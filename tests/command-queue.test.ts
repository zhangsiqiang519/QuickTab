import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CommandQueue } from "../src/main/services/command-queue";

let dir: string;
let queue: CommandQueue;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "quicktab-queue-test-"));
  queue = new CommandQueue(join(dir, "commands.json"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("CommandQueue", () => {
  it("claims commands for the matching browser profile", async () => {
    await queue.enqueue({
      messageId: "cmd-1",
      protocolVersion: "1.0",
      type: "activate_tab",
      browserId: "chrome",
      profileId: "default",
      timestamp: Date.now(),
      payload: { tabId: 1, windowId: 1 }
    });

    expect(await queue.claimPending("edge", "default")).toHaveLength(0);
    const claimed = await queue.claimPending("chrome", "default");
    expect(claimed).toHaveLength(1);
    expect(claimed[0].message.type).toBe("activate_tab");
  });

  it("stores command results for desktop polling", async () => {
    await queue.enqueue({
      messageId: "cmd-2",
      protocolVersion: "1.0",
      type: "open_url",
      browserId: "chrome",
      profileId: "default",
      timestamp: Date.now(),
      payload: { url: "https://example.com" }
    });
    await queue.complete("cmd-2", {
      success: true,
      commandId: "cmd-2",
      action: "open_url",
      retryable: false
    });

    await expect(queue.waitForResult("cmd-2", 20)).resolves.toMatchObject({ success: true });
  });
});
