import { describe, expect, it, vi } from "vitest";
import { createInitialSyncRunner } from "../extension/chromium/sync-runner.js";

describe("extension initial sync runner", () => {
  it("deduplicates overlapping initial sync triggers", async () => {
    let finishSync!: () => void;
    const syncAll = vi.fn(() => new Promise<void>((resolve) => {
      finishSync = resolve;
    }));
    const runInitialSync = createInitialSyncRunner(syncAll);

    const startup = runInitialSync();
    const handshake = runInitialSync();
    await Promise.resolve();

    expect(syncAll).toHaveBeenCalledTimes(1);
    finishSync();
    await Promise.all([startup, handshake]);
  });

  it("skips handshake sync after initial sync completed", async () => {
    const syncAll = vi.fn().mockResolvedValue(undefined);
    const runInitialSync = createInitialSyncRunner(syncAll);

    await expect(runInitialSync()).resolves.toBe(true);
    await expect(runInitialSync()).resolves.toBe(false);

    expect(syncAll).toHaveBeenCalledTimes(1);
  });
});
