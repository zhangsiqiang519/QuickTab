import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const LOCK_RETRY_MS = 25;
const LOCK_TIMEOUT_MS = 3_000;

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
  await mkdir(dirname(filePath), { recursive: true });
  const nextPath = `${filePath}.tmp`;
  await writeFile(nextPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(nextPath, filePath);
  } finally {
    await release();
  }
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
  while (true) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.writeFile(`${process.pid}\n${Date.now()}\n`, "utf8");
      await handle.close();
      return async () => {
        await rm(lockPath, { force: true });
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || Date.now() > deadline) {
        await rm(lockPath, { force: true });
        continue;
      }
      await sleep(LOCK_RETRY_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
