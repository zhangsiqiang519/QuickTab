# QuickTab ✨

![Version](https://img.shields.io/badge/version-0.1.7-blue.svg)
![macOS](https://img.shields.io/badge/macOS-supported-black.svg)
![Windows](https://img.shields.io/badge/Windows-supported-0078D4.svg)
![Chrome](https://img.shields.io/badge/Chrome-supported-4285F4.svg)
![Edge](https://img.shields.io/badge/Edge-supported-0078D7.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**像 Spotlight 一样搜索和切换浏览器标签页、书签与历史记录。**

[English README](./README.en.md) · [功能](#-功能) · [下载](#-下载) · [快速开始](#-快速开始) · [使用方式](#-使用方式) · [常见问题](#-常见问题)

---

## 简介

QuickTab 是一个桌面浏览器工作台搜索工具。你可以用全局快捷键唤醒它，输入网页标题、域名、URL、中文关键词或拼音，然后直接切换到目标页面。

它适合经常同时打开多个浏览器、多个窗口和大量标签页的人。QuickTab 会优先展示已经打开的页面，能切换就切换，尽量避免重复打开同一个网址。

---

## ✨ 功能

- **全局唤醒**：使用快捷键快速打开搜索窗口。
- **多来源搜索**：搜索打开的标签页、书签和历史记录。
- **优先切换标签页**：目标页面已经打开时，直接切换到现有标签页。
- **浏览器支持**：支持 Chrome、Microsoft Edge；macOS 支持 Safari。
- **中文友好**：支持中文标题、拼音、域名、URL 和书签文件夹搜索。
- **结果筛选**：按全部、标签页、书签、历史记录筛选结果。
- **书签去重**：减少同域名或同路径的重复结果。
- **双语界面**：支持中文和英文。
- **系统集成**：支持开机启动、托盘/菜单栏入口、快捷键自定义。
- **更新检查**：可在设置中检查新版本并打开下载页面。

---

## 平台支持

| 平台 | 状态 | 说明 |
| --- | --- | --- |
| macOS Apple Silicon | ✅ 支持 | 提供 `.dmg` 和 `.zip` |
| Windows x64 | ✅ 支持 | 提供 `.exe` 安装包 |
| Chrome | ✅ 支持 | 通过浏览器扩展连接 |
| Microsoft Edge | ✅ 支持 | 通过浏览器扩展连接 |
| Safari | ✅ 支持 | 仅 macOS |

---

## 📦 下载

请从 GitHub Releases 下载最新版本：

**[下载 QuickTab 最新版](https://github.com/zhangsiqiang519/QuickTab/releases/latest)**

发布包包括：

| 系统 | 文件 |
| --- | --- |
| macOS | `QuickTab-<version>-arm64.dmg` |
| macOS | `QuickTab-<version>-arm64-mac.zip` |
| Windows | `QuickTab-<version>-x64.exe` |

---

## 🚀 快速开始

### macOS

1. 下载 `QuickTab-<version>-arm64.dmg`。
2. 打开 DMG。
3. 将 `QuickTab.app` 拖入 `Applications`。
4. 启动 QuickTab。
5. 如果系统提示应用未验证，请在 `系统设置 > 隐私与安全性` 中允许打开。

### Windows

1. 下载 `QuickTab-<version>-x64.exe`。
2. 运行安装程序。
3. 启动 QuickTab。
4. 按首次启动向导连接 Chrome 或 Edge 扩展。

---

## 🔌 浏览器连接

QuickTab 需要浏览器扩展来读取 Chrome / Edge 的标签页、书签和历史记录。首次启动时，应用会引导你打开扩展页面并选择内置扩展目录。

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

### Safari（仅 macOS）

Safari 不使用 Chrome / Edge 扩展。

如需切换 Safari 已打开的标签页：

1. 打开 `系统设置 > 隐私与安全性 > 自动化`。
2. 允许 QuickTab 控制 Safari。

如需导入 Safari 书签：

1. 打开 `系统设置 > 隐私与安全性 > 完全磁盘访问权限`。
2. 添加并启用 QuickTab。
3. 重启 QuickTab。
4. 在 QuickTab 设置中点击 `导入 Safari`。

---

## ⌨️ 使用方式

### 默认快捷键

| 系统 | 快捷键 |
| --- | --- |
| macOS | `Alt+Space` |
| Windows | `Ctrl+Shift+K` |

你可以在设置中修改快捷键，也可以关闭全局快捷键。

### 可以搜索什么

- 网页标题
- 域名
- URL
- 书签文件夹名称
- 中文关键词
- 拼音

### 键盘操作

| 按键 | 功能 |
| --- | --- |
| `Enter` | 打开或切换到选中结果 |
| `↑ / ↓` | 切换选中项 |
| `Esc` | 隐藏 QuickTab |
| `Ctrl+,` / `Command+,` | 打开设置 |

如果没有匹配结果，QuickTab 会使用系统默认浏览器打开输入内容或进行搜索。

---

## ⚙️ 设置

设置会自动保存。常用配置包括：

- 快捷键。
- 界面语言。
- 开机启动。
- 是否显示任务栏、程序坞、托盘或菜单栏入口。
- 启用的浏览器来源。
- 启用的数据来源：标签页、书签、历史记录。
- 搜索结果范围。
- 排序方式。
- 书签去重方式。
- 清空本地索引。
- 重新打开配置向导。
- 检查更新。

---

## ❓ 常见问题

### 为什么需要手动加载浏览器扩展？

Chrome 和 Edge 不允许桌面应用静默安装本地扩展。QuickTab 可以帮你准备扩展目录并打开扩展管理页，但最后的加载操作需要你在浏览器中确认。

### 为什么搜不到 Chrome 或 Edge 的标签页？

请检查：

- 浏览器扩展是否已加载。
- 扩展是否启用。
- QuickTab 是否已经打开过配置向导并完成连接。
- 浏览器和 QuickTab 是否需要重启。

### 为什么 macOS 上无法读取 Safari 书签？

Safari 书签文件受系统保护。请在 `系统设置 > 隐私与安全性 > 完全磁盘访问权限` 中允许 QuickTab，然后重启应用。

### QuickTab 会把浏览器数据上传到服务器吗？

不会。QuickTab 的搜索索引保存在本机，用于本地搜索和切换。

---

## 许可证

本项目采用 [MIT License](./LICENSE)。

---

如果 QuickTab 对你有帮助，欢迎给项目一个 Star。
