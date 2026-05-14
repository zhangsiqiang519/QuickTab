# QuickTab

[English README](./README.en.md)

QuickTab 是一个 macOS 桌面快捷启动器，用于搜索和切换浏览器标签页、书签和历史记录。它的交互目标接近 Spotlight：通过全局快捷键唤醒，输入关键词，选择结果，然后继续当前工作。

QuickTab 支持 Chrome、Microsoft Edge 和 Safari。Chrome / Edge 通过内置 Chromium 扩展和 Native Messaging 通信；Safari 通过 macOS Automation 控制打开的标签页，并通过 Full Disk Access 导入 Safari 书签。

## 功能

- Spotlight 风格的全局搜索浮窗。
- 搜索打开的标签页、书签和历史记录。
- 搜索时优先展示已打开的标签页。
- 目标 URL 已经打开时，优先切换到现有标签页，避免重复打开。
- 直接输入 URL 或搜索词时，使用默认浏览器打开。
- 支持 Chrome、Edge、Safari 来源过滤。
- 书签可按「域名 + 路径」或「域名」去重。
- 支持按相关度或访问次数排序。
- 支持中文标题和 URL 的拼音搜索。
- 默认中文界面，可在设置中切换英文。
- 支持菜单栏入口，可选择显示 `QT` 文字或图标。
- 可选是否显示程序坞图标。
- 可选是否开机启动。
- 设置变动自动保存。
- 使用 Electron Builder 生成 macOS DMG / ZIP。

## 平台支持

QuickTab 当前主要面向 macOS。

| 平台 | 状态 |
| --- | --- |
| macOS Apple Silicon | 默认支持并打包 |
| macOS Intel | 源码理论可构建，但当前默认发布包不是 Intel 架构 |
| Windows | 有部分构建配置，但不是当前主要目标 |
| Linux | 源码层面部分支持 |

## 环境要求

- 推荐 macOS 13 或更新版本。
- Node.js 20 或更新版本。
- npm。
- 如需 Chrome / Edge 集成，需要安装 Chrome 和/或 Microsoft Edge。
- 如需 Safari 标签页/书签，需要安装并启用 Safari。

## 从 Release 安装

1. 下载 `QuickTab-<version>-arm64.dmg`。
2. 打开 DMG。
3. 将 `QuickTab.app` 拖入 `/Applications`。
4. 从 `/Applications` 启动 QuickTab。
5. 如果 macOS 因未公证拦截应用，打开：
   `系统设置 > 隐私与安全性`，手动允许 QuickTab。

本地构建产物默认生成在：

```bash
release/QuickTab-0.1.0-arm64.dmg
release/QuickTab-0.1.0-arm64-mac.zip
```

## 首次启动配置

QuickTab 启动时会自动安装 Chrome / Edge 的 Native Messaging manifest。首次启动向导中也会提供内置扩展目录入口。

### Chrome

1. 打开 `chrome://extensions`。
2. 开启 `开发者模式`。
3. 点击 `加载已解压的扩展程序`。
4. 选择内置扩展目录：
   - 开发环境：`extension/chromium`
   - 打包后应用：`QuickTab.app/Contents/Resources/extension/chromium`
5. 如果 Chrome 已经打开，建议重启 Chrome 和 QuickTab。

### Microsoft Edge

1. 打开 `edge://extensions`。
2. 开启 `开发人员模式`。
3. 点击 `加载解压缩的扩展`。
4. 选择内置扩展目录：
   - 开发环境：`extension/chromium`
   - 打包后应用：`QuickTab.app/Contents/Resources/extension/chromium`
5. 如果 Edge 已经打开，建议重启 Edge 和 QuickTab。

### Safari

Safari 不使用 Chromium 扩展。

如果需要控制 Safari 打开的标签页：

1. 打开 `系统设置 > 隐私与安全性 > 自动化`。
2. 允许 QuickTab 控制 Safari。

如果需要导入 Safari 书签：

1. 打开 `系统设置 > 隐私与安全性 > 完全磁盘访问权限`。
2. 添加并启用 `QuickTab.app`。
3. 重启 QuickTab。
4. 打开设置，点击 `导入 Safari`。

Safari 书签导入读取：

```bash
~/Library/Safari/Bookmarks.plist
```

macOS 默认会保护该文件；没有完全磁盘访问权限时无法读取。

## 使用方式

### 全局快捷键

macOS 默认快捷键：

```text
Alt+Space
```

可以在设置中修改。快捷键修改后会自动保存。

### 搜索

唤醒 QuickTab 后可以输入：

- 网页标题
- 域名
- URL
- 书签文件夹文本
- 中文文本或拼音

常用按键：

- `Enter`：打开选中结果。
- `Arrow Up / Arrow Down`：切换选中项。
- `Esc`：隐藏 QuickTab。
- `Command+,`：打开设置。

如果没有匹配结果，QuickTab 可以使用默认浏览器搜索或打开输入内容。

### 来源模式

搜索窗口提供来源筛选：

- 全部来源
- 打开的标签
- 资料库，即书签 + 历史记录

设置中还可以限制结果范围：

- 全部
- 只展示书签
- 只展示历史记录

为保证可以切换到已打开页面，相关场景下打开的标签页仍会参与匹配。

### 设置

设置变动会立即保存，没有保存按钮。

可配置项包括：

- 全局快捷键。
- 语言。
- 开机启动。
- 是否显示程序坞图标。
- 是否显示菜单栏入口。
- 菜单栏显示方式：`QT` 文字或图标。
- 浏览器来源：Chrome、Edge、Safari 书签。
- 数据来源：标签页、书签、历史记录。
- 书签去重策略。
- 排序方式。
- 结果范围。
- Safari 书签导入。
- 清空索引。

## 开发

安装依赖：

```bash
npm install
```

启动 Vite 和 Electron 开发环境：

```bash
npm run dev:electron
```

运行测试：

```bash
npm test -- --run
```

运行 TypeScript 检查：

```bash
npm run typecheck
```

构建生产资源：

```bash
npm run build
```

生成未压缩的 Electron 应用：

```bash
npm run package
```

生成 macOS DMG / ZIP：

```bash
npm run dist
```

## Native Messaging

QuickTab 使用的 Native Messaging host 名称是：

```text
com.quicktab.ai
```

虽然产品名称已经是 QuickTab，但该名称为了兼容已有安装继续保留。

Native Messaging manifest 安装路径：

```bash
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.quicktab.ai.json
~/Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.quicktab.ai.json
```

运行时共享数据路径：

```bash
~/.quicktab-ai
```

Electron 用户数据路径：

```bash
~/Library/Application Support/quicktab-ai
```

这些历史路径同样为了兼容旧版本继续保留。

如果只想从开发环境移除 Native Messaging manifests：

```bash
npm run unregister:native-host
```

## macOS 完全卸载

如果需要完整移除 QuickTab，包括本地数据和浏览器集成文件，使用以下步骤。

### 自动卸载

在源码目录执行：

```bash
npm run uninstall:mac
```

脚本会删除：

- `/Applications/QuickTab.app`
- Chrome Native Messaging manifest
- Edge Native Messaging manifest
- `~/Library/Application Support/quicktab-ai`
- `~/.quicktab-ai`
- 部分 QuickTab 偏好设置和 saved state 文件
- 在 `tccutil` 允许的情况下重置部分 macOS 权限提示

部分 macOS 项仍需要手动清理。

### 手动卸载

1. 从菜单栏或活动监视器退出 QuickTab。
2. 删除应用：

```bash
rm -rf /Applications/QuickTab.app
```

3. 删除 Native Messaging manifests：

```bash
rm -f "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.quicktab.ai.json"
rm -f "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.quicktab.ai.json"
```

4. 删除 QuickTab 数据：

```bash
rm -rf "$HOME/Library/Application Support/quicktab-ai"
rm -rf "$HOME/.quicktab-ai"
rm -f "$HOME/Library/Preferences/com.quicktab.ai.plist"
rm -rf "$HOME/Library/Saved Application State/com.quicktab.ai.savedState"
```

5. 手动移除浏览器扩展：

- Chrome：打开 `chrome://extensions`，移除 QuickTab。
- Edge：打开 `edge://extensions`，移除 QuickTab。

6. 手动移除登录项：

```text
系统设置 > 通用 > 登录项
```

如果 QuickTab 仍在列表中，移除它。

7. 手动移除残留权限：

```text
系统设置 > 隐私与安全性 > 自动化
系统设置 > 隐私与安全性 > 完全磁盘访问权限
```

如果 QuickTab 仍在列表中，移除或关闭它。

## 常见问题

### 全局快捷键无法唤醒 QuickTab

- 检查设置中快捷键是否启用。
- 如果当前快捷键被 macOS 或其他应用占用，换一个快捷键。
- 安装新版本后，先完全退出旧版 QuickTab，再启动新版。

### Chrome 或 Edge 标签页/书签不同步

- 确认扩展已从 `extension/chromium` 加载。
- 确认 QuickTab 已安装 Native Messaging manifests。
- 加载扩展后重启浏览器。
- 如有需要，打开 QuickTab 诊断信息检查状态。

### Safari 导入失败

给 QuickTab 授予完全磁盘访问权限并重启应用。Safari 书签位于受 macOS 保护的位置。

### 菜单栏入口不显示

- 打开设置，启用 `在菜单栏显示`。
- 在菜单栏样式中切换 `QT 文字` 和 `图标`。
- 安装新版本后，完全退出旧版 QuickTab 再启动新版。

## 项目结构

```text
src/main/                 Electron 主进程
src/main/services/        索引、设置、Native Host、浏览器集成
src/main/native/          Native Messaging host 入口
src/renderer/             React UI
src/preload/              Electron preload bridge
extension/chromium/       Chrome / Edge 扩展
scripts/                  打包和维护脚本
docs/                     实现说明
release/                  本地构建产物，不建议提交到源码仓库
```

## 开源协议

QuickTab 使用 MIT License。详见 [LICENSE](./LICENSE)。

### 如何获取或更换开源协议

本仓库已经包含 `LICENSE` 文件。

如果你要为自己的项目选择开源协议：

1. 打开 <https://choosealicense.com/>。
2. 根据项目目标选择协议。
3. 如果需要宽松协议，MIT 是常见默认选择。
4. 将协议文本复制到仓库根目录的 `LICENSE` 文件。
5. 在 `package.json` 中声明相同协议标识，例如：

```json
{
  "license": "MIT"
}
```

不要在没有许可证文件的情况下宣称项目开源。没有明确许可证时，其他人通常没有清晰的使用、修改和再分发权限。

## 安全与隐私说明

QuickTab 将浏览器索引数据保存在本地，不依赖云服务。

数据路径：

```bash
~/Library/Application Support/quicktab-ai
~/.quicktab-ai
```

浏览器集成需要本地权限：

- Chrome / Edge Native Messaging，用于扩展通信。
- macOS Automation，用于控制 Safari 或打开的浏览器标签页。
- Full Disk Access，仅在导入 Safari 书签时需要。

公开发布前，请审查代码和权限请求是否符合你的分发要求。

## 发布检查清单

发布公开版本前：

1. 更新 `package.json` 中的 `version`。
2. 执行：

```bash
npm run typecheck
npm test -- --run
npm run dist
```

3. 在干净的 macOS 用户账号中验证 DMG。
4. 验证安装、首次启动、菜单栏入口、快捷键唤醒、浏览器扩展配置、Safari 权限和卸载。
5. 如果面向普通用户分发，配置 Apple Developer 签名和 notarization。当前本地构建在没有签名身份时会退回 ad-hoc 签名。
