// 开发者示例：自定义反调试脚本检测规则
// 这个示例展示如何扩展拦截器的检测能力

// 扩展检测模式
const CUSTOM_PATTERNS = [
    // 添加你遇到的特定反调试脚本特征
    'your-anti-debug-keyword',
    'custom-protection',
    'security-check',
    
    // 特定网站的反调试脚本
    'site-specific-protection',
];

// 扩展代码特征
const CUSTOM_SIGNATURES = [
    // 函数名特征
    'preventDevTools',
    'blockF12',
    'disableRightClick',
    
    // 变量名特征  
    'debuggerCheck',
    'consoleCheck',
    'devtoolsDetector',
    
    // 字符串特征
    'debugger',
    'Developer Tools',
    'F12',
];

// 高级检测函数示例
function advancedDetection(code) {
    // 检测混淆代码
    const obfuscationPatterns = [
        /\b[a-zA-Z]\[['"][a-zA-Z0-9+/=]{10,}['"]\]/g, // Base64 混淆
        /\\x[0-9a-fA-F]{2}/g, // 十六进制编码
        /eval\s*\(/g, // eval 调用
        /Function\s*\(/g, // Function 构造器
    ];
    
    let suspiciousScore = 0;
    
    obfuscationPatterns.forEach(pattern => {
        const matches = code.match(pattern);
        if (matches) {
            suspiciousScore += matches.length;
        }
    });
    
    // 检测反调试关键字
    const antiDebugKeywords = [
        'debugger',
        'console.clear',
        'setInterval',
        'setTimeout',
        'addEventListener',
        'keydown',
        'keyCode',
        '123', // F12 键码
        'ctrlKey',
        'preventDefault',
    ];
    
    antiDebugKeywords.forEach(keyword => {
        if (code.includes(keyword)) {
            suspiciousScore += 1;
        }
    });
    
    // 检测 DOM 操作限制
    const domRestrictions = [
        'contextmenu',
        'selectstart',
        'dragstart',
        'oncontextmenu',
        'onselectstart',
        'ondragstart',
    ];
    
    domRestrictions.forEach(restriction => {
        if (code.includes(restriction)) {
            suspiciousScore += 2;
        }
    });
    
    // 根据评分判断是否为反调试脚本
    return suspiciousScore >= 5;
}

// URL 黑名单检测
function isBlockedDomain(url) {
    const blockedDomains = [
        // 常见的反调试脚本托管域名
        'anti-debug.com',
        'protection.js',
        'security-scripts.net',
        
        // CDN 上的特定路径
        '/disable-devtool',
        '/anti-debug',
        '/console-ban',
        '/devtools-detect',
    ];
    
    return blockedDomains.some(domain => 
        url.toLowerCase().includes(domain.toLowerCase())
    );
}

// 实时监控函数
function monitorScriptCreation() {
    // 监控动态创建的脚本元素
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.tagName === 'SCRIPT') {
                    const src = node.src || '';
                    const content = node.textContent || '';
                    
                    if (isBlockedDomain(src) || advancedDetection(content)) {
                        console.log('🛡️ [高级检测] 发现可疑脚本:', src || '内联脚本');
                        
                        // 阻止脚本执行
                        node.remove();
                        
                        // 或者替换为无害内容
                        node.textContent = '// 可疑脚本已被拦截';
                    }
                }
            });
        });
    });
    
    // 开始监控
    observer.observe(document, {
        childList: true,
        subtree: true
    });
}

// 防护绕过检测
function preventBypass() {
    // 保护拦截器自身不被移除
    Object.defineProperty(window, 'interceptorProtection', {
        get: function() {
            console.log('🛡️ 拦截器自我保护激活');
            return true;
        },
        set: function() {
            console.log('🛡️ 拦截器保护：禁止修改');
            return false;
        },
        configurable: false
    });
    
    // 防止控制台被清空
    const originalClear = console.clear;
    console.clear = function() {
        console.log('🛡️ 阻止控制台清空操作');
        // 可选择性允许清空或完全阻止
        // originalClear.call(console);
    };
}

// 导出配置供主脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CUSTOM_PATTERNS,
        CUSTOM_SIGNATURES,
        advancedDetection,
        isBlockedDomain,
        monitorScriptCreation,
        preventBypass
    };
}