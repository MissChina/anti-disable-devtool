# 安装和使用指南

## 快速开始

### 1. 安装浏览器扩展

首先需要安装一个用户脚本管理器：

**推荐：Tampermonkey**
- [Chrome 扩展商店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox 插件](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- [Edge 插件](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

**或者：Greasemonkey（仅Firefox）**
- [Firefox 插件](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)

### 2. 安装脚本

有两种安装方式：

#### 方式一：直接安装（推荐）
1. 点击此链接：[安装 DisableDevtool 万能拦截器](https://github.com/MissChina/anti-disable-devtool/raw/main/anti-disable-devtool.user.js)
2. 在弹出的 Tampermonkey 安装页面点击"安装"

#### 方式二：手动安装
1. 复制 [anti-disable-devtool.user.js](../anti-disable-devtool.user.js) 文件的全部内容
2. 打开 Tampermonkey 控制面板
3. 点击"添加新脚本"
4. 删除默认内容，粘贴复制的代码
5. 按 `Ctrl+S` 保存

### 3. 验证安装

安装成功后：
1. 访问任何网站
2. 右上角应该会出现绿色的状态指示器
3. 指示器显示"👁️ 守护中"表示脚本正在运行

## 使用说明

### 状态指示器

脚本运行时会在页面右上角显示一个状态指示器：

- **👁️ 守护中**: 脚本正在监控，暂未发现反调试脚本
- **🛡️ 已拦截 X**: 成功拦截了 X 个反调试脚本

### 查看详细信息

点击状态指示器可以展开详细面板，显示：
- 开发者工具可用状态
- 拦截统计信息
- 操作提示

### 控制台日志

脚本会在浏览器开发者工具的控制台中输出详细日志：
- 脚本启动信息
- 拦截行为记录
- 检测到的可疑脚本信息

## 常见问题

### Q: 脚本没有生效怎么办？
A: 请检查：
1. Tampermonkey 扩展是否已启用
2. 脚本是否已启用（在 Tampermonkey 控制面板中查看）
3. 网站是否在脚本的匹配规则内（默认匹配所有网站）

### Q: 如何知道脚本是否拦截了反调试脚本？
A: 有几种方式可以确认：
1. 查看右上角状态指示器的变化
2. 打开开发者工具控制台查看日志输出
3. 测试开发者工具是否能正常使用

### Q: 脚本会影响网站正常功能吗？
A: 不会。脚本只拦截特定的反调试脚本，并提供兼容性支持以防止页面报错。

### Q: 如何更新脚本？
A: Tampermonkey 会自动检查更新。你也可以：
1. 在 Tampermonkey 控制面板中手动检查更新
2. 重新安装最新版本的脚本

### Q: 如何卸载脚本？
A: 在 Tampermonkey 控制面板中找到脚本，点击删除即可。

## 高级配置

### 自定义检测模式

你可以修改脚本中的检测关键字来适应特定需求：

```javascript
const TARGET_PATTERNS = [
    // 添加你要检测的关键字
    'your-custom-pattern',
    // ...
];
```

### 调试模式

要查看更详细的调试信息，可以在浏览器控制台中启用详细日志。

## 技术支持

如果遇到问题，请：
1. 查看本文档的常见问题部分
2. 在 [GitHub Issues](https://github.com/MissChina/anti-disable-devtool/issues) 中搜索相关问题
3. 提交新的 Issue 并提供详细的问题描述

## 贡献

欢迎贡献代码和建议！请参阅 [README.md](../README.md) 中的贡献指南。