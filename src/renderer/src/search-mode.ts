export type SearchMode = "all" | "tabs" | "bookmarks" | "history";

export const SEARCH_MODE_ORDER: SearchMode[] = ["all", "tabs", "bookmarks", "history"];

export function cycleSearchMode(mode: SearchMode, delta: -1 | 1): SearchMode {
  const index = SEARCH_MODE_ORDER.indexOf(mode);
  const nextIndex = (index + delta + SEARCH_MODE_ORDER.length) % SEARCH_MODE_ORDER.length;
  return SEARCH_MODE_ORDER[nextIndex] ?? "all";
}
