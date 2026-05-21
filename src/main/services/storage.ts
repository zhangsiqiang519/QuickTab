import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const LOCK_RETRY_MS = 25;
const LOCK_TIMEOUT_MS = 3_000;
const LOCK_STALE_MS = LOCK_TIMEOUT_MS;

interface LockInfo {
  ownerToken: string;
  createdAt: number;
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      await quarantineCorruptJson(filePath);
    }
    return fallback;
  }
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  const release = await acquireLock(`${filePath}.lock`);
  try {
    await writeJsonFileUnlocked(filePath, value);
  } finally {
    await release();
  }
}

export async function updateJsonFile<T>(filePath: string, fallback: T, update: (current: T) => T): Promise<T> {
  const release = await acquireLock(`${filePath}.lock`);
  try {
    const current = await readJsonFileUnlocked(filePath, fallback);
    const next = update(current);
    await writeJsonFileUnlocked(filePath, next);
    return next;
  } finally {
    await release();
  }
}

async function readJsonFileUnlocked<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      await quarantineCorruptJson(filePath);
    }
    return fallback;
  }
}

async function writeJsonFileUnlocked(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const nextPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(nextPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(nextPath, filePath);
}

async function quarantineCorruptJson(filePath: string): Promise<void> {
  try {
    const backupPath = `${filePath}.corrupt-${Date.now()}`;
    await rename(filePath, backupPath);
  } catch {
    // Best effort only; callers can continue with defaults.
  }
}

async function acquireLock(lockPath: string): Promise<() => Promise<void>> {
  await mkdir(dirname(lockPath), { recursive: true });
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  const lockInfo: LockInfo = {
    ownerToken: `${process.pid}-${Date.now()}-${randomUUID()}`,
    createdAt: Date.now()
  };
  while (true) {
    try {
      const handle = await open(lockPath, "wx");
      try {
        await handle.writeFile(`${JSON.stringify(lockInfo)}\n`, "utf8");
      } finally {
        await handle.close();
      }
      return async () => {
        await removeLockIfOwned(lockPath, lockInfo);
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }

      const existing = await readLockInfo(lockPath);
      if (existing && Date.now() - existing.createdAt > LOCK_STALE_MS) {
        await removeLockIfOwned(lockPath, existing);
        continue;
      }

      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for JSON storage lock: ${lockPath}`);
      }
      await sleep(LOCK_RETRY_MS);
    }
  }
}

async function readLockInfo(lockPath: string): Promise<LockInfo | undefined> {
  try {
    const raw = await readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LockInfo>;
    if (typeof parsed.ownerToken === "string" && typeof parsed.createdAt === "number") {
      return { ownerToken: parsed.ownerToken, createdAt: parsed.createdAt };
    }
  } catch {
    // Fall through to legacy format parsing.
  }

  try {
    const [pid, createdAt] = (await readFile(lockPath, "utf8")).trim().split("\n");
    const timestamp = Number(createdAt);
    if (pid && Number.isFinite(timestamp)) {
      return { ownerToken: `${pid}:${timestamp}`, createdAt: timestamp };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function removeLockIfOwned(lockPath: string, owner: LockInfo): Promise<void> {
  const current = await readLockInfo(lockPath);
  if (!current) return;
  if (current.ownerToken !== owner.ownerToken || current.createdAt !== owner.createdAt) return;
  await rm(lockPath, { force: true });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
