import { BrowserId, BrowserSource, DataSourceState, OpenTabRef, SearchableItem, SearchResponse, SearchResult } from "../shared.js";
import { getDomain, getPathText, normalizeUrl } from "./url.js";
import { readJsonFile, updateJsonFile } from "./storage.js";
import { pinyin } from "pinyin-pro";

interface IndexDatabase {
  schemaVersion: number;
  sources: BrowserSource[];
  items: IndexedSearchableItem[];
  recentUsage: Record<string, number>;
  diagnosticEvents: DiagnosticEvent[];
}

type IndexedSearchableItem = SearchableItem & {
  searchText: string;
};

export interface DiagnosticEvent {
  id: string;
  level: "info" | "warn" | "error";
  code: string;
  message: string;
  timestamp: number;
}

export interface UpsertTabInput {
  browserId: SearchableItem["browserId"];
  profileId: string;
  windowId: number;
  tabId: number;
  url: string;
  title?: string;
  active?: boolean;
  lastActivatedAt?: number;
  activationMode?: "tab" | "url";
  groupTitle?: string;
  groupColor?: string;
}

export interface UpsertBookmarkInput {
  browserId: SearchableItem["browserId"];
  profileId: string;
  bookmarkId: string;
  url: string;
  title?: string;
  folderPath?: string;
  dateAdded?: number;
}

export interface UpsertHistoryInput {
  browserId: SearchableItem["browserId"];
  profileId: string;
  url: string;
  title?: string;
  lastVisitTime?: number;
  visitCount?: number;
  typedCount?: number;
}

export interface SearchFilters {
  tabs: boolean;
  bookmarks: boolean;
  history: boolean;
  browsers?: Partial<Record<BrowserId, boolean>>;
  dedupeStrategy?: "path" | "domain";
  ranking?: "relevance" | "frequency";
  preferredBrowser?: BrowserId | "system";
}

const EMPTY_DB: IndexDatabase = {
  schemaVersion: 1,
  sources: [],
  items: [],
  recentUsage: {},
  diagnosticEvents: []
};

const MAX_HISTORY_ITEMS_PER_PROFILE = 2_000;

export class IndexService {
  constructor(private readonly filePath: string) {}

  async upsertSource(source: BrowserSource): Promise<void> {
    await this.update((db) => ({
      ...db,
      sources: [...db.sources.filter((item) => sourceKey(item) !== sourceKey(source)), source]
    }));
  }

  async upsertTabs(tabs: UpsertTabInput[]): Promise<void> {
    await this.update((db) => {
      const incomingKeys = new Set(tabs.map((tab) => `open_tab:${tab.browserId}:${tab.profileId}:${tab.windowId}:${tab.tabId}`));
      const otherItems = db.items.filter((item) => {
        if (item.sourceType !== "open_tab") return true;
        return !incomingKeys.has(item.itemId);
      });
      return { ...db, items: [...otherItems, ...tabs.map(tabToSearchableItem)] };
    });
  }

  async replaceOpenTabs(browserId: BrowserId, profileId: string, tabs: UpsertTabInput[]): Promise<void> {
    await this.update((db) => {
      const retainedItems = db.items.filter((item) => {
        return !(item.sourceType === "open_tab" && item.browserId === browserId && item.profileId === profileId);
      });
      return { ...db, items: [...retainedItems, ...tabs.map(tabToSearchableItem)] };
    });
  }

  async removeTab(browserId: SearchableItem["browserId"], profileId: string, tabId: number): Promise<void> {
    await this.update((db) => ({
      ...db,
      items: db.items.filter((item) => {
        return !(item.sourceType === "open_tab" && item.browserId === browserId && item.profileId === profileId && item.openTabRef?.tabId === tabId);
      })
    }));
  }

  async upsertBookmarks(bookmarks: UpsertBookmarkInput[]): Promise<void> {
    await this.update((db) => {
      const ids = new Set(bookmarks.map((bookmark) => `bookmark:${bookmark.browserId}:${bookmark.profileId}:${bookmark.bookmarkId}`));
      const items = db.items.filter((item) => item.sourceType !== "bookmark" || !ids.has(item.itemId));
      items.push(...bookmarks.map(bookmarkToSearchableItem));
      return { ...db, items };
    });
  }

  async replaceBookmarks(browserId: BrowserId, profileId: string, bookmarks: UpsertBookmarkInput[]): Promise<void> {
    await this.update((db) => {
      const retainedItems = db.items.filter((item) => {
        return !(item.sourceType === "bookmark" && item.browserId === browserId && item.profileId === profileId);
      });
      return { ...db, items: [...retainedItems, ...bookmarks.map(bookmarkToSearchableItem)] };
    });
  }

  async upsertHistory(historyItems: UpsertHistoryInput[]): Promise<void> {
    await this.update((db) => {
      const next = new Map(db.items.map((item) => [item.itemId, item]));
      for (const history of historyItems) {
        const item = historyToSearchableItem(history);
        const existing = next.get(item.itemId);
        next.set(item.itemId, existing && existing.lastSeenAt > item.lastSeenAt ? existing : item);
      }
      return { ...db, items: pruneHistoryItems([...next.values()]) };
    });
  }

  async search(query: string, limit = 20, filters: SearchFilters = { tabs: true, bookmarks: true, history: true }): Promise<SearchResponse> {
    const started = performance.now();
    const db = await this.load();
    const prepared = prepareQuery(query);
    const sourceStatus = this.getSourceStatus(db.sources);
    const items = db.items.filter((item) => !item.deleted && sourceEnabled(item, filters));

    const openByUrl = buildOpenTabLookup(items, filters.preferredBrowser);

    const results = items
      .map((item) => scoreItem(item, prepared, db.recentUsage, openByUrl, filters.preferredBrowser))
      .filter((result): result is SearchResult => Boolean(result));

    const ranked = topRankedResults(results, limit, filters.ranking ?? "relevance");
    const deduped = dedupeResults(ranked, filters.dedupeStrategy ?? "path").slice(0, limit);
    return {
      query,
      elapsedMs: Math.round(performance.now() - started),
      results: deduped,
      sourceStatus
    };
  }

  async getRecent(limit = 8, filters: SearchFilters = { tabs: true, bookmarks: true, history: true }): Promise<SearchResult[]> {
    const db = await this.load();
    return db.items
      .filter((item) => !item.deleted && sourceEnabled(item, filters))
      .map((item) => toSearchResult(item, db.recentUsage[item.itemId] ? 30 : 1, "recent"))
      .sort((a, b) => (db.recentUsage[b.itemId] ?? b.lastSeenAt) - (db.recentUsage[a.itemId] ?? a.lastSeenAt))
      .slice(0, limit);
  }

  async findOpenTabByUrl(url: string, preferredBrowser?: BrowserId | "system"): Promise<SearchResult | undefined> {
    const db = await this.load();
    const normalizedUrl = normalizeUrl(url);
    const candidates = db.items
      .filter((item) => {
        return !item.deleted && item.sourceType === "open_tab" && item.normalizedUrl === normalizedUrl && Boolean(item.openTabRef);
      })
      .map((item) => toSearchResult(item, 120, "already open"))
      .sort((a, b) => {
        const browserDelta = browserPreferenceScore(b, preferredBrowser) - browserPreferenceScore(a, preferredBrowser);
        return browserDelta || (b.openTabRef?.lastActivatedAt ?? 0) - (a.openTabRef?.lastActivatedAt ?? 0);
      });
    return candidates[0];
  }

  async recordUsage(itemId: string): Promise<void> {
    await this.update((db) => ({
      ...db,
      recentUsage: { ...db.recentUsage, [itemId]: Date.now() }
    }));
  }

  async clearIndex(): Promise<void> {
    await this.update((db) => ({
      ...db,
      items: [],
      recentUsage: {}
    }));
  }

  async addDiagnostic(event: Omit<DiagnosticEvent, "id" | "timestamp">): Promise<void> {
    await this.update((db) => ({
      ...db,
      diagnosticEvents: [{ ...event, id: crypto.randomUUID(), timestamp: Date.now() }, ...db.diagnosticEvents].slice(0, 200)
    }));
  }

  async diagnostics(): Promise<{ sources: BrowserSource[]; itemCount: number; events: DiagnosticEvent[] }> {
    const db = await this.load();
    return {
      sources: db.sources,
      itemCount: db.items.filter((item) => !item.deleted).length,
      events: db.diagnosticEvents
    };
  }

  private getSourceStatus(sources: BrowserSource[]): Record<string, DataSourceState> {
    if (!sources.length) return { browser: "disconnected" };
    return Object.fromEntries(sources.map((source) => [`${source.browserId}:${source.profileId}`, source.status]));
  }

  private async load(): Promise<IndexDatabase> {
    const db = await readJsonFile<IndexDatabase>(this.filePath, EMPTY_DB);
    return normalizeDatabase(db);
  }

  private async update(update: (db: IndexDatabase) => IndexDatabase): Promise<IndexDatabase> {
    return updateJsonFile(this.filePath, EMPTY_DB, (db) => update(normalizeDatabase(db)));
  }
}

function normalizeDatabase(db: Partial<IndexDatabase>): IndexDatabase {
  return {
    schemaVersion: db.schemaVersion ?? 1,
    sources: db.sources ?? [],
    items: (db.items ?? []).map(ensureSearchText),
    recentUsage: db.recentUsage ?? {},
    diagnosticEvents: db.diagnosticEvents ?? []
  };
}

function ensureSearchText(item: SearchableItem | IndexedSearchableItem): IndexedSearchableItem {
  if ("searchText" in item && typeof item.searchText === "string" && item.searchText) {
    return item;
  }
  return {
    ...item,
    searchText: buildSearchText(item)
  };
}

function pruneHistoryItems(items: IndexedSearchableItem[]): IndexedSearchableItem[] {
  const historyByProfile = new Map<string, IndexedSearchableItem[]>();
  for (const item of items) {
    if (item.sourceType !== "history") continue;
    const key = `${item.browserId}:${item.profileId}`;
    const bucket = historyByProfile.get(key) ?? [];
    bucket.push(item);
    historyByProfile.set(key, bucket);
  }

  const removed = new Set<string>();
  for (const bucket of historyByProfile.values()) {
    if (bucket.length <= MAX_HISTORY_ITEMS_PER_PROFILE) continue;
    bucket.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    for (const item of bucket.slice(MAX_HISTORY_ITEMS_PER_PROFILE)) {
      removed.add(item.itemId);
    }
  }
  return removed.size ? items.filter((item) => !removed.has(item.itemId)) : items;
}

function sourceKey(source: BrowserSource): string {
  return `${source.browserId}:${source.profileId}`;
}

function browserPreferenceScore(item: SearchableItem, preferredBrowser?: BrowserId | "system"): number {
  if (!preferredBrowser || preferredBrowser === "system") return 0;
  return item.browserId === preferredBrowser ? 1 : 0;
}

function buildOpenTabLookup(items: IndexedSearchableItem[], preferredBrowser?: BrowserId | "system"): Map<string, IndexedSearchableItem> {
  const openByUrl = new Map<string, IndexedSearchableItem>();
  const sorted = items
    .filter((item) => item.sourceType === "open_tab")
    .sort((a, b) => {
      const activationDelta = activationPriority(b) - activationPriority(a);
      if (activationDelta) return activationDelta;
      const browserDelta = browserPreferenceScore(b, preferredBrowser) - browserPreferenceScore(a, preferredBrowser);
      return browserDelta || (b.openTabRef?.lastActivatedAt ?? 0) - (a.openTabRef?.lastActivatedAt ?? 0);
    });
  for (const item of sorted) {
    if (!openByUrl.has(item.normalizedUrl)) openByUrl.set(item.normalizedUrl, item);
  }
  return openByUrl;
}

function sourceEnabled(item: SearchableItem, filters: SearchFilters): boolean {
  if (filters.browsers && filters.browsers[item.browserId] === false) return false;
  if (item.sourceType === "open_tab") return filters.tabs;
  if (item.sourceType === "bookmark") return filters.bookmarks;
  return filters.history;
}

function tabToSearchableItem(tab: UpsertTabInput): IndexedSearchableItem {
  const normalizedUrl = normalizeUrl(tab.url);
  const now = Date.now();
  const openTabRef: OpenTabRef = {
    browserId: tab.browserId,
    profileId: tab.profileId,
    windowId: tab.windowId,
    tabId: tab.tabId,
    active: Boolean(tab.active),
    lastActivatedAt: tab.lastActivatedAt ?? now,
    activationMode: tab.activationMode,
    groupTitle: tab.groupTitle,
    groupColor: tab.groupColor
  };
  const pathText = getPathText(tab.url);
  return ensureSearchText({
    itemId: `open_tab:${tab.browserId}:${tab.profileId}:${tab.windowId}:${tab.tabId}`,
    sourceType: "open_tab",
    browserId: tab.browserId,
    profileId: tab.profileId,
    url: tab.url,
    normalizedUrl,
    domain: getDomain(tab.url),
    title: tab.title,
    displayTitle: tab.title?.trim() || getDomain(tab.url) || tab.url,
    subtitle: tab.groupTitle?.trim() || pathText,
    pathText,
    groupTitle: tab.groupTitle,
    groupColor: tab.groupColor,
    lastSeenAt: now,
    scoreSignals: { active: Boolean(tab.active), groupTitle: tab.groupTitle ?? "", groupColor: tab.groupColor ?? "" },
    openTabRef
  });
}

function bookmarkToSearchableItem(bookmark: UpsertBookmarkInput): IndexedSearchableItem {
  const normalizedUrl = normalizeUrl(bookmark.url);
  return ensureSearchText({
    itemId: `bookmark:${bookmark.browserId}:${bookmark.profileId}:${bookmark.bookmarkId}`,
    sourceType: "bookmark",
    browserId: bookmark.browserId,
    profileId: bookmark.profileId,
    url: bookmark.url,
    normalizedUrl,
    domain: getDomain(bookmark.url),
    title: bookmark.title,
    displayTitle: bookmark.title?.trim() || getDomain(bookmark.url) || bookmark.url,
    subtitle: bookmark.folderPath,
    pathText: getPathText(bookmark.url),
    folderPath: bookmark.folderPath,
    lastSeenAt: bookmark.dateAdded ?? Date.now(),
    scoreSignals: { folderPath: bookmark.folderPath ?? "" }
  });
}

function historyToSearchableItem(history: UpsertHistoryInput): IndexedSearchableItem {
  const normalizedUrl = normalizeUrl(history.url);
  return ensureSearchText({
    itemId: `history:${history.browserId}:${history.profileId}:${normalizedUrl}`,
    sourceType: "history",
    browserId: history.browserId,
    profileId: history.profileId,
    url: history.url,
    normalizedUrl,
    domain: getDomain(history.url),
    title: history.title,
    displayTitle: history.title?.trim() || getDomain(history.url) || history.url,
    subtitle: formatRelativeTime(history.lastVisitTime ?? Date.now()),
    pathText: getPathText(history.url),
    lastSeenAt: history.lastVisitTime ?? Date.now(),
    scoreSignals: {
      visitCount: history.visitCount ?? 0,
      typedCount: history.typedCount ?? 0
    }
  });
}

function prepareQuery(query: string): string[] {
  const trimmed = query.trim().toLowerCase().slice(0, 256);
  if (!trimmed) return [];
  return trimmed.split(/[\s/._:-]+/).filter(Boolean);
}

function scoreItem(
  item: IndexedSearchableItem,
  tokens: string[],
  recentUsage: Record<string, number>,
  openByUrl: Map<string, IndexedSearchableItem>,
  preferredBrowser?: BrowserId | "system"
): SearchResult | null {
  const haystack = item.searchText;
  if (tokens.length && !tokens.every((token) => haystack.includes(token))) return null;

  let score = item.sourceType === "open_tab" ? 100 : item.sourceType === "bookmark" ? 70 : 40;
  score += relevanceScore(item, tokens);
  const query = tokens.join(" ");
  if (!tokens.length) score = 0;
  if (recentUsage[item.itemId]) score += 30;
  score += browserPreferenceScore(item, preferredBrowser) * 18;
  if (item.sourceType === "history") score += Math.min(Number(item.scoreSignals.visitCount ?? 0), 15);
  score += recencyBoost(item.lastSeenAt);

  const matchingOpenTab = openByUrl.get(item.normalizedUrl);
  if (item.sourceType !== "open_tab" && matchingOpenTab?.openTabRef) {
    score += 35;
    return {
      ...toSearchResult(item, score, "already open"),
      sourceType: "open_tab",
      itemId: matchingOpenTab.itemId,
      openTabRef: matchingOpenTab.openTabRef
    };
  }
  return toSearchResult(item, score, tokens.length ? "query" : "recent");
}

function toSearchResult(item: IndexedSearchableItem, score: number, matchReason: string): SearchResult {
  const { searchText: _searchText, ...result } = item;
  return { ...result, score, matchReason };
}

function compareResults(a: SearchResult, b: SearchResult, ranking: "relevance" | "frequency"): number {
  if (ranking === "frequency") {
    return sourcePriority(b) - sourcePriority(a) || frequencyScore(b) - frequencyScore(a) || b.score - a.score || b.lastSeenAt - a.lastSeenAt;
  }
  return b.score - a.score || sourcePriority(b) - sourcePriority(a) || frequencyScore(b) - frequencyScore(a) || b.lastSeenAt - a.lastSeenAt;
}

function topRankedResults(results: SearchResult[], limit: number, ranking: "relevance" | "frequency"): SearchResult[] {
  const candidateLimit = Math.max(500, Math.min(2_000, limit * 50));
  if (results.length <= candidateLimit) {
    return results.sort((a, b) => compareResults(a, b, ranking));
  }

  const top: SearchResult[] = [];
  for (const result of results) {
    const insertAt = top.findIndex((existing) => compareResults(result, existing, ranking) < 0);
    if (insertAt === -1) {
      if (top.length < candidateLimit) top.push(result);
      continue;
    }
    top.splice(insertAt, 0, result);
    if (top.length > candidateLimit) top.pop();
  }
  return top;
}

function sourcePriority(item: SearchResult): number {
  if (item.sourceType === "open_tab") return 3;
  if (item.sourceType === "bookmark") return 2;
  return 1;
}

function frequencyScore(item: SearchResult): number {
  const visitCount = Number(item.scoreSignals.visitCount ?? 0);
  const typedCount = Number(item.scoreSignals.typedCount ?? 0);
  const activeBoost = item.openTabRef?.active ? 20 : 0;
  return visitCount + typedCount * 5 + activeBoost;
}

function relevanceScore(item: SearchableItem, tokens: string[]): number {
  if (!tokens.length) return 0;
  const title = item.displayTitle.toLowerCase();
  const domain = item.domain.toLowerCase();
  const path = (item.pathText ?? "").toLowerCase();
  const folder = (item.folderPath ?? "").toLowerCase();
  const group = (item.groupTitle ?? "").toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (title === token) score += 120;
    else if (title.startsWith(token)) score += 100;
    else if (wordStartsWith(title, token)) score += 76;
    else if (title.includes(token)) score += 58;

    if (domain === token) score += 105;
    else if (domain.startsWith(token)) score += 88;
    else if (domainSegmentStartsWith(domain, token)) score += 70;
    else if (domain.includes(token)) score += 42;

    if (path.startsWith(token)) score += 32;
    else if (wordStartsWith(path, token)) score += 24;
    else if (path.includes(token)) score += 12;

    if (folder.startsWith(token)) score += 18;
    else if (wordStartsWith(folder, token)) score += 12;

    if (group === token) score += 90;
    else if (group.startsWith(token)) score += 72;
    else if (wordStartsWith(group, token)) score += 54;
    else if (group.includes(token)) score += 36;
  }
  return score;
}

function wordStartsWith(value: string, token: string): boolean {
  return value.split(/[\s/._:-]+/).some((part) => part.startsWith(token));
}

function domainSegmentStartsWith(domain: string, token: string): boolean {
  return domain.split(".").some((part) => part.startsWith(token));
}

function buildSearchText(item: SearchableItem): string {
  const fields = [item.displayTitle, item.domain, item.pathText, item.folderPath, item.groupTitle, item.url].filter(Boolean);
  const raw = fields.join(" ").toLowerCase();
  const pinyinText = fields.map((field) => toPinyinText(field ?? "")).filter(Boolean).join(" ");
  return `${raw} ${pinyinText}`.trim();
}

function toPinyinText(value: string): string {
  if (!/[\u3400-\u9fff]/.test(value)) return "";
  const full = pinyin(value, { toneType: "none", type: "array", nonZh: "removed" }).join(" ").toLowerCase();
  const compact = full.replace(/\s+/g, "");
  return `${full} ${compact}`;
}

function dedupeResults(results: SearchResult[], strategy: "path" | "domain"): SearchResult[] {
  const byUrl = new Map<string, SearchResult>();
  for (const result of results) {
    const key = strategy === "domain" ? result.domain : dedupePathKey(result.normalizedUrl);
    const existing = byUrl.get(key);
    if (!existing || shouldReplaceDedupeResult(existing, result, strategy)) {
      byUrl.set(key, { ...result, duplicateCount: existing ? (existing.duplicateCount ?? 1) + 1 : result.duplicateCount });
    } else {
      existing.duplicateCount = (existing.duplicateCount ?? 1) + 1;
    }
  }
  return [...byUrl.values()];
}

function shouldReplaceDedupeResult(existing: SearchResult, candidate: SearchResult, strategy: "path" | "domain"): boolean {
  const sameConcretePage = strategy === "path" || existing.normalizedUrl === candidate.normalizedUrl;
  if (sameConcretePage) {
    const activationDelta = activationPriority(candidate) - activationPriority(existing);
    if (activationDelta) return activationDelta > 0;
  }
  return candidate.score > existing.score;
}

function activationPriority(item: SearchableItem): number {
  if (!item.openTabRef) return 0;
  return item.openTabRef.activationMode === "url" ? 1 : 2;
}

function dedupePathKey(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return rawUrl.split("?")[0];
  }
}

function recencyBoost(timestamp: number): number {
  const ageHours = Math.max(0, (Date.now() - timestamp) / 3_600_000);
  if (ageHours < 24) return 20;
  if (ageHours < 24 * 7) return 12;
  if (ageHours < 24 * 30) return 5;
  return 0;
}

function formatRelativeTime(timestamp: number): string {
  const ageDays = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (ageDays <= 0) return "today";
  if (ageDays === 1) return "yesterday";
  return `${ageDays} days ago`;
}
