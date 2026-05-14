import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { redactUrl } from "./url.js";

export class Logger {
  constructor(private readonly logPath: string) {}

  async info(message: string, details?: Record<string, unknown>): Promise<void> {
    await this.write("info", message, details);
  }

  async warn(message: string, details?: Record<string, unknown>): Promise<void> {
    await this.write("warn", message, details);
  }

  async error(message: string, details?: Record<string, unknown>): Promise<void> {
    await this.write("error", message, details);
  }

  private async write(level: "info" | "warn" | "error", message: string, details?: Record<string, unknown>): Promise<void> {
    await mkdir(dirname(this.logPath), { recursive: true });
    const safeDetails = JSON.stringify(details ?? {}, (_key, value) => {
      if (typeof value === "string" && /^https?:\/\//i.test(value)) return redactUrl(value);
      return value;
    });
    await appendFile(this.logPath, `${JSON.stringify({ ts: Date.now(), level, message, details: JSON.parse(safeDetails) })}\n`, "utf8");
  }
}
