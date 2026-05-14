const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("quicktab", {
    search: (query) => ipcRenderer.invoke("quicktab:search", query),
    execute: (result) => ipcRenderer.invoke("quicktab:execute", result),
    getSettings: () => ipcRenderer.invoke("quicktab:get-settings"),
    getDefaultShortcut: () => ipcRenderer.invoke("quicktab:get-default-shortcut"),
    validateShortcut: (shortcut) => ipcRenderer.invoke("quicktab:validate-shortcut", shortcut),
    saveSettings: (settings) => ipcRenderer.invoke("quicktab:save-settings", settings),
    clearIndex: () => ipcRenderer.invoke("quicktab:clear-index"),
    importSafari: () => ipcRenderer.invoke("quicktab:import-safari"),
    openPrivacySettings: () => ipcRenderer.invoke("quicktab:open-privacy-settings"),
    diagnostics: () => ipcRenderer.invoke("quicktab:diagnostics"),
    getOnboardingStatus: () => ipcRenderer.invoke("quicktab:get-onboarding-status"),
    completeOnboarding: () => ipcRenderer.invoke("quicktab:complete-onboarding"),
    openExtensionManager: (browserId) => ipcRenderer.invoke("quicktab:open-extension-manager", browserId),
    prepareExtension: (browserId) => ipcRenderer.invoke("quicktab:prepare-extension", browserId),
    revealExtensionFolder: () => ipcRenderer.invoke("quicktab:reveal-extension-folder"),
    hide: () => ipcRenderer.invoke("quicktab:hide"),
    minimize: () => ipcRenderer.invoke("quicktab:minimize"),
    expandWindow: () => ipcRenderer.invoke("quicktab:expand-window"),
    holdWindow: (durationMs) => ipcRenderer.invoke("quicktab:hold-window", durationMs),
    onFocusSearch: (callback) => {
        ipcRenderer.on("quicktab:focus-search", callback);
        return () => ipcRenderer.removeListener("quicktab:focus-search", callback);
    },
    onOpenSettings: (callback) => {
        ipcRenderer.on("quicktab:open-settings", callback);
        return () => ipcRenderer.removeListener("quicktab:open-settings", callback);
    }
});
