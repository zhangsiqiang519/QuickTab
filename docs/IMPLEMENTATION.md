# QuickTab MVP Implementation

## Scope

This repository implements a runnable V0.1 skeleton for the documentation package:

- `QT-MVP-01` project boundaries for Electron desktop, Chromium extension, and Native Messaging host.
- `QT-MVP-03` floating search window with keyboard navigation and empty/error states.
- `QT-MVP-05` Chrome/Edge MV3 extension for tabs, bookmarks, and history.
- `QT-MVP-07` Native Messaging handshake and validation.
- `QT-MVP-08` tabs sync.
- `QT-MVP-09` bookmarks sync.
- `QT-MVP-10` history batch sync.
- `QT-MVP-11` local search, ranking, URL normalization, and de-duplication.
- `QT-MVP-12` activate/open command routing with safe URL checks.
- `QT-MVP-13` settings for shortcut, data sources, and clear index.
- `QT-MVP-14` local diagnostics and redacted logs.

## Run

```bash
npm install
npm run build
npm run dev:electron
```

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run smoke:native-host
npm run package
```

## Extension

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable developer mode.
3. Generate a stable unpacked extension ID:

```bash
npm run extension:prepare
```

4. Load unpacked extension from `extension/chromium`.
5. The desktop app also auto-registers Native Host manifests on startup. The CLI registration command remains available for development workflows.
6. You can still override IDs explicitly:

```bash
npm run register:native-host -- --chrome-extension-id=<chrome_id> --edge-extension-id=<edge_id>
```

Unregister native host manifests:

```bash
npm run unregister:native-host
```

## Privacy Boundaries

QuickTab stores URL metadata, titles, source browser, profile, and timestamps locally. It does not read cookies, passwords, page bodies, form data, private browsing windows, or browser profile databases.

## Known Limits

The MVP uses a JSON-backed local index to keep the first implementation portable and testable. The service boundary matches the docs so SQLite + FTS5 can replace it without changing renderer or extension contracts.

Desktop and Native Host processes share `~/.quicktab-ai` by default. The desktop queues `activate_tab` and `open_url` commands into `commands.json`; the extension sends a heartbeat over Native Messaging and receives queued commands from the Native Host. Command results are written back to the same queue for the desktop to observe.

## Release Notes

- macOS directory packaging has been verified with `electron-builder --dir`.
- Full macOS distribution still requires a product icon, Apple Developer signing identity, hardened runtime entitlements review, and notarization credentials.
- Windows installer configuration is present. Native Host registry registration is implemented in `scripts/register-native-host.mjs`, but must be verified on a Windows machine.
- Real browser E2E requires loading `extension/chromium`, registering the generated extension ID, then validating sync/search/activate/open with Chrome and Edge.
