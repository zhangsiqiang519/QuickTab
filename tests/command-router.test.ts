import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NativeMessage, SearchResult } from "../src/main/shared";
import { CommandQueue } from "../src/main/services/command-queue";
import { CommandRouter } from "../src/main/services/command-router";
import { IndexService } from "../src/main/services/index-service";

const mocks = vi.hoisted(() => ({
  openExternal: vi.fn()
}));

vi.mock("electron", () => ({
  shell: {
    openExternal: mocks.openExternal
  }
}));

let dir: string;
let index: IndexService;
let queue: CommandQueue;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "quicktab-router-test-"));
  index = new IndexService(join(dir, "index.json"));
  queue = new CommandQueue(join(dir, "commands.json"));
  mocks.openExternal.mockReset();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("CommandRouter", () => {
  it("activates an already open tab for a URL result instead of opening a new browser tab", async () => {
    await index.upsertTabs([
      {
        browserId: "chrome",
        profileId: "default",
        windowId: 1,
        tabId: 42,
        url: "https://example.com/docs",
        title: "Docs"
      }
    ]);

    const sent: NativeMessage[] = [];
    const router = new CommandRouter(
      index,
      async (message) => {
        sent.push(message);
        return { success: true, commandId: message.messageId, action: "activate_tab", retryable: false };
      },
      queue,
      async () => false,
      async () => "system"
    );

    const result: SearchResult = {
      itemId: "bookmark:chrome:default:docs",
      sourceType: "bookmark",
      browserId: "chrome",
      profileId: "default",
      url: "https://example.com/docs",
      normalizedUrl: "https://example.com/docs",
      domain: "example.com",
      displayTitle: "Docs Bookmark",
      lastSeenAt: Date.now(),
      scoreSignals: {},
      score: 10,
      matchReason: "query"
    };

    await expect(router.executeResult(result)).resolves.toMatchObject({ success: true, action: "activate_tab" });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: "activate_tab", browserId: "chrome", profileId: "default" });
    expect(sent[0].payload).toMatchObject({ tabId: 42 });
    expect(mocks.openExternal).not.toHaveBeenCalled();
  });

  it("activates Safari tab results through the macOS Safari bridge", async () => {
    const activated: unknown[] = [];
    const router = new CommandRouter(
      index,
      async () => undefined,
      queue,
      async () => false,
      async () => "safari",
      async (browserId, openTabRef, url) => {
        activated.push({ browserId, openTabRef, url });
      }
    );

    const result: SearchResult = {
      itemId: "open_tab:safari:default:100:3",
      sourceType: "open_tab",
      browserId: "safari",
      profileId: "default",
      url: "https://example.com/safari",
      normalizedUrl: "https://example.com/safari",
      domain: "example.com",
      displayTitle: "Safari Result",
      lastSeenAt: Date.now(),
      scoreSignals: {},
      openTabRef: {
        browserId: "safari",
        profileId: "default",
        windowId: 100,
        tabId: 3,
        active: false,
        lastActivatedAt: Date.now()
      },
      score: 120,
      matchReason: "query"
    };

    await expect(router.executeResult(result)).resolves.toMatchObject({ success: true, action: "activate_tab" });
    expect(activated).toEqual([{ browserId: "safari", openTabRef: result.openTabRef, url: result.url }]);
    expect(mocks.openExternal).not.toHaveBeenCalled();
  });

  it("activates Chrome macOS automation tab results without the extension", async () => {
    const activated: unknown[] = [];
    const router = new CommandRouter(
      index,
      async () => undefined,
      queue,
      async () => false,
      async () => "chrome",
      async (browserId, openTabRef, url) => {
        activated.push({ browserId, openTabRef, url });
      }
    );

    const result: SearchResult = {
      itemId: "open_tab:chrome:macos-automation:10:2",
      sourceType: "open_tab",
      browserId: "chrome",
      profileId: "macos-automation",
      url: "https://example.com/chrome",
      normalizedUrl: "https://example.com/chrome",
      domain: "example.com",
      displayTitle: "Chrome Result",
      lastSeenAt: Date.now(),
      scoreSignals: {},
      openTabRef: {
        browserId: "chrome",
        profileId: "macos-automation",
        windowId: 10,
        tabId: 2,
        active: false,
        lastActivatedAt: Date.now()
      },
      score: 120,
      matchReason: "query"
    };

    await expect(router.executeResult(result)).resolves.toMatchObject({ success: true, action: "activate_tab" });
    expect(activated).toEqual([{ browserId: "chrome", openTabRef: result.openTabRef, url: result.url }]);
    expect(mocks.openExternal).not.toHaveBeenCalled();
  });

  it("does not rematch or open a URL when a selected open tab activation fails", async () => {
    await index.upsertTabs([
      {
        browserId: "chrome",
        profileId: "default",
        windowId: 9,
        tabId: 99,
        url: "https://example.com/stale",
        title: "Stale"
      }
    ]);

    const sent: NativeMessage[] = [];
    const router = new CommandRouter(
      index,
      async (message) => {
        sent.push(message);
        return {
          success: false,
          commandId: message.messageId,
          action: "activate_tab",
          errorCode: "EXT_TAB_NOT_FOUND",
          retryable: true
        };
      },
      queue,
      async () => false,
      async () => "chrome"
    );

    const result: SearchResult = {
      itemId: "open_tab:chrome:default:9:99",
      sourceType: "open_tab",
      browserId: "chrome",
      profileId: "default",
      url: "https://example.com/stale",
      normalizedUrl: "https://example.com/stale",
      domain: "example.com",
      displayTitle: "Stale",
      lastSeenAt: Date.now(),
      scoreSignals: {},
      openTabRef: {
        browserId: "chrome",
        profileId: "default",
        windowId: 9,
        tabId: 99,
        active: false,
        lastActivatedAt: Date.now()
      },
      score: 120,
      matchReason: "query"
    };

    await expect(router.executeResult(result)).resolves.toMatchObject({
      success: false,
      action: "activate_tab",
      errorCode: "EXT_TAB_NOT_FOUND"
    });
    expect(sent).toHaveLength(1);
    expect(mocks.openExternal).not.toHaveBeenCalled();
  });
});
