import { contextBridge, ipcRenderer } from "electron";
import type { BrowserId, OnboardingStatus, QuickTabSettings, SearchResponse, SearchResult } from "../main/shared.js";

contextBridge.exposeInMainWorld("quicktab", {
  search: (query: string): Promise<SearchResponse> => ipcRenderer.invoke("quicktab:search", query),
  execute: (result: SearchResult) => ipcRenderer.invoke("quicktab:execute", result),
  getSettings: (): Promise<QuickTabSettings> => ipcRenderer.invoke("quicktab:get-settings"),
  getDefaultShortcut: (): Promise<string> => ipcRenderer.invoke("quicktab:get-default-shortcut"),
  validateShortcut: (shortcut: string): Promise<{ ok: boolean; normalized: string; reason?: string }> => ipcRenderer.invoke("quicktab:validate-shortcut", shortcut),
  saveSettings: (settings: Partial<QuickTabSettings>): Promise<QuickTabSettings> => ipcRenderer.invoke("quicktab:save-settings", settings),
  clearIndex: (): Promise<boolean> => ipcRenderer.invoke("quicktab:clear-index"),
  importSafari: (): Promise<number> => ipcRenderer.invoke("quicktab:import-safari"),
  openPrivacySettings: (): Promise<boolean> => ipcRenderer.invoke("quicktab:open-privacy-settings"),
  diagnostics: () => ipcRenderer.invoke("quicktab:diagnostics"),
  getOnboardingStatus: (): Promise<OnboardingStatus> => ipcRenderer.invoke("quicktab:get-onboarding-status"),
  completeOnboarding: (): Promise<QuickTabSettings> => ipcRenderer.invoke("quicktab:complete-onboarding"),
  openExtensionManager: (browserId: BrowserId): Promise<boolean> => ipcRenderer.invoke("quicktab:open-extension-manager", browserId),
  prepareExtension: (browserId: BrowserId): Promise<boolean> => ipcRenderer.invoke("quicktab:prepare-extension", browserId),
  revealExtensionFolder: (): Promise<boolean> => ipcRenderer.invoke("quicktab:reveal-extension-folder"),
  hide: (): Promise<void> => ipcRenderer.invoke("quicktab:hide"),
  minimize: (): Promise<void> => ipcRenderer.invoke("quicktab:minimize"),
  expandWindow: (): Promise<void> => ipcRenderer.invoke("quicktab:expand-window"),
  holdWindow: (durationMs?: number): Promise<void> => ipcRenderer.invoke("quicktab:hold-window", durationMs),
  checkForUpdates: () => ipcRenderer.invoke("quicktab:check-for-updates"),
  openUpdateUrl: (url?: string): Promise<boolean> => ipcRenderer.invoke("quicktab:open-update-url", url),
  onFocusSearch: (callback: () => void) => {
    ipcRenderer.on("quicktab:focus-search", callback);
    return () => ipcRenderer.removeListener("quicktab:focus-search", callback);
  },
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on("quicktab:open-settings", callback);
    return () => ipcRenderer.removeListener("quicktab:open-settings", callback);
  }
});
