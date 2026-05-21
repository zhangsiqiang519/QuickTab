# Learnings

## REV-001 2026-05-21T13:36:31+08:00
- 更新链接这类外部动作必须在 Electron 主进程 IPC 边界做 allowlist，不能只相信渲染层或远端 API 字段。
- 共享 JSON 文件锁需要 owner token、stale lock 判定和 release 校验，否则 native host 与主进程并发写入会破坏读改写语义。
- preload bridge 应有单一共享类型来源，避免 `preload.ts`、`types.d.ts`、主进程 handler 与渲染层各自漂移。
