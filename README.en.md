# QuickTab ✨

![Version](https://img.shields.io/badge/version-0.1.7-blue.svg)
![macOS](https://img.shields.io/badge/macOS-supported-black.svg)
![Windows](https://img.shields.io/badge/Windows-supported-0078D4.svg)
![Chrome](https://img.shields.io/badge/Chrome-supported-4285F4.svg)
![Edge](https://img.shields.io/badge/Edge-supported-0078D7.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Search and switch browser tabs, bookmarks, and history like Spotlight.**

[中文 README](./README.md) · [Features](#-features) · [Download](#-download) · [Quick Start](#-quick-start) · [Usage](#️-usage) · [FAQ](#-faq)

---

## Overview

QuickTab is a desktop browser workspace search tool. Open it with a global shortcut, type a page title, domain, URL, Chinese keyword, or pinyin, then jump straight to the page you need.

It is built for people who work with many browsers, windows, and tabs at the same time. QuickTab prioritizes pages that are already open, so you can switch back to existing tabs instead of opening duplicates.

---

## ✨ Features

- **Global launcher**: open the search window with a shortcut.
- **Multi-source search**: search open tabs, bookmarks, and history.
- **Tab-first results**: switch to an existing tab when the page is already open.
- **Browser support**: Chrome and Microsoft Edge; Safari on macOS.
- **Chinese-friendly search**: search by Chinese title, pinyin, domain, URL, and bookmark folder.
- **Result filters**: filter by all sources, tabs, bookmarks, or history.
- **Bookmark dedupe**: reduce repeated results from the same domain or path.
- **Bilingual UI**: Chinese and English.
- **System integration**: launch at login, tray/menu bar entry, and custom shortcuts.
- **Update check**: check for new releases from Settings and open the download page.

---

## Platform Support

| Platform | Status | Notes |
| --- | --- | --- |
| macOS Apple Silicon | ✅ Supported | `.dmg` and `.zip` builds |
| Windows x64 | ✅ Supported | `.exe` installer |
| Chrome | ✅ Supported | Connected through browser extension |
| Microsoft Edge | ✅ Supported | Connected through browser extension |
| Safari | ✅ Supported | macOS only |

---

## 📦 Download

Download the latest version from GitHub Releases:

**[Download QuickTab](https://github.com/zhangsiqiang519/QuickTab/releases/latest)**

Release builds include:

| System | File |
| --- | --- |
| macOS | `QuickTab-<version>-arm64.dmg` |
| macOS | `QuickTab-<version>-arm64-mac.zip` |
| Windows | `QuickTab-<version>-x64.exe` |

---

## 🚀 Quick Start

### macOS

1. Download `QuickTab-<version>-arm64.dmg`.
2. Open the DMG.
3. Drag `QuickTab.app` into `Applications`.
4. Launch QuickTab.
5. If macOS blocks the app, allow it from `System Settings > Privacy & Security`.

### Windows

1. Download `QuickTab-<version>-x64.exe`.
2. Run the installer.
3. Launch QuickTab.
4. Follow the first-run setup guide to connect Chrome or Edge.

---

## 🔌 Browser Connection

QuickTab uses a browser extension to read Chrome and Edge tabs, bookmarks, and history. During setup, QuickTab opens the browser extension page and shows the bundled extension folder.

### Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Go back to QuickTab and click `Prepare Chrome extension`.
5. Select the extension folder shown by QuickTab.
6. If the extension does not connect immediately, restart Chrome and QuickTab.

### Microsoft Edge

1. Open `edge://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Go back to QuickTab and click `Prepare Edge extension`.
5. Select the extension folder shown by QuickTab.
6. If the extension does not connect immediately, restart Edge and QuickTab.

### Safari (macOS Only)

Safari does not use the Chrome / Edge extension.

To switch open Safari tabs:

1. Open `System Settings > Privacy & Security > Automation`.
2. Allow QuickTab to control Safari.

To import Safari bookmarks:

1. Open `System Settings > Privacy & Security > Full Disk Access`.
2. Add and enable QuickTab.
3. Restart QuickTab.
4. Open QuickTab Settings and click `Import Safari`.

---

## ⌨️ Usage

### Default Shortcuts

| System | Shortcut |
| --- | --- |
| macOS | `Alt+Space` |
| Windows | `Ctrl+Shift+K` |

You can change the shortcut in Settings or disable the global shortcut entirely.

### Search Inputs

- Page title
- Domain
- URL
- Bookmark folder name
- Chinese keywords
- Pinyin

### Keyboard Controls

| Key | Action |
| --- | --- |
| `Enter` | Open or switch to the selected result |
| `↑ / ↓` | Move selection |
| `Esc` | Hide QuickTab |
| `Ctrl+,` / `Command+,` | Open Settings |

If there is no matching result, QuickTab opens or searches your input with the system default browser.

---

## ⚙️ Settings

Settings are saved automatically. Common options include:

- Shortcut.
- UI language.
- Launch at login.
- Taskbar, Dock, tray, or menu bar visibility.
- Enabled browser sources.
- Enabled data sources: tabs, bookmarks, and history.
- Result scope.
- Ranking mode.
- Bookmark deduplication mode.
- Clear local index.
- Reopen setup guide.
- Check for updates.

---

## ❓ FAQ

### Why do I need to load the browser extension manually?

Chrome and Edge do not allow desktop apps to silently install local extensions. QuickTab can prepare the folder and open the extensions page, but you still need to confirm loading the extension in the browser.

### Why are Chrome or Edge tabs missing from search?

Check that:

- The browser extension is loaded.
- The extension is enabled.
- QuickTab setup has completed the browser connection.
- The browser and QuickTab have been restarted after setup.

### Why can QuickTab not read Safari bookmarks on macOS?

Safari bookmarks are protected by macOS. Allow QuickTab in `System Settings > Privacy & Security > Full Disk Access`, then restart the app.

### Does QuickTab upload browser data?

No. QuickTab keeps its search index on your computer for local search and tab switching.

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

If QuickTab helps you, a Star is appreciated.
