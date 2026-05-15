import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { parse } from "plist";
import { BrowserSource } from "../shared.js";
import { IndexService, UpsertBookmarkInput } from "./index-service.js";

const execFileAsync = promisify(execFile);

interface SafariBookmarkNode {
  Title?: string;
  URLString?: string;
  Children?: SafariBookmarkNode[];
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
    permissions: { bookmarks: true, tabs: false, history: false },
    status: "connected",
    lastConnectedAt: Date.now()
  };
  await index.upsertSource(source);
  await index.replaceBookmarks("safari", "default", bookmarks);
  return bookmarks.length;
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
