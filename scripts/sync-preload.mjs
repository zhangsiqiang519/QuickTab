import { readFile, writeFile } from "node:fs/promises";

const sourcePath = "dist/src/preload/preload.js";
const targetPath = "preload.cjs";

const source = await readFile(sourcePath, "utf8");
const cjs = source.replace(
  /^import \{ contextBridge, ipcRenderer \} from "electron";/m,
  'const { contextBridge, ipcRenderer } = require("electron");'
);

if (cjs === source) {
  throw new Error(`Could not convert ${sourcePath} to CommonJS preload.`);
}

await writeFile(targetPath, cjs, "utf8");
