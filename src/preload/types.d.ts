import type { BrowserId, OnboardingStatus, QuickTabSettings, SearchResponse, SearchResult } from "../main/shared";

declare global {
  interface Window {
    quicktab: {
      search(query: string): Promise<SearchResponse>;
      execute(result: SearchResult): Promise<unknown>;
      getSettings(): Promise<QuickTabSettings>;
      getDefaultShortcut(): Promise<string>;
      validateShortcut(shortcut: string): Promise<{ ok: boolean; normalized: string; reason?: string }>;
      saveSettings(settings: Partial<QuickTabSettings>): Promise<QuickTabSettings>;
      clearIndex(): Promise<boolean>;
      importSafari(): Promise<{ ok: boolean; count: number; userMessage?: string; message?: string; path?: string }>;
      openPrivacySettings(): Promise<boolean>;
      diagnostics(): Promise<unknown>;
      getOnboardingStatus(): Promise<OnboardingStatus>;
      completeOnboarding(): Promise<QuickTabSettings>;
      openExtensionManager(browserId: BrowserId): Promise<boolean>;
      prepareExtension(browserId: BrowserId): Promise<boolean>;
      revealExtensionFolder(): Promise<boolean>;
      hide(): Promise<void>;
      minimize(): Promise<void>;
      expandWindow(): Promise<void>;
      holdWindow(durationMs?: number): Promise<void>;
      onFocusSearch(callback: () => void): () => void;
      onOpenSettings(callback: () => void): () => void;
    };
  }
}
