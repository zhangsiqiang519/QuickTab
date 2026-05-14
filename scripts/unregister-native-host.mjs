import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const root = resolve(new URL("..", import.meta.url).pathname);
const execFileAsync = promisify(execFile);

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
    return [join(root, "build", "com.quicktab.ai.json")];
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
