import React, { useEffect, useRef, useState } from "react";
import { Bookmark, CheckCircle2, ChevronRight, Clock3, ExternalLink, FolderOpen, Globe2, Keyboard, Layers3, LoaderCircle, Minus, Monitor, RefreshCw, RotateCcw, Search, Settings, ShieldCheck, Sparkles, Trash2, WifiOff, X, XCircle } from "lucide-react";
import type { CommandResult, OnboardingStatus, QuickTabSettings, SearchResult, UpdateStatus } from "../../main/shared";
import { formatShortcutFromKeyEvent, normalizeShortcut, validateShortcutSyntax } from "../../main/services/shortcut";
import "./styles.css";

type View = "search" | "settings" | "diagnostics" | "onboarding";
type SearchMode = "all" | "tabs" | "library" | "bookmarks" | "history";

const typeMeta = {
  open_tab: { label: "Tab", icon: Monitor },
  bookmark: { label: "Bookmark", icon: Bookmark },
  history: { label: "History", icon: Clock3 }
};

const browserNames: Record<string, string> = {
  chrome: "Chrome",
  edge: "Edge",
  firefox: "Firefox",
  safari: "Safari"
};

const dictionary = {
  "zh-CN": {
    searchPlaceholder: "搜索标签页、书签和历史记录",
    appTagline: "浏览器工作台",
    allSources: "全部来源",
    openTabs: "打开的标签",
    library: "资料库",
    windowControls: "窗口控制",
    hideWindow: "隐藏窗口",
    minimizeWindow: "最小化窗口",
    dockIcon: "在任务栏或程序坞显示",
    menuBarIcon: "在系统托盘或菜单栏显示",
    menuBarStyle: "托盘/菜单栏样式",
    menuBarText: "QT 文字",
    menuBarIconOnly: "图标",
    openAtLogin: "开机启动",
    openAtLoginHint: "登录系统后自动启动 QuickTab，并保持后台待命。",
    appAppearance: "应用显示",
    systemBehavior: "系统行为",
    quickActions: "快捷操作",
    resultPreview: "结果预览",
    openSelected: "打开选中项",
    macHint: "Enter 打开 · ↑↓ 选择 · Esc 隐藏 · Ctrl/⌘, 设置",
    sourceHealth: "来源状态",
    noPreview: "选择一个结果查看详情",
    copiedStyleTitle: "快速唤醒、输入、选择、继续工作",
    bridgeMissingTitle: "QuickTab 桥接未加载",
    bridgeMissingBody: "请重启应用。如果仍然看到此提示，请重新安装最新版本。",
    statusNoResults: "没有结果",
    statusResults: (count: number, elapsed: number) => `${count} 个结果 · ${elapsed}ms`,
    settings: "设置",
    shortcut: "快捷键",
    shortcutCapture: "点击后直接按新的快捷键组合",
    shortcutDisabled: "快捷键已禁用",
    shortcutAvailable: "快捷键可用",
    shortcutChecking: "正在检查快捷键...",
    shortcutConflict: "该快捷键已被系统或其他应用占用",
    shortcutInvalid: "快捷键需要包含修饰键和一个按键",
    shortcutReserved: "该快捷键是系统/应用保留组合",
    restoreDefault: "恢复默认",
    deleteShortcut: "删除快捷键",
    chrome: "Chrome",
    edge: "Edge",
    safariBookmarks: "Safari 书签",
    tabs: "标签页",
    bookmarks: "书签",
    history: "历史记录",
    dedupe: "书签去重",
    dedupePath: "同域名 + 同路径，忽略查询参数",
    dedupeDomain: "同域名",
    ranking: "排序方式",
    rankingRelevance: "最相似",
    rankingFrequency: "次数最多",
    resultScope: "结果范围",
    resultScopeAll: "全部",
    resultScopeBookmarks: "只展示书签",
    resultScopeHistory: "只展示历史记录",
    language: "语言",
    chinese: "中文",
    english: "English",
    save: "保存",
    saved: "已保存",
    clearIndex: "清空索引",
    indexCleared: "索引已清空",
    importSafari: "导入 Safari",
    importingSafari: "正在导入 Safari 书签...",
    importedSafari: (count: number) => `已导入 ${count} 个 Safari 书签`,
    importedSafariEmpty: "Safari 书签读取完成，但没有找到可导入的网页书签",
    safariImportFailed: "Safari 导入失败",
    safariNeedsPermission: "Safari 需要权限",
    openPrivacy: "打开隐私设置",
    noMatchingPages: "没有匹配页面",
    connectExtension: "连接浏览器扩展",
    searchHint: "试试网页标题、域名、文件夹名称，或粘贴网址。",
    connectHint: "连接 Chrome/Edge 扩展后即可同步标签页、书签和历史记录。",
    diagnostics: "诊断",
    refresh: "刷新",
    open: (value: string) => `打开 ${value}`,
    browserSearch: (value: string) => `用浏览器搜索 "${value}"`,
    opening: "正在打开...",
    commandFailed: "操作失败",
    onboardingTitle: "欢迎使用 QuickTab",
    onboardingSubtitle: "按下面步骤完成浏览器连接，之后就可以用快捷键搜索和切换标签页。",
    defaultBrowser: "默认浏览器",
    nativeHostReady: "本机桥接已安装",
    nativeHostMissing: "本机桥接安装失败",
    extensionReady: "浏览器已连接",
    extensionMissing: "浏览器未连接",
    openChromeExtensions: "打开 Chrome 扩展页",
    openEdgeExtensions: "打开 Edge 扩展页",
    prepareChromeExtension: "准备 Chrome 扩展",
    prepareEdgeExtension: "准备 Edge 扩展",
    revealExtension: "显示扩展文件夹",
    extensionInstallNote: "浏览器不允许桌面应用静默安装扩展。点击准备后，在打开的扩展页启用开发者模式，选择刚显示的文件夹。",
    openSetupGuide: "打开配置向导",
    openSetupGuideHint: "重新检查浏览器扩展、系统权限和快捷键配置。",
    checkUpdates: "检查更新",
    checkingUpdates: "正在检查更新...",
    updateAvailable: (version: string) => `发现新版本 ${version}`,
    updateReady: "打开下载页面",
    currentVersion: "当前版本",
    latestVersion: "最新版本",
    unknownVersion: "未知",
    noUpdateAvailable: "当前已是最新版本",
    updateCheckFailed: "检查更新失败",
    dangerZone: "危险操作",
    uninstallApp: "卸载 QuickTab",
    uninstallData: "同时清空本地数据、索引和配置",
    uninstallHint: "将退出 QuickTab，删除应用和 Chrome/Edge 本机桥接配置。浏览器扩展仍需在扩展管理页手动移除。",
    uninstallConfirm: "确定要卸载 QuickTab 吗？应用会退出并删除 QuickTab.app。",
    uninstalling: "正在卸载 QuickTab...",
    uninstallFailed: "卸载失败",
    safariAutomationReady: "Safari 标签页控制已可用",
    safariAutomationMissing: "需要允许 QuickTab 控制 Safari",
    testAgain: "重新检测",
    finishOnboarding: "完成向导",
    skipOnboarding: "跳过",
    setupTip: "标签页切换可直接使用；如需同步书签和历史记录，可在扩展页加载 extension/chromium。",
    shortcutReady: (value: string) => `快捷键：${value || "未启用"}`,
    types: { open_tab: "标签页", bookmark: "书签", history: "历史" }
  },
  en: {
    searchPlaceholder: "Search tabs, bookmarks, and history",
    appTagline: "Browser workspace",
    allSources: "All sources",
    openTabs: "Open tabs",
    library: "Library",
    windowControls: "Window controls",
    hideWindow: "Hide window",
    minimizeWindow: "Minimize window",
    dockIcon: "Show in taskbar or Dock",
    menuBarIcon: "Show in menu bar",
    menuBarStyle: "Menu bar style",
    menuBarText: "QT text",
    menuBarIconOnly: "Icon",
    openAtLogin: "Open at login",
    openAtLoginHint: "Start QuickTab automatically after signing in and keep it ready in the background.",
    appAppearance: "App visibility",
    systemBehavior: "System behavior",
    quickActions: "Quick actions",
    resultPreview: "Result preview",
    openSelected: "Open selected",
    macHint: "Enter open · ↑↓ select · Esc hide · Ctrl/⌘, settings",
    sourceHealth: "Source health",
    noPreview: "Select a result to inspect it",
    copiedStyleTitle: "Wake, type, choose, and keep working quickly",
    bridgeMissingTitle: "QuickTab bridge did not load",
    bridgeMissingBody: "Restart the app. If this remains visible, reinstall the latest build.",
    statusNoResults: "No results",
    statusResults: (count: number, elapsed: number) => `${count} results in ${elapsed}ms`,
    settings: "Settings",
    shortcut: "Shortcut",
    shortcutCapture: "Click, then press the new shortcut",
    shortcutDisabled: "Shortcut disabled",
    shortcutAvailable: "Shortcut available",
    shortcutChecking: "Checking shortcut...",
    shortcutConflict: "This shortcut is already used by the system or another app",
    shortcutInvalid: "Use at least one modifier and one key",
    shortcutReserved: "This shortcut is reserved by the system or app",
    restoreDefault: "Restore default",
    deleteShortcut: "Delete shortcut",
    chrome: "Chrome",
    edge: "Edge",
    safariBookmarks: "Safari bookmarks",
    tabs: "Tabs",
    bookmarks: "Bookmarks",
    history: "History",
    dedupe: "Bookmark dedupe",
    dedupePath: "Same domain + path, ignore query parameters",
    dedupeDomain: "Same domain",
    ranking: "Ranking",
    rankingRelevance: "Most similar",
    rankingFrequency: "Most frequent",
    resultScope: "Result scope",
    resultScopeAll: "All",
    resultScopeBookmarks: "Bookmarks only",
    resultScopeHistory: "History only",
    language: "Language",
    chinese: "中文",
    english: "English",
    save: "Save",
    saved: "Saved",
    clearIndex: "Clear index",
    indexCleared: "Index cleared",
    importSafari: "Import Safari",
    importingSafari: "Importing Safari bookmarks...",
    importedSafari: (count: number) => `Imported ${count} Safari bookmarks`,
    importedSafariEmpty: "Safari bookmarks were read, but no web bookmarks were found",
    safariImportFailed: "Safari import failed",
    safariNeedsPermission: "Safari needs permission",
    openPrivacy: "Open Privacy Settings",
    noMatchingPages: "No matching pages",
    connectExtension: "Connect your browser extension",
    searchHint: "Try a title, domain, folder name, or paste a URL.",
    connectHint: "Connect Chrome or Edge extensions to sync tabs, bookmarks, and history.",
    diagnostics: "Diagnostics",
    refresh: "Refresh",
    open: (value: string) => `Open ${value}`,
    browserSearch: (value: string) => `Search "${value}" in browser`,
    opening: "Opening...",
    commandFailed: "Command failed",
    onboardingTitle: "Welcome to QuickTab",
    onboardingSubtitle: "Complete these steps to connect your browsers, then use the shortcut to search and switch tabs.",
    defaultBrowser: "Default browser",
    nativeHostReady: "Native host installed",
    nativeHostMissing: "Native host installation failed",
    extensionReady: "Browser connected",
    extensionMissing: "Browser not connected",
    openChromeExtensions: "Open Chrome extensions",
    openEdgeExtensions: "Open Edge extensions",
    prepareChromeExtension: "Prepare Chrome extension",
    prepareEdgeExtension: "Prepare Edge extension",
    revealExtension: "Show extension folder",
    extensionInstallNote: "Browsers do not allow desktop apps to silently install extensions. After preparing, enable Developer mode in the opened extensions page and select the shown folder.",
    openSetupGuide: "Open setup guide",
    openSetupGuideHint: "Recheck browser extensions, system permissions, and shortcut setup.",
    checkUpdates: "Check for updates",
    checkingUpdates: "Checking for updates...",
    updateAvailable: (version: string) => `New version ${version} is available`,
    updateReady: "Open download page",
    currentVersion: "Current version",
    latestVersion: "Latest version",
    unknownVersion: "Unknown",
    noUpdateAvailable: "QuickTab is up to date",
    updateCheckFailed: "Update check failed",
    dangerZone: "Danger zone",
    uninstallApp: "Uninstall QuickTab",
    uninstallData: "Also clear local data, index, and settings",
    uninstallHint: "QuickTab will quit, remove the app, and delete Chrome/Edge native host config. Browser extensions still need to be removed from each browser extension page.",
    uninstallConfirm: "Uninstall QuickTab now? The app will quit and delete QuickTab.app.",
    uninstalling: "Uninstalling QuickTab...",
    uninstallFailed: "Uninstall failed",
    safariAutomationReady: "Safari tab control is ready",
    safariAutomationMissing: "Allow QuickTab to control Safari",
    testAgain: "Check again",
    finishOnboarding: "Finish setup",
    skipOnboarding: "Skip",
    setupTip: "Tab switching works directly; load extension/chromium only if bookmarks and history sync are needed.",
    shortcutReady: (value: string) => `Shortcut: ${value || "Disabled"}`,
    types: { open_tab: "Tab", bookmark: "Bookmark", history: "History" }
  }
};
type Locale = keyof typeof dictionary;

function isMacPlatform(): boolean {
  return /Mac/i.test(globalThis.navigator?.platform ?? "");
}

export default function App() {
  if (!window.quicktab) {
    return (
      <main className="shell">
        <section className="emptyState">
          <WifiOff size={30} />
          <h1>QuickTab 桥接未加载</h1>
          <p>请重启应用。如果仍然看到此提示，请重新安装最新版本。</p>
        </section>
      </main>
    );
  }

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [sourceStatus, setSourceStatus] = useState<Record<string, string>>({});
  const [view, setView] = useState<View>("search");
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [compact, setCompact] = useState(true);
  const [settings, setSettings] = useState<QuickTabSettings | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<unknown>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRequestRef = useRef(0);
  const t = dictionary[(settings?.language ?? "zh-CN") as Locale];
  const isMac = isMacPlatform();

  useEffect(() => {
    if (!settings) {
      void window.quicktab.getSettings().then((next) => {
        setSettings(next);
        if (!next.onboardingCompleted) setView("onboarding");
      });
    }
  }, [settings]);

  useEffect(() => {
    const stop = window.quicktab.onFocusSearch(() => {
      if (settings?.onboardingCompleted === false) {
        setView("onboarding");
        setCompact(false);
        void window.quicktab.expandWindow();
      } else {
        setView("search");
        setCompact(true);
      }
      setTimeout(() => inputRef.current?.focus(), 20);
    });
    return stop;
  }, [settings?.onboardingCompleted]);

  useEffect(() => {
    const stop = window.quicktab.onOpenSettings(() => {
      setCompact(false);
      setView("settings");
      void window.quicktab.expandWindow();
      setTimeout(() => inputRef.current?.focus(), 20);
    });
    return stop;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const requestId = searchRequestRef.current + 1;
      searchRequestRef.current = requestId;
      try {
        const response = await window.quicktab.search(query);
        if (searchRequestRef.current !== requestId) return;
        setResults(response.results);
        setSourceStatus(response.sourceStatus);
        setStatus(response.results.length ? t.statusResults(response.results.length, response.elapsedMs) : t.statusNoResults);
        setSelectedIndex(0);
      } catch (error) {
        if (searchRequestRef.current !== requestId) return;
        setStatus(error instanceof Error ? error.message : "Search failed");
      }
    }, 60);
    return () => window.clearTimeout(timer);
  }, [query, t, refreshToken]);

  useEffect(() => {
    if (view === "settings" && !settings) {
      void window.quicktab.getSettings().then(setSettings);
    }
    if (view === "diagnostics") {
      void window.quicktab.diagnostics().then(setDiagnostics);
    }
    if (view === "onboarding") {
      void window.quicktab.getOnboardingStatus().then(setOnboardingStatus);
    }
  }, [view, settings]);

  const displayResults = filterResultsByMode(results, searchMode);
  const selectedResult = displayResults[selectedIndex];
  const hasDisconnectedSource = Object.values(sourceStatus).some((state) => state === "disconnected" || state === "error");

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchMode]);

  useEffect(() => {
    setSelectedIndex((index) => Math.min(index, Math.max(0, displayResults.length - 1)));
  }, [displayResults.length]);

  async function execute(result: SearchResult | undefined) {
    if (!result) {
      if (query.trim()) await window.quicktab.execute(createDirectResult(query));
      return;
    }
    setStatus(t.opening);
    const outcome = (await window.quicktab.execute(result)) as CommandResult;
    if (outcome.success) {
      await window.quicktab.hide();
    } else {
      setStatus(outcome.message ?? t.commandFailed);
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      void window.quicktab.hide();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === ",") {
      setView("settings");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(displayResults.length - 1, index + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(0, index - 1));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      void execute(selectedResult);
    }
  }

  function onSearchInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      event.currentTarget.select();
      event.stopPropagation();
    }
  }

  function updateQuery(value: string): void {
    setQuery(value);
    if (compact) {
      setCompact(false);
      void window.quicktab.expandWindow();
    }
  }

  function openSettings(): void {
    setCompact(false);
    void window.quicktab.expandWindow();
    setView(view === "settings" ? "search" : "settings");
  }

  const directActionText = query.trim() ? (isDirectUrl(query) ? t.open(query.trim()) : t.browserSearch(query.trim())) : "";

  return (
    <main className={`shell ${compact && view === "search" && !query ? "compactShell" : ""}`} onKeyDown={onKeyDown}>
      <div className="appChrome">
        <aside className="sidebar">
          <div className="trafficLights" aria-label={t.windowControls}>
            <button title={t.hideWindow} onClick={() => void window.quicktab.hide()}><X size={8} /></button>
            <button title={t.minimizeWindow} onClick={() => void window.quicktab.minimize()}><Minus size={8} /></button>
            <button title={t.settings} onClick={openSettings}><Settings size={8} /></button>
          </div>
          <div className="brandBlock">
            <span className="brandMark"><Sparkles size={18} /></span>
            <div>
              <strong>QuickTab</strong>
              <small>{t.appTagline}</small>
            </div>
          </div>
          <nav className="railNav" aria-label="QuickTab views">
            <button className={view === "search" && searchMode === "all" ? "active" : ""} onClick={() => { setView("search"); setSearchMode("all"); }}><Search size={16} /> {t.allSources}</button>
            <button className={view === "search" && searchMode === "tabs" ? "active" : ""} onClick={() => { setView("search"); setSearchMode("tabs"); }}><Monitor size={16} /> {t.openTabs}</button>
            <button className={view === "search" && searchMode === "library" ? "active" : ""} onClick={() => { setView("search"); setSearchMode("library"); }}><Layers3 size={16} /> {t.library}</button>
            <button className={view === "search" && searchMode === "bookmarks" ? "active" : ""} onClick={() => { setView("search"); setSearchMode("bookmarks"); }}><Bookmark size={16} /> {t.bookmarks}</button>
            <button className={view === "search" && searchMode === "history" ? "active" : ""} onClick={() => { setView("search"); setSearchMode("history"); }}><Clock3 size={16} /> {t.history}</button>
            <button className={view === "diagnostics" ? "active" : ""} onClick={() => setView("diagnostics")}><ShieldCheck size={16} /> {t.diagnostics}</button>
          </nav>
          <div className="sourcePanel">
            <span>{t.sourceHealth}</span>
            {Object.entries(browserNames).filter(([id]) => ["chrome", "edge", ...(isMac ? ["safari"] : [])].includes(id)).map(([id, name]) => (
              <span key={id} className={`sourcePill ${Object.keys(sourceStatus).some((key) => key.startsWith(id)) ? "connected" : ""}`}>
                <span className="statusDot" />
                {name}
              </span>
            ))}
          </div>
          <button className="settingsLauncher" title={t.settings} onClick={openSettings}>
            <Settings size={16} /> {t.settings}
          </button>
        </aside>

        <section className="workspace">
          <header className="assistantBar">
            <div className="searchBox">
              <Search size={20} aria-hidden />
              <input
                ref={inputRef}
                value={query}
                maxLength={256}
                onChange={(event) => updateQuery(event.target.value)}
                onKeyDown={onSearchInputKeyDown}
                placeholder={t.searchPlaceholder}
                autoFocus
              />
              {query && <button className="clearButton" onClick={() => setQuery("")}>×</button>}
              <button className="settingsButton" title={t.settings} onClick={openSettings}>
                <Settings size={16} />
              </button>
            </div>
          </header>

          <div className="contextStrip">
            <div className="modePills" aria-label="Search scope">
              <button className={searchMode === "all" ? "active" : ""} onClick={() => { setView("search"); setSearchMode("all"); }}><Search size={13} /> {t.allSources}</button>
              <button className={searchMode === "tabs" ? "active" : ""} onClick={() => { setView("search"); setSearchMode("tabs"); }}><Monitor size={13} /> {t.openTabs}</button>
              <button className={searchMode === "library" ? "active" : ""} onClick={() => { setView("search"); setSearchMode("library"); }}><Layers3 size={13} /> {t.library}</button>
              <button className={searchMode === "bookmarks" ? "active" : ""} onClick={() => { setView("search"); setSearchMode("bookmarks"); }}><Bookmark size={13} /> {t.bookmarks}</button>
              <button className={searchMode === "history" ? "active" : ""} onClick={() => { setView("search"); setSearchMode("history"); }}><Clock3 size={13} /> {t.history}</button>
            </div>
            <strong>{status}</strong>
          </div>

          {view === "search" && (
            <SearchView
              query={query}
              results={displayResults}
              selectedIndex={selectedIndex}
              status={status}
              hasDisconnectedSource={hasDisconnectedSource}
              directActionText={directActionText}
              onHover={setSelectedIndex}
              onExecute={execute}
              onDiagnostics={() => setView("diagnostics")}
              onSettings={openSettings}
              t={t}
            />
          )}
          {view === "diagnostics" && <DiagnosticsView value={diagnostics} onRefresh={() => window.quicktab.diagnostics().then(setDiagnostics)} t={t} />}
          {view === "onboarding" && settings && (
            <OnboardingView
              settings={settings}
              status={onboardingStatus}
              onRefresh={() => window.quicktab.getOnboardingStatus().then(setOnboardingStatus)}
              onDone={async () => {
                const saved = await window.quicktab.completeOnboarding();
                setSettings(saved);
                setView("search");
              }}
              onSkip={async () => {
                const saved = await window.quicktab.completeOnboarding();
                setSettings(saved);
                setView("search");
              }}
              t={t}
            />
          )}
        </section>
      </div>

      {view === "settings" && settings && (
        <div className="sheetBackdrop" onClick={() => setView("search")}>
          <div className="settingsSheet" onClick={(event) => event.stopPropagation()}>
            <SettingsView
              settings={settings}
              onSaved={setSettings}
              onImported={() => setRefreshToken((value) => value + 1)}
              onOpenOnboarding={() => {
                setView("onboarding");
                setCompact(false);
                void window.quicktab.expandWindow();
                void window.quicktab.getOnboardingStatus().then(setOnboardingStatus);
              }}
              t={t}
              isMac={isMac}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function OnboardingView({
  settings,
  status,
  onRefresh,
  onDone,
  onSkip,
  t
}: {
  settings: QuickTabSettings;
  status: OnboardingStatus | null;
  onRefresh: () => void;
  onDone: () => void;
  onSkip: () => void;
  t: typeof dictionary["zh-CN"];
}) {
  const chromeConnected = Boolean(status?.extensions.chrome.connected);
  const edgeConnected = Boolean(status?.extensions.edge.connected);
  const safariReady = !settings.browsers.safari || Boolean(status?.safari.automationOk);
  const canFinish = Boolean(status?.nativeHost.ok) && (chromeConnected || edgeConnected || safariReady);

  return (
    <section className="onboarding">
      <div className="onboardingHero">
        <span className="heroMark"><Sparkles size={22} /></span>
        <div>
          <h1>{t.onboardingTitle}</h1>
          <p>{t.onboardingSubtitle}</p>
        </div>
      </div>

      <div className="setupList">
        <SetupStep
          ok={Boolean(status?.nativeHost.ok)}
          title={status?.nativeHost.ok ? t.nativeHostReady : t.nativeHostMissing}
          detail={status?.nativeHost.extensionId ? `Extension ID: ${status.nativeHost.extensionId}` : status?.nativeHost.message}
          icon={<ShieldCheck size={18} />}
        />
        <SetupStep
          ok={chromeConnected}
          title={`Chrome ${chromeConnected ? t.extensionReady : t.extensionMissing}`}
          detail={chromeConnected ? status?.extensions.chrome.extensionId : t.setupTip}
          icon={<Monitor size={18} />}
          actions={(
            <>
              <button onClick={() => void window.quicktab.prepareExtension("chrome")}><FolderOpen size={15} /> {t.prepareChromeExtension}</button>
              <button onClick={() => void window.quicktab.openExtensionManager("chrome")}>{t.openChromeExtensions}</button>
            </>
          )}
        />
        <SetupStep
          ok={edgeConnected}
          title={`Edge ${edgeConnected ? t.extensionReady : t.extensionMissing}`}
          detail={edgeConnected ? status?.extensions.edge.extensionId : t.setupTip}
          icon={<Monitor size={18} />}
          actions={(
            <>
              <button onClick={() => void window.quicktab.prepareExtension("edge")}><FolderOpen size={15} /> {t.prepareEdgeExtension}</button>
              <button onClick={() => void window.quicktab.openExtensionManager("edge")}>{t.openEdgeExtensions}</button>
            </>
          )}
        />
        <p className="setupNote">{t.extensionInstallNote}</p>
        {settings.browsers.safari && (
          <SetupStep
            ok={Boolean(status?.safari.automationOk)}
            title={status?.safari.automationOk ? t.safariAutomationReady : t.safariAutomationMissing}
            detail={status?.safari.automationOk ? `${status.safari.openTabCount} tabs` : status?.safari.message}
            icon={<ShieldCheck size={18} />}
            actions={<button onClick={() => void window.quicktab.openPrivacySettings()}>{t.openPrivacy}</button>}
          />
        )}
        <SetupStep
          ok={settings.shortcut.length > 0}
          title={t.shortcutReady(settings.shortcut)}
          detail={settings.shortcut ? t.shortcutAvailable : t.shortcutDisabled}
          icon={<Keyboard size={18} />}
        />
      </div>

      <div className="onboardingFooter">
        <span>{t.defaultBrowser}: {browserNames[status?.defaultBrowser ?? ""] ?? status?.defaultBrowser ?? "System"}</span>
        <div className="buttonRow">
          <button onClick={onRefresh}><RefreshCw size={16} /> {t.testAgain}</button>
          <button onClick={onSkip}>{t.skipOnboarding}</button>
          <button className="primaryAction" disabled={!canFinish} onClick={onDone}>{t.finishOnboarding}</button>
        </div>
      </div>
    </section>
  );
}

function SetupStep({
  ok,
  title,
  detail,
  icon,
  actions
}: {
  ok: boolean;
  title: string;
  detail?: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className={`setupStep ${ok ? "ready" : "pending"}`}>
      <span className="setupIcon">{ok ? <CheckCircle2 size={18} /> : icon}</span>
      <div className="setupText">
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
      </div>
      {actions && <div className="setupActions">{actions}</div>}
    </div>
  );
}

function SearchView(props: {
  query: string;
  results: SearchResult[];
  selectedIndex: number;
  status: string;
  hasDisconnectedSource: boolean;
  directActionText: string;
  onHover: (index: number) => void;
  onExecute: (result: SearchResult) => void;
  onDiagnostics: () => void;
  onSettings: () => void;
  t: typeof dictionary["zh-CN"];
}) {
  const selected = props.results[props.selectedIndex];

  if (!props.results.length) {
    return (
      <section className="emptyState">
        {props.hasDisconnectedSource ? <WifiOff size={30} /> : <Search size={30} />}
        <h1>{props.query ? props.t.noMatchingPages : props.t.connectExtension}</h1>
        <p>{props.query ? props.t.searchHint : props.t.connectHint}</p>
        <div className="emptyActions">
          {props.directActionText && <button className="primaryAction" onClick={() => void window.quicktab.execute(createDirectResult(props.query))}>{props.directActionText}</button>}
          {props.directActionText && <button onClick={props.onSettings}><Settings size={16} /> {props.t.settings}</button>}
          <button onClick={props.onDiagnostics}>{props.t.diagnostics}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="searchStage" aria-label="Search results">
      <div className="resultColumn">
        <div className="statusLine">
          <span>{props.status}</span>
          <div className="resultActions">
            {props.directActionText && <button className="inlineAction" onClick={() => void window.quicktab.execute(createDirectResult(props.query))}>{props.directActionText}</button>}
            {props.directActionText && <button className="inlineAction iconOnlyAction" title={props.t.settings} onClick={props.onSettings}><Settings size={15} /></button>}
          </div>
        </div>
        <div className="results">
          {props.results.map((result, index) => {
            const meta = typeMeta[result.sourceType];
            const Icon = meta.icon;
            return (
              <button
                key={`${result.itemId}:${result.normalizedUrl}`}
                className={`resultItem ${index === props.selectedIndex ? "selected" : ""}`}
                onMouseEnter={() => props.onHover(index)}
                onClick={() => props.onExecute(result)}
              >
                <span className="typeIcon"><Icon size={17} /></span>
                <span className="resultText">
                  <strong>{result.displayTitle}</strong>
                  <small>{result.domain}{result.subtitle ? ` / ${result.subtitle}` : ""}</small>
                </span>
                <span className="resultMeta">
                  {browserNames[result.browserId] ?? result.browserId} · {props.t.types[result.sourceType]}
                  {result.duplicateCount ? ` +${result.duplicateCount - 1}` : ""}
                </span>
                <ChevronRight className="rowChevron" size={16} />
              </button>
            );
          })}
        </div>
      </div>

      <aside className="previewPane">
        <div className="previewHeader">
          <span>{props.t.resultPreview}</span>
          {selected && <strong>{browserNames[selected.browserId] ?? selected.browserId}</strong>}
        </div>
        {selected ? (
          <div className="previewBody">
            <span className="previewIcon">{selected.sourceType === "open_tab" ? <Monitor size={22} /> : selected.sourceType === "bookmark" ? <Bookmark size={22} /> : <Clock3 size={22} />}</span>
            <h2>{selected.displayTitle}</h2>
            <p>{selected.url}</p>
            <dl>
              <div><dt>{props.t.types[selected.sourceType]}</dt><dd>{selected.matchReason}</dd></div>
              <div><dt>{props.t.resultScope}</dt><dd>{selected.domain}</dd></div>
              <div><dt>{props.t.ranking}</dt><dd>{Math.round(selected.score)}</dd></div>
            </dl>
            <button className="primaryAction wideAction" onClick={() => props.onExecute(selected)}>
              <ExternalLink size={16} /> {props.t.openSelected}
            </button>
          </div>
        ) : (
          <div className="previewEmpty">
            <Globe2 size={24} />
            <span>{props.t.noPreview}</span>
          </div>
        )}
      </aside>
    </section>
  );
}

type MessageKind = "idle" | "working" | "success" | "warning" | "error";

function SettingsView({
  settings,
  onSaved,
  onImported,
  onOpenOnboarding,
  t,
  isMac
}: {
  settings: QuickTabSettings;
  onSaved: (settings: QuickTabSettings) => void;
  onImported: () => void;
  onOpenOnboarding: () => void;
  t: typeof dictionary["zh-CN"];
  isMac: boolean;
}) {
  const [draft, setDraft] = useState(settings);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<MessageKind>("idle");
  const [safariError, setSafariError] = useState("");
  const [isImportingSafari, setIsImportingSafari] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
  const [clearDataOnUninstall, setClearDataOnUninstall] = useState(true);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [defaultShortcut, setDefaultShortcut] = useState("");
	  const [shortcutCheck, setShortcutCheck] = useState<{ ok: boolean; normalized: string; reason?: string } | null>(null);
	  const [isCheckingShortcut, setIsCheckingShortcut] = useState(false);
	  const lastSavedSettings = useRef(JSON.stringify(settings));

  const MessageIcon = messageKind === "working" ? LoaderCircle : messageKind === "error" ? XCircle : CheckCircle2;
  const shortcutStatus = getShortcutStatusText(t, draft.shortcut, shortcutCheck, isCheckingShortcut);

	  useEffect(() => {
	    void window.quicktab.getDefaultShortcut().then(setDefaultShortcut);
	  }, []);

	  useEffect(() => {
	    setDraft(settings);
	    lastSavedSettings.current = JSON.stringify(settings);
	  }, [settings]);

	  useEffect(() => {
    let cancelled = false;
    const syntax = validateShortcutSyntax(draft.shortcut);
    setShortcutCheck({ ok: syntax.ok, normalized: syntax.normalized ?? "", reason: syntax.reason });
    setIsCheckingShortcut(false);
    if (!syntax.ok || !syntax.normalized || syntax.normalized === normalizeShortcut(settings.shortcut)) {
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setTimeout(async () => {
      try {
        const result = await window.quicktab.validateShortcut(draft.shortcut);
        if (!cancelled) setShortcutCheck(result);
      } catch {
        if (!cancelled) {
          setShortcutCheck({ ok: false, normalized: draft.shortcut, reason: "invalid" });
        }
      }
    }, 20);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
	  }, [draft.shortcut, settings.shortcut]);

	  useEffect(() => {
	    const serialized = JSON.stringify(draft);
	    if (serialized === lastSavedSettings.current) return;

	    const syntax = validateShortcutSyntax(draft.shortcut);
    if (!syntax.ok) {
	      setMessage(getShortcutStatusText(t, draft.shortcut, { ok: false, normalized: draft.shortcut, reason: syntax.reason }, false));
	      setMessageKind("error");
	      return;
	    }
	    if (shortcutCheck?.ok === false) {
	      setMessage(getShortcutStatusText(t, draft.shortcut, shortcutCheck, false));
	      setMessageKind("error");
	      return;
	    }

	    setMessage(t.saved);
	    setMessageKind("working");
	    const timer = window.setTimeout(async () => {
	      try {
	        const saved = await window.quicktab.saveSettings(draft);
	        lastSavedSettings.current = JSON.stringify(saved);
	        onSaved(saved);
	        setMessage(t.saved);
	        setMessageKind("success");
	      } catch {
	        setMessage(getShortcutStatusText(t, draft.shortcut, { ok: false, normalized: draft.shortcut, reason: "invalid" }, false));
	        setMessageKind("error");
	      }
	    }, 180);

	    return () => window.clearTimeout(timer);
	  }, [draft, onSaved, shortcutCheck, t]);

  function recordShortcut(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Tab") return;
    event.preventDefault();
    if (event.key === "Escape") {
      setIsRecordingShortcut(false);
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      setDraft({ ...draft, shortcut: "" });
      return;
    }
    const next = formatShortcutFromKeyEvent(event);
    if (next) setDraft({ ...draft, shortcut: next });
  }

  function keepSettingsOpen(): void {
    void window.quicktab.holdWindow(6_000);
  }

  return (
    <section className="panel" onMouseDownCapture={keepSettingsOpen} onFocusCapture={keepSettingsOpen}>
      <h1>{t.settings}</h1>
      <div className="shortcutField">
        <label>
          {t.shortcut}
          <span className="fieldHint">{t.shortcutCapture}</span>
          <span className={`shortcutRecorder ${isRecordingShortcut ? "recording" : ""} ${shortcutCheck?.ok === false ? "invalid" : ""}`}>
            <Keyboard size={16} />
            <input
              value={draft.shortcut || t.shortcutDisabled}
              readOnly
              onFocus={() => setIsRecordingShortcut(true)}
              onBlur={() => setIsRecordingShortcut(false)}
              onKeyDown={recordShortcut}
            />
          </span>
        </label>
        <div className="shortcutActions">
          <button type="button" onClick={() => setDraft({ ...draft, shortcut: defaultShortcut })}><RotateCcw size={16} /> {t.restoreDefault}</button>
          <button type="button" className="danger" onClick={() => setDraft({ ...draft, shortcut: "" })}><Trash2 size={16} /> {t.deleteShortcut}</button>
        </div>
        <p className={`shortcutStatus ${shortcutCheck?.ok === false ? "invalid" : ""}`}>{shortcutStatus}</p>
      </div>
      <label>
        {t.language}
        <select value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value as QuickTabSettings["language"] })}>
          <option value="zh-CN">{t.chinese}</option>
          <option value="en">{t.english}</option>
        </select>
      </label>
      <div className="sectionLabel">{t.systemBehavior}</div>
      <label className="check prominentCheck">
        <input type="checkbox" checked={draft.openAtLogin} onChange={(event) => setDraft({ ...draft, openAtLogin: event.target.checked })} />
        <span>
          <strong>{t.openAtLogin}</strong>
          <small>{t.openAtLoginHint}</small>
        </span>
      </label>
      <button type="button" className="setupGuideButton" onClick={onOpenOnboarding}>
        <ShieldCheck size={16} />
        <span>
          <strong>{t.openSetupGuide}</strong>
          <small>{t.openSetupGuideHint}</small>
        </span>
      </button>
      <div className="updateRow">
        {updateStatus && (
          <div className="versionInfo">
            <span>{t.currentVersion}: {updateStatus.currentVersion || t.unknownVersion}</span>
            <span>{t.latestVersion}: {updateStatus.latestVersion || t.unknownVersion}</span>
          </div>
        )}
        <button
          type="button"
          disabled={isCheckingUpdate}
          onClick={async () => {
            setIsCheckingUpdate(true);
            setUpdateStatus(null);
            setMessage(t.checkingUpdates);
            setMessageKind("working");
            try {
              const status = await window.quicktab.checkForUpdates();
              setUpdateStatus(status);
              if (status.updateAvailable) {
                setMessage(t.updateAvailable(status.latestVersion ?? ""));
                setMessageKind("success");
              } else if (status.message && status.message !== "QuickTab is up to date.") {
                setMessage(`${t.updateCheckFailed}: ${status.message}`);
                setMessageKind("warning");
              } else {
                setMessage(t.noUpdateAvailable);
                setMessageKind("success");
              }
            } catch (error) {
              setMessage(`${t.updateCheckFailed}: ${error instanceof Error ? error.message : String(error)}`);
              setMessageKind("error");
            } finally {
              setIsCheckingUpdate(false);
            }
          }}
        >
          {isCheckingUpdate ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />} {t.checkUpdates}
        </button>
        {updateStatus?.updateAvailable && (
          <button type="button" className="primaryAction" onClick={() => void window.quicktab.openUpdateUrl(updateStatus.assetUrl ?? updateStatus.releaseUrl)}>
            <ExternalLink size={16} /> {t.updateReady}
          </button>
        )}
      </div>
      <div className="sectionLabel">{t.appAppearance}</div>
      <div className="settingsGrid twoColumns">
        <label className="check"><input type="checkbox" checked={draft.showDockIcon} onChange={(event) => setDraft({ ...draft, showDockIcon: event.target.checked })} /> {t.dockIcon}</label>
        <label className="check"><input type="checkbox" checked={draft.showMenuBarIcon} onChange={(event) => setDraft({ ...draft, showMenuBarIcon: event.target.checked })} /> {t.menuBarIcon}</label>
      </div>
      <label>
        {t.menuBarStyle}
        <select value={draft.menuBarDisplayMode} onChange={(event) => setDraft({ ...draft, menuBarDisplayMode: event.target.value as QuickTabSettings["menuBarDisplayMode"] })}>
          <option value="text">{t.menuBarText}</option>
          <option value="icon">{t.menuBarIconOnly}</option>
        </select>
      </label>
      <div className="settingsGrid">
        <label className="check"><input type="checkbox" checked={draft.browsers.chrome} onChange={(event) => setDraft({ ...draft, browsers: { ...draft.browsers, chrome: event.target.checked } })} /> {t.chrome}</label>
        <label className="check"><input type="checkbox" checked={draft.browsers.edge} onChange={(event) => setDraft({ ...draft, browsers: { ...draft.browsers, edge: event.target.checked } })} /> {t.edge}</label>
        {isMac && <label className="check"><input type="checkbox" checked={draft.browsers.safari} onChange={(event) => setDraft({ ...draft, browsers: { ...draft.browsers, safari: event.target.checked } })} /> {t.safariBookmarks}</label>}
      </div>
      <div className="settingsGrid">
      <label className="check"><input type="checkbox" checked={draft.dataSources.tabs} onChange={(event) => setDraft({ ...draft, dataSources: { ...draft.dataSources, tabs: event.target.checked } })} /> {t.tabs}</label>
      <label className="check"><input type="checkbox" checked={draft.dataSources.bookmarks} onChange={(event) => setDraft({ ...draft, dataSources: { ...draft.dataSources, bookmarks: event.target.checked } })} /> {t.bookmarks}</label>
      <label className="check"><input type="checkbox" checked={draft.dataSources.history} onChange={(event) => setDraft({ ...draft, dataSources: { ...draft.dataSources, history: event.target.checked } })} /> {t.history}</label>
      </div>
      <label>
        {t.dedupe}
        <select value={draft.dedupeStrategy} onChange={(event) => setDraft({ ...draft, dedupeStrategy: event.target.value as QuickTabSettings["dedupeStrategy"] })}>
          <option value="path">{t.dedupePath}</option>
          <option value="domain">{t.dedupeDomain}</option>
        </select>
      </label>
      <label>
        {t.ranking}
        <select value={draft.ranking} onChange={(event) => setDraft({ ...draft, ranking: event.target.value as QuickTabSettings["ranking"] })}>
          <option value="relevance">{t.rankingRelevance}</option>
          <option value="frequency">{t.rankingFrequency}</option>
        </select>
      </label>
      <label>
        {t.resultScope}
        <select value={draft.resultScope} onChange={(event) => setDraft({ ...draft, resultScope: event.target.value as QuickTabSettings["resultScope"] })}>
          <option value="all">{t.resultScopeAll}</option>
          <option value="bookmarks">{t.resultScopeBookmarks}</option>
          <option value="history">{t.resultScopeHistory}</option>
        </select>
      </label>
	      <div className="buttonRow">
        <button className="danger" onClick={async () => {
          await window.quicktab.clearIndex();
          setMessage(t.indexCleared);
          setMessageKind("warning");
        }}><Trash2 size={16} /> {t.clearIndex}</button>
        {isMac && (
          <button
            className="primaryAction"
            disabled={isImportingSafari}
            onClick={async () => {
              setIsImportingSafari(true);
              setMessage(t.importingSafari);
              setMessageKind("working");
              setSafariError("");
              try {
                const result = await window.quicktab.importSafari();
                if (result.ok) {
                  setMessage(result.count > 0 ? t.importedSafari(result.count) : t.importedSafariEmpty);
                  setMessageKind(result.count > 0 ? "success" : "warning");
                  onImported();
                } else {
                  setMessage(t.safariImportFailed);
                  setMessageKind("error");
                  setSafariError(result.userMessage ?? result.message ?? "QuickTab could not read Safari bookmarks.");
                }
              } catch (error) {
                setMessage(t.safariImportFailed);
                setMessageKind("error");
                setSafariError(error instanceof Error ? error.message : "QuickTab could not import Safari bookmarks.");
              } finally {
                setIsImportingSafari(false);
              }
            }}
          >
            {isImportingSafari ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />} {t.importSafari}
          </button>
        )}
      </div>
      {isMac && (
        <>
          <div className="sectionLabel">{t.dangerZone}</div>
          <div className="dangerPanel">
            <label className="check">
              <input
                type="checkbox"
                checked={clearDataOnUninstall}
                onChange={(event) => setClearDataOnUninstall(event.target.checked)}
              />
              {t.uninstallData}
            </label>
            <p>{t.uninstallHint}</p>
            <button
              type="button"
              className="danger"
              disabled={isUninstalling}
              onClick={async () => {
                if (!window.confirm(t.uninstallConfirm)) return;
                setIsUninstalling(true);
                setMessage(t.uninstalling);
                setMessageKind("working");
                try {
                  await window.quicktab.uninstall(clearDataOnUninstall);
                } catch (error) {
                  setMessage(`${t.uninstallFailed}: ${error instanceof Error ? error.message : String(error)}`);
                  setMessageKind("error");
                  setIsUninstalling(false);
                }
              }}
            >
              {isUninstalling ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />} {t.uninstallApp}
            </button>
          </div>
        </>
      )}
      {message && (
        <div className={`feedback ${messageKind}`}>
          <MessageIcon className={messageKind === "working" ? "spin" : ""} size={16} />
          <span>{message}</span>
        </div>
      )}
      {isMac && safariError && (
        <div className="notice">
          <strong>{t.safariNeedsPermission}</strong>
          <span>{safariError}</span>
          <button onClick={() => void window.quicktab.openPrivacySettings()}>{t.openPrivacy}</button>
        </div>
      )}
    </section>
  );
}

function getShortcutStatusText(
  t: typeof dictionary["zh-CN"],
  shortcut: string,
  check: { ok: boolean; normalized: string; reason?: string } | null,
  checking: boolean
): string {
  if (checking) return t.shortcutChecking;
  if (!shortcut) return t.shortcutDisabled;
  if (!check) return "";
  if (check.ok) return t.shortcutAvailable;
  if (check.reason === "conflict") return t.shortcutConflict;
  if (check.reason === "reserved") return t.shortcutReserved;
  return t.shortcutInvalid;
}

function filterResultsByMode(results: SearchResult[], mode: SearchMode): SearchResult[] {
  if (mode === "tabs") return results.filter((result) => result.sourceType === "open_tab");
  if (mode === "library") return results.filter((result) => result.sourceType === "bookmark" || result.sourceType === "history");
  if (mode === "bookmarks") return results.filter((result) => result.sourceType === "bookmark");
  if (mode === "history") return results.filter((result) => result.sourceType === "history");
  return results;
}

function createDirectResult(query: string): SearchResult {
  const trimmed = query.trim();
  const url = isDirectUrl(trimmed)
    ? trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
    : `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  return {
    itemId: `suggestion:${url}`,
    sourceType: "history",
    browserId: "chrome",
    profileId: "default",
    url,
    normalizedUrl: url,
    domain: isDirectUrl(trimmed) ? trimmed : "google.com",
    displayTitle: isDirectUrl(trimmed) ? url : trimmed,
    lastSeenAt: Date.now(),
    scoreSignals: {},
    score: 0,
    matchReason: isDirectUrl(trimmed) ? "direct" : "browser search"
  };
}

function isDirectUrl(query: string): boolean {
  return /^(https?:\/\/|localhost|[\w-]+\.[\w.-]+)/i.test(query.trim());
}

function DiagnosticsView({ value, onRefresh, t }: { value: unknown; onRefresh: () => void; t: typeof dictionary["zh-CN"] }) {
  return (
    <section className="panel">
      <h1>{t.diagnostics}</h1>
      <pre>{JSON.stringify(value ?? { status: "Loading" }, null, 2)}</pre>
      <button onClick={onRefresh}><ExternalLink size={16} /> {t.refresh}</button>
    </section>
  );
}
