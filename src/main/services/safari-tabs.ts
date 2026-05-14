import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BrowserId, OpenTabRef } from "../shared.js";
import { IndexService, UpsertTabInput } from "./index-service.js";
import { isAllowedUrl } from "./url.js";

const execFileAsync = promisify(execFile);
const AUTOMATION_PROFILE_ID = "macos-automation";

const MAC_BROWSER_APPS: Partial<Record<BrowserId, string>> = {
  chrome: "Google Chrome",
  edge: "Microsoft Edge",
  safari: "Safari"
};

const MAC_BROWSER_TABS_SCRIPT = `
function run(argv) {
  const appName = argv[0];
  const browserId = argv[1];
  const Browser = Application(appName);
  if (!Browser.running()) return "[]";

  const now = Date.now();
  const results = [];
  const windows = Browser.windows();

  for (let windowIndex = 0; windowIndex < windows.length; windowIndex += 1) {
    const win = windows[windowIndex];
    const windowId = Number(win.id());
    let activeUrl = "";
    try {
      const activeTab = browserId === "safari" ? win.currentTab() : win.activeTab();
      activeUrl = String(activeTab.url() || "");
    } catch (_) {}

    const tabs = win.tabs();
    for (let tabIndex = 0; tabIndex < tabs.length; tabIndex += 1) {
      const tab = tabs[tabIndex];
      const url = String(tab.url() || "");
      if (!url) continue;
      const active = activeUrl === url;
      results.push({
        browserId: browserId,
        profileId: "macos-automation",
        windowId: windowId,
        tabId: tabIndex + 1,
        url: url,
        title: String(tab.name() || url),
        active: active,
        lastActivatedAt: active ? now : now - 1
      });
    }
  }

  return JSON.stringify(results);
}
`;

function appleScriptString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

function makeWebKitActivateScript(appName: string): string {
  return `
on run argv
  set targetWindowId to (item 2 of argv) as integer
  set targetTabIndex to (item 3 of argv) as integer
  set targetUrl to item 4 of argv
  tell application ${appleScriptString(appName)}
    activate
    repeat with candidateWindow in windows
      if id of candidateWindow is targetWindowId then
        if (count of tabs of candidateWindow) >= targetTabIndex then
          set current tab of candidateWindow to tab targetTabIndex of candidateWindow
          set index of candidateWindow to 1
          return "ok"
        end if
      end if
    end repeat

    if targetUrl is not "" then
      repeat with candidateWindow in windows
        repeat with candidateTab in tabs of candidateWindow
          if URL of candidateTab is targetUrl then
            set current tab of candidateWindow to candidateTab
            set index of candidateWindow to 1
            return "ok"
          end if
        end repeat
      end repeat
    end if

    error "Target Safari tab was not found."
  end tell
end run
`;
}

function makeChromiumActivateScript(appName: string): string {
  return `
on run argv
  set targetWindowId to (item 2 of argv) as integer
  set targetTabIndex to (item 3 of argv) as integer
  set targetUrl to item 4 of argv
  tell application ${appleScriptString(appName)}
    activate
    repeat with candidateWindow in windows
      if id of candidateWindow is targetWindowId then
        if (count of tabs of candidateWindow) >= targetTabIndex then
          set active tab index of candidateWindow to targetTabIndex
          set index of candidateWindow to 1
          return "ok"
        end if
      end if
    end repeat

    if targetUrl is not "" then
      repeat with candidateWindow in windows
        repeat with tabIndex from 1 to count of tabs of candidateWindow
          if URL of tab tabIndex of candidateWindow is targetUrl then
            set active tab index of candidateWindow to tabIndex
            set index of candidateWindow to 1
            return "ok"
          end if
        end repeat
      end repeat
    end if

    error "Target browser tab was not found."
  end tell
end run
`;
}

export async function syncMacBrowserOpenTabs(index: IndexService, browserId: BrowserId): Promise<number> {
  if (process.platform !== "darwin") return 0;
  const appName = MAC_BROWSER_APPS[browserId];
  if (!appName) return 0;
  const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", MAC_BROWSER_TABS_SCRIPT, appName, browserId], { timeout: 1_500, maxBuffer: 1024 * 1024 * 4 });
  const tabs = parseMacBrowserTabs(stdout, browserId);
  await index.replaceOpenTabs(browserId, AUTOMATION_PROFILE_ID, tabs);
  if (browserId === "safari") {
    await index.replaceOpenTabs("safari", "default", []);
  }
  await index.upsertSource({
    browserId,
    browserName: appName,
    profileId: AUTOMATION_PROFILE_ID,
    profileName: "macOS Automation",
    extensionId: "macos-automation",
    extensionVersion: "1.0.0",
    connected: true,
    permissions: { tabs: true, bookmarks: false, history: false },
    status: "connected",
    lastConnectedAt: Date.now()
  });
  return tabs.length;
}

export async function activateMacBrowserTab(browserId: BrowserId, openTabRef: OpenTabRef, url = ""): Promise<void> {
  if (process.platform !== "darwin") throw new Error("Browser tab activation is only available on macOS.");
  const appName = MAC_BROWSER_APPS[browserId];
  if (!appName) throw new Error(`Unsupported browser for macOS automation: ${browserId}`);
  const script = browserId === "safari" ? makeWebKitActivateScript(appName) : makeChromiumActivateScript(appName);
  await execFileAsync("osascript", ["-e", script, appName, String(openTabRef.windowId), String(openTabRef.tabId), url], { timeout: 2_500 });
}

export async function syncSafariOpenTabs(index: IndexService): Promise<number> {
  return syncMacBrowserOpenTabs(index, "safari");
}

export async function activateSafariTab(openTabRef: OpenTabRef): Promise<void> {
  if (process.platform !== "darwin") throw new Error("Safari tab activation is only available on macOS.");
  await activateMacBrowserTab("safari", openTabRef);
}

export function parseSafariTabs(rawOutput: string): UpsertTabInput[] {
  return parseMacBrowserTabs(rawOutput, "safari");
}

export function parseMacBrowserTabs(rawOutput: string, browserId: BrowserId): UpsertTabInput[] {
  const parsed = JSON.parse(rawOutput.trim() || "[]") as UpsertTabInput[];
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((tab) => {
    return tab.browserId === browserId
      && tab.profileId === AUTOMATION_PROFILE_ID
      && Number.isFinite(tab.windowId)
      && Number.isFinite(tab.tabId)
      && typeof tab.url === "string"
      && isAllowedUrl(tab.url, false);
  });
}
