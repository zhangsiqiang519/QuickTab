# QuickTab Reviewer 复核报告

## 结论

基于 `/Users/zhangsiqiang/Documents/person/other_code/QuickTab/.workflow/.team/RV-2026-05-21-quicktab-review/scan/scan-results.json` 和源码复核，4 个扫描发现均确认成立，严重级别维持 medium。未修改项目源码。

Gemini 与 qwen CLI 不可用；codex 降级富化完成。`ccw spec load --category review` 未找到匹配规范。

## 指标

| 维度 | medium | 合计 |
| --- | ---: | ---: |
| SEC | 1 | 1 |
| COR | 1 | 1 |
| PRF | 1 | 1 |
| MNT | 1 | 1 |

- 总发现：4
- 确认：4
- 驳回：0
- 可修复：4
- 适合自动修复：3（SEC-001、PRF-001、MNT-001）

## 确认发现

| ID | 严重级别 | 维度 | 位置 | 结论 |
| --- | --- | --- | --- | --- |
| SEC-001 | medium | SEC | `/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/main/main.ts:489` | 更新 URL 从远端响应和渲染层参数进入主进程 `shell.openExternal`，缺少主进程 allowlist 校验。 |
| COR-001 | medium | COR | `/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/main/services/storage.ts:80` | 文件锁超时后会删除可能仍被其他进程持有的 lock，release 也不校验 owner，影响共享 JSON 存储。 |
| PRF-001 | medium | PRF | `/Users/zhangsiqiang/Documents/person/other_code/QuickTab/extension/chromium/background.js:37` | 扩展启动后立即 `syncAll`，收到 `handshake_ack` 后再次 `syncAll`，会重复执行全量同步。 |
| MNT-001 | medium | MNT | `/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/preload/preload.ts:12` | `importSafari` 的 preload 实现类型与主进程返回值、Window 声明、渲染层使用方式不一致。 |

## 关键证据

- SEC-001：`/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/main/services/update-service.ts:42` 透传 `release.html_url`，`:43` 透传下载资产 URL；`/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/renderer/src/App.tsx:1113` 将其传入 `openUpdateUrl`；`/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/main/main.ts:491` 直接 `shell.openExternal`。
- COR-001：`/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/main/services/storage.ts:80-82` 超时或异常后删除 lock 并继续；`:76-78` release 无 token 校验；`/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/main/native/native-host.ts:8-10` 与主进程共享数据文件。
- PRF-001：`/Users/zhangsiqiang/Documents/person/other_code/QuickTab/extension/chromium/background.js:42-43` 顶层同步，`:73-75` handshake ack 再同步，`:143-151` 历史最多 2000 条并分批发送。
- MNT-001：`/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/preload/preload.ts:12` 标注 `Promise<number>`；`/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/main/main.ts:421-436` 返回对象；`/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/preload/types.d.ts:13` 和 `App.tsx:1189-1197` 均按对象使用。

## 修复范围建议

1. 先修 COR-001：只改 `storage.ts` 的锁所有权、stale lock 处理和临时文件命名，补跨进程并发测试。这是影响面最大的正确性问题。
2. 再修 SEC-001：在 `update-service.ts` 和 `main.ts` 双层校验更新 URL。保持渲染层调用不变即可，除非选择枚举动作方案。
3. PRF-001 可小范围修复：保留 handshake ack 后一次初始同步，并给 `syncAll` 增加 in-flight/initialSyncCompleted 去重。
4. MNT-001 可先最小修正返回类型；后续再抽共享 `QuickTabBridge` 或 `ImportSafariResult` 类型，防止桥接 API 再次漂移。

## 产物

- `/Users/zhangsiqiang/Documents/person/other_code/QuickTab/.workflow/.team/RV-2026-05-21-quicktab-review/review/enriched-findings.json`
- `/Users/zhangsiqiang/Documents/person/other_code/QuickTab/.workflow/.team/RV-2026-05-21-quicktab-review/review/review-report.json`
- `/Users/zhangsiqiang/Documents/person/other_code/QuickTab/.workflow/.team/RV-2026-05-21-quicktab-review/review/review-report.md`
