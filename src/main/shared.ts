export const PROTOCOL_VERSION = "1.0";

export type BrowserId = "chrome" | "edge" | "firefox" | "safari";
export type SourceType = "open_tab" | "bookmark" | "history";
export type DataSourceState = "connected" | "partial_permission" | "disconnected" | "syncing" | "error" | "disabled";
export type MenuBarDisplayMode = "text" | "icon";

export interface NativeMessage<TPayload = unknown> {
  messageId: string;
  protocolVersion: string;
  type: string;
  browserId?: BrowserId;
  profileId?: string;
  timestamp: number;
  payload?: TPayload;
  correlationId?: string;
  error?: QuickTabError;
}

export interface QuickTabError {
  errorCode: string;
  humanMessage: string;
  technicalMessage?: string;
  retryable: boolean;
  suggestedAction?: string;
}

export interface BrowserSource {
  browserId: BrowserId;
  browserName: string;
  profileId: string;
  profileName?: string;
  extensionId: string;
  extensionVersion: string;
  connected: boolean;
  permissions: Record<string, boolean>;
  status: DataSourceState;
  lastConnectedAt: number;
}

export interface OpenTabRef {
  browserId: BrowserId;
  profileId: string;
  windowId: number;
  tabId: number;
  lastActivatedAt: number;
  active: boolean;
}

export interface SearchableItem {
  itemId: string;
  sourceType: SourceType;
  browserId: BrowserId;
  profileId: string;
  url: string;
  normalizedUrl: string;
  domain: string;
  title?: string;
  displayTitle: string;
  subtitle?: string;
  pathText?: string;
  folderPath?: string;
  lastSeenAt: number;
  scoreSignals: Record<string, number | boolean | string>;
  openTabRef?: OpenTabRef;
  deleted?: boolean;
}

export interface SearchResult extends SearchableItem {
  score: number;
  matchReason: string;
  duplicateCount?: number;
}

export interface SearchResponse {
  query: string;
  elapsedMs: number;
  results: SearchResult[];
  sourceStatus: Record<string, DataSourceState>;
  error?: QuickTabError;
}

export interface CommandResult {
  success: boolean;
  commandId: string;
  action: "activate_tab" | "open_url" | "tabs_snapshot" | "bookmarks_snapshot";
  errorCode?: string;
  message?: string;
  technicalMessage?: string;
  retryable: boolean;
}

export interface QuickTabSettings {
  language: "zh-CN" | "en";
  shortcut: string;
  onboardingCompleted: boolean;
  defaultBrowser: BrowserId | "system";
  browsers: {
    chrome: boolean;
    edge: boolean;
    safari: boolean;
  };
  dataSources: {
    tabs: boolean;
    bookmarks: boolean;
    history: boolean;
  };
  dedupeStrategy: "path" | "domain";
  ranking: "relevance" | "frequency";
  resultScope: "all" | "bookmarks" | "history";
  allowFileUrls: boolean;
  showDockIcon: boolean;
  showMenuBarIcon: boolean;
  menuBarDisplayMode: MenuBarDisplayMode;
  openAtLogin: boolean;
}

export interface OnboardingStatus {
  defaultBrowser: BrowserId | "system";
  nativeHost: {
    ok: boolean;
    extensionId?: string;
    manifestPaths: string[];
    message?: string;
  };
  extensions: {
    chrome: { connected: boolean; extensionId?: string; lastConnectedAt?: number };
    edge: { connected: boolean; extensionId?: string; lastConnectedAt?: number };
  };
  safari: {
    available: boolean;
    automationOk: boolean;
    openTabCount: number;
    message?: string;
  };
  shortcut: {
    enabled: boolean;
    value: string;
  };
  extensionPath: string;
}

export interface UpdateStatus {
  currentVersion: string;
  latestVersion?: string;
  updateAvailable: boolean;
  releaseUrl?: string;
  assetUrl?: string;
  message?: string;
}

export const DEFAULT_SETTINGS: QuickTabSettings = {
  language: "zh-CN",
  shortcut: process.platform === "darwin" ? "Alt+Space" : "CommandOrControl+Shift+K",
  onboardingCompleted: false,
  defaultBrowser: "system",
  browsers: {
    chrome: true,
    edge: true,
    safari: process.platform === "darwin"
  },
  dataSources: {
    tabs: true,
    bookmarks: true,
    history: true
  },
  dedupeStrategy: "path",
  ranking: "relevance",
  resultScope: "all",
  allowFileUrls: false,
  showDockIcon: false,
  showMenuBarIcon: true,
  menuBarDisplayMode: "text",
  openAtLogin: false
};
