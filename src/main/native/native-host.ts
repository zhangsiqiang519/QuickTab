import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CommandQueue } from "../services/command-queue.js";
import { IndexService } from "../services/index-service.js";
import { createErrorResponse, createMessage, protocolError, validateMessage } from "../services/native-protocol.js";
import { BrowserSource, NativeMessage } from "../shared.js";

const dataDir = process.env.QUICKTAB_DATA_DIR || join(process.env.HOME || process.env.USERPROFILE || ".", ".quicktab-ai");
const index = new IndexService(join(dataDir, "index.json"));
const commandQueue = new CommandQueue(join(dataDir, "commands.json"));

let stdinBuffer = Buffer.alloc(0);
let draining = false;

process.stdin.on("data", (chunk) => {
  stdinBuffer = Buffer.concat([stdinBuffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
  void drainMessages();
});

process.stdin.on("error", (error) => {
  console.error("[quicktab-native-host] stdin error", error);
});

async function drainMessages(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    while (stdinBuffer.length >= 4) {
      const length = stdinBuffer.readUInt32LE(0);
      if (length > 1024 * 1024 * 8) {
        send(createErrorResponse(protocolError("PROTO_MESSAGE_TOO_LARGE", "Native message is too large.")));
        stdinBuffer = Buffer.alloc(0);
        return;
      }
      if (stdinBuffer.length < 4 + length) return;
      const raw = stdinBuffer.subarray(4, 4 + length).toString("utf8");
      stdinBuffer = stdinBuffer.subarray(4 + length);
      try {
        const message = validateMessage(JSON.parse(raw));
        const responses = await handleMessage(message);
        for (const response of responses) send(response);
        const pendingCommands = await commandQueue.claimPending(message.browserId ?? "chrome", message.profileId ?? "default");
        for (const command of pendingCommands) send(command.message);
      } catch (error) {
        const quicktabError = typeof error === "object" && error && "errorCode" in error
          ? error
          : protocolError("PROTO_HANDLER_FAILED", "QuickTab could not process the extension message.", error instanceof Error ? error.message : String(error));
        send(createErrorResponse(quicktabError as never));
      }
    }
  } finally {
    draining = false;
  }
}

async function handleMessage(message: NativeMessage): Promise<NativeMessage[]> {
  const browserId = message.browserId ?? "chrome";
  const profileId = message.profileId ?? "default";
  switch (message.type) {
    case "handshake": {
      const payload = message.payload as Partial<BrowserSource> | undefined;
      await index.upsertSource({
        browserId,
        browserName: payload?.browserName ?? browserId,
        profileId,
        profileName: payload?.profileName,
        extensionId: payload?.extensionId ?? "unknown",
        extensionVersion: payload?.extensionVersion ?? "0.0.0",
        connected: true,
        permissions: payload?.permissions ?? {},
        status: "connected",
        lastConnectedAt: Date.now()
      });
      return [createMessage("handshake_ack", {
        capabilities: ["tabs_snapshot", "request_tabs_snapshot", "bookmarks_snapshot", "request_bookmarks_snapshot", "history_batch", "activate_tab", "open_url"],
        requestedSources: ["tabs", "bookmarks", "history"]
      }, message.messageId)];
    }
    case "permission_status": {
      await index.addDiagnostic({ level: "info", code: "PERMISSION_STATUS", message: JSON.stringify(message.payload ?? {}) });
      return [createMessage("command_result", { success: true, action: "permission_status" }, message.messageId)];
    }
    case "tabs_snapshot": {
      const tabs = Array.isArray(message.payload) ? message.payload : (message.payload as { tabs?: unknown[] })?.tabs ?? [];
      await index.replaceOpenTabs(browserId, profileId, tabs as never);
      return [createMessage("command_result", { success: true, action: "tabs_snapshot", count: tabs.length }, message.messageId)];
    }
    case "tab_event": {
      const payload = message.payload as { eventType?: string; tab?: never; tabId?: number };
      if (payload.eventType === "removed" && payload.tabId) {
        await index.removeTab(browserId, profileId, payload.tabId);
      } else if (payload.tab) {
        await index.upsertTabs([payload.tab]);
      }
      return [createMessage("command_result", { success: true, action: "tab_event" }, message.messageId)];
    }
    case "bookmarks_snapshot": {
      const bookmarks = Array.isArray(message.payload) ? message.payload : (message.payload as { bookmarks?: unknown[] })?.bookmarks ?? [];
      await index.replaceBookmarks(browserId, profileId, bookmarks as never);
      return [createMessage("command_result", { success: true, action: "bookmarks_snapshot", count: bookmarks.length }, message.messageId)];
    }
    case "history_batch": {
      const history = Array.isArray(message.payload) ? message.payload : (message.payload as { history?: unknown[] })?.history ?? [];
      await index.upsertHistory(history as never);
      return [createMessage("command_result", { success: true, action: "history_batch", count: history.length }, message.messageId)];
    }
    case "heartbeat": {
      return [createMessage("heartbeat_ack", { ok: true }, message.messageId)];
    }
    case "command_result": {
      const payload = message.payload as { commandId?: string } & Record<string, unknown>;
      if (payload.commandId) {
        await commandQueue.complete(payload.commandId, {
          success: Boolean(payload.success),
          commandId: payload.commandId,
          action: normalizeCommandAction(payload.action),
          errorCode: typeof payload.errorCode === "string" ? payload.errorCode : undefined,
          message: typeof payload.message === "string" ? payload.message : undefined,
          technicalMessage: typeof payload.technicalMessage === "string" ? payload.technicalMessage : undefined,
          retryable: Boolean(payload.retryable)
        });
      }
      return [createMessage("command_result", { success: true, action: "command_result" }, message.messageId)];
    }
    case "diagnostic_response": {
      await index.addDiagnostic({ level: "info", code: "EXT_DIAGNOSTIC", message: JSON.stringify(message.payload ?? {}) });
      return [createMessage("command_result", { success: true, action: "diagnostic_response" }, message.messageId)];
    }
    default:
      return [createErrorResponse(protocolError("PROTO_UNKNOWN_TYPE", `Unsupported message type: ${message.type}`), message.messageId)];
  }
}

function normalizeCommandAction(action: unknown): "activate_tab" | "open_url" | "tabs_snapshot" | "bookmarks_snapshot" {
  if (action === "activate_tab" || action === "tabs_snapshot" || action === "bookmarks_snapshot") return action;
  return "open_url";
}

function send(message: NativeMessage): void {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([header, body]));
}

if (process.argv.includes("--manifest-path")) {
  const currentFile = fileURLToPath(import.meta.url);
  console.log(join(dirname(currentFile), "native-host.js"));
}
