import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, nativeTheme, screen, shell, Tray } from "electron";
import { execFile, spawn } from "node:child_process";
import { writeFile, chmod } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { Rectangle } from "electron";
import { CommandQueue } from "./services/command-queue.js";
import { CommandRouter } from "./services/command-router.js";
import { IndexService } from "./services/index-service.js";
import { Logger } from "./services/logger.js";
import { bundledExtensionPath, installNativeHostManifests } from "./services/native-host-installer.js";
import { selectBrowserExtensionSource } from "./services/onboarding-status.js";
import { importSafariBookmarks } from "./services/safari-importer.js";
import { activateMacBrowserTab, syncMacBrowserOpenTabs, syncSafariOpenTabs } from "./services/safari-tabs.js";
import { SettingsService } from "./services/settings.js";
import { normalizeShortcut, validateShortcutSyntax } from "./services/shortcut.js";
import { checkForUpdates } from "./services/update-service.js";
import { BrowserId, DEFAULT_SETTINGS, NativeMessage, OnboardingStatus, QuickTabSettings, SearchResult } from "./shared.js";
import { getSharedDataPathFromEnv, getUserDataPath } from "./paths.js";

let searchWindow: BrowserWindow | undefined;
let tray: Tray | undefined;
let commandRouter: CommandRouter;
let settingsService: SettingsService;
let indexService: IndexService;
let commandQueue: CommandQueue;
let logger: Logger;
let ignoreBlurUntil = 0;
let isApplyingSearchWindowBounds = false;
let saveSearchWindowPositionTimer: ReturnType<typeof setTimeout> | undefined;
const lastTabRefreshByBrowser = new Map<BrowserId, number>();
const lastBookmarkRefreshByBrowser = new Map<BrowserId, number>();
const TAB_REFRESH_THROTTLE_MS = 1_200;
const TAB_REFRESH_WAIT_MS = 700;
const BOOKMARK_REFRESH_THROTTLE_MS = 5_000;
const BOOKMARK_REFRESH_WAIT_MS = 900;
const EXTERNAL_SETUP_HOLD_MS = 5 * 60_000;
const execFileAsync = promisify(execFile);
const PRODUCT_NAME = "QuickTab";
const NATIVE_HOST_NAME = "com.quicktab.ai";
const MENU_BAR_ICON_TITLE = "◉";
type SearchWindowLayout = "compact" | "results" | "sheet";

const isDev = process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === "development";

if (process.argv.includes("--native-host")) {
  await import("./native/native-host.js");
} else {
app.setName(PRODUCT_NAME);

async function createSearchWindow(): Promise<BrowserWindow> {
  if (searchWindow && !searchWindow.isDestroyed()) return searchWindow;
  const settings = await settingsService.get();
  const isWindows = process.platform === "win32";

  searchWindow = new BrowserWindow({
    width: 720,
    height: 76,
    show: false,
    frame: false,
    resizable: false,
    roundedCorners: isWindows,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: !settings.showDockIcon,
    transparent: true,
    hasShadow: isWindows,
    autoHideMenuBar: isWindows,
    backgroundMaterial: isWindows ? "acrylic" : undefined,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: join(app.getAppPath(), "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  searchWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    void logger?.error("Renderer failed to load", { errorCode, errorDescription, validatedURL });
  });
  searchWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level >= 2) void logger?.warn("Renderer console message", { level, message, line, sourceId });
  });
  searchWindow.webContents.on("before-input-event", (event, input) => {
    if ((input.meta || input.control) && input.key.toLowerCase() === "w") {
      searchWindow?.hide();
      event.preventDefault();
      return;
    }
    if ((input.meta || input.control) && input.key === ",") {
      void showSettingsWindow();
      event.preventDefault();
      return;
    }
    if ((input.meta || input.control) && input.key.toLowerCase() === "q") {
      app.quit();
      event.preventDefault();
    }
  });

  searchWindow.on("blur", () => {
    if (Date.now() < ignoreBlurUntil) return;
    if (!searchWindow?.webContents.isDevToolsOpened()) searchWindow?.hide();
  });
  searchWindow.on("moved", () => {
    scheduleSearchWindowPositionSave(searchWindow);
  });

  if (isDev) {
    await searchWindow.loadURL(process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173");
  } else {
    await searchWindow.loadURL(pathToFileURL(join(app.getAppPath(), "dist/renderer/index.html")).toString());
  }
  return searchWindow;
}

async function toggleSearchWindow(): Promise<void> {
  const window = await createSearchWindow();
  if (window.isVisible()) {
    window.hide();
    return;
  }
  await presentSearchWindow(window);
}

async function showSearchWindow(): Promise<void> {
  const window = await createSearchWindow();
  await presentSearchWindow(window);
}

async function presentSearchWindow(window: BrowserWindow): Promise<void> {
  const settings = await settingsService.get();
  await resizeSearchWindow(window, "compact");
  applyDockIconPreference(settings);
  if (process.platform === "darwin" && settings.showDockIcon) {
    app.focus({ steal: true });
  }
  window.setSkipTaskbar(!settings.showDockIcon);
  ignoreBlurUntil = Date.now() + 1_200;
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.show();
  window.moveTop();
  window.focus();
  applyDockIconPreference(settings);
  if (process.platform === "darwin" && app.dock && !settings.showDockIcon) {
    app.dock.hide();
  }
  window.setAlwaysOnTop(true, "screen-saver");
  window.setAlwaysOnTop(true);
  setTimeout(() => {
    if (!window.isDestroyed()) window.setVisibleOnAllWorkspaces(false);
    applyDockIconPreference(settings);
  }, 900);
  window.webContents.send("quicktab:focus-search");
}

async function expandSearchWindow(): Promise<void> {
  const window = await createSearchWindow();
  await resizeSearchWindow(window, "sheet");
}

async function resizeSearchWindow(window: BrowserWindow, layout: SearchWindowLayout, resultCount = 0): Promise<void> {
  const settings = await settingsService.get();
  const savedPosition = settings.searchWindowPosition;
  const display = savedPosition
    ? screen.getDisplayNearestPoint(savedPosition)
    : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const width = Math.min(720, Math.max(560, display.workArea.width - 32));
  const visibleRows = Math.min(Math.max(resultCount, 1), 8);
  const heightByLayout: Record<SearchWindowLayout, number> = {
    compact: 76,
    results: Math.min(560, 76 + 42 + visibleRows * 64 + 14),
    sheet: Math.min(640, Math.max(520, Math.round(display.workArea.height * 0.66)))
  };
  const height = heightByLayout[layout];
  const position = savedPosition
    ? clampSearchWindowPosition(savedPosition, width, height, display.workArea)
    : {
        x: Math.round(display.workArea.x + (display.workArea.width - width) / 2),
        y: Math.round(display.workArea.y + display.workArea.height * 0.18)
      };
  window.setHasShadow(process.platform === "win32");
  isApplyingSearchWindowBounds = true;
  window.setBounds({ x: position.x, y: position.y, width, height });
  setTimeout(() => {
    isApplyingSearchWindowBounds = false;
  }, 150);
}

function clampSearchWindowPosition(
  position: { x: number; y: number },
  width: number,
  height: number,
  workArea: Rectangle
): { x: number; y: number } {
  const maxX = workArea.x + Math.max(0, workArea.width - width);
  const maxY = workArea.y + Math.max(0, workArea.height - height);
  return {
    x: Math.min(maxX, Math.max(workArea.x, Math.round(position.x))),
    y: Math.min(maxY, Math.max(workArea.y, Math.round(position.y)))
  };
}

function scheduleSearchWindowPositionSave(window: BrowserWindow | undefined): void {
  if (!window || window.isDestroyed() || isApplyingSearchWindowBounds) return;
  if (saveSearchWindowPositionTimer) clearTimeout(saveSearchWindowPositionTimer);
  saveSearchWindowPositionTimer = setTimeout(() => {
    if (!window || window.isDestroyed() || isApplyingSearchWindowBounds) return;
    const [x, y] = window.getPosition();
    void settingsService.save({ searchWindowPosition: { x, y } });
  }, 250);
}

async function registerShortcut(): Promise<void> {
  globalShortcut.unregisterAll();
  const settings = await settingsService.get();
  if (!settings.shortcut) return;
  const validation = validateShortcutSyntax(settings.shortcut);
  if (!validation.ok || !validation.normalized) {
    await logger.warn("Shortcut is invalid", { shortcut: settings.shortcut, reason: validation.reason });
    return;
  }
  const ok = globalShortcut.register(validation.normalized, () => {
    void logger.info("Shortcut triggered", { shortcut: validation.normalized });
    void toggleSearchWindow();
  });
  if (!ok) {
    await logger.warn("Shortcut registration failed", { shortcut: validation.normalized });
    await indexService.addDiagnostic({
      level: "warn",
      code: "SHORTCUT_CONFLICT",
      message: `Shortcut ${validation.normalized} could not be registered.`
    });
  } else {
    await logger.info("Shortcut registered", { shortcut: validation.normalized });
  }
}

async function validateShortcutAvailability(shortcut: string): Promise<{ ok: boolean; normalized: string; reason?: string }> {
  const validation = validateShortcutSyntax(shortcut);
  if (!validation.ok || !validation.normalized) {
    return { ok: validation.ok, normalized: validation.normalized ?? "", reason: validation.reason };
  }
  if (!validation.normalized) return { ok: true, normalized: "" };

  const current = normalizeShortcut((await settingsService.get()).shortcut);
  if (validation.normalized === current) return { ok: true, normalized: validation.normalized };

  const currentWasRegistered = current ? globalShortcut.isRegistered(current) : false;
  if (currentWasRegistered) globalShortcut.unregister(current);
  try {
    let available = false;
    try {
      available = globalShortcut.register(validation.normalized, () => {});
    } catch (error) {
      await logger.warn("Shortcut validation failed", { shortcut: validation.normalized, message: error instanceof Error ? error.message : String(error) });
      return { ok: false, normalized: validation.normalized, reason: "invalid" };
    }
    if (available) globalShortcut.unregister(validation.normalized);
    return { ok: available, normalized: validation.normalized, reason: available ? undefined : "conflict" };
  } finally {
    if (currentWasRegistered && current) {
      globalShortcut.register(current, () => {
        void logger.info("Shortcut triggered", { shortcut: current });
        void toggleSearchWindow();
      });
    }
  }
}

function setupTray(): void {
  if (tray) return;
  const template = Menu.buildFromTemplate([
    { label: "Open QuickTab", accelerator: process.platform === "darwin" ? "Alt+Space" : "CommandOrControl+Shift+K", click: () => {
      ignoreBlurUntil = Date.now() + 1_500;
      void showSearchWindow();
    } },
    { label: "Settings", accelerator: "CommandOrControl+,", click: () => void showSettingsWindow() },
    { label: "Hide QuickTab", accelerator: "Esc", click: () => searchWindow?.hide() },
    {
      label: "Rebuild search window",
      click: async () => {
        ignoreBlurUntil = Date.now() + 1_500;
        searchWindow?.destroy();
        await createSearchWindow();
      }
    },
    { type: "separator" },
    { label: "Quit", accelerator: "CommandOrControl+Q", click: () => app.quit() }
  ]);
  if (process.platform === "darwin") {
    Menu.setApplicationMenu(template);
  }
  const icon = createMenuBarIcon();
  tray = new Tray(icon);
  tray.setToolTip(PRODUCT_NAME);
  tray.setContextMenu(template);
  if (process.platform !== "darwin") {
    tray.on("click", () => void showSearchWindow());
  }
  void logger?.info("Menu bar icon created");
}

async function showSettingsWindow(): Promise<void> {
  const window = await createSearchWindow();
  ignoreBlurUntil = Date.now() + 1_500;
  await presentSearchWindow(window);
  await resizeSearchWindow(window, "sheet");
  window.webContents.send("quicktab:open-settings");
}

function applyShellPresence(settings: QuickTabSettings): void {
  searchWindow?.setSkipTaskbar(!settings.showDockIcon);
  applyDockIconPreference(settings);
  if (settings.showMenuBarIcon) {
    setupTray();
    if (tray) {
      tray.setImage(nativeImage.createEmpty());
      tray.setTitle(process.platform === "darwin" ? (settings.menuBarDisplayMode === "icon" ? MENU_BAR_ICON_TITLE : "QT") : "");
      tray.setToolTip(PRODUCT_NAME);
    }
  } else {
    tray?.destroy();
    tray = undefined;
  }
  if (app.isPackaged && (process.platform === "darwin" || process.platform === "win32")) {
    app.setLoginItemSettings({
      openAtLogin: settings.openAtLogin,
      openAsHidden: true
    });
  }
}

function applyDockIconPreference(settings: QuickTabSettings): void {
  if (process.platform === "darwin" && app.dock) {
    if (settings.showDockIcon) {
      app.setActivationPolicy("regular");
      app.dock.show();
    } else {
      app.setActivationPolicy("accessory");
      app.dock.hide();
    }
  }
}

function createMenuBarIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="7.45" fill="#fff" stroke="#000" stroke-width="1.45"/>
      <path fill="none" stroke="#000" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round" d="M8.25 5.85a3.35 3.35 0 1 0 0 6.7a3.35 3.35 0 0 0 0-6.7Z"/>
      <path fill="none" stroke="#000" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round" d="m10.65 11.45 1.95 1.95"/>
      <path fill="none" stroke="#000" stroke-width="1.55" stroke-linecap="round" d="M6.7 8.2h3.1"/>
    </svg>`;
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
  if (process.platform === "darwin") image.setTemplateImage(false);
  return image;
}

function setupIpc(): void {
  ipcMain.handle("quicktab:search", async (_event, query: string) => {
    const settings = await settingsService.get();
    const preferredBrowser = resolvePreferredBrowser(settings.defaultBrowser);
    await refreshOpenTabsForSearch(settings, preferredBrowser);
    await refreshBookmarksForSearch(settings, preferredBrowser);
    const scopedSources = applyResultScope(settings.dataSources, settings.resultScope);
    const filters = { ...scopedSources, browsers: settings.browsers, dedupeStrategy: settings.dedupeStrategy, ranking: settings.ranking, preferredBrowser };
    if (!query.trim()) {
      const recent = await indexService.getRecent(8, filters);
      return { query, elapsedMs: 0, results: recent, sourceStatus: (await indexService.search("", 1, filters)).sourceStatus };
    }
    return indexService.search(query, 20, filters);
  });

  ipcMain.handle("quicktab:execute", async (_event, result: SearchResult) => {
    const outcome = await commandRouter.executeResult(result);
    if (!outcome.success) {
      await logger.warn("Command execution failed", {
        action: outcome.action,
        browserId: result.browserId,
        profileId: result.profileId,
        url: result.url,
        errorCode: outcome.errorCode,
        message: outcome.message,
        technicalMessage: outcome.technicalMessage
      });
    }
    return outcome;
  });
  ipcMain.handle("quicktab:get-settings", () => settingsService.get());
  ipcMain.handle("quicktab:get-default-shortcut", () => DEFAULT_SETTINGS.shortcut);
  ipcMain.handle("quicktab:validate-shortcut", async (_event, shortcut: string) => validateShortcutAvailability(shortcut));
  ipcMain.handle("quicktab:save-settings", async (_event, next) => {
    if (typeof next?.shortcut === "string") {
      const validation = await validateShortcutAvailability(next.shortcut);
      if (!validation.ok) {
        throw new Error(validation.reason ?? "Shortcut could not be saved.");
      }
      next.shortcut = validation.normalized;
    }
    const saved = await settingsService.save(next);
    applyShellPresence(saved);
    await registerShortcut();
    return saved;
  });
  ipcMain.handle("quicktab:clear-index", async () => {
    await indexService.clearIndex();
    return true;
  });
  ipcMain.handle("quicktab:import-safari", async () => {
    try {
      const count = await importSafariBookmarks(indexService);
      await indexService.addDiagnostic({ level: "info", code: "SAFARI_IMPORT_OK", message: `Imported ${count} Safari bookmarks.` });
      return { ok: true, count };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await indexService.addDiagnostic({ level: "warn", code: "SAFARI_IMPORT_FAILED", message });
      return {
        ok: false,
        count: 0,
        errorCode: "SAFARI_BOOKMARK_ACCESS_FAILED",
        message,
        userMessage: "QuickTab could not read Safari bookmarks. Grant Full Disk Access to QuickTab, then try Import Safari again.",
        path: "~/Library/Safari/Bookmarks.plist"
      };
    }
  });
  ipcMain.handle("quicktab:open-privacy-settings", async () => {
    holdWindowForExternalSetup();
    await shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles");
    return true;
  });
  ipcMain.handle("quicktab:diagnostics", async () => ({
    ...(await indexService.diagnostics()),
    commands: await commandQueue.diagnostics(),
    sharedDataDir: getSharedDataPathFromEnv(),
    extensionPath: bundledExtensionPath()
  }));
  ipcMain.handle("quicktab:get-onboarding-status", () => getOnboardingStatus());
  ipcMain.handle("quicktab:complete-onboarding", async () => settingsService.save({ onboardingCompleted: true }));
  ipcMain.handle("quicktab:open-extension-manager", async (_event, browserId: BrowserId) => {
    holdWindowForExternalSetup();
    await openExtensionManager(browserId);
    return true;
  });
  ipcMain.handle("quicktab:prepare-extension", async (_event, browserId: BrowserId) => {
    holdWindowForExternalSetup();
    await installNativeHostManifests();
    shell.showItemInFolder(join(bundledExtensionPath(), "manifest.json"));
    await openExtensionManager(browserId);
    return true;
  });
  ipcMain.handle("quicktab:reveal-extension-folder", async () => {
    holdWindowForExternalSetup();
    shell.showItemInFolder(join(bundledExtensionPath(), "manifest.json"));
    return true;
  });
  ipcMain.handle("quicktab:hide", () => searchWindow?.hide());
  ipcMain.handle("quicktab:minimize", () => {
    ignoreBlurUntil = Date.now() + 1_000;
    searchWindow?.minimize();
  });
  ipcMain.handle("quicktab:expand-window", async () => expandSearchWindow());
  ipcMain.handle("quicktab:resize-window", async (_event, layout: SearchWindowLayout, resultCount = 0) => {
    const window = await createSearchWindow();
    await resizeSearchWindow(window, layout, Number(resultCount) || 0);
  });
  ipcMain.handle("quicktab:move-window-by", (_event, deltaX = 0, deltaY = 0) => {
    if (!searchWindow || searchWindow.isDestroyed()) return;
    const [x, y] = searchWindow.getPosition();
    searchWindow.setPosition(x + Math.round(Number(deltaX) || 0), y + Math.round(Number(deltaY) || 0));
    scheduleSearchWindowPositionSave(searchWindow);
  });
  ipcMain.handle("quicktab:hold-window", (_event, durationMs = 4_000) => {
    ignoreBlurUntil = Date.now() + Math.max(500, Math.min(Number(durationMs) || 4_000, 10_000));
  });
  ipcMain.handle("quicktab:check-for-updates", () => checkForUpdates());
  ipcMain.handle("quicktab:open-update-url", async (_event, url?: string) => {
    holdWindowForExternalSetup();
    await shell.openExternal(url || "https://github.com/zhangsiqiang519/QuickTab/releases");
    return true;
  });
  ipcMain.handle("quicktab:uninstall", async (_event, clearData = false) => uninstallApp(Boolean(clearData)));
}

function holdWindowForExternalSetup(): void {
  ignoreBlurUntil = Date.now() + EXTERNAL_SETUP_HOLD_MS;
}

async function uninstallApp(clearData: boolean): Promise<boolean> {
  if (process.platform !== "darwin") {
    throw new Error("In-app uninstall is currently only available on macOS.");
  }
  if (!app.isPackaged) {
    throw new Error("In-app uninstall is only available from a packaged QuickTab.app build.");
  }

  const appBundlePath = getAppBundlePath();
  if (!appBundlePath) {
    throw new Error("Could not locate QuickTab.app bundle.");
  }

  app.setLoginItemSettings({ openAtLogin: false, openAsHidden: true });

  const scriptPath = join(app.getPath("temp"), `quicktab-uninstall-${Date.now()}.sh`);
  const home = app.getPath("home");
  const nativeHostPaths = [
    join(home, "Library/Application Support/Google/Chrome/NativeMessagingHosts", `${NATIVE_HOST_NAME}.json`),
    join(home, "Library/Application Support/Microsoft Edge/NativeMessagingHosts", `${NATIVE_HOST_NAME}.json`)
  ];
  const dataPaths = [
    app.getPath("userData"),
    getSharedDataPathFromEnv(),
    join(home, "Library/Preferences", `${NATIVE_HOST_NAME}.plist`),
    join(home, "Library/Saved Application State", `${NATIVE_HOST_NAME}.savedState`)
  ];

  const script = [
    "#!/bin/sh",
    "set +e",
    "sleep 1",
    ...nativeHostPaths.map((path) => `rm -f ${shellQuote(path)}`),
    ...(clearData ? dataPaths.map((path) => `rm -rf ${shellQuote(path)}`) : []),
    `rm -rf ${shellQuote(appBundlePath)}`,
    `rm -f ${shellQuote(scriptPath)}`,
    ""
  ].join("\n");

  await writeFile(scriptPath, script, { mode: 0o700 });
  await chmod(scriptPath, 0o700);
  await logger.info("Uninstall requested", { clearData, appBundlePath });
  const child = spawn("/bin/sh", [scriptPath], { detached: true, stdio: "ignore" });
  child.unref();
  app.quit();
  return true;
}

function getAppBundlePath(): string | undefined {
  const marker = ".app/Contents/MacOS";
  const index = process.execPath.indexOf(marker);
  if (index === -1) return undefined;
  return `${process.execPath.slice(0, index)}.app`;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function applyResultScope(
  dataSources: { tabs: boolean; bookmarks: boolean; history: boolean },
  resultScope: "all" | "bookmarks" | "history"
): { tabs: boolean; bookmarks: boolean; history: boolean } {
  if (resultScope === "bookmarks") return { tabs: true, bookmarks: true, history: false };
  if (resultScope === "history") return { tabs: true, bookmarks: false, history: true };
  return dataSources;
}

async function refreshOpenTabsForSearch(settings: QuickTabSettings, preferredBrowser: BrowserId | "system"): Promise<void> {
  if (!settings.dataSources.tabs) return;
  if (process.platform === "darwin") {
    await Promise.all(browsersToRefresh(settings, preferredBrowser).map((browserId) => requestMacBrowserTabsSnapshot(browserId)));
    if (settings.browsers.safari) {
      await requestMacBrowserTabsSnapshot("safari");
    }
    return;
  }
  const browsers = browsersToRefresh(settings, preferredBrowser);
  await Promise.all(browsers.map((browserId) => requestTabsSnapshot(browserId)));
}

function browsersToRefresh(settings: QuickTabSettings, preferredBrowser: BrowserId | "system"): BrowserId[] {
  if ((preferredBrowser === "chrome" || preferredBrowser === "edge") && settings.browsers[preferredBrowser]) {
    return [preferredBrowser];
  }
  return (["chrome", "edge"] as const).filter((browserId) => settings.browsers[browserId]);
}

async function requestTabsSnapshot(browserId: BrowserId): Promise<void> {
  const now = Date.now();
  if (now - (lastTabRefreshByBrowser.get(browserId) ?? 0) < TAB_REFRESH_THROTTLE_MS) return;
  lastTabRefreshByBrowser.set(browserId, now);
  const message: NativeMessage = {
    messageId: crypto.randomUUID(),
    protocolVersion: "1.0",
    type: "request_tabs_snapshot",
    browserId,
    profileId: "default",
    timestamp: now,
    payload: { reason: "search" }
  };
  await commandQueue.enqueue(message);
  const result = await commandQueue.waitForResult(message.messageId, TAB_REFRESH_WAIT_MS);
  if (!result?.success) {
    await logger?.warn("Open tab refresh did not complete before search", { browserId, result });
  }
}

async function refreshBookmarksForSearch(settings: QuickTabSettings, preferredBrowser: BrowserId | "system"): Promise<void> {
  if (!settings.dataSources.bookmarks) return;
  const browsers = browsersToRefresh(settings, preferredBrowser).filter((browserId) => browserId === "chrome" || browserId === "edge");
  await Promise.all(browsers.map((browserId) => requestBookmarksSnapshot(browserId)));
}

async function requestBookmarksSnapshot(browserId: BrowserId): Promise<void> {
  const now = Date.now();
  if (now - (lastBookmarkRefreshByBrowser.get(browserId) ?? 0) < BOOKMARK_REFRESH_THROTTLE_MS) return;
  lastBookmarkRefreshByBrowser.set(browserId, now);
  const message: NativeMessage = {
    messageId: crypto.randomUUID(),
    protocolVersion: "1.0",
    type: "request_bookmarks_snapshot",
    browserId,
    profileId: "default",
    timestamp: now,
    payload: { reason: "search" }
  };
  await commandQueue.enqueue(message);
  const result = await commandQueue.waitForResult(message.messageId, BOOKMARK_REFRESH_WAIT_MS);
  if (!result?.success) {
    await logger?.warn("Bookmark refresh did not complete before search", { browserId, result });
  }
}

async function requestSafariTabsSnapshot(): Promise<void> {
  await requestMacBrowserTabsSnapshot("safari");
}

async function requestMacBrowserTabsSnapshot(browserId: BrowserId): Promise<void> {
  const now = Date.now();
  if (now - (lastTabRefreshByBrowser.get(browserId) ?? 0) < TAB_REFRESH_THROTTLE_MS) return;
  lastTabRefreshByBrowser.set(browserId, now);
  try {
    const count = await syncMacBrowserOpenTabs(indexService, browserId);
    await logger?.info("Browser tabs refreshed through macOS automation", { browserId, count });
  } catch (error) {
    await logger?.warn("macOS browser tab refresh failed", { browserId, message: error instanceof Error ? error.message : String(error) });
    await indexService.addDiagnostic({
      level: "warn",
      code: "MACOS_BROWSER_TABS_ACCESS_FAILED",
      message: `QuickTab could not read ${browserId} open tabs. Allow QuickTab to control the browser in macOS Automation settings.`
    });
  }
}

function resolvePreferredBrowser(defaultBrowser: QuickTabSettings["defaultBrowser"]): BrowserId | "system" {
  if (defaultBrowser !== "system") return defaultBrowser;
  const appName = `${app.getApplicationNameForProtocol("https://example.com") || ""} ${app.getApplicationNameForProtocol("http://example.com") || ""}`.toLowerCase();
  if (appName.includes("edge")) return "edge";
  if (appName.includes("chrome")) return "chrome";
  if (appName.includes("safari")) return "safari";
  return "system";
}

async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const settings = await settingsService.get();
  const defaultBrowser = resolvePreferredBrowser(settings.defaultBrowser);
  const diagnostics = await indexService.diagnostics();
  const chromeSource = selectBrowserExtensionSource(diagnostics.sources, "chrome");
  const edgeSource = selectBrowserExtensionSource(diagnostics.sources, "edge");
  let nativeHost: OnboardingStatus["nativeHost"];
  try {
    const installed = await installNativeHostManifests();
    nativeHost = {
      ok: true,
      extensionId: installed.extensionId,
      manifestPaths: installed.manifestPaths
    };
  } catch (error) {
    nativeHost = {
      ok: false,
      manifestPaths: [],
      message: error instanceof Error ? error.message : String(error)
    };
  }

  const safari = await testSafariAutomation(settings);
  return {
    defaultBrowser,
    nativeHost,
    extensions: {
      chrome: {
        connected: Boolean(chromeSource),
        extensionId: chromeSource?.extensionId,
        lastConnectedAt: chromeSource?.lastConnectedAt
      },
      edge: {
        connected: Boolean(edgeSource),
        extensionId: edgeSource?.extensionId,
        lastConnectedAt: edgeSource?.lastConnectedAt
      }
    },
    safari,
    shortcut: {
      enabled: Boolean(settings.shortcut),
      value: settings.shortcut
    },
    extensionPath: bundledExtensionPath()
  };
}

async function testSafariAutomation(settings: QuickTabSettings): Promise<OnboardingStatus["safari"]> {
  if (process.platform !== "darwin" || !settings.browsers.safari) {
    return { available: false, automationOk: false, openTabCount: 0 };
  }
  try {
    const openTabCount = await syncSafariOpenTabs(indexService);
    return { available: true, automationOk: true, openTabCount };
  } catch (error) {
    return {
      available: true,
      automationOk: false,
      openTabCount: 0,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

async function openExtensionManager(browserId: BrowserId): Promise<void> {
  if (browserId === "edge") {
    await openBrowserUrl("Microsoft Edge", "edge://extensions");
    return;
  }
  await openBrowserUrl("Google Chrome", "chrome://extensions");
}

async function openBrowserUrl(appName: string, url: string): Promise<void> {
  if (process.platform === "darwin") {
    try {
      await execFileAsync("open", ["-a", appName, url], { timeout: 2_000 });
      return;
    } catch (error) {
      await logger?.warn("Could not open browser app directly", { appName, url, message: error instanceof Error ? error.message : String(error) });
    }
  }
  await shell.openExternal(url);
}

app.whenReady().then(async () => {
  app.setPath("userData", join(app.getPath("appData"), "quicktab-ai"));
  settingsService = new SettingsService(getUserDataPath("settings.json"));
  indexService = new IndexService(getSharedDataPathFromEnv("index.json"));
  commandQueue = new CommandQueue(getSharedDataPathFromEnv("commands.json"));
  logger = new Logger(getSharedDataPathFromEnv("logs", "quicktab.log"));
  commandRouter = new CommandRouter(
    indexService,
    (message) => commandRouter.sendQueuedNativeCommand(message),
    commandQueue,
    async () => (await settingsService.get()).allowFileUrls,
    async () => (await settingsService.get()).defaultBrowser,
    activateMacBrowserTab
  );
  setupIpc();
  applyShellPresence(await settingsService.get());
  try {
    const installed = await installNativeHostManifests();
    await logger.info("Native host manifests installed", { ...installed });
  } catch (error) {
    await logger.error("Native host manifest installation failed", { message: error instanceof Error ? error.message : String(error) });
  }
  await createSearchWindow();
  await registerShortcut();
  const settings = await settingsService.get();
  if (settings.browsers.safari && settings.dataSources.bookmarks) {
    try {
      const count = await importSafariBookmarks(indexService);
      await logger.info("Safari bookmarks imported", { count });
    } catch (error) {
      await logger.warn("Safari bookmark import failed", { message: error instanceof Error ? error.message : String(error) });
    }
  }
  const loginState = app.getLoginItemSettings();
  if (!loginState.wasOpenedAsHidden && !loginState.wasOpenedAtLogin) {
    await showSearchWindow();
  }
  await logger.info("QuickTab started");
});

app.on("activate", () => {
  void showSearchWindow();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
}
