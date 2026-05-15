# Bookmark Sync Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让标签页、书签和搜索结果在扩展事件、主动刷新、并发写入下保持一致，降低“最新增加的书签搜不到”的概率。

**Architecture:** 保留现有 Electron + Native Messaging + JSON 存储架构，做最小增强：JSON 更新改成锁内读改写；全量快照走 replace 语义；搜索前按节流主动请求书签快照；renderer 只接受最新搜索响应。

**Tech Stack:** Electron, React, TypeScript, Vitest, Chrome/Edge MV3 extension, Native Messaging.

---

### Task 1: JSON 事务级更新

**Files:**
- Modify: `src/main/services/storage.ts`
- Modify: `src/main/services/index-service.ts`
- Modify: `src/main/services/command-queue.ts`
- Test: `tests/index-service.test.ts`

- [ ] **Step 1: Add a failing concurrency test**

在 `tests/index-service.test.ts` 增加并发写入测试：

```ts
it("keeps concurrent tab and bookmark writes in the index", async () => {
  await Promise.all([
    service.upsertTabs([
      {
        browserId: "chrome",
        profileId: "default",
        windowId: 1,
        tabId: 1,
        url: "https://tabs.example.com",
        title: "Concurrent Tab"
      }
    ]),
    service.upsertBookmarks([
      {
        browserId: "chrome",
        profileId: "default",
        bookmarkId: "concurrent-bookmark",
        url: "https://bookmarks.example.com",
        title: "Concurrent Bookmark"
      }
    ])
  ]);

  const tabResponse = await service.search("Concurrent Tab");
  const bookmarkResponse = await service.search("Concurrent Bookmark");
  expect(tabResponse.results).toHaveLength(1);
  expect(bookmarkResponse.results).toHaveLength(1);
});
```

- [ ] **Step 2: Run targeted test**

Run: `npm test -- tests/index-service.test.ts`

Expected: 当前实现存在读改写竞争，该测试可能失败或不稳定；实现完成后必须稳定通过。

- [ ] **Step 3: Implement locked update helper**

在 `src/main/services/storage.ts` 新增 `updateJsonFile<T>`，在同一个文件锁内完成读取、修改、写入。

- [ ] **Step 4: Route mutating services through update helper**

`IndexService` 所有修改型方法和 `CommandQueue` 的 `enqueue/claimPending/complete` 改成 `updateJsonFile`。

- [ ] **Step 5: Verify**

Run: `npm test -- tests/index-service.test.ts`

Expected: PASS。

### Task 2: 全量快照使用 replace 语义

**Files:**
- Modify: `src/main/services/index-service.ts`
- Modify: `src/main/native/native-host.ts`
- Modify: `src/main/services/safari-importer.ts`
- Test: `tests/index-service.test.ts`

- [ ] **Step 1: Add tab snapshot replacement test**

在 `tests/index-service.test.ts` 增加测试，验证旧标签在新快照后消失。

- [ ] **Step 2: Implement replace path**

`tabs_snapshot` 调用 `replaceOpenTabs`；Safari 书签导入调用 `replaceBookmarks("safari", "default", bookmarks)`。

- [ ] **Step 3: Verify**

Run: `npm test -- tests/index-service.test.ts`

Expected: PASS。

### Task 3: 主动请求 Chrome/Edge 书签快照

**Files:**
- Modify: `extension/chromium/background.js`
- Modify: `src/main/shared.ts`
- Modify: `src/main/native/native-host.ts`
- Modify: `src/main/main.ts`

- [ ] **Step 1: Extend extension command handling**

扩展接收 `request_bookmarks_snapshot` 时调用 `syncBookmarks()` 并返回 `command_result`。

- [ ] **Step 2: Extend desktop command typing and native-host result mapping**

`CommandResult.action` 增加 `"bookmarks_snapshot"`；native-host 接收 command_result 时保留该 action。

- [ ] **Step 3: Search-time throttled refresh**

在主进程搜索前，若启用书签数据源，按浏览器和节流时间请求 `request_bookmarks_snapshot`，不阻塞太久。

- [ ] **Step 4: Verify**

Run: `npm run typecheck`

Expected: PASS。

### Task 4: Renderer 搜索响应防旧结果覆盖

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Add latest-request guard**

使用 `useRef(0)` 保存最新搜索序号；每次搜索递增序号，只允许最新请求更新 `results/status/sourceStatus`。

- [ ] **Step 2: Verify**

Run: `npm run typecheck`

Expected: PASS。

### Task 5: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit 0.
