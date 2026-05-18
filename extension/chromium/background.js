const PROTOCOL_VERSION = "1.0";
const NATIVE_HOST = "com.quicktab.ai";
const browserId = navigator.userAgent.includes("Edg/") ? "edge" : "chrome";
const profileId = "default";
const HEARTBEAT_INTERVAL_MS = 15_000;
const HISTORY_LOOKBACK_DAYS = 60;
const HISTORY_MAX_RESULTS = 2_000;

let port;

chrome.runtime.onInstalled.addListener(() => {
  connectNative();
});

chrome.runtime.onStartup.addListener(() => {
  connectNative();
});

chrome.action.onClicked.addListener(() => {
  connectNative();
  void syncAll();
});

chrome.tabs.onCreated.addListener((tab) => sendTabEvent("created", tab));
chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => sendTabEvent("updated", tab));
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  sendTabEvent("activated", tab);
});
chrome.tabs.onRemoved.addListener((tabId) => {
  postMessage("tab_event", { eventType: "removed", tabId });
});
chrome.bookmarks.onCreated.addListener(() => void syncBookmarks());
chrome.bookmarks.onRemoved.addListener(() => void syncBookmarks());
chrome.bookmarks.onChanged.addListener(() => void syncBookmarks());
chrome.history.onVisited.addListener((item) => {
  postMessage("history_batch", { history: [mapHistoryItem(item)] });
});

connectNative();
void syncAll();
setInterval(() => {
  postMessage("heartbeat", { extensionAlive: true });
}, HEARTBEAT_INTERVAL_MS);

function connectNative() {
  if (port) return port;
  try {
    port = chrome.runtime.connectNative(NATIVE_HOST);
    port.onMessage.addListener(handleNativeMessage);
    port.onDisconnect.addListener(() => {
      console.warn("QuickTab native host disconnected", chrome.runtime.lastError?.message);
      port = undefined;
    });
    postMessage("handshake", {
      browserId,
      browserName: browserId === "edge" ? "Edge" : "Chrome",
      profileId,
      extensionId: chrome.runtime.id,
      extensionVersion: chrome.runtime.getManifest().version,
      permissions: { tabs: true, tabGroups: true, bookmarks: true, history: true }
    });
  } catch (error) {
    console.warn("QuickTab native host unavailable", error);
  }
  return port;
}

function handleNativeMessage(message) {
  if (!message || message.protocolVersion?.split(".")[0] !== "1") return;
  if (message.type === "handshake_ack") {
    void syncAll();
  }
  if (message.type === "request_tabs_snapshot") {
    void respondWithTabsSnapshot(message);
  }
  if (message.type === "request_bookmarks_snapshot") {
    void respondWithBookmarksSnapshot(message);
  }
  if (message.type === "activate_tab") {
    void activateTab(message);
  }
  if (message.type === "open_url") {
    void openUrl(message);
  }
}

async function syncAll() {
  await syncTabs();
  await syncBookmarks();
  await syncHistory();
}

async function syncTabs() {
  const tabs = await chrome.tabs.query({});
  const groupLookup = await buildTabGroupLookup(tabs);
  postMessage("tabs_snapshot", { tabs: tabs.filter(isAllowedTab).map((tab) => mapTab(tab, groupLookup)) });
}

async function respondWithTabsSnapshot(message) {
  try {
    await syncTabs();
    postMessage("command_result", { success: true, action: "tabs_snapshot", commandId: message.messageId }, message.messageId);
  } catch (error) {
    postMessage("command_result", {
      success: false,
      action: "tabs_snapshot",
      commandId: message.messageId,
      errorCode: "EXT_TABS_SNAPSHOT_FAILED",
      message: "The browser extension could not read current tabs.",
      technicalMessage: String(error),
      retryable: true
    }, message.messageId);
  }
}

async function respondWithBookmarksSnapshot(message) {
  try {
    await syncBookmarks();
    postMessage("command_result", { success: true, action: "bookmarks_snapshot", commandId: message.messageId }, message.messageId);
  } catch (error) {
    postMessage("command_result", {
      success: false,
      action: "bookmarks_snapshot",
      commandId: message.messageId,
      errorCode: "EXT_BOOKMARKS_SNAPSHOT_FAILED",
      message: "The browser extension could not read bookmarks.",
      technicalMessage: String(error),
      retryable: true
    }, message.messageId);
  }
}

async function syncBookmarks() {
  const tree = await chrome.bookmarks.getTree();
  const bookmarks = [];
  walkBookmarks(tree, [], bookmarks);
  postMessage("bookmarks_snapshot", { bookmarks });
}

async function syncHistory() {
  const startTime = Date.now() - 1000 * 60 * 60 * 24 * HISTORY_LOOKBACK_DAYS;
  const items = await chrome.history.search({ text: "", startTime, maxResults: HISTORY_MAX_RESULTS });
  const batchSize = 250;
  for (let index = 0; index < items.length; index += batchSize) {
    postMessage("history_batch", {
      batchIndex: Math.floor(index / batchSize),
      hasMore: index + batchSize < items.length,
      history: items.slice(index, index + batchSize).filter((item) => isAllowedUrl(item.url)).map(mapHistoryItem)
    });
  }
}

async function sendTabEvent(eventType, tab) {
  if (!isAllowedTab(tab)) return;
  const groupLookup = await buildTabGroupLookup([tab]);
  postMessage("tab_event", { eventType, tab: mapTab(tab, groupLookup) });
}

async function activateTab(message) {
  const ref = message.payload;
  try {
    await chrome.windows.update(ref.windowId, { focused: true });
    await chrome.tabs.update(ref.tabId, { active: true });
    postMessage("command_result", { success: true, action: "activate_tab", commandId: message.messageId }, message.messageId);
  } catch (error) {
    postMessage("command_result", {
      success: false,
      action: "activate_tab",
      commandId: message.messageId,
      errorCode: "EXT_TAB_NOT_FOUND",
      message: "The tab is no longer available.",
      technicalMessage: String(error),
      retryable: true
    }, message.messageId);
  }
}

async function openUrl(message) {
  try {
    await chrome.tabs.create({ url: message.payload?.url });
    postMessage("command_result", { success: true, action: "open_url", commandId: message.messageId }, message.messageId);
  } catch (error) {
    postMessage("command_result", {
      success: false,
      action: "open_url",
      commandId: message.messageId,
      errorCode: "EXT_OPEN_URL_FAILED",
      message: "The browser extension could not open this URL.",
      technicalMessage: String(error),
      retryable: true
    }, message.messageId);
  }
}

function postMessage(type, payload, correlationId) {
  const target = connectNative();
  if (!target) return;
  target.postMessage({
    messageId: crypto.randomUUID(),
    protocolVersion: PROTOCOL_VERSION,
    type,
    browserId,
    profileId,
    timestamp: Date.now(),
    payload,
    correlationId
  });
}

async function buildTabGroupLookup(tabs) {
  const groupIds = [...new Set(tabs.map((tab) => tab.groupId).filter((groupId) => Number.isInteger(groupId) && groupId >= 0))];
  if (!groupIds.length || !chrome.tabGroups?.get) return new Map();

  const entries = await Promise.all(groupIds.map(async (groupId) => {
    try {
      const group = await chrome.tabGroups.get(groupId);
      return [groupId, { title: group.title || "", color: group.color || "" }];
    } catch {
      return [groupId, null];
    }
  }));
  return new Map(entries.filter((entry) => entry[1]?.title));
}

function mapTab(tab, groupLookup = new Map()) {
  const group = groupLookup.get(tab.groupId);
  return {
    browserId,
    profileId,
    windowId: tab.windowId,
    tabId: tab.id,
    url: tab.url,
    title: tab.title,
    active: tab.active,
    lastActivatedAt: tab.active ? Date.now() : Date.now() - 1,
    groupTitle: group?.title,
    groupColor: group?.color
  };
}

function mapHistoryItem(item) {
  return {
    browserId,
    profileId,
    url: item.url,
    title: item.title,
    lastVisitTime: item.lastVisitTime,
    visitCount: item.visitCount,
    typedCount: item.typedCount
  };
}

function walkBookmarks(nodes, folders, out) {
  for (const node of nodes) {
    if (node.url && isAllowedUrl(node.url)) {
      out.push({
        browserId,
        profileId,
        bookmarkId: node.id,
        parentId: node.parentId,
        folderPath: folders.join(" / "),
        url: node.url,
        title: node.title,
        dateAdded: node.dateAdded
      });
    }
    if (node.children) {
      walkBookmarks(node.children, node.title ? [...folders, node.title] : folders, out);
    }
  }
}

function isAllowedTab(tab) {
  return Boolean(tab?.id && isAllowedUrl(tab.url) && !tab.incognito);
}

function isAllowedUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}
