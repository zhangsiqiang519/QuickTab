import { describe, expect, it, vi } from "vitest";
import { openBrowserUrlWithFallback } from "../src/main/services/browser-launch";

describe("browser launch", () => {
  it("launches Edge directly on Windows before falling back", async () => {
    const execFileAsync = vi.fn().mockResolvedValue(undefined);
    const openExternal = vi.fn().mockResolvedValue(undefined);

    await openBrowserUrlWithFallback({
      platform: "win32",
      browserId: "edge",
      appName: "Microsoft Edge",
      url: "edge://extensions",
      execFileAsync,
      openExternal
    });

    expect(execFileAsync).toHaveBeenCalledWith("msedge.exe", ["edge://extensions"], { timeout: 2_000 });
    expect(openExternal).not.toHaveBeenCalled();
  });

  it("falls back to shell.openExternal when direct Windows launch fails", async () => {
    const execFileAsync = vi.fn().mockRejectedValue(new Error("missing"));
    const openExternal = vi.fn().mockResolvedValue(undefined);

    await openBrowserUrlWithFallback({
      platform: "win32",
      browserId: "chrome",
      appName: "Google Chrome",
      url: "chrome://extensions",
      execFileAsync,
      openExternal
    });

    expect(execFileAsync).toHaveBeenCalledWith("chrome.exe", ["chrome://extensions"], { timeout: 2_000 });
    expect(openExternal).toHaveBeenCalledWith("chrome://extensions");
  });
});
