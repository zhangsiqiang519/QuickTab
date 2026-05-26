import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const appPath = join(root, "release", "mac-arm64", "QuickTab.app");
const executable = join(appPath, "Contents", "MacOS", "QuickTab");
const manifestPaths = [
  join(homedir(), "Library/Application Support/Google/Chrome/NativeMessagingHosts/com.quicktab.ai.json"),
  join(homedir(), "Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.quicktab.ai.json")
];

if (process.platform !== "darwin") {
  console.log("macOS smoke test skipped: not running on darwin.");
  process.exit(0);
}

if (!existsSync(executable)) {
  throw new Error(`Packaged app executable not found: ${executable}. Run npm run package first.`);
}

const testDir = await mkdtemp(join(tmpdir(), "quicktab-macos-smoke-"));
const dataDir = join(testDir, "shared");
const userDataDir = join(testDir, "user-data");
const child = spawn(executable, [], {
  env: {
    ...process.env,
    QUICKTAB_DATA_DIR: dataDir,
    QUICKTAB_USER_DATA_DIR: userDataDir,
    QUICKTAB_SKIP_NATIVE_HOST_INSTALL: "1"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let stdout = "";
let stderr = "";
let passed = false;
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  stdout += chunk;
});
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});

try {
  await waitForLog(join(dataDir, "logs", "quicktab.log"), "QuickTab started", 12_000);
  if (child.exitCode !== null) {
    throw new Error(`QuickTab exited early with code ${child.exitCode}.`);
  }

  const log = await readFile(join(dataDir, "logs", "quicktab.log"), "utf8");
  if (!log.includes("Native host manifest installation skipped")) {
    throw new Error("Smoke test did not run with native host installation skipped.");
  }

  const manifests = await readManifestContents();
  for (const [path, content] of Object.entries(manifests)) {
    if (content?.includes(testDir)) {
      throw new Error(`Native host manifest points to the smoke test directory: ${path}`);
    }
  }

  console.log("macOS app smoke test passed.");
  passed = true;
} finally {
  await terminateProcessTree(child.pid);
  await rm(testDir, { recursive: true, force: true });
  if (!passed) {
    if (stdout.trim()) console.log(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());
  }
}

async function readManifestContents() {
  const contents = {};
  for (const path of manifestPaths) {
    if (!existsSync(path)) {
      contents[path] = null;
      continue;
    }
    contents[path] = await readFile(path, "utf8");
  }
  return contents;
}

async function waitForLog(path, needle, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (existsSync(path)) {
      const log = await readFile(path, "utf8");
      if (log.includes(needle)) return;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`Timed out waiting for "${needle}" in ${path}.`);
}

async function terminateProcessTree(pid) {
  if (!pid) return;
  const descendants = await listDescendants(pid);
  for (const childPid of descendants.reverse()) {
    try {
      process.kill(childPid, "SIGTERM");
    } catch {
      // 进程可能已经退出。
    }
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // 进程可能已经退出。
  }
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
}

async function listDescendants(pid) {
  const directChildren = await listChildren(pid);
  const nested = [];
  for (const childPid of directChildren) {
    nested.push(childPid, ...(await listDescendants(childPid)));
  }
  return nested;
}

async function listChildren(pid) {
  const result = spawn("pgrep", ["-P", String(pid)], { stdio: ["ignore", "pipe", "ignore"] });
  let output = "";
  result.stdout.setEncoding("utf8");
  result.stdout.on("data", (chunk) => {
    output += chunk;
  });
  await new Promise((resolveDone) => result.on("close", resolveDone));
  return output
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => Number(value))
    .filter(Number.isFinite);
}
