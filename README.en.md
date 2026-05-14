# QuickTab

QuickTab is a macOS desktop launcher for searching and switching browser tabs, bookmarks, and history. It is designed to feel like Spotlight: wake it with a global shortcut, type, select a result, and continue working.

The app supports Chrome, Microsoft Edge, and Safari. Chrome and Edge integration uses a bundled Chromium extension plus Native Messaging. Safari integration uses macOS Automation for open tabs and Full Disk Access for importing Safari bookmarks.

## Why QuickTab Exists

The browser has become the primary workspace, but browsers are still weak at fast navigation across windows, browsers, and data sources. Common problems include:

- Too many tabs make page titles unreadable and target pages hard to identify.
- The same page may already be open in another window or browser, but opening the URL again creates yet another duplicate tab.
- Open tabs, bookmarks, and history live behind different browser surfaces and search behaviors.
- Chrome, Edge, and Safari each expose browser data differently, making cross-browser workflows inconsistent.
- For Chinese pages, users may remember pinyin, partial titles, domains, or bookmark folder names rather than exact text.
- The browser address bar is good for web search, but less effective for returning to an already-open or previously-saved working context.
- macOS Spotlight can launch apps and files, but it does not understand browser tabs, bookmarks, and history as one searchable workspace.

QuickTab turns the browser workspace into a local searchable index. It checks open tabs first, then bookmarks and history; if a page is already open, QuickTab switches to it instead of opening another copy. It does not replace the address bar. It fills the gap between browser search, bookmark management, and tab switching.

## Features

- Spotlight-style global search window.
- Search open tabs, bookmarks, and history.
- Prioritize open tabs when matching the current browser state.
- Open an existing browser tab instead of opening a duplicate URL when possible.
- Use the default browser for direct URL/search actions.
- Chrome, Edge, and Safari source filters.
- Bookmark deduplication by domain + path or by domain.
- Relevance and frequency ranking modes.
- Pinyin search for Chinese titles and URLs.
- Chinese UI by default, with English available in Settings.
- Menu bar mode with text or icon display.
- Optional Dock icon and optional launch at login.
- Automatic settings saving.
- Check GitHub Releases for updates from Settings and open the download page.
- macOS DMG/ZIP packaging through Electron Builder.

## Current Platform Support

QuickTab is currently focused on macOS.

| Platform | Status |
| --- | --- |
| macOS Apple Silicon | Supported and packaged by default |
| macOS Intel | Source should build, but release packaging is not the default in this repo |
| Windows | Partial build config exists, but desktop/browser integration is not the primary target |
| Linux | Source-level support is partial |

## Requirements

- macOS 13 or newer is recommended.
- Node.js 20 or newer.
- npm.
- Chrome and/or Microsoft Edge for Chromium extension integration.
- Safari if you want Safari tabs/bookmarks.

## Install From Release Build

The source repository does not commit the local `release/` output directory. DMG / ZIP files should be downloaded from GitHub Releases, or generated locally with `npm run dist`.

1. Download `QuickTab-<version>-arm64.dmg` from the release.
2. Open the DMG.
3. Drag `QuickTab.app` into `/Applications`.
4. Start QuickTab from `/Applications`.
5. If macOS blocks the app because it is not notarized, open:
   `System Settings > Privacy & Security`, then allow QuickTab manually.

Current local build output is generated in:

```bash
release/QuickTab-0.1.0-arm64.dmg
release/QuickTab-0.1.0-arm64-mac.zip
```

## First Run Setup

QuickTab installs Native Messaging manifests for Chrome and Edge automatically on startup. It also exposes the bundled extension folder from the onboarding screen.

Note: Chrome and Edge do not allow desktop apps to silently install local extensions. QuickTab can prepare Native Messaging, open the extensions page, and reveal the extension folder, but the final `Load unpacked` action must still be confirmed by the user in the browser.

### Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. If you are using QuickTab onboarding, click `Prepare Chrome extension`; QuickTab opens the Chrome extensions page and reveals the extension folder in Finder.
5. Select the bundled extension folder:
   - In development: `extension/chromium`
   - In packaged app: `QuickTab.app/Contents/Resources/extension/chromium`
6. Restart QuickTab if Chrome was already open.

### Microsoft Edge

1. Open `edge://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. If you are using QuickTab onboarding, click `Prepare Edge extension`; QuickTab opens the Edge extensions page and reveals the extension folder in Finder.
5. Select the bundled extension folder:
   - In development: `extension/chromium`
   - In packaged app: `QuickTab.app/Contents/Resources/extension/chromium`
6. Restart QuickTab if Edge was already open.

### Safari

Safari does not use the Chromium extension.

For Safari open-tab control:

1. Open `System Settings > Privacy & Security > Automation`.
2. Allow QuickTab to control Safari.

For Safari bookmark import:

1. Open `System Settings > Privacy & Security > Full Disk Access`.
2. Add and enable `QuickTab.app`.
3. Restart QuickTab.
4. Open Settings and use `Import Safari`.

Safari bookmark import reads:

```bash
~/Library/Safari/Bookmarks.plist
```

macOS blocks this file without Full Disk Access.

## Usage

### Global Shortcut

Default shortcut on macOS:

```text
Alt+Space
```

You can change it in Settings. Shortcut changes are saved automatically.

### Search

Open QuickTab and type:

- Page title
- Domain
- URL
- Bookmark folder text
- Chinese text or pinyin

Use:

- `Enter` to open the selected result.
- `Arrow Up / Arrow Down` to change selection.
- `Esc` to hide QuickTab.
- `Command+,` to open Settings.

If the query does not match an item, QuickTab can search/open it in the default browser.

### Source Modes

The search window provides source filters:

- All sources
- Open tabs
- Library, meaning bookmarks + history

Settings also allow limiting results to:

- All
- Bookmarks only
- History only

Open tabs remain available where relevant so QuickTab can switch to already-open pages.

### Settings

Settings are saved immediately after changes. There is no Save button.

Available settings include:

- Global shortcut.
- Language.
- Launch at login.
- Show/hide Dock icon.
- Show/hide menu bar item.
- Menu bar display mode: `QT` text or icon.
- Browser sources: Chrome, Edge, Safari bookmarks.
- Data sources: tabs, bookmarks, history.
- Bookmark deduplication strategy.
- Ranking mode.
- Result scope.
- Safari bookmark import.
- Clear index.
- Reopen the setup guide to recheck browser extensions, Safari permissions, and shortcut setup.
- Check for updates and open the GitHub Release download page when a new version is available.

The current update flow checks GitHub Releases and opens the download page for manual installation. Full silent auto-install on macOS requires stable signing, notarization, and an update feed; for the current open-source distribution model, manual update triggering is more reliable.

## Development

Install dependencies:

```bash
npm install
```

Run the renderer dev server and Electron app:

```bash
npm run dev:electron
```

Run tests:

```bash
npm test -- --run
```

Run TypeScript checks:

```bash
npm run typecheck
```

Build production assets:

```bash
npm run build
```

Create unpacked Electron app:

```bash
npm run package
```

Create macOS DMG/ZIP:

```bash
npm run dist
```

## Native Messaging

QuickTab uses the Native Messaging host name:

```text
com.quicktab.ai
```

The name is kept for compatibility with existing installs even though the product name is QuickTab.

Native host manifests are installed to:

```bash
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.quicktab.ai.json
~/Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.quicktab.ai.json
```

Runtime shared data is stored at:

```bash
~/.quicktab-ai
```

Electron user data is stored at:

```bash
~/Library/Application Support/quicktab-ai
```

These legacy paths are also kept for compatibility.

To remove only the Native Messaging manifests from a development checkout:

```bash
npm run unregister:native-host
```

## Complete Uninstall On macOS

Use this if you want to remove QuickTab completely, including the app, local index, settings, Native Messaging config, and browser extensions. Installed-app users should prefer in-app uninstall. Developers or source checkout users can use the uninstall script.

### Option 1: In-App Uninstall Recommended

Installed Mac builds can be removed directly from QuickTab:

```text
Settings > Danger zone > Uninstall QuickTab
```

Before uninstalling, you can choose whether to enable:

```text
Also clear local data, index, and settings
```

The in-app uninstall flow will:

- Quit QuickTab.
- Disable QuickTab login startup.
- Remove the installed `QuickTab.app`.
- Remove Chrome / Edge Native Messaging manifests.
- If data cleanup is enabled: remove the local index, settings, logs, preferences, and saved state.

Note: browsers do not allow desktop apps to silently remove extensions, so Chrome / Edge extensions still need to be removed from each browser extension page.

### Option 2: Source Script Cleanup

This command is only for users who have cloned the source repository. Run it from the project root that contains `package.json`:

```bash
cd /path/to/QuickTab
npm run uninstall:mac
```

If you know the absolute script path, you can run it directly:

```bash
bash /path/to/QuickTab/scripts/uninstall-macos.sh
```

The script removes:

- `/Applications/QuickTab.app`
- Chrome Native Messaging manifest
- Edge Native Messaging manifest
- `~/Library/Application Support/quicktab-ai`
- `~/.quicktab-ai`
- selected QuickTab preferences/saved state files
- resettable macOS privacy prompts where `tccutil` permits it

The script also cannot remove browser extensions for you; Chrome / Edge extensions need manual cleanup.

### Option 3: Manual Cleanup

1. Quit QuickTab from the menu bar or Activity Monitor.
2. Delete the app:

```bash
rm -rf /Applications/QuickTab.app
```

3. Remove Native Messaging manifests:

```bash
rm -f "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.quicktab.ai.json"
rm -f "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.quicktab.ai.json"
```

4. Remove QuickTab data:

```bash
rm -rf "$HOME/Library/Application Support/quicktab-ai"
rm -rf "$HOME/.quicktab-ai"
rm -f "$HOME/Library/Preferences/com.quicktab.ai.plist"
rm -rf "$HOME/Library/Saved Application State/com.quicktab.ai.savedState"
```

5. Remove browser extensions manually:

- Chrome: open `chrome://extensions`, remove QuickTab.
- Edge: open `edge://extensions`, remove QuickTab.

6. Remove login item manually:

```text
System Settings > General > Login Items
```

Remove QuickTab if it is listed.

7. Remove privacy permissions manually if they remain:

```text
System Settings > Privacy & Security > Automation
System Settings > Privacy & Security > Full Disk Access
```

Remove or disable QuickTab if it is listed.

## Troubleshooting

### Global shortcut does not wake QuickTab

- Check Settings and make sure the shortcut is enabled.
- Try another shortcut if macOS or another app owns the current shortcut.
- Restart QuickTab after installing a new build.

### Chrome or Edge tabs/bookmarks do not sync

- Make sure the extension is loaded from `extension/chromium`.
- Make sure QuickTab has installed Native Messaging manifests.
- Restart the browser after loading the extension.
- Open QuickTab Diagnostics from onboarding/settings if available.

### Safari import fails

Grant Full Disk Access to QuickTab and restart the app. Safari bookmarks are stored in a protected macOS location.

### Menu bar item is missing

- Open Settings and enable `Show in menu bar`.
- Switch menu bar style between `QT text` and `Icon`.
- Restart QuickTab after changing installed builds.

## Repository Structure

```text
src/main/                 Electron main process
src/main/services/        Indexing, settings, native host, browser integration
src/main/native/          Native Messaging host entrypoint
src/renderer/             React UI
src/preload/              Electron preload bridge
extension/chromium/       Chrome/Edge extension
scripts/                  Packaging and maintenance scripts
docs/                     Implementation notes
release/                  Local build output, not intended for source control
```

## Open Source License

QuickTab is released under the MIT License. See [LICENSE](./LICENSE).

### How To Get Or Change The License

For this repository, the license is already included as `LICENSE`.

If you are creating your own open-source project and need a license:

1. Go to <https://choosealicense.com/>.
2. Select a license that matches your goals.
3. For a permissive license, MIT is a common default.
4. Copy the license text into a `LICENSE` file at the repository root.
5. Set the same license identifier in `package.json`, for example:

```json
{
  "license": "MIT"
}
```

Do not publish a repository as open source without a license file. Without an explicit license, others generally do not have clear permission to use, modify, or redistribute the code.

## Security And Privacy Notes

QuickTab stores browser-derived index data locally. It does not require a cloud service.

Data locations:

```bash
~/Library/Application Support/quicktab-ai
~/.quicktab-ai
```

Browser integration requires local permissions:

- Chrome/Edge Native Messaging for extension communication.
- macOS Automation for controlling Safari/open browser tabs.
- Full Disk Access only when importing Safari bookmarks.

Review the code and requested permissions before distributing a public release.

## Release Checklist

Before publishing a public release:

1. Update `version` in `package.json`.
2. Run:

```bash
npm run typecheck
npm test -- --run
npm run dist
```

3. Verify the DMG on a clean macOS account.
4. Confirm install, first run, menu bar item, shortcut wake, browser extension setup, Safari permissions, and uninstall.
5. For broad distribution, configure Apple Developer signing and notarization. The local build currently falls back to ad-hoc signing if no signing identity is configured.

## Creating A GitHub Release

`release/` is a local build output directory and is ignored by `.gitignore`, so it will not appear in the GitHub repository file list. GitHub Releases are not normal git-tracked files; they must be created through tags, GitHub Actions, or the GitHub UI.

This repository includes a GitHub Actions release workflow:

```text
.github/workflows/release.yml
```

Recommended release flow:

```bash
npm version patch
git push origin main
git push origin --tags
```

When the tag matches `v*`, for example `v0.1.1`, GitHub Actions will automatically:

1. Install dependencies.
2. Run typecheck.
3. Run tests.
4. Run `npm run dist`.
5. Upload `release/*.dmg` and `release/*.zip` to the GitHub Release.

If you do not want tag-based automation, create a Release manually:

1. Open the GitHub repository page.
2. Go to `Releases`.
3. Click `Draft a new release`.
4. Create or select a tag, for example `v0.1.0`.
5. Upload local `release/QuickTab-*.dmg` and `release/QuickTab-*.zip` files.
6. Publish the Release.
