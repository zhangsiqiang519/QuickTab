import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/renderer/src/App.tsx"), "utf8");

describe("search clear action", () => {
  it("uses a dedicated clear action that restores compact search styling", () => {
    expect(source).toContain("function clearSearchInput(): void");
    expect(source).toContain("setCompact(true);");
    expect(source).toContain('window.quicktab.resizeWindow("compact")');
    expect(source).toContain("onClick={clearSearchInput}");
    expect(source).not.toContain('className="clearButton" onClick={() => setQuery("")}');
  });
});
