// ==UserScript==
// @name         DisableDevtool万能拦截器 - 增强版
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  全方位拦截disable-devtool，支持多种加载方式，可拖拽悬浮控制面板
// @author       MissChina
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @icon         https://github.com/MissChina/anti-disable-devtool/raw/main/icon.png
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
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let panelStartX = 0;
    let panelStartY = 0;
    let isMinimized = false;
    
    // 初始化启动信息
    console.log('%c🛡️ DisableDevtool万能拦截器 - 增强版 v3.1', 'color: #10B981; font-weight: bold; font-size: 14px;');
    console.log('%c👨‍💻 作者: MissChina (GitHub)', 'color: #6B7280; font-size: 12px;');
    console.log('%c🔗 项目地址: https://github.com/MissChina/anti-disable-devtool', 'color: #6B7280; font-size: 12px;');
    console.log('%c⚠️  仅供个人非盈利使用，禁止商用', 'color: #F59E0B; font-size: 12px;');
    
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
    
    // 创建可拖拽的状态面板
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
            cursor: move;
            transition: all 0.3s ease;
            min-width: 120px;
            text-align: center;
            user-select: none;
            backdrop-filter: blur(10px);
        `;
        
        // 添加作者信息水印
        const authorInfo = document.createElement('div');
        authorInfo.style.cssText = `
            position: absolute;
            bottom: -20px;
            right: 0;
            font-size: 8px;
            color: rgba(255,255,255,0.6);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        authorInfo.textContent = 'by MissChina';
        statusDiv.appendChild(authorInfo);
        
        updateStatusPanel();
        document.body.appendChild(statusDiv);
        
        // 创建控制按钮容器
        const controlButtons = document.createElement('div');
        controlButtons.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            display: none;
            gap: 4px;
        `;
        
        // 最小化按钮
        const minimizeBtn = document.createElement('div');
        minimizeBtn.innerHTML = '−';
        minimizeBtn.style.cssText = `
            width: 16px;
            height: 16px;
            background: rgba(255, 193, 7, 0.9);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 10px;
            font-weight: bold;
            color: white;
        `;
        minimizeBtn.onclick = (e) => {
            e.stopPropagation();
            toggleMinimize();
        };
        
        // 关闭按钮
        const closeBtn = document.createElement('div');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            width: 16px;
            height: 16px;
            background: rgba(220, 38, 38, 0.9);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            color: white;
        `;
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            hidePanel();
        };
        
        controlButtons.appendChild(minimizeBtn);
        controlButtons.appendChild(closeBtn);
        statusDiv.appendChild(controlButtons);
        
        // 鼠标事件处理
        statusDiv.addEventListener('mousedown', startDrag);
        statusDiv.addEventListener('click', handleClick);
        statusDiv.addEventListener('mouseenter', showControls);
        statusDiv.addEventListener('mouseleave', hideControls);
        
        // 全局事件监听
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', endDrag);
        
        // 悬停效果显示作者信息
        statusDiv.addEventListener('mouseenter', () => {
            if (!isDragging) {
                statusDiv.style.background = 'rgba(16, 185, 129, 1)';
                statusDiv.style.transform = 'scale(1.05)';
                authorInfo.style.opacity = '1';
            }
        });
        
        statusDiv.addEventListener('mouseleave', () => {
            if (!isDragging) {
                statusDiv.style.background = 'rgba(16, 185, 129, 0.9)';
                statusDiv.style.transform = 'scale(1)';
                authorInfo.style.opacity = '0';
            }
        });
        
        // 5秒后自动半透明，减少干扰
        setTimeout(() => {
            if (statusDiv && !isExpanded && !isMinimized) {
                statusDiv.style.opacity = '0.6';
            }
        }, 5000);
        
        function startDrag(e) {
            if (e.target === minimizeBtn || e.target === closeBtn) return;
            
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            
            const rect = statusDiv.getBoundingClientRect();
            panelStartX = rect.left;
            panelStartY = rect.top;
            
            statusDiv.style.cursor = 'grabbing';
            statusDiv.style.transition = 'none';
            e.preventDefault();
        }
        
        function handleDrag(e) {
            if (!isDragging) return;
            
            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;
            
            let newX = panelStartX + deltaX;
            let newY = panelStartY + deltaY;
            
            // 边界检测
            const maxX = window.innerWidth - statusDiv.offsetWidth;
            const maxY = window.innerHeight - statusDiv.offsetHeight;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            statusDiv.style.left = newX + 'px';
            statusDiv.style.top = newY + 'px';
            statusDiv.style.right = 'auto';
            statusDiv.style.bottom = 'auto';
        }
        
        function endDrag() {
            if (!isDragging) return;
            
            isDragging = false;
            statusDiv.style.cursor = 'move';
            statusDiv.style.transition = 'all 0.3s ease';
        }
        
        function handleClick(e) {
            if (e.target === minimizeBtn || e.target === closeBtn) return;
            if (isDragging) return;
            
            // 延迟执行，避免与拖拽冲突
            setTimeout(() => {
                if (!isDragging) {
                    togglePanel();
                }
            }, 100);
        }
        
        function showControls() {
            if (!isMinimized) {
                controlButtons.style.display = 'flex';
            }
        }
        
        function hideControls() {
            controlButtons.style.display = 'none';
        }
        
        function toggleMinimize() {
            isMinimized = !isMinimized;
            if (isMinimized) {
                statusDiv.innerHTML = '<div style="padding: 2px 6px;">🛡️</div>';
                statusDiv.style.minWidth = 'auto';
                statusDiv.style.width = '24px';
                statusDiv.style.height = '24px';
                statusDiv.style.borderRadius = '50%';
                controlButtons.style.display = 'none';
                // 重新添加控制按钮到最小化状态
                statusDiv.appendChild(controlButtons);
            } else {
                updateStatusPanel();
                statusDiv.style.width = 'auto';
                statusDiv.style.height = 'auto';
                statusDiv.style.borderRadius = '20px';
                statusDiv.appendChild(controlButtons);
            }
        }
        
        function hidePanel() {
            statusDiv.style.opacity = '0';
            statusDiv.style.transform = 'scale(0.5)';
            setTimeout(() => {
                if (statusDiv) {
                    statusDiv.style.display = 'none';
                }
            }, 300);
            
            // 10秒后重新显示
            setTimeout(() => {
                if (statusDiv) {
                    statusDiv.style.display = 'block';
                    statusDiv.style.opacity = '0.6';
                    statusDiv.style.transform = 'scale(1)';
                }
            }, 10000);
        }
    }
    
    // 切换面板状态
    function togglePanel() {
        isExpanded = !isExpanded;
        statusDiv.style.opacity = '1';
        updateStatusPanel();
    }
    
    // 更新状态显示
    function updateStatusPanel() {
        if (!statusDiv || isMinimized) return;
        
        if (!isExpanded) {
            const status = interceptCount > 0 ? '🛡️' : '👁️';
            const text = interceptCount > 0 ? `已拦截 ${interceptCount}` : '守护中';
            
            statusDiv.innerHTML = `
                <span>${status} ${text}</span>
                <div style="position: absolute; bottom: -20px; right: 0; font-size: 8px; color: rgba(255,255,255,0.6); pointer-events: none; opacity: 0; transition: opacity 0.3s ease;">by MissChina</div>
            `;
            statusDiv.style.padding = '6px 10px';
            
            // 重新添加控制按钮
            const existingControls = statusDiv.querySelector('[data-control-buttons]');
            if (!existingControls) {
                const controlButtons = createControlButtons();
                statusDiv.appendChild(controlButtons);
            }
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
                点击收缩 • 拖拽移动 • by MissChina
            </div>
            <div style="position: absolute; bottom: -20px; right: 0; font-size: 8px; color: rgba(255,255,255,0.6); pointer-events: none; opacity: 0; transition: opacity 0.3s ease;">by MissChina</div>
        `;
        statusDiv.style.padding = '10px 14px';
        
        // 重新添加控制按钮
        const controlButtons = createControlButtons();
        statusDiv.appendChild(controlButtons);
    }
    
    // 创建控制按钮
    function createControlButtons() {
        const controlButtons = document.createElement('div');
        controlButtons.setAttribute('data-control-buttons', 'true');
        controlButtons.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            display: none;
            gap: 4px;
        `;
        
        // 最小化按钮
        const minimizeBtn = document.createElement('div');
        minimizeBtn.innerHTML = '−';
        minimizeBtn.style.cssText = `
            width: 16px;
            height: 16px;
            background: rgba(255, 193, 7, 0.9);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 10px;
            font-weight: bold;
            color: white;
        `;
        minimizeBtn.onclick = (e) => {
            e.stopPropagation();
            toggleMinimize();
        };
        
        // 关闭按钮
        const closeBtn = document.createElement('div');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            width: 16px;
            height: 16px;
            background: rgba(220, 38, 38, 0.9);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            color: white;
        `;
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            hidePanel();
        };
        
        controlButtons.appendChild(minimizeBtn);
        controlButtons.appendChild(closeBtn);
        
        return controlButtons;
    }
    
    // 最小化切换
    function toggleMinimize() {
        isMinimized = !isMinimized;
        if (isMinimized) {
            statusDiv.innerHTML = '<div style="padding: 2px 6px; cursor: pointer;">🛡️</div>';
            statusDiv.style.minWidth = 'auto';
            statusDiv.style.width = '24px';
            statusDiv.style.height = '24px';
            statusDiv.style.borderRadius = '50%';
            statusDiv.style.opacity = '0.8';
        } else {
            statusDiv.style.minWidth = '120px';
            statusDiv.style.width = 'auto';
            statusDiv.style.height = 'auto';
            statusDiv.style.borderRadius = '20px';
            statusDiv.style.opacity = '1';
            updateStatusPanel();
        }
    }
    
    // 隐藏面板
    function hidePanel() {
        statusDiv.style.opacity = '0';
        statusDiv.style.transform = 'scale(0.5)';
        setTimeout(() => {
            if (statusDiv) {
                statusDiv.style.display = 'none';
            }
        }, 300);
        
        // 10秒后重新显示为最小化状态
        setTimeout(() => {
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.opacity = '0.6';
                statusDiv.style.transform = 'scale(1)';
                isMinimized = true;
                toggleMinimize(); // 设为最小化状态
            }
        }, 10000);
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