## Context

QuickTab is an Electron app with a main process, preload bridge, React renderer, and Chromium extension. The review report for `RV-2026-05-21-quicktab-review` confirmed four medium issues across those boundaries: update links enter `shell.openExternal`, shared JSON storage is used by both the app and native host, the extension can perform duplicate initial syncs, and Safari import bridge typing differs between layers.

The implementation should stay small and local to the affected modules. No new runtime dependencies are expected.

## Goals / Non-Goals

**Goals:**

- Validate update URLs before opening them from the main process.
- Preserve shared JSON storage correctness when multiple processes contend for the same lock.
- Avoid duplicate full synchronization during extension startup and native-host handshake.
- Make Safari import return types consistent across preload declarations and renderer usage.
- Add focused tests for the behaviors that can regress.

**Non-Goals:**

- Rebuild the update system, change the update provider, or add notarization/release automation.
- Replace JSON file storage with a database.
- Change browser extension permissions or data collection scope.
- Redesign the preload bridge beyond the affected Safari import contract.

## Decisions

1. Validate update URLs in the main process, not only in the renderer.

   Rationale: renderer inputs are not a trust boundary. `openUpdateUrl` should reject unsafe or unexpected hosts immediately before `shell.openExternal`.

   Alternative considered: sanitize only in `UpdateService`. This reduces accidental bad release metadata, but it does not protect the IPC method when a renderer-supplied URL is passed directly.

2. Use owner-aware lock files for shared JSON writes.

   Rationale: a process should only release the lock it created, and stale-lock handling should avoid deleting an active lock without checking owner/age. This keeps the current file-based storage while improving correctness.

   Alternative considered: use an external locking package. That adds dependency and packaging surface for a narrow local issue.

3. Add in-flight and completed guards around extension `syncAll`.

   Rationale: startup and `handshake_ack` are both valid triggers, but only one full initial sync should run at a time. A small guard preserves existing sync behavior while eliminating duplicate work.

   Alternative considered: remove one trigger. That risks missing initial sync when native messaging connects after extension startup.

4. Align the existing Safari import result shape instead of introducing a broad bridge abstraction now.

   Rationale: the renderer already expects an object result. Correcting preload and window types is the smallest fix. A shared bridge type can be introduced later if more bridge drift appears.

   Alternative considered: move all IPC bridge types into a shared module. Useful long term, but broader than this review-finding fix.

## Risks / Trade-offs

- Update URL allowlist could block a legitimate future release mirror -> keep allowed hosts explicit and covered by tests so changes are intentional.
- Lock timeout behavior can still be imperfect if the process is paused for longer than the stale threshold -> use ownership checks and conservative stale detection to avoid deleting fresh locks.
- Sync deduplication might suppress a needed follow-up sync if implemented as a permanent block -> distinguish in-flight work from completed initial sync and preserve event-driven incremental updates.
- Type alignment may reveal existing assumptions in tests or renderer code -> update only Safari import types and keep runtime shape unchanged.

## Migration Plan

1. Implement and test the four fixes in small commits or patches.
2. Run `npm run typecheck`, targeted Vitest suites, and `npm run build`.
3. If a fix causes regression, revert only the affected module; the changes are independent and can be rolled back separately.

## Open Questions

- Which update hosts should be allowed besides the current GitHub release and asset URLs, if any?
- What stale-lock timeout is appropriate for slow disks or suspended native-host writes?
