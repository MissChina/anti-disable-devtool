// ==UserScript==
// @name         DisableDevtool万能拦截器 - 增强版
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  全方位拦截disable-devtool，支持多种加载方式
// @author       MissChina
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // 扩展的检测关键字（根据源码分析得出的特征）
    const TARGET_PATTERNS = [
        // 文件名模式
        'disable-devtool',
        'anti-debug',
        'devtool-disable',
        'security',
        'protect',
        
        // 域名模式（常见CDN）
        'cdn.jsdelivr.net',
        'unpkg.com',
        'cdnjs.cloudflare.com',
        
        // 你遇到的具体案例
        'vf.uujjyp.cn',
        'frameworks'
    ];
    
    // 代码特征检测（检测内联脚本）
    const CODE_SIGNATURES = [
        'DisableDevtool',           // 核心对象名
        'ondevtoolopen',           // 特征方法名
        'detectors',               // 配置属性
        'RegToString',             // 检测器类型
        'FuncToString',            // 检测器类型
        'clearIntervalWhenDevOpenTrigger', // 特有配置项
    ];
    
    let interceptCount = 0;
    let statusDiv = null;
    let isExpanded = false;
    
    // 检查是否为目标脚本
    function isTargetScript(url, content = '') {
        if (!url && !content) return false;
        
        // 检查URL
        if (url) {
            const urlLower = url.toLowerCase();
            if (TARGET_PATTERNS.some(pattern => urlLower.includes(pattern.toLowerCase()))) {
                return true;
            }
        }
        
        // 检查代码内容特征
        if (content) {
            const codeSignatureCount = CODE_SIGNATURES.filter(sig => 
                content.includes(sig)
            ).length;
            
            // 如果包含3个或以上特征，判定为目标脚本
            return codeSignatureCount >= 3;
        }
        
        return false;
    }
    
    // 创建状态面板
    function createStatusPanel() {
        if (!document.body) {
            setTimeout(createStatusPanel, 100);
            return;
        }
        
        statusDiv = document.createElement('div');
        statusDiv.style.cssText = `
            position: fixed;
            top: 15px;
            right: 15px;
            background: rgba(16, 185, 129, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-family: 'Segoe UI', sans-serif;
            font-size: 12px;
            z-index: 999999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.25);
            border: 1px solid rgba(255,255,255,0.2);
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 120px;
            text-align: center;
        `;
        
        updateStatusPanel();
        document.body.appendChild(statusDiv);
        
        statusDiv.addEventListener('click', togglePanel);
        
        // 悬停效果
        statusDiv.addEventListener('mouseenter', () => {
            statusDiv.style.background = 'rgba(16, 185, 129, 1)';
            statusDiv.style.transform = 'scale(1.05)';
        });
        
        statusDiv.addEventListener('mouseleave', () => {
            statusDiv.style.background = 'rgba(16, 185, 129, 0.9)';
            statusDiv.style.transform = 'scale(1)';
        });
        
        // 3秒后半透明
        setTimeout(() => {
            if (statusDiv && !isExpanded) {
                statusDiv.style.opacity = '0.7';
            }
        }, 3000);
    }
    
    // 切换面板状态
    function togglePanel() {
        isExpanded = !isExpanded;
        statusDiv.style.opacity = '1';
        updateStatusPanel();
    }
    
    // 更新状态显示
    function updateStatusPanel() {
        if (!statusDiv) return;
        
        if (!isExpanded) {
            const status = interceptCount > 0 ? '🛡️' : '👁️';
            const text = interceptCount > 0 ? `已拦截 ${interceptCount}` : '守护中';
            
            statusDiv.innerHTML = `<span>${status} ${text}</span>`;
            statusDiv.style.padding = '6px 10px';
            return;
        }
        
        // 详细模式
        const devToolsStatus = testDevTools() ? 
            '<span style="color: #86efac;">✅ 控制台可用</span>' : 
            '<span style="color: #fca5a5;">❌ 控制台被禁</span>';
        
        const interceptStatus = interceptCount > 0 ? 
            `<span style="color: #86efac;">🛡️ 成功拦截 ${interceptCount}</span>` : 
            '<span style="color: #fde68a;">👁️ 持续守护</span>';
        
        statusDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">
                🔒 万能拦截器
            </div>
            ${devToolsStatus}<br>
            ${interceptStatus}
            <div style="margin-top: 6px; font-size: 10px; color: rgba(255,255,255,0.8);">
                点击收缩 • 全网站通用
            </div>
        `;
        statusDiv.style.padding = '10px 14px';
    }
    
    // 测试开发者工具
    function testDevTools() {
        try {
            return typeof console !== 'undefined' && typeof console.log === 'function';
        } catch(e) {
            return false;
        }
    }
    
    // 拦截脚本核心函数
    function interceptScript(scriptElement, method) {
        const src = scriptElement.src || scriptElement.getAttribute('src') || '';
        const content = scriptElement.textContent || scriptElement.innerHTML || '';
        
        if (isTargetScript(src, content)) {
            interceptCount++;
            console.log(`🛡️ [万能拦截器] ${method}方式拦截成功:`, src || '内联脚本');
            updateStatusPanel();
            
            // 创建无害的替代脚本
            const dummyScript = document.createElement('script');
            dummyScript.textContent = `
                // DisableDevtool 已被万能拦截器安全移除
                console.log('🛡️ 检测到反调试脚本，已安全拦截');
                
                // 提供兼容性支持，防止页面报错
                window.DisableDevtool = function() {
                    return { success: false, reason: 'intercepted by universal blocker' };
                };
            `;
            return dummyScript;
        }
        return null;
    }
    
    // 劫持各种脚本加载方式
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function(child) {
        if (child && child.tagName === 'SCRIPT') {
            const replacement = interceptScript(child, 'appendChild');
            if (replacement) {
                return originalAppendChild.call(this, replacement);
            }
        }
        return originalAppendChild.call(this, child);
    };
    
    const originalInsertBefore = Element.prototype.insertBefore;
    Element.prototype.insertBefore = function(newNode, referenceNode) {
        if (newNode && newNode.tagName === 'SCRIPT') {
            const replacement = interceptScript(newNode, 'insertBefore');
            if (replacement) {
                return originalInsertBefore.call(this, replacement, referenceNode);
            }
        }
        return originalInsertBefore.call(this, newNode, referenceNode);
    };
    
    const originalCreateElement = Document.prototype.createElement;
    Document.prototype.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        
        if (tagName && tagName.toLowerCase() === 'script') {
            let realSrc = '';
            
            Object.defineProperty(element, 'src', {
                get: function() { return realSrc; },
                set: function(value) {
                    if (value && isTargetScript(value)) {
                        interceptCount++;
                        console.log(`🛡️ [万能拦截器] createElement拦截:`, value);
                        updateStatusPanel();
                        return; // 阻止设置src
                    }
                    realSrc = value;
                    element.setAttribute('src', value);
                }
            });
            
            // 劫持textContent设置（拦截内联脚本）
            const originalTextContentSetter = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').set;
            Object.defineProperty(element, 'textContent', {
                get: function() {
                    return this._textContent || '';
                },
                set: function(value) {
                    if (value && isTargetScript('', value)) {
                        interceptCount++;
                        console.log('🛡️ [万能拦截器] 内联脚本拦截成功');
                        updateStatusPanel();
                        this._textContent = '// 内联反调试脚本已被拦截';
                        return;
                    }
                    this._textContent = value;
                    originalTextContentSetter.call(this, value);
                }
            });
        }
        
        return element;
    };
    
    // 全局保护
    Object.defineProperty(window, 'DisableDevtool', {
        get: function() {
            console.log('🛡️ [万能拦截器] DisableDevtool对象访问被拦截');
            return function() {
                return { success: false, reason: 'blocked by universal interceptor' };
            };
        },
        set: function() {
            console.log('🛡️ [万能拦截器] 禁止设置DisableDevtool');
        }
    });
    
    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createStatusPanel);
    } else {
        setTimeout(createStatusPanel, 100);
    }
    
    // 检查已存在脚本
    setTimeout(() => {
        document.querySelectorAll('script').forEach(script => {
            const src = script.src;
            const content = script.textContent || script.innerHTML;
            
            if (isTargetScript(src, content)) {
                console.log('🛡️ [万能拦截器] 发现并移除已存在脚本:', src || '内联脚本');
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                    interceptCount++;
                    updateStatusPanel();
                }
            }
        });
    }, 500);
    
    console.log('🛡️ DisableDevtool万能拦截器已启动 - 适配全网站');
    
})();