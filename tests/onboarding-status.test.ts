import { describe, expect, it } from "vitest";
import type { BrowserSource } from "../src/main/shared";
import { selectBrowserExtensionSource } from "../src/main/services/onboarding-status";

function source(overrides: Partial<BrowserSource>): BrowserSource {
  return {
    browserId: "chrome",
    browserName: "Google Chrome",
    profileId: "default",
    extensionId: "extension-id",
    extensionVersion: "1.0.0",
    connected: true,
    permissions: { tabs: true, bookmarks: true, history: true },
    status: "connected",
    lastConnectedAt: 1,
    ...overrides
  };
}

describe("selectBrowserExtensionSource", () => {
  it("does not treat macOS Automation tab sources as browser extension connections", () => {
    const selected = selectBrowserExtensionSource([
      source({
        browserId: "chrome",
        profileId: "macos-automation",
        extensionId: "macos-automation",
        permissions: { tabs: true, bookmarks: false, history: false }
      })
    ], "chrome");

    expect(selected).toBeUndefined();
  });

  it("selects a real connected Chrome or Edge extension source", () => {
    const selected = selectBrowserExtensionSource([
      source({ browserId: "chrome", profileId: "default", extensionId: "hibhhgiimgddhcklioipmdgblkganmfp" })
    ], "chrome");

    expect(selected?.extensionId).toBe("hibhhgiimgddhcklioipmdgblkganmfp");
  });
});
