# DisableDevtool 万能拦截器 - 增强版

🛡️ **全方位拦截disable-devtool，支持多种加载方式**

一个强大的用户脚本，可以检测并拦截各种反调试脚本，确保开发者工具始终可用。

## ✨ 特性

- 🔍 **智能检测**: 支持多种反调试脚本检测模式
  - 文件名模式匹配
  - CDN域名检测
  - 代码特征分析
- 🛡️ **全方位拦截**: 
  - 拦截动态加载的脚本
  - 拦截内联脚本
  - 拦截已存在的脚本
- 📊 **可视化状态**: 实时显示拦截状态和开发者工具可用性
- 🎯 **精准匹配**: 基于代码特征的智能识别，减少误拦截
- 🌐 **全网站兼容**: 适用于所有网站

## 🚀 安装方法

### 方法一：直接安装
1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Greasemonkey](https://www.greasespot.net/) 浏览器扩展
2. 点击 [安装脚本](https://github.com/MissChina/anti-disable-devtool/raw/main/anti-disable-devtool.user.js)
3. 在弹出的安装页面点击"安装"

### 方法二：手动安装
1. 复制 `anti-disable-devtool.user.js` 文件内容
2. 在 Tampermonkey 控制面板中创建新脚本
3. 粘贴代码并保存

## 🎯 检测特征

### 文件名模式
- `disable-devtool`
- `anti-debug`
- `devtool-disable`
- `security`
- `protect`

### CDN域名
- `cdn.jsdelivr.net`
- `unpkg.com`
- `cdnjs.cloudflare.com`

### 代码特征
- `DisableDevtool` - 核心对象名
- `ondevtoolopen` - 特征方法名
- `detectors` - 配置属性
- `RegToString` / `FuncToString` - 检测器类型
- `clearIntervalWhenDevOpenTrigger` - 特有配置项

## 📋 使用说明

1. **安装完成后自动启动**: 脚本会在页面加载时自动运行
2. **状态指示器**: 右上角会显示一个绿色的状态指示器
   - 👁️ 守护中：脚本正在监控，未发现反调试脚本
   - 🛡️ 已拦截：成功拦截了反调试脚本
3. **详细信息**: 点击状态指示器可查看详细信息
4. **控制台日志**: 拦截行为会在浏览器控制台中输出详细日志

## 🔧 工作原理

### 拦截机制
1. **DOM操作拦截**: 劫持 `appendChild`、`insertBefore` 等方法
2. **元素创建拦截**: 监控 `createElement` 方法
3. **属性设置拦截**: 监控 `src` 和 `textContent` 属性设置
4. **全局对象保护**: 阻止 `DisableDevtool` 对象的创建和访问

### 检测算法
- **URL匹配**: 检查脚本URL是否包含特征关键字
- **内容分析**: 分析脚本内容，计算特征关键字出现次数
- **阈值判断**: 当特征匹配数量达到阈值时判定为目标脚本

## 🛠️ 技术细节

### 核心功能
```javascript
// 检测目标脚本
function isTargetScript(url, content) {
    // URL模式匹配
    // 代码特征分析
    // 返回检测结果
}

// 拦截脚本加载
function interceptScript(scriptElement, method) {
    // 创建无害的替代脚本
    // 记录拦截日志
    // 更新状态显示
}
```

### 兼容性处理
- 提供 `DisableDevtool` 函数的兼容性实现
- 防止页面因缺少对象而报错
- 保持页面正常功能

## 📊 支持的反调试库

- ✅ disable-devtool (官方库)
- ✅ 各种自定义反调试脚本
- ✅ 基于 F12 检测的脚本
- ✅ 控制台禁用脚本
- ✅ 右键菜单禁用脚本

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

### 如何贡献
1. Fork 这个项目
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## ⚠️ 免责声明

本工具仅供学习和研究使用，请遵守相关法律法规和网站使用条款。使用者需对使用本工具的行为承担责任。

## 🔗 相关链接

- [Tampermonkey 官网](https://www.tampermonkey.net/)
- [Greasemonkey 官网](https://www.greasespot.net/)
- [用户脚本开发文档](https://wiki.greasespot.net/User_Script_Hosting)

---

**如果这个项目对你有帮助，请给一个 ⭐️ Star！**
