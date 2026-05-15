import { app } from "electron";
import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { platform } from "node:os";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { getSharedDataPathFromEnv } from "../paths.js";
import { buildNativeHostInstallPlan } from "./native-host-config.js";

export interface NativeHostInstallResult {
  extensionId: string;
  runnerPath: string;
  manifestPaths: string[];
}

const execFileAsync = promisify(execFile);

export async function installNativeHostManifests(): Promise<NativeHostInstallResult> {
  const extensionId = await getBundledExtensionId();
  const runtimeBinary = process.env.QUICKTAB_NODE_PATH || process.execPath;
  const hostScript = app.isPackaged
    ? join(process.resourcesPath, "app.asar", "dist", "src", "main", "native", "native-host.js")
    : join(app.getAppPath(), "dist", "src", "main", "native", "native-host.js");
  const plan = buildNativeHostInstallPlan({
    platform: platform(),
    extensionId,
    dataDir: getSharedDataPathFromEnv(),
    runtimeBinary,
    hostScript,
    useElectronRunAsNode: !process.env.QUICKTAB_NODE_PATH
  });

  await mkdir(dirname(plan.runnerPath), { recursive: true });
  await writeFile(plan.runnerPath, plan.runnerBody, "utf8");
  if (platform() !== "win32") await chmod(plan.runnerPath, 0o755);

  for (const manifestPath of plan.manifestPaths) {
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(plan.manifest, null, 2)}\n`, "utf8");
  }
  for (const registryKey of plan.registryKeys) {
    await execFileAsync("reg", ["add", registryKey, "/ve", "/t", "REG_SZ", "/d", plan.manifestPaths[0], "/f"]);
  }
  return { extensionId, runnerPath: plan.runnerPath, manifestPaths: plan.manifestPaths };
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
