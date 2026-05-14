import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dataDir = join(tmpdir(), `quicktab-smoke-${Date.now()}`);
await mkdir(dataDir, { recursive: true });

const child = spawn(process.execPath, ["dist/src/main/native/native-host.js"], {
  env: { ...process.env, QUICKTAB_DATA_DIR: dataDir },
  stdio: ["pipe", "pipe", "pipe"]
});

const message = {
  messageId: "smoke-handshake",
  protocolVersion: "1.0",
  type: "handshake",
  browserId: "chrome",
  profileId: "default",
  timestamp: Date.now(),
  payload: {
    browserName: "Chrome",
    extensionId: "smoke-extension",
    extensionVersion: "0.0.0",
    permissions: { tabs: true, bookmarks: true, history: true }
  }
};

child.stdin.write(encodeNativeMessage(message));
const response = await readNativeMessage(child.stdout);
child.kill();
await once(child, "exit");
await rm(dataDir, { recursive: true, force: true });

if (response.type !== "handshake_ack") {
  console.error(response);
  throw new Error("Native host smoke test failed: expected handshake_ack");
}

console.log("Native host smoke test passed.");

function encodeNativeMessage(value) {
  const body = Buffer.from(JSON.stringify(value), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

async function readNativeMessage(stream) {
  let buffer = Buffer.alloc(0);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length < 4) continue;
    const length = buffer.readUInt32LE(0);
    if (buffer.length < 4 + length) continue;
    return JSON.parse(buffer.subarray(4, 4 + length).toString("utf8"));
  }
  throw new Error("Native host exited before responding");
}
