import { writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { updateJsonFile } from "../src/main/services/storage";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "quicktab-storage-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("storage locks", () => {
  it("recovers a stale lock before updating JSON", async () => {
    const filePath = join(dir, "index.json");
    const lockPath = `${filePath}.lock`;
    await writeFile(lockPath, `${JSON.stringify({ ownerToken: "stale-owner", createdAt: Date.now() - 10_000 })}\n`, "utf8");

    const result = await updateJsonFile(filePath, { count: 0 }, (current) => ({ count: current.count + 1 }));

    expect(result).toEqual({ count: 1 });
    await expect(readFile(filePath, "utf8")).resolves.toContain('"count": 1');
    await expect(readFile(lockPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not release a lock now owned by another writer", async () => {
    const filePath = join(dir, "index.json");
    const lockPath = `${filePath}.lock`;
    const otherLock = { ownerToken: "other-owner", createdAt: Date.now() };

    await updateJsonFile(filePath, { count: 0 }, (current) => {
      writeFileSync(lockPath, `${JSON.stringify(otherLock)}\n`, "utf8");
      return { count: current.count + 1 };
    });

    await expect(readFile(lockPath, "utf8")).resolves.toContain(otherLock.ownerToken);
  });
});
