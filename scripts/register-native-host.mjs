import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const root = resolve(new URL("..", import.meta.url).pathname);
const hostPath = join(root, "dist", "src", "main", "native", "native-host.js");
const nodePath = process.execPath;
const dataDir = process.env.QUICKTAB_DATA_DIR || join(process.env.HOME || process.env.USERPROFILE || ".", ".quicktab-ai");
const autoExtensionId = await readExtensionIdFromManifest();
const chromeExtensionId = readArg("--chrome-extension-id") || process.env.QUICKTAB_CHROME_EXTENSION_ID || autoExtensionId || "REPLACE_WITH_CHROME_EXTENSION_ID";
const edgeExtensionId = readArg("--edge-extension-id") || process.env.QUICKTAB_EDGE_EXTENSION_ID || autoExtensionId || "REPLACE_WITH_EDGE_EXTENSION_ID";
const execFileAsync = promisify(execFile);
const manifest = {
  name: "com.quicktab.ai",
  description: "QuickTab native messaging host",
  path: nodePath,
  type: "stdio",
  allowed_origins: [
    `chrome-extension://${chromeExtensionId}/`,
    `chrome-extension://${edgeExtensionId}/`
  ]
};

const wrapperPath = join(dataDir, platform() === "win32" ? "native-host-runner.cmd" : "native-host-runner");
await mkdir(dirname(wrapperPath), { recursive: true });
if (platform() === "win32") {
  await writeFile(wrapperPath, `@echo off\r\nset QUICKTAB_DATA_DIR=${dataDir}\r\n"${nodePath}" "${hostPath}"\r\n`, "utf8");
} else {
  await writeFile(wrapperPath, `#!/bin/sh\nQUICKTAB_DATA_DIR="${dataDir}" exec "${nodePath}" "${hostPath}"\n`, { encoding: "utf8", mode: 0o755 });
}
manifest.path = wrapperPath;

const targets = getManifestTargets();
for (const target of targets) {
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote native host manifest: ${target}`);
}

if (platform() === "win32") {
  const manifestPath = targets[0];
  await registerWindowsKey("HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.quicktab.ai", manifestPath);
  await registerWindowsKey("HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\com.quicktab.ai", manifestPath);
}

if (chromeExtensionId.includes("REPLACE") || edgeExtensionId.includes("REPLACE")) {
  console.log("Native host manifest contains placeholder extension IDs.");
  console.log("Re-run with --chrome-extension-id=<id> --edge-extension-id=<id>, or set QUICKTAB_CHROME_EXTENSION_ID / QUICKTAB_EDGE_EXTENSION_ID.");
}

function getManifestTargets() {
  if (platform() === "darwin") {
    return [
      join(homedir(), "Library/Application Support/Google/Chrome/NativeMessagingHosts/com.quicktab.ai.json"),
      join(homedir(), "Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.quicktab.ai.json")
    ];
  }
  if (platform() === "win32") {
    return [join(dataDir, "com.quicktab.ai.json")];
  }
  return [join(homedir(), ".config/google-chrome/NativeMessagingHosts/com.quicktab.ai.json")];
}

async function registerWindowsKey(key, manifestPath) {
  await execFileAsync("reg", ["add", key, "/ve", "/t", "REG_SZ", "/d", manifestPath, "/f"]);
  console.log(`Registered Windows native host key: ${key}`);
}

function readArg(name) {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}

async function readExtensionIdFromManifest() {
  try {
    const manifest = JSON.parse(await readFile(join(root, "extension", "chromium", "manifest.json"), "utf8"));
    if (!manifest.key) return undefined;
    return computeExtensionId(manifest.key);
  } catch {
    return undefined;
  }
}

function computeExtensionId(publicKeyDerBase64) {
  const digest = createHash("sha256").update(Buffer.from(publicKeyDerBase64, "base64")).digest();
  return [...digest.subarray(0, 16)]
    .map((byte) => `${String.fromCharCode(97 + (byte >> 4))}${String.fromCharCode(97 + (byte & 0x0f))}`)
    .join("");
}
