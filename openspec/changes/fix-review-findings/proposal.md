## Why

The latest review confirmed four medium-severity issues in QuickTab that affect update-link safety, shared JSON storage correctness, extension startup performance, and preload API maintainability. Addressing them now reduces security and data consistency risk before more features build on these paths.

## What Changes

- Add main-process validation for update URLs before opening release or installer links.
- Make shared JSON storage locking owner-aware so one process cannot delete or release another process's active lock.
- Deduplicate extension startup synchronization so tabs, bookmarks, and history are not synced twice during initial native-host handshake.
- Align the preload bridge typing for Safari import results with the main-process return shape and renderer usage.

## Capabilities

### New Capabilities

- `update-url-safety`: Validates update-related URLs before the app opens external links.
- `shared-json-storage-locking`: Defines safe lock ownership and stale-lock behavior for shared JSON storage.
- `extension-sync-deduplication`: Prevents duplicate initial browser extension synchronization work.
- `preload-bridge-types`: Keeps preload bridge contracts aligned across main, preload, and renderer layers.

### Modified Capabilities

None.

## Impact

- Main process update handling in `src/main/services/update-service.ts` and `src/main/main.ts`.
- Shared storage locking in `src/main/services/storage.ts` and tests covering concurrent writes.
- Chromium extension startup synchronization in `extension/chromium/background.js`.
- Preload bridge types in `src/preload/preload.ts`, `src/preload/types.d.ts`, and renderer call sites.
- Existing Electron, Vitest, and TypeScript build/test workflows; no new runtime dependencies expected.
