import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const manifestPath = join(root, "extension", "chromium", "manifest.json");
const privateKeyPath = join(root, "build", "quicktab-extension-private-key.pem");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
let publicKeyDerBase64 = manifest.key;

if (!publicKeyDerBase64) {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });
  publicKeyDerBase64 = publicKey.toString("base64");
  manifest.key = publicKeyDerBase64;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await mkdir(dirname(privateKeyPath), { recursive: true });
  await writeFile(privateKeyPath, privateKey, { encoding: "utf8", mode: 0o600 });
}

const extensionId = computeExtensionId(publicKeyDerBase64);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ extensionId, manifestPath, privateKeyPath }, null, 2));
} else {
  console.log(extensionId);
}

function computeExtensionId(publicKeyDerBase64) {
  const digest = createHash("sha256").update(Buffer.from(publicKeyDerBase64, "base64")).digest();
  return [...digest.subarray(0, 16)]
    .map((byte) => {
      const high = String.fromCharCode("a".charCodeAt(0) + (byte >> 4));
      const low = String.fromCharCode("a".charCodeAt(0) + (byte & 0x0f));
      return `${high}${low}`;
    })
    .join("");
}
