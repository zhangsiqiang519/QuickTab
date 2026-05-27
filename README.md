# QuickTab

![Release](https://img.shields.io/github/v/release/zhangsiqiang519/QuickTab?label=release)
![macOS](https://img.shields.io/badge/macOS-supported-black.svg)
![Windows](https://img.shields.io/badge/Windows-supported-0078D4.svg)
![Chrome](https://img.shields.io/badge/Chrome-supported-4285F4.svg)
![Edge](https://img.shields.io/badge/Edge-supported-0078D7.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**像 Spotlight 一样搜索和切换浏览器标签页、书签与历史记录。**

[English README](./README.en.md) · [下载](#下载) · [快速开始](#快速开始) · [浏览器连接](#浏览器连接) · [开发](#开发) · [隐私](#隐私)

---

## 为什么需要 QuickTab

当浏览器里打开了太多页面，标签标题会被挤没，最后只能靠图标和运气找页面。

![浏览器中打开了大量标签页，标题被压缩后很难定位目标页面](./docs/assets/problem-many-tabs.svg)

QuickTab 把多个浏览器的打开标签页、书签和历史记录集合到一个本地搜索窗口。唤醒、输入关键词、回车，就可以切回已有页面；如果结果来自书签、历史记录或需要按 URL 打开，QuickTab 会用你设置的默认浏览器打开。

![QuickTab 搜索 linux 相关标签页、书签和历史记录](./docs/assets/quicktab-search.svg)

## 功能

- 全局快捷键唤醒，适合高频切换浏览器页面。
- 集合多个浏览器的打开标签页、书签和历史记录并统一搜索。
- 已打开页面优先展示，尽量避免重复打开同一个网址。
- 书签、历史记录和 URL 结果可在默认浏览器中打开。
- 支持 Chrome、Microsoft Edge；macOS 支持 Safari。
- 支持中文标题、拼音、域名、URL 和书签文件夹搜索。
- 支持按全部、标签页、书签、历史记录筛选结果。
- 支持中英文界面、开机启动、托盘/菜单栏入口、快捷键自定义。
- 搜索索引保存在本机，不上传浏览器数据。

## 平台支持

| 平台 | 状态 | 说明 |
| --- | --- | --- |
| macOS Apple Silicon | 支持 | 提供 `.dmg` 和 `.zip` |
| Windows x64 | 支持 | 提供 `.exe` 安装包 |
| Chrome | 支持 | 通过浏览器扩展连接 |
| Microsoft Edge | 支持 | 通过浏览器扩展连接 |
| Safari | 支持 | 仅 macOS |

## 下载

从 GitHub Releases 下载最新版本：

[下载 QuickTab 最新版](https://github.com/zhangsiqiang519/QuickTab/releases/latest)

发布包通常包括：

| 系统 | 文件 |
| --- | --- |
| macOS | `QuickTab-<version>-arm64.dmg` |
| macOS | `QuickTab-<version>-arm64-mac.zip` |
| Windows | `QuickTab-<version>-x64.exe` |

## 快速开始

### macOS

1. 下载 `QuickTab-<version>-arm64.dmg`。
2. 打开 DMG，将 `QuickTab.app` 拖入 `Applications`。
3. 启动 QuickTab。
4. 如果系统提示应用未验证，在 `系统设置 > 隐私与安全性` 中允许打开。

### Windows

1. 下载 `QuickTab-<version>-x64.exe`。
2. 运行安装程序。
3. 启动 QuickTab。
4. 按首次启动向导连接 Chrome 或 Edge 扩展。

## 浏览器连接

QuickTab 通过本机桥接和浏览器扩展读取 Chrome / Edge 的标签页、书签和历史记录，并把不同浏览器来源放进同一个搜索索引。首次启动时，应用会引导你打开扩展页面并选择内置扩展目录。

### Chrome

1. 打开 `chrome://extensions`。
2. 开启 `开发者模式`。
3. 点击 `加载已解压的扩展程序`。
4. 回到 QuickTab，点击 `准备 Chrome 扩展`。
5. 选择 QuickTab 显示的扩展文件夹。
6. 如扩展未立即连接，重启 Chrome 和 QuickTab。

### Microsoft Edge

1. 打开 `edge://extensions`。
2. 开启 `开发人员模式`。
3. 点击 `加载解压缩的扩展`。
4. 回到 QuickTab，点击 `准备 Edge 扩展`。
5. 选择 QuickTab 显示的扩展文件夹。
6. 如扩展未立即连接，重启 Edge 和 QuickTab。

### Safari

Safari 仅在 macOS 上可用，不使用 Chrome / Edge 扩展。

切换 Safari 已打开标签页需要允许 QuickTab 控制 Safari：

1. 打开 `系统设置 > 隐私与安全性 > 自动化`。
2. 允许 QuickTab 控制 Safari。

导入 Safari 书签需要完全磁盘访问权限：

1. 打开 `系统设置 > 隐私与安全性 > 完全磁盘访问权限`。
2. 添加并启用 QuickTab。
3. 重启 QuickTab。
4. 在 QuickTab 设置中点击 `导入 Safari`。

## 使用方式

| 系统 | 默认快捷键 |
| --- | --- |
| macOS | `Alt+Space` |
| Windows | `Ctrl+Shift+K` |

常用键盘操作：

| 按键 | 功能 |
| --- | --- |
| `Enter` | 打开或切换到选中结果 |
| `↑ / ↓` | 切换选中项 |
| `Esc` | 隐藏 QuickTab |
| `Ctrl+,` / `Command+,` | 打开设置 |

如果没有匹配结果，QuickTab 会使用系统默认浏览器打开输入内容或进行搜索。

对于搜索结果，QuickTab 会优先切回已经打开的标签页；书签、历史记录和 URL 结果会使用你在 QuickTab 中设置的默认浏览器打开，必要时回退到系统默认浏览器。

## 开发

```bash
npm install
npm run dev:electron
```

常用命令：

```bash
npm run typecheck
npm test
npm run build
npm run dist
```

`release/`、`dist/`、`.workflow/` 和本地 agent 状态文件不会进入 Git。正式发布请使用 GitHub Releases 托管安装包，不要把本地构建产物提交到仓库。

## 隐私

QuickTab 的搜索索引保存在本机，用于本地搜索和切换。项目不提供服务器端数据同步，也不会把浏览器标签页、书签或历史记录上传到远程服务。

## 许可证

本项目采用 [MIT License](./LICENSE)。
