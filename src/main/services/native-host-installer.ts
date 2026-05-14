import { app } from "electron";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { getSharedDataPathFromEnv } from "../paths.js";

export interface NativeHostInstallResult {
  extensionId: string;
  runnerPath: string;
  manifestPaths: string[];
}

export async function installNativeHostManifests(): Promise<NativeHostInstallResult> {
  const extensionId = await getBundledExtensionId();
  const runnerPath = join(getSharedDataPathFromEnv(), "native-host-runner");
  const runtimeBinary = process.env.QUICKTAB_NODE_PATH || process.execPath;
  const hostScript = app.isPackaged
    ? join(process.resourcesPath, "app.asar", "dist", "src", "main", "native", "native-host.js")
    : join(app.getAppPath(), "dist", "src", "main", "native", "native-host.js");
  const nodeMode = process.env.QUICKTAB_NODE_PATH ? "" : "ELECTRON_RUN_AS_NODE=1 ";
  const runner = `#!/bin/sh\nQUICKTAB_DATA_DIR="${getSharedDataPathFromEnv()}" ${nodeMode}exec "${runtimeBinary}" "${hostScript}"\n`;
  await mkdir(dirname(runnerPath), { recursive: true });
  await writeFile(runnerPath, runner, "utf8");
  await chmod(runnerPath, 0o755);

  const manifest = {
    name: "com.quicktab.ai",
    description: "QuickTab native messaging host",
    path: runnerPath,
    type: "stdio",
    allowed_origins: [`chrome-extension://${extensionId}/`]
  };
  const manifestPaths = nativeHostManifestPaths();
  for (const manifestPath of manifestPaths) {
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
  return { extensionId, runnerPath, manifestPaths };
}

export function bundledExtensionPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "extension", "chromium");
  }
  return join(app.getAppPath(), "extension", "chromium");
}

async function getBundledExtensionId(): Promise<string> {
  const manifest = JSON.parse(await readFile(join(bundledExtensionPath(), "manifest.json"), "utf8")) as { key?: string };
  if (!manifest.key) {
    throw new Error("Bundled extension manifest is missing a stable key. Run npm run extension:prepare before packaging.");
  }
  return computeExtensionId(manifest.key);
}

function computeExtensionId(publicKeyDerBase64: string): string {
  const digest = createHash("sha256").update(Buffer.from(publicKeyDerBase64, "base64")).digest();
  return [...digest.subarray(0, 16)]
    .map((byte) => `${String.fromCharCode(97 + (byte >> 4))}${String.fromCharCode(97 + (byte & 0x0f))}`)
    .join("");
}

function nativeHostManifestPaths(): string[] {
  if (platform() === "darwin") {
    return [
      join(homedir(), "Library/Application Support/Google/Chrome/NativeMessagingHosts/com.quicktab.ai.json"),
      join(homedir(), "Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.quicktab.ai.json")
    ];
  }
  if (platform() === "win32") {
    return [join(getSharedDataPathFromEnv(), "com.quicktab.ai.json")];
  }
  return [
    join(homedir(), ".config/google-chrome/NativeMessagingHosts/com.quicktab.ai.json"),
    join(homedir(), ".config/microsoft-edge/NativeMessagingHosts/com.quicktab.ai.json")
  ];
}
