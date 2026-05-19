import { describe, expect, it } from "vitest";
import { cycleSearchMode } from "../src/renderer/src/search-mode";

describe("search mode cycling", () => {
  it("cycles to the next mode from left to right", () => {
    expect(cycleSearchMode("all", 1)).toBe("tabs");
    expect(cycleSearchMode("history", 1)).toBe("all");
  });

  it("cycles to the previous mode from right to left", () => {
    expect(cycleSearchMode("all", -1)).toBe("history");
    expect(cycleSearchMode("bookmarks", -1)).toBe("library");
  });
});
