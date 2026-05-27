import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/renderer/src/styles.css"), "utf8");

function cssBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  return match?.[1] ?? "";
}

function lastCssBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, "g"))];
  return matches.at(-1)?.[1] ?? "";
}

describe("search results layout css", () => {
  it("fixes the result-mode header rows so input state cannot squeeze mode pills", () => {
    const workspace = cssBlock(".hasResults .workspace");
    const assistantBar = cssBlock(".hasResults .assistantBar");
    const contextStrip = cssBlock(".hasResults .contextStrip");
    const searchInput = cssBlock(".searchBox input");

    expect(workspace).toContain("grid-template-rows: var(--spotlight-search-height) 42px minmax(0, 1fr)");
    expect(assistantBar).toContain("height: var(--spotlight-search-height)");
    expect(assistantBar).toContain("max-height: var(--spotlight-search-height)");
    expect(contextStrip).toContain("height: 42px");
    expect(contextStrip).toContain("max-height: 42px");
    expect(contextStrip).toContain("overflow: hidden");
    expect(searchInput).toContain("line-height: 1");
  });

  it("keeps settings sheet controls on a visible surface instead of a transparent search input", () => {
    const settingsSearchBox = cssBlock(".sheetOpen .searchBox");
    const sheetBackdrop = lastCssBlock(".sheetBackdrop");
    const settingsPanel = lastCssBlock(".settingsSheet .panel");

    expect(settingsSearchBox).toContain("background: light-dark");
    expect(settingsSearchBox).not.toContain("background: transparent");
    expect(sheetBackdrop).toContain("background: light-dark");
    expect(sheetBackdrop).not.toContain("background: transparent");
    expect(settingsPanel).toContain("0.96");
  });
});
