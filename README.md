# Anti-Disable-Devtool

智能拦截 disable-devtool 反调试脚本，保护开发者工具正常使用。

## 功能特性

**智能检测**
- URL 关键词匹配
- 代码特征加权分析
- 多维度综合评分

**全面拦截**
- `createElement` 动态创建
- `appendChild` / `insertBefore` DOM 插入
- `innerHTML` / `document.write` HTML 注入
- `Function` / `eval` 动态执行
- `MutationObserver` DOM 变化监控

**反制措施**
- 阻止恶意跳转（百度、谷歌等）
- 拦截反调试 alert
- 伪造窗口尺寸
- 锁定全局变量
- 移除 debugger 语句

**监控面板**
- 实时显示捕获的脚本
- 分类查看：全部 / 危险 / 已拦截 / 安全
- 搜索过滤
- 查看匹配特征、调用栈、代码预览
- 一键打开 / 复制 URL

## 安装

### Tampermonkey

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击 [安装脚本](https://github.com/MissChina/anti-disable-devtool/raw/main/anti-disable-devtool.user.js)
3. 确认安装

### 手动安装

1. 复制 `anti-disable-devtool.user.js` 内容
2. 在 Tampermonkey 中新建脚本
3. 粘贴并保存

## 配置

脚本顶部可修改配置：

```javascript
const CONFIG = {
    enableBlock: true,   // 启用拦截
    showPanel: true,     // 显示面板
    debug: false,        // 调试模式
    threshold: 4         // 特征匹配阈值
};
```

## 检测特征

### URL 关键词

```
disable-devtool, disable_devtool, disabledevtool
anti-debug, anti_debug, devtools-detect
```

### 代码特征（带权重）

| 特征 | 权重 |
|------|------|
| theajack.github.io | 5 |
| clearIntervalWhenDevOpenTrigger | 5 |
| DisableDevtool | 3 |
| ondevtoolopen | 3 |
| Function debugger | 3 |
| RegToString/FuncToString | 3 |
| 跳转检测 | 3 |
| ondevtoolclose | 2 |
| isDevToolOpened | 2 |
| 尺寸检测 | 2 |
| F12检测 | 2 |
| eruda/vconsole | 1 |
| 右键禁用 | 1 |

当总分 >= 4 时判定为危险脚本。

## API

脚本暴露全局对象 `window._AntiDD`：

```javascript
_AntiDD.version     // 版本号
_AntiDD.config      // 配置对象
_AntiDD.data        // 数据（scripts, blocked）
_AntiDD.scan()      // 手动扫描
_AntiDD.analyze(code, url)  // 分析脚本
```

## 文件结构

```
anti-disable-devtool/
├── anti-disable-devtool.user.js  # 主脚本
├── debug-console.user.js         # 调试面板（独立版）
├── README.md                     # 说明文档
├── LICENSE                       # 许可证
└── icon.png                      # 图标
```

## 许可证

个人非营利使用许可证

- 允许：学习、研究、个人项目
- 禁止：商业用途、盗用抄袭
- 二次开发需保留原作者信息

详见 [LICENSE](LICENSE)

## 作者

**MissChina**

- GitHub: [MissChina](https://github.com/MissChina)
- 项目地址: [anti-disable-devtool](https://github.com/MissChina/anti-disable-devtool)

## 免责声明

本工具仅供学习研究使用。使用者需遵守相关法律法规，对使用行为自行承担责任。
