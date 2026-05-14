import { app } from "electron";
import { join } from "node:path";

export function getUserDataPath(...parts: string[]): string {
  return join(app.getPath("userData"), ...parts);
}

export function getSharedDataPathFromEnv(...parts: string[]): string {
  const base = process.env.QUICKTAB_DATA_DIR || join(process.env.HOME || process.env.USERPROFILE || ".", ".quicktab-ai");
  return join(base, ...parts);
}
