# Issues

## SCAN-001 2026-05-21T05:30:54.567Z
- SEC-001 [medium] 更新下载入口会打开未校验的远端 URL (/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/main/main.ts:489)
- COR-001 [medium] JSON 文件锁超时后会删除仍可能被持有的锁 (/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/main/services/storage.ts:80)
- PRF-001 [medium] 扩展启动时会重复执行全量同步 (/Users/zhangsiqiang/Documents/person/other_code/QuickTab/extension/chromium/background.js:37)
- MNT-001 [medium] preload 实现签名与公开 Window 类型已发生漂移 (/Users/zhangsiqiang/Documents/person/other_code/QuickTab/src/preload/preload.ts:12)

## REV-001 2026-05-21T13:36:31+08:00
- 确认 4 个 medium 发现均成立，无驳回项。
- 优先级建议：COR-001 > SEC-001 > PRF-001 > MNT-001。
- 详细报告：/Users/zhangsiqiang/Documents/person/other_code/QuickTab/.workflow/.team/RV-2026-05-21-quicktab-review/review/review-report.md
