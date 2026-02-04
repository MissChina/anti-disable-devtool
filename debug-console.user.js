// ==UserScript==
// @name         脚本监控面板
// @namespace    https://github.com/MissChina/anti-disable-devtool
// @version      5.0.0
// @description  监控页面加载的所有 JS 脚本（纯监控，不拦截）
// @author       MissChina
// @license      Personal Non-Commercial License
// @match        *://*.hhkan0.com/*
// @match        *://*.hhkan1.com/*
// @match        *://*.hhkan2.com/*
// @match        *://*.hhkan3.com/*
// @match        *://*.hhkan4.com/*
// @match        *://hhkan0.com/*
// @match        *://hhkan1.com/*
// @match        *://hhkan2.com/*
// @match        *://hhkan3.com/*
// @match        *://hhkan4.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const DATA = { js: [], net: [] };
    const seen = new Set();

    const O = {
        createElement: Document.prototype.createElement,
        appendChild: Element.prototype.appendChild,
        insertBefore: Element.prototype.insertBefore
    };

    const getStack = () => {
        try { throw new Error(); }
        catch (e) { return (e.stack || '').split('\n').slice(3, 7).join('\n'); }
    };

    const getName = (url) => {
        if (!url) return '(inline)';
        try { return new URL(url).pathname.split('/').pop() || url; }
        catch { return url.split('/').pop() || url; }
    };

    const add = (type, url, stack = '') => {
        const u = String(url);
        if (seen.has(u) || !u) return;
        seen.add(u);
        DATA[type]?.push({ url: u, name: getName(u), stack });
        render();
    };

    // 拦截 createElement
    Document.prototype.createElement = function(tag) {
        const el = O.createElement.call(this, tag);
        if (tag?.toLowerCase() === 'script') {
            const stack = getStack();
            let _src = '';
            Object.defineProperty(el, 'src', {
                get: () => _src,
                set: (v) => { _src = v; add('js', v, stack); el.setAttribute('src', v); }
            });
            el._stack = stack;
        }
        return el;
    };

    // 拦截 DOM 插入
    Element.prototype.appendChild = function(child) {
        if (child?.tagName === 'SCRIPT' && child.src) add('js', child.src, child._stack || getStack());
        return O.appendChild.call(this, child);
    };

    Element.prototype.insertBefore = function(node, ref) {
        if (node?.tagName === 'SCRIPT' && node.src) add('js', node.src, node._stack || getStack());
        return O.insertBefore.call(this, node, ref);
    };

    // 扫描已加载资源
    const scan = () => {
        try {
            performance.getEntriesByType('resource').forEach(e => {
                if (e.initiatorType === 'script') add('js', e.name, '(已加载)');
                else if (e.initiatorType === 'xmlhttprequest' || e.initiatorType === 'fetch') add('net', e.name);
            });
        } catch {}
        document.querySelectorAll('script[src]').forEach(s => add('js', s.src, '(HTML)'));
    };

    // PerformanceObserver
    try {
        new PerformanceObserver((list) => {
            list.getEntries().forEach(e => {
                if (e.initiatorType === 'script') add('js', e.name, '');
                else if (e.initiatorType === 'xmlhttprequest' || e.initiatorType === 'fetch') add('net', e.name);
            });
        }).observe({ entryTypes: ['resource'] });
    } catch {}

    // 面板
    let panel = null;
    let state = { min: false, tab: 'js', exp: {} };

    const isDanger = (url) => /disable[-_]?devtool|anti[-_]?debug/i.test(url);

    const render = () => {
        if (!panel) return;

        const dangerCount = DATA.js.filter(x => isDanger(x.url)).length;
        const list = DATA[state.tab] || [];

        if (state.min) {
            panel.style.width = 'auto';
            panel.innerHTML = `
                <div id="m-expand" style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#667eea,#764ba2)">
                    <span>📊</span>
                    <span>JS ${DATA.js.length}</span>
                    <span>NET ${DATA.net.length}</span>
                    ${dangerCount ? `<span style="background:#f44336;padding:2px 6px;border-radius:8px;font-size:10px">${dangerCount}</span>` : ''}
                </div>
            `;
            document.getElementById('m-expand').onclick = () => { state.min = false; render(); };
            return;
        }

        panel.style.width = '400px';
        panel.innerHTML = `
            <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:12px 14px;display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:16px">📊</span>
                    <span style="font-weight:700;font-size:13px">脚本监控</span>
                    ${dangerCount ? `<span style="background:#fff;color:#f44336;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:bold">${dangerCount}</span>` : ''}
                </div>
                <span id="m-min" style="cursor:pointer;font-size:16px;padding:2px">−</span>
            </div>
            <div style="display:flex;background:#16213e;border-bottom:1px solid #0f3460">
                <div id="m-t1" style="flex:1;padding:10px;text-align:center;cursor:pointer;border-bottom:2px solid ${state.tab==='js'?'#667eea':'transparent'};color:${state.tab==='js'?'#fff':'#666'}">JS ${DATA.js.length}</div>
                <div id="m-t2" style="flex:1;padding:10px;text-align:center;cursor:pointer;border-bottom:2px solid ${state.tab==='net'?'#00bcd4':'transparent'};color:${state.tab==='net'?'#00bcd4':'#666'}">NET ${DATA.net.length}</div>
            </div>
            <div style="max-height:50vh;overflow-y:auto;padding:8px;background:#1a1a2e">
                ${list.length === 0 ? '<div style="text-align:center;color:#555;padding:20px">暂无</div>' : ''}
                ${list.map((x, i) => {
                    const d = isDanger(x.url);
                    const e = state.exp[x.url];
                    return `
                    <div style="margin:4px 0;background:${d?'#3d1f1f':'#16213e'};border:1px solid ${d?'#6b2c2c':'#0f3460'};border-radius:6px;overflow:hidden">
                        <div style="padding:8px 10px">
                            <div style="display:flex;justify-content:space-between;align-items:center">
                                <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
                                    <span style="font-weight:600;color:${d?'#ef5350':'#ddd'};font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x.name}</span>
                                    ${d ? '<span style="background:#f44336;color:#fff;padding:1px 4px;border-radius:2px;font-size:8px">危险</span>' : ''}
                                </div>
                                <div style="display:flex;gap:4px;flex-shrink:0">
                                    <span class="m-open" data-u="${x.url}" style="cursor:pointer;color:#667eea;font-size:9px;padding:2px 6px;background:rgba(102,126,234,0.2);border-radius:3px">打开</span>
                                    <span class="m-copy" data-u="${x.url}" style="cursor:pointer;color:#888;font-size:9px;padding:2px 6px;background:rgba(255,255,255,0.1);border-radius:3px">复制</span>
                                    <span class="m-toggle" data-u="${x.url}" style="cursor:pointer;color:#666;font-size:9px;padding:2px 4px">${e ? '▼' : '▶'}</span>
                                </div>
                            </div>
                            <div style="font-size:8px;color:#555;margin-top:3px;word-break:break-all">${x.url}</div>
                        </div>
                        ${e && x.stack ? `
                        <div style="padding:8px 10px;background:rgba(0,0,0,0.2);border-top:1px solid ${d?'#6b2c2c':'#0f3460'}">
                            <div style="font-size:9px;color:#777;margin-bottom:4px">调用栈:</div>
                            <pre style="margin:0;font-size:8px;color:#888;white-space:pre-wrap;background:rgba(0,0,0,0.3);padding:6px;border-radius:3px">${x.stack}</pre>
                        </div>
                        ` : ''}
                    </div>`;
                }).join('')}
            </div>
            <div style="padding:8px 10px;background:#16213e;border-top:1px solid #0f3460;font-size:9px;color:#555;display:flex;justify-content:space-between">
                <span>共 ${list.length} 条</span>
                <span id="m-scan" style="cursor:pointer;color:#667eea">刷新</span>
            </div>
        `;

        document.getElementById('m-min').onclick = () => { state.min = true; render(); };
        document.getElementById('m-t1').onclick = () => { state.tab = 'js'; render(); };
        document.getElementById('m-t2').onclick = () => { state.tab = 'net'; render(); };
        document.getElementById('m-scan').onclick = () => { scan(); render(); };

        panel.querySelectorAll('.m-toggle').forEach(el => {
            el.onclick = () => { state.exp[el.dataset.u] = !state.exp[el.dataset.u]; render(); };
        });
        panel.querySelectorAll('.m-open').forEach(el => {
            el.onclick = (e) => { e.stopPropagation(); window.open(el.dataset.u, '_blank'); };
        });
        panel.querySelectorAll('.m-copy').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(el.dataset.u).then(() => {
                    el.textContent = '✓';
                    setTimeout(() => { el.textContent = '复制'; }, 800);
                });
            };
        });
    };

    const init = () => {
        if (!document.body || panel) return;
        panel = document.createElement('div');
        panel.style.cssText = 'position:fixed;top:10px;right:10px;background:#1a1a2e;color:#eee;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:11px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,0.4);z-index:2147483647;overflow:hidden;transition:width .2s';
        document.body.appendChild(panel);
        scan();
        render();
    };

    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);

    setTimeout(scan, 100);
    setTimeout(scan, 500);
    setTimeout(scan, 2000);

    window._Monitor = { data: DATA, scan };
})();
