import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { parse } from "plist";
import { BrowserSource } from "../shared.js";
import { IndexService, UpsertBookmarkInput, UpsertHistoryInput } from "./index-service.js";

const execFileAsync = promisify(execFile);
const SAFARI_HISTORY_EPOCH_OFFSET_SECONDS = 978_307_200;
const DEFAULT_HISTORY_DAYS = 60;
const DEFAULT_HISTORY_LIMIT = 2_000;
function makeSafariHistoryQuery(minVisitTime: number, limit: number): string {
  return `
SELECT hi.url AS url,
       COALESCE(NULLIF(latest.title, ''), hi.url) AS title,
       hi.visit_count AS visit_count,
       latest.visit_time AS visit_time
FROM history_items hi
JOIN (
  SELECT history_item,
         title,
         visit_time,
         ROW_NUMBER() OVER (PARTITION BY history_item ORDER BY visit_time DESC) AS row_number
  FROM history_visits
  WHERE load_successful = 1
) latest ON latest.history_item = hi.id AND latest.row_number = 1
WHERE hi.url LIKE 'http%'
  AND latest.visit_time >= ${Number(minVisitTime)}
ORDER BY latest.visit_time DESC
LIMIT ${Math.max(1, Math.floor(limit))};
`;
}

interface SafariBookmarkNode {
  Title?: string;
  URLString?: string;
  Children?: SafariBookmarkNode[];
}

interface SafariHistoryRow {
  url?: unknown;
  title?: unknown;
  visit_count?: unknown;
  visit_time?: unknown;
}

export async function importSafariBookmarks(index: IndexService): Promise<number> {
  if (platform() !== "darwin") return 0;
  const plistPath = join(homedir(), "Library", "Safari", "Bookmarks.plist");
  await access(plistPath);
  const { stdout } = await execFileAsync("plutil", ["-convert", "xml1", "-o", "-", plistPath], { maxBuffer: 50 * 1024 * 1024 });
  const bookmarks = parseSafariBookmarksFromPlistXml(stdout);
  const source: BrowserSource = {
    browserId: "safari",
    browserName: "Safari",
    profileId: "default",
    profileName: "Default",
    extensionId: "local-safari-bookmarks",
    extensionVersion: "0.1.0",
    connected: true,
    permissions: { bookmarks: true, tabs: false, history: true },
    status: "connected",
    lastConnectedAt: Date.now()
  };
  await index.upsertSource(source);
  await index.replaceBookmarks("safari", "default", bookmarks);
  return bookmarks.length;
}

export async function importSafariHistory(index: IndexService, options: { days?: number; limit?: number } = {}): Promise<number> {
  if (platform() !== "darwin") return 0;
  const historyPath = join(homedir(), "Library", "Safari", "History.db");
  await access(historyPath);
  const days = options.days ?? DEFAULT_HISTORY_DAYS;
  const limit = options.limit ?? DEFAULT_HISTORY_LIMIT;
  const minVisitTime = Date.now() / 1000 - SAFARI_HISTORY_EPOCH_OFFSET_SECONDS - days * 24 * 60 * 60;
  const { stdout } = await execFileAsync("sqlite3", ["-json", historyPath, makeSafariHistoryQuery(minVisitTime, limit)], {
    timeout: 2_000,
    maxBuffer: 10 * 1024 * 1024
  });
  const history = parseSafariHistoryRows(stdout);
  const source: BrowserSource = {
    browserId: "safari",
    browserName: "Safari",
    profileId: "default",
    profileName: "Default",
    extensionId: "local-safari-history",
    extensionVersion: "0.1.0",
    connected: true,
    permissions: { bookmarks: true, tabs: false, history: true },
    status: "connected",
    lastConnectedAt: Date.now()
  };
  await index.upsertSource(source);
  await index.upsertHistory(history);
  return history.length;
}

export function parseSafariBookmarksFromPlistXml(xml: string): UpsertBookmarkInput[] {
  const root = parse(xml) as SafariBookmarkNode;
  const bookmarks: UpsertBookmarkInput[] = [];
  collectSafariBookmarks(root.Children ?? [], [], bookmarks);
  return bookmarks;
}

function collectSafariBookmarks(nodes: SafariBookmarkNode[], folders: string[], out: UpsertBookmarkInput[]): void {
  for (const node of nodes) {
    const title = node.Title?.trim();
    if (node.URLString?.startsWith("http")) {
      out.push({
        browserId: "safari",
        profileId: "default",
        bookmarkId: `safari:${node.URLString}:${folders.join("/")}:${title ?? ""}`,
        url: node.URLString,
        title,
        folderPath: folders.filter(Boolean).join(" / "),
        dateAdded: Date.now()
      });
    }
    if (node.Children?.length) {
      collectSafariBookmarks(node.Children, title ? [...folders, title] : folders, out);
    }
  }
}

export function parseSafariHistoryRows(rawOutput: string): UpsertHistoryInput[] {
  const rows = JSON.parse(rawOutput || "[]") as SafariHistoryRow[];
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((row) => {
    const url = typeof row.url === "string" ? row.url.trim() : "";
    const visitTime = typeof row.visit_time === "number" ? row.visit_time : Number(row.visit_time);
    if (!url.startsWith("http") || !Number.isFinite(visitTime)) return [];

    const title = typeof row.title === "string" && row.title.trim() ? row.title.trim() : url;
    const visitCount = typeof row.visit_count === "number" ? row.visit_count : Number(row.visit_count);
    return [{
      browserId: "safari",
      profileId: "default",
      url,
      title,
      lastVisitTime: Math.round((visitTime + SAFARI_HISTORY_EPOCH_OFFSET_SECONDS) * 1000),
      visitCount: Number.isFinite(visitCount) ? visitCount : 0,
      typedCount: 0
    }];
  });
}
