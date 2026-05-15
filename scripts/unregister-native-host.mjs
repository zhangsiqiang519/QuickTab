import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const dataDir = process.env.QUICKTAB_DATA_DIR || join(process.env.HOME || process.env.USERPROFILE || ".", ".quicktab-ai");

for (const target of getManifestTargets()) {
  await rm(target, { force: true });
  console.log(`Removed native host manifest if present: ${target}`);
}

if (platform() === "win32") {
  await unregisterWindowsKey("HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.quicktab.ai");
  await unregisterWindowsKey("HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\com.quicktab.ai");
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

async function unregisterWindowsKey(key) {
  try {
    await execFileAsync("reg", ["delete", key, "/f"]);
    console.log(`Removed Windows native host key: ${key}`);
  } catch {
    console.log(`Windows native host key was not present: ${key}`);
  }
}
