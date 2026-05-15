import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execFile: vi.fn()
}));

vi.mock("node:child_process", () => ({
  execFile: mocks.execFile
}));

const {
  activateMacBrowserTab,
  activateSafariTab,
  parseMacBrowserTabs,
  parseSafariTabs,
  syncSafariOpenTabs
} = await import("../src/main/services/safari-tabs");

describe("Safari tab bridge", () => {
  it("parses valid Safari tabs and drops unsupported URLs", () => {
    const tabs = parseSafariTabs(JSON.stringify([
      {
        browserId: "safari",
        profileId: "macos-automation",
        windowId: 101,
        tabId: 1,
        url: "https://example.com/docs",
        title: "Docs",
        active: true,
        lastActivatedAt: 100
      },
      {
        browserId: "safari",
        profileId: "macos-automation",
        windowId: 101,
        tabId: 2,
        url: "safari-extension://internal",
        title: "Internal"
      }
    ]));

    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toMatchObject({
      browserId: "safari",
      profileId: "macos-automation",
      windowId: 101,
      tabId: 1,
      url: "https://example.com/docs"
    });
  });

  it.runIf(process.platform === "darwin")("runs the Safari activation script with osascript -e", async () => {
    mocks.execFile.mockImplementation((_command, _args, _options, callback) => callback(null, "", ""));

    await activateSafariTab({
      browserId: "safari",
      profileId: "default",
      windowId: 101,
      tabId: 2,
      active: false,
      lastActivatedAt: 100
    });

    expect(mocks.execFile).toHaveBeenCalledWith(
      "osascript",
      expect.arrayContaining(["-e", expect.stringContaining("tell application \"Safari\""), "Safari", "101", "2", ""]),
      expect.objectContaining({ timeout: 2_500 }),
      expect.any(Function)
    );
  });

  it.runIf(process.platform === "darwin")("guards against Safari windows with null tabs", async () => {
    mocks.execFile.mockImplementation((_command, _args, _options, callback) => callback(null, { stdout: "[]", stderr: "" }));

    await syncSafariOpenTabs({
      replaceOpenTabs: vi.fn(),
      upsertSource: vi.fn()
    } as never);

    expect(mocks.execFile).toHaveBeenCalledWith(
      "osascript",
      expect.arrayContaining(["-l", "JavaScript", "-e", expect.stringContaining("win.tabs() || []")]),
      expect.objectContaining({ timeout: 1_500 }),
      expect.any(Function)
    );
  });

  it("parses Chrome automation tabs", () => {
    const tabs = parseMacBrowserTabs(JSON.stringify([
      {
        browserId: "chrome",
        profileId: "macos-automation",
        windowId: 12,
        tabId: 3,
        url: "https://example.com/chrome",
        title: "Chrome",
        active: false,
        lastActivatedAt: 100
      }
    ]), "chrome");

    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toMatchObject({
      browserId: "chrome",
      profileId: "macos-automation",
      windowId: 12,
      tabId: 3
    });
  });

  it.runIf(process.platform === "darwin")("runs the Chrome activation script with osascript -e", async () => {
    mocks.execFile.mockImplementation((_command, _args, _options, callback) => callback(null, "", ""));

    await activateMacBrowserTab("chrome", {
      browserId: "chrome",
      profileId: "macos-automation",
      windowId: 101,
      tabId: 2,
      active: false,
      lastActivatedAt: 100
    }, "https://example.com/chrome");

    expect(mocks.execFile).toHaveBeenCalledWith(
      "osascript",
      expect.arrayContaining(["-e", expect.stringContaining("active tab index"), "Google Chrome", "101", "2", "https://example.com/chrome"]),
      expect.objectContaining({ timeout: 2_500 }),
      expect.any(Function)
    );
  });
});
