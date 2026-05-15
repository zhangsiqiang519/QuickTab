import { describe, expect, it } from "vitest";
import { compareVersions, findPlatformDownloadUrl } from "../src/main/services/update-service";

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
        { name: "QuickTab-0.1.7-arm64.dmg", browser_download_url: "https://example.com/mac.dmg" },
        { name: "QuickTab-0.1.7-x64.exe", browser_download_url: "https://example.com/win.exe" }
      ]
    };

    expect(findPlatformDownloadUrl(release, "darwin")).toBe("https://example.com/mac.dmg");
    expect(findPlatformDownloadUrl(release, "win32")).toBe("https://example.com/win.exe");
  });
});
