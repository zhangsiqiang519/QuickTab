import { describe, expect, it } from "vitest";
import { parseSafariBookmarksFromPlistXml } from "../src/main/services/safari-importer";

describe("Safari bookmark importer", () => {
  it("parses nested Safari bookmark plist XML and preserves folder paths", () => {
    const bookmarks = parseSafariBookmarksFromPlistXml(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Children</key>
  <array>
    <dict>
      <key>Title</key>
      <string>Favorites</string>
      <key>Children</key>
      <array>
        <dict>
          <key>Title</key>
          <string>Work</string>
          <key>Children</key>
          <array>
            <dict>
              <key>Title</key>
              <string>QuickTab Docs</string>
              <key>URLString</key>
              <string>https://example.com/docs?ref=safari</string>
            </dict>
            <dict>
              <key>Title</key>
              <string>Local File</string>
              <key>URLString</key>
              <string>file:///Users/me/private.html</string>
            </dict>
          </array>
        </dict>
      </array>
    </dict>
  </array>
</dict>
</plist>`);

    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0]).toMatchObject({
      browserId: "safari",
      profileId: "default",
      title: "QuickTab Docs",
      folderPath: "Favorites / Work",
      url: "https://example.com/docs?ref=safari"
    });
  });
});
