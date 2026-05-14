import { DEFAULT_SETTINGS, QuickTabSettings } from "../shared.js";
import { normalizeShortcut } from "./shortcut.js";
import { readJsonFile, writeJsonFile } from "./storage.js";

export class SettingsService {
  constructor(private readonly filePath: string) {}

  async get(): Promise<QuickTabSettings> {
    const loaded = await readJsonFile<Partial<QuickTabSettings>>(this.filePath, {});
    return this.normalize(loaded);
  }

  async save(next: Partial<QuickTabSettings>): Promise<QuickTabSettings> {
    const current = await this.get();
    const merged = this.normalize({ ...current, ...next });
    await writeJsonFile(this.filePath, merged);
    return merged;
  }

  private normalize(value: Partial<QuickTabSettings>): QuickTabSettings {
    const shortcut = typeof value.shortcut === "string" ? normalizeShortcut(value.shortcut) : DEFAULT_SETTINGS.shortcut;
    return {
      language: value.language ?? DEFAULT_SETTINGS.language,
      shortcut,
      onboardingCompleted: value.onboardingCompleted ?? DEFAULT_SETTINGS.onboardingCompleted,
      defaultBrowser: value.defaultBrowser ?? DEFAULT_SETTINGS.defaultBrowser,
      browsers: {
        chrome: value.browsers?.chrome ?? DEFAULT_SETTINGS.browsers.chrome,
        edge: value.browsers?.edge ?? DEFAULT_SETTINGS.browsers.edge,
        safari: value.browsers?.safari ?? DEFAULT_SETTINGS.browsers.safari
      },
      dataSources: {
        tabs: value.dataSources?.tabs ?? DEFAULT_SETTINGS.dataSources.tabs,
        bookmarks: value.dataSources?.bookmarks ?? DEFAULT_SETTINGS.dataSources.bookmarks,
        history: value.dataSources?.history ?? DEFAULT_SETTINGS.dataSources.history
      },
      dedupeStrategy: value.dedupeStrategy ?? DEFAULT_SETTINGS.dedupeStrategy,
      ranking: value.ranking ?? DEFAULT_SETTINGS.ranking,
      resultScope: value.resultScope ?? DEFAULT_SETTINGS.resultScope,
      allowFileUrls: value.allowFileUrls ?? DEFAULT_SETTINGS.allowFileUrls,
      showDockIcon: value.showDockIcon ?? DEFAULT_SETTINGS.showDockIcon,
      showMenuBarIcon: value.showMenuBarIcon ?? DEFAULT_SETTINGS.showMenuBarIcon,
      menuBarDisplayMode: value.menuBarDisplayMode === "icon" || value.menuBarDisplayMode === "text" ? value.menuBarDisplayMode : DEFAULT_SETTINGS.menuBarDisplayMode,
      openAtLogin: value.openAtLogin ?? DEFAULT_SETTINGS.openAtLogin
    };
  }
}
