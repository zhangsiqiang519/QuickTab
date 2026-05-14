import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IndexService } from "../src/main/services/index-service";

let dir: string;
let service: IndexService;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "quicktab-test-"));
  service = new IndexService(join(dir, "index.json"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("IndexService", () => {
  it("prioritizes open tabs over matching bookmarks", async () => {
    await service.upsertTabs([
      {
        browserId: "chrome",
        profileId: "default",
        windowId: 1,
        tabId: 10,
        url: "https://notion.so/project-plan",
        title: "Notion Project Plan",
        active: true,
        lastActivatedAt: Date.now()
      }
    ]);
    await service.upsertBookmarks([
      {
        browserId: "chrome",
        profileId: "default",
        bookmarkId: "b1",
        url: "https://notion.so/project-plan",
        title: "Notion Bookmark",
        folderPath: "Work"
      }
    ]);

    const response = await service.search("notion project");
    expect(response.results[0].sourceType).toBe("open_tab");
    expect(response.results[0].openTabRef?.tabId).toBe(10);
  });

  it("finds an already open tab by URL before opening a new URL", async () => {
    await service.upsertTabs([
      {
        browserId: "chrome",
        profileId: "default",
        windowId: 1,
        tabId: 10,
        url: "https://example.com/docs?from=tab",
        title: "Docs",
        lastActivatedAt: 100
      }
    ]);

    const openTab = await service.findOpenTabByUrl("https://example.com/docs?from=tab");
    expect(openTab?.openTabRef?.tabId).toBe(10);
    expect(openTab?.sourceType).toBe("open_tab");
  });

  it("prefers the default browser open tab when the same URL is open in multiple browsers", async () => {
    await service.upsertTabs([
      {
        browserId: "edge",
        profileId: "default",
        windowId: 1,
        tabId: 20,
        url: "https://example.com/docs",
        title: "Docs in Edge",
        lastActivatedAt: 200
      },
      {
        browserId: "chrome",
        profileId: "default",
        windowId: 2,
        tabId: 30,
        url: "https://example.com/docs",
        title: "Docs in Chrome",
        lastActivatedAt: 100
      }
    ]);
    await service.upsertBookmarks([
      {
        browserId: "chrome",
        profileId: "default",
        bookmarkId: "docs",
        url: "https://example.com/docs",
        title: "Docs Bookmark"
      }
    ]);

    const response = await service.search("docs", 20, { tabs: true, bookmarks: true, history: true, preferredBrowser: "chrome" });
    expect(response.results[0].sourceType).toBe("open_tab");
    expect(response.results[0].browserId).toBe("chrome");
    expect(response.results[0].openTabRef?.tabId).toBe(30);
  });

  it("prioritizes title and domain prefix matches over weak URL parameter matches", async () => {
    await service.upsertTabs([
      {
        browserId: "safari",
        profileId: "macos-automation",
        windowId: 1,
        tabId: 1,
        url: "https://aiops.yunzhangfang.com/admin?redirect=deep-link",
        title: "服务管理平台",
        lastActivatedAt: 200
      },
      {
        browserId: "safari",
        profileId: "macos-automation",
        windowId: 1,
        tabId: 2,
        url: "https://chat.deepseek.com/a/chat/some-id",
        title: "DeepSeek",
        lastActivatedAt: 100
      }
    ]);

    const response = await service.search("deep", 20, { tabs: true, bookmarks: true, history: true, preferredBrowser: "safari" });
    expect(response.results[0].displayTitle).toBe("DeepSeek");
    expect(response.results[0].domain).toBe("chat.deepseek.com");
  });

  it("searches Chinese bookmark titles", async () => {
    await service.upsertBookmarks([
      {
        browserId: "edge",
        profileId: "default",
        bookmarkId: "b2",
        url: "https://example.com/admin",
        title: "后台管理",
        folderPath: "工作"
      }
    ]);

    const response = await service.search("后台");
    expect(response.results).toHaveLength(1);
    expect(response.results[0].browserId).toBe("edge");
  });

  it("searches Chinese titles by pinyin", async () => {
    await service.upsertBookmarks([
      {
        browserId: "edge",
        profileId: "default",
        bookmarkId: "pinyin",
        url: "https://example.com/admin",
        title: "后台管理",
        folderPath: "工作"
      }
    ]);

    const response = await service.search("houtai guanli");
    expect(response.results).toHaveLength(1);
    expect(response.results[0].displayTitle).toBe("后台管理");
  });

  it("can rank matches by frequency instead of similarity", async () => {
    await service.upsertHistory([
      {
        browserId: "chrome",
        profileId: "default",
        url: "https://example.com/rare-admin",
        title: "Admin precise rare",
        visitCount: 1,
        typedCount: 0
      },
      {
        browserId: "chrome",
        profileId: "default",
        url: "https://example.com/frequent-admin",
        title: "Admin frequent",
        visitCount: 200,
        typedCount: 3
      }
    ]);

    const response = await service.search("admin", 20, { tabs: true, bookmarks: true, history: true, ranking: "frequency" });
    expect(response.results[0].displayTitle).toBe("Admin frequent");
  });

  it("prioritizes bookmarks before history when both match", async () => {
    await service.upsertBookmarks([
      {
        browserId: "chrome",
        profileId: "default",
        bookmarkId: "bookmark-admin",
        url: "https://example.com/bookmark-admin",
        title: "Admin bookmark"
      }
    ]);
    await service.upsertHistory([
      {
        browserId: "chrome",
        profileId: "default",
        url: "https://example.com/history-admin",
        title: "Admin history",
        visitCount: 500,
        typedCount: 20
      }
    ]);

    const response = await service.search("admin", 20, { tabs: true, bookmarks: true, history: true, ranking: "frequency" });
    expect(response.results[0].sourceType).toBe("bookmark");
  });

  it("removes closed tabs from open tab results", async () => {
    await service.upsertTabs([
      {
        browserId: "chrome",
        profileId: "default",
        windowId: 1,
        tabId: 99,
        url: "https://example.com/a",
        title: "Example A"
      }
    ]);
    await service.removeTab("chrome", "default", 99);
    const response = await service.search("example");
    expect(response.results).toHaveLength(0);
  });

  it("replaces Safari open tab snapshots so closed Safari tabs disappear", async () => {
    await service.replaceOpenTabs("safari", "default", [
      {
        browserId: "safari",
        profileId: "default",
        windowId: 10,
        tabId: 1,
        url: "https://example.com/old",
        title: "Old"
      }
    ]);
    await service.replaceOpenTabs("safari", "default", [
      {
        browserId: "safari",
        profileId: "default",
        windowId: 10,
        tabId: 2,
        url: "https://example.com/new",
        title: "New"
      }
    ]);

    const response = await service.search("example", 20, { tabs: true, bookmarks: true, history: true, preferredBrowser: "safari" });
    expect(response.results).toHaveLength(1);
    expect(response.results[0].url).toBe("https://example.com/new");
    expect(response.results[0].sourceType).toBe("open_tab");
  });

  it("honors disabled data source filters", async () => {
    await service.upsertBookmarks([
      {
        browserId: "chrome",
        profileId: "default",
        bookmarkId: "b3",
        url: "https://docs.example.com",
        title: "Docs"
      }
    ]);
    await service.upsertHistory([
      {
        browserId: "chrome",
        profileId: "default",
        url: "https://docs.example.com/history",
        title: "Docs History",
        visitCount: 4
      }
    ]);

    const response = await service.search("docs", 20, { tabs: true, bookmarks: false, history: true });
    expect(response.results.every((item) => item.sourceType !== "bookmark")).toBe(true);
    expect(response.results.some((item) => item.sourceType === "history")).toBe(true);
  });

  it("dedupes by concrete path while preserving different paths", async () => {
    await service.upsertBookmarks([
      {
        browserId: "chrome",
        profileId: "default",
        bookmarkId: "same-path-a",
        url: "https://example.com/docs?a=1",
        title: "Docs A"
      },
      {
        browserId: "chrome",
        profileId: "default",
        bookmarkId: "same-path-b",
        url: "https://example.com/docs?b=2",
        title: "Docs B"
      },
      {
        browserId: "chrome",
        profileId: "default",
        bookmarkId: "other-path",
        url: "https://example.com/admin",
        title: "Docs Admin"
      }
    ]);

    const pathResponse = await service.search("docs", 20, { tabs: true, bookmarks: true, history: true, dedupeStrategy: "path" });
    expect(pathResponse.results).toHaveLength(2);
    expect(pathResponse.results.some((item) => item.normalizedUrl.includes("/admin"))).toBe(true);

    const domainResponse = await service.search("docs", 20, { tabs: true, bookmarks: true, history: true, dedupeStrategy: "domain" });
    expect(domainResponse.results).toHaveLength(1);
  });
});
