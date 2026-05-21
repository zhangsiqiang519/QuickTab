import { describe, expect, it } from "vitest";
import { compareVersions, findPlatformDownloadUrl, getAllowedUpdateUrl, RELEASES_URL } from "../src/main/services/update-service";

describe("compareVersions", () => {
  it("compares semantic versions", () => {
    expect(compareVersions("0.1.4", "0.1.3")).toBeGreaterThan(0);
    expect(compareVersions("v0.2.0", "0.1.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("0.1.2", "0.1.3")).toBeLessThan(0);
  });

  it("selects the matching release asset for the current platform", () => {
    const release = {
      assets: [
        { name: "QuickTab-0.1.7-arm64.dmg", browser_download_url: "https://github.com/zhangsiqiang519/QuickTab/releases/download/v0.1.7/QuickTab.dmg" },
        { name: "QuickTab-0.1.7-x64.exe", browser_download_url: "https://github.com/zhangsiqiang519/QuickTab/releases/download/v0.1.7/QuickTab.exe" }
      ]
    };

    expect(findPlatformDownloadUrl(release, "darwin")).toBe("https://github.com/zhangsiqiang519/QuickTab/releases/download/v0.1.7/QuickTab.dmg");
    expect(findPlatformDownloadUrl(release, "win32")).toBe("https://github.com/zhangsiqiang519/QuickTab/releases/download/v0.1.7/QuickTab.exe");
  });

  it("rejects release assets outside the update allowlist", () => {
    const release = {
      assets: [
        { name: "QuickTab-0.1.7-arm64.dmg", browser_download_url: "https://example.com/mac.dmg" }
      ]
    };

    expect(findPlatformDownloadUrl(release, "darwin")).toBeUndefined();
  });

  it("allows only QuickTab GitHub release URLs", () => {
    expect(getAllowedUpdateUrl(RELEASES_URL)).toBe(`${RELEASES_URL}`);
    expect(getAllowedUpdateUrl("https://github.com/zhangsiqiang519/QuickTab/releases/download/v0.1.7/QuickTab.dmg")).toBe(
      "https://github.com/zhangsiqiang519/QuickTab/releases/download/v0.1.7/QuickTab.dmg"
    );
    expect(getAllowedUpdateUrl("http://github.com/zhangsiqiang519/QuickTab/releases")).toBeUndefined();
    expect(getAllowedUpdateUrl("https://example.com/QuickTab/releases")).toBeUndefined();
    expect(getAllowedUpdateUrl("not a url")).toBeUndefined();
  });
});
