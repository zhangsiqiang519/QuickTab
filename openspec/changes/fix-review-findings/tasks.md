## 1. Update URL Safety

- [x] 1.1 Add a small update URL allowlist helper for release and asset URLs.
- [x] 1.2 Filter untrusted release and asset URLs returned by update metadata.
- [x] 1.3 Reject untrusted renderer-supplied update URLs before calling `shell.openExternal`.
- [x] 1.4 Add tests for allowed and rejected update URLs.

## 2. Shared JSON Storage Locking

- [x] 2.1 Add owner tokens to shared JSON storage lock acquisition.
- [x] 2.2 Change lock release so only the current owner can remove the lock.
- [x] 2.3 Make stale-lock recovery preserve fresh locks owned by another writer.
- [x] 2.4 Add focused concurrency or lock-ownership tests for shared storage updates.

## 3. Extension Sync Deduplication

- [x] 3.1 Add in-flight and completed guards around the extension full `syncAll` flow.
- [x] 3.2 Keep startup and handshake acknowledgement as valid sync triggers without concurrent duplicate runs.
- [x] 3.3 Ensure tab, bookmark, and history incremental events still send after initial sync.
- [x] 3.4 Add or update extension tests covering duplicate startup/handshake sync behavior.

## 4. Preload Bridge Types

- [x] 4.1 Define or reuse the Safari import result object shape for preload typing.
- [x] 4.2 Update `src/preload/preload.ts` and `src/preload/types.d.ts` so `importSafari` returns the object shape used by the renderer.
- [x] 4.3 Confirm renderer Safari import usage typechecks without casts or mismatched assumptions.

## 5. Verification

- [x] 5.1 Run targeted Vitest suites for update handling, storage locking, extension sync, and preload typing.
- [x] 5.2 Run `npm run typecheck`.
- [x] 5.3 Run `npm run build`.
- [x] 5.4 Review the final diff to confirm the implementation stays scoped to the four review findings.
