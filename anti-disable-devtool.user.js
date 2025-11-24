// ==UserScript==
// @name         禁用开发者工具万能拦截器 - 极简版
// @namespace    http://tampermonkey.net/
// @version      7.1
// @description  全方位拦截禁用开发者工具的脚本，保护控制台正常使用
// @author       MissChina
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @icon         https://github.com/MissChina/anti-disable-devtool/raw/main/icon.png
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 检测规则 ====================
    const 检测关键词 = [
        'disable-devtool',
        'anti-debug',
        'devtool-disable',
        'security',
        'protect',
        'cdn.jsdelivr.net',
        'unpkg.com',
        'cdnjs.cloudflare.com',
        'vf.uujjyp.cn',
        'frameworks'
    ];

    const 代码特征 = [
        'DisableDevtool',
        'ondevtoolopen',
        'detectors',
        'RegToString',
        'FuncToString',
        'clearIntervalWhenDevOpenTrigger',
    ];

    let 拦截次数 = 0;
    let 待显示提示队列 = [];
    let 样式已注入 = false;

    // ==================== 启动信息 ====================
    console.log('%c🛡️ 禁用开发者工具万能拦截器 v7.1', 'color: #10B981; font-weight: bold; font-size: 14px;');
    console.log('%c👨‍💻 作者：MissChina', 'color: #6B7280; font-size: 12px;');
    console.log('%c⚠️ 仅供个人非盈利使用，禁止商用', 'color: #F59E0B; font-size: 12px; font-weight: bold;');

    // ==================== 注入样式 ====================
    function 注入样式() {
        if (样式已注入) return;

        const 样式标签 = document.createElement('style');
        样式标签.textContent = `
            @keyframes antiDevtoolSlideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes antiDevtoolFadeOut {
                to {
                    opacity: 0;
                    transform: translateX(400px);
                }
            }
        `;
        document.head.appendChild(样式标签);
        样式已注入 = true;
    }

    // ==================== 提示系统 ====================
    function 显示提示(消息, 网址 = '') {
        // 如果 body 还不存在，加入队列等待
        if (!document.body) {
            待显示提示队列.push({ 消息, 网址 });
            return;
        }

        // 确保样式已注入
        注入样式();

        const 提示框 = document.createElement('div');
        提示框.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Microsoft YaHei', sans-serif;
            font-size: 14px;
            z-index: 2147483647;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(20px);
            animation: antiDevtoolSlideIn 0.3s ease-out;
            max-width: 400px;
            word-break: break-all;
        `;

        提示框.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">🛡️</span>
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px;">${消息}</div>
                    ${网址 ? `<div style="font-size: 12px; opacity: 0.9; margin-top: 4px; max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${网址}</div>` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(提示框);

        // 3秒后淡出并移除
        setTimeout(() => {
            提示框.style.animation = 'antiDevtoolFadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (提示框.parentNode) {
                    提示框.parentNode.removeChild(提示框);
                }
            }, 300);
        }, 3000);
    }

    // ==================== 处理待显示的提示 ====================
    function 处理待显示提示() {
        if (待显示提示队列.length === 0) return;

        待显示提示队列.forEach(项 => {
            显示提示(项.消息, 项.网址);
        });

        待显示提示队列 = [];
    }

    // ==================== 检测函数 ====================
    function 是否为目标脚本(网址, 内容 = '') {
        if (!网址 && !内容) return false;

        if (网址) {
            const 小写网址 = 网址.toLowerCase();
            if (检测关键词.some(关键词 => 小写网址.includes(关键词.toLowerCase()))) {
                return true;
            }
        }

        if (内容) {
            const 匹配数量 = 代码特征.filter(特征 => 内容.includes(特征)).length;
            return 匹配数量 >= 3;
        }

        return false;
    }

    // ==================== 拦截引擎 ====================
    function 拦截脚本(脚本元素, 方法) {
        const 网址 = 脚本元素.src || 脚本元素.getAttribute('src') || '';
        const 内容 = 脚本元素.textContent || 脚本元素.innerHTML || '';

        if (是否为目标脚本(网址, 内容)) {
            拦截次数++;
            const 显示网址 = 网址 || '内联脚本';

            console.log(`🛡️ 拦截成功 [${方法}]`, 显示网址);
            显示提示(`成功拦截第 ${拦截次数} 个恶意脚本`, 显示网址);

            const 替代脚本 = document.createElement('script');
            替代脚本.textContent = `
                console.log('%c🛡️ 反调试脚本已被安全拦截', 'color: #10b981; font-weight: bold;');
                window.DisableDevtool = function() { return { success: false, reason: 'intercepted' }; };
            `;
            return 替代脚本;
        }
        return null;
    }

    // ==================== 劫持脚本加载 ====================
    const 原始appendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function(子元素) {
        if (子元素 && 子元素.tagName === 'SCRIPT') {
            const 替换元素 = 拦截脚本(子元素, 'appendChild');
            if (替换元素) return 原始appendChild.call(this, 替换元素);
        }
        return 原始appendChild.call(this, 子元素);
    };

    const 原始insertBefore = Element.prototype.insertBefore;
    Element.prototype.insertBefore = function(新节点, 参考节点) {
        if (新节点 && 新节点.tagName === 'SCRIPT') {
            const 替换元素 = 拦截脚本(新节点, 'insertBefore');
            if (替换元素) return 原始insertBefore.call(this, 替换元素, 参考节点);
        }
        return 原始insertBefore.call(this, 新节点, 参考节点);
    };

    const 原始createElement = Document.prototype.createElement;
    Document.prototype.createElement = function(标签名) {
        const 元素 = 原始createElement.call(this, 标签名);

        if (标签名 && 标签名.toLowerCase() === 'script') {
            let 真实网址 = '';

            Object.defineProperty(元素, 'src', {
                get: () => 真实网址,
                set: (值) => {
                    if (值 && 是否为目标脚本(值)) {
                        拦截次数++;
                        console.log(`🛡️ 拦截成功 [createElement]`, 值);
                        显示提示(`成功拦截第 ${拦截次数} 个恶意脚本`, 值);
                        return;
                    }
                    真实网址 = 值;
                    元素.setAttribute('src', 值);
                }
            });

            const 原始设置器 = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').set;
            Object.defineProperty(元素, 'textContent', {
                get: function() { return this._内容 || ''; },
                set: function(值) {
                    if (值 && 是否为目标脚本('', 值)) {
                        拦截次数++;
                        console.log(`🛡️ 拦截成功 [内联脚本]`);
                        显示提示(`成功拦截第 ${拦截次数} 个恶意脚本`, '内联脚本');
                        this._内容 = '// 已拦截';
                        return;
                    }
                    this._内容 = 值;
                    原始设置器.call(this, 值);
                }
            });
        }

        return 元素;
    };

    // ==================== 全局保护 ====================
    Object.defineProperty(window, 'DisableDevtool', {
        get: () => function() { return { success: false, reason: 'blocked' }; },
        set: () => {},
        configurable: false
    });

    // ==================== 等待 body 加载 ====================
    function 初始化提示系统() {
        if (document.body) {
            处理待显示提示();
        } else {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    处理待显示提示();
                });
            } else {
                setTimeout(初始化提示系统, 50);
            }
        }
    }

    初始化提示系统();

    // ==================== 扫描已存在的脚本 ====================
    setTimeout(() => {
        document.querySelectorAll('script').forEach(脚本 => {
            const 网址 = 脚本.src;
            const 内容 = 脚本.textContent || 脚本.innerHTML;

            if (是否为目标脚本(网址, 内容)) {
                console.log('🛡️ 扫描移除已存在的脚本', 网址 || '内联脚本');
                if (脚本.parentNode) {
                    脚本.parentNode.removeChild(脚本);
                    拦截次数++;
                    显示提示(`扫描移除已存在的恶意脚本`, 网址 || '内联脚本');
                }
            }
        });
    }, 500);

    console.log('🛡️ 拦截器已启动，开始保护控制台');

})();
