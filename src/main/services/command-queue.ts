import { CommandResult, NativeMessage } from "../shared.js";
import { readJsonFile, writeJsonFile } from "./storage.js";

export interface QueuedCommand {
  id: string;
  browserId: string;
  profileId: string;
  message: NativeMessage;
  status: "pending" | "sent" | "completed" | "failed";
  createdAt: number;
  updatedAt: number;
  deliveredAt?: number;
  result?: CommandResult;
}

interface QueueDatabase {
  schemaVersion: number;
  commands: QueuedCommand[];
}

const EMPTY_QUEUE: QueueDatabase = {
  schemaVersion: 1,
  commands: []
};

const SENT_RETRY_MS = 10_000;
const RETAIN_MS = 1000 * 60 * 10;

export class CommandQueue {
  constructor(private readonly filePath: string) {}

  async enqueue(message: NativeMessage): Promise<QueuedCommand> {
    const now = Date.now();
    const command: QueuedCommand = {
      id: message.messageId,
      browserId: message.browserId ?? "chrome",
      profileId: message.profileId ?? "default",
      message,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };
    const db = await this.load();
    db.commands = this.prune(db.commands).filter((item) => item.id !== command.id);
    db.commands.push(command);
    await this.save(db);
    return command;
  }

  async claimPending(browserId: string, profileId: string, limit = 10): Promise<QueuedCommand[]> {
    const db = await this.load();
    const now = Date.now();
    const claimed: QueuedCommand[] = [];
    db.commands = this.prune(db.commands).map((command) => {
      const isTarget = command.browserId === browserId && command.profileId === profileId;
      const canRetry = command.status === "sent" && (!command.deliveredAt || now - command.deliveredAt > SENT_RETRY_MS);
      if (isTarget && claimed.length < limit && (command.status === "pending" || canRetry)) {
        const next = { ...command, status: "sent" as const, deliveredAt: now, updatedAt: now };
        claimed.push(next);
        return next;
      }
      return command;
    });
    await this.save(db);
    return claimed;
  }

  async complete(commandId: string, result: CommandResult): Promise<void> {
    const db = await this.load();
    const now = Date.now();
    db.commands = db.commands.map((command) => {
      if (command.id !== commandId) return command;
      return {
        ...command,
        status: result.success ? "completed" : "failed",
        result,
        updatedAt: now
      };
    });
    await this.save(db);
  }

  async waitForResult(commandId: string, timeoutMs = 2_800): Promise<CommandResult | undefined> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const command = (await this.load()).commands.find((item) => item.id === commandId);
      if (command?.result) return command.result;
      await sleep(80);
    }
    return undefined;
  }

  async diagnostics(): Promise<{ pending: number; sent: number; completed: number; failed: number }> {
    const commands = (await this.load()).commands;
    return {
      pending: commands.filter((item) => item.status === "pending").length,
      sent: commands.filter((item) => item.status === "sent").length,
      completed: commands.filter((item) => item.status === "completed").length,
      failed: commands.filter((item) => item.status === "failed").length
    };
  }

  private prune(commands: QueuedCommand[]): QueuedCommand[] {
    const cutoff = Date.now() - RETAIN_MS;
    return commands.filter((command) => {
      if (command.status === "pending" || command.status === "sent") return true;
      return command.updatedAt > cutoff;
    });
  }

  private async load(): Promise<QueueDatabase> {
    const db = await readJsonFile<QueueDatabase>(this.filePath, EMPTY_QUEUE);
    return {
      schemaVersion: db.schemaVersion ?? 1,
      commands: db.commands ?? []
    };
  }

  private async save(db: QueueDatabase): Promise<void> {
    await writeJsonFile(this.filePath, db);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
