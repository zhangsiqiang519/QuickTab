import { describe, expect, it } from "vitest";
import { parseSafariBookmarksFromPlistXml, parseSafariHistoryRows } from "../src/main/services/safari-importer";

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

  it("converts Safari history rows into indexable history items", () => {
    const history = parseSafariHistoryRows(JSON.stringify([
      {
        url: "https://example.com/docs?ref=safari",
        title: "QuickTab Docs",
        visit_count: 7,
        visit_time: 801320400
      },
      {
        url: "file:///Users/me/private.html",
        title: "Local File",
        visit_count: 1,
        visit_time: 801320399
      },
      {
        url: "https://example.com/untitled",
        title: "",
        visit_count: 2,
        visit_time: 801320398
      }
    ]));

    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      browserId: "safari",
      profileId: "default",
      url: "https://example.com/docs?ref=safari",
      title: "QuickTab Docs",
      visitCount: 7
    });
    expect(history[0].lastVisitTime).toBe(1_779_627_600_000);
    expect(history[1]).toMatchObject({
      url: "https://example.com/untitled",
      title: "https://example.com/untitled",
      visitCount: 2
    });
  });
});
