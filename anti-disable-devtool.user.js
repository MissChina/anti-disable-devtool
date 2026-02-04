// ==UserScript==
// @name         Anti-Disable-Devtool
// @namespace    https://github.com/MissChina/anti-disable-devtool
// @version      10.1.0
// @description  智能拦截 disable-devtool 反调试脚本，保护开发者工具正常使用
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
// @icon         https://github.com/MissChina/anti-disable-devtool/raw/main/icon.png
// @homepageURL  https://github.com/MissChina/anti-disable-devtool
// @supportURL   https://github.com/MissChina/anti-disable-devtool/issues
// ==/UserScript==

// 使用页面注入方式，绕过 Tampermonkey 沙箱，确保最早执行
const injectedCode = `(function() {
    'use strict';

    // ============================================================
    // 【最高优先级】反跳转保护 - 必须最先执行
    // ============================================================
    const BAD_DOMAINS = ['baidu.com', 'google.com', 'bing.com', 'theajack.github.io', '404.html', 'about:blank'];
    const isBadUrl = (url) => {
        if (!url) return false;
        const s = String(url).toLowerCase();
        return BAD_DOMAINS.some(d => s.includes(d));
    };

    // 锁定 Location.prototype
    (function() {
        const L = Location.prototype;
        const _assign = L.assign;
        const _replace = L.replace;

        L.assign = function(url) {
            if (isBadUrl(url)) { console.log('[Anti-DD] 阻止跳转 assign:', url); return; }
            return _assign.call(this, url);
        };
        L.replace = function(url) {
            if (isBadUrl(url)) { console.log('[Anti-DD] 阻止跳转 replace:', url); return; }
            return _replace.call(this, url);
        };

        const desc = Object.getOwnPropertyDescriptor(L, 'href');
        if (desc && desc.set) {
            Object.defineProperty(L, 'href', {
                get: desc.get,
                set: function(url) {
                    if (isBadUrl(url)) { console.log('[Anti-DD] 阻止跳转 href:', url); return; }
                    return desc.set.call(this, url);
                },
                configurable: false,
                enumerable: true
            });
        }

        // 锁定 reload
        const _reload = L.reload;
        L.reload = function() {
            // 允许正常 reload，但记录
            return _reload.call(this);
        };
    })();

    // 锁定 window.location / top.location / self.location / parent.location
    (function() {
        const targets = [
            [window, 'window'],
            [window.top, 'top'],
            [window.self, 'self'],
            [window.parent, 'parent']
        ];
        targets.forEach(([obj, name]) => {
            try {
                if (!obj) return;
                const loc = obj.location;
                Object.defineProperty(obj, 'location', {
                    get: () => loc,
                    set: (url) => {
                        if (isBadUrl(url)) {
                            console.log('[Anti-DD] 阻止跳转 ' + name + '.location=', url);
                            return;
                        }
                        loc.href = url;
                    },
                    configurable: false
                });
            } catch(e) {}
        });
    })();

    // 拦截 window.open
    const _open = window.open;
    window.open = function(url, ...args) {
        if (isBadUrl(url)) {
            console.log('[Anti-DD] 阻止 window.open:', url);
            return null;
        }
        return _open.call(this, url, ...args);
    };

    // 拦截 meta refresh (通过 MutationObserver)
    const blockMetaRefresh = () => {
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.tagName === 'META') {
                        const equiv = node.getAttribute('http-equiv');
                        const content = node.getAttribute('content') || '';
                        if (equiv && equiv.toLowerCase() === 'refresh' && isBadUrl(content)) {
                            console.log('[Anti-DD] 移除恶意 meta refresh:', content);
                            node.remove();
                        }
                    }
                }
            }
        });
        if (document.documentElement) {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    };
    blockMetaRefresh();

    // 拦截 beforeunload（某些检测会用这个）
    window.addEventListener('beforeunload', (e) => {
        // 不阻止，但记录
    }, true);

    // ============================================================
    // 拦截 alert / confirm / prompt
    // ============================================================
    const _alert = window.alert;
    const _confirm = window.confirm;
    const _prompt = window.prompt;

    window.alert = function(msg) {
        const s = String(msg || '').toLowerCase();
        if (s.includes('devtool') || s.includes('调试') || s.includes('控制台') || s.includes('检测') || s.includes('debug')) {
            console.log('[Anti-DD] 拦截 alert:', msg);
            return;
        }
        return _alert.call(this, msg);
    };

    window.confirm = function(msg) {
        const s = String(msg || '').toLowerCase();
        if (s.includes('devtool') || s.includes('调试') || s.includes('控制台')) {
            console.log('[Anti-DD] 拦截 confirm:', msg);
            return false;
        }
        return _confirm.call(this, msg);
    };

    // ============================================================
    // 破坏检测机制
    // ============================================================

    // 伪造窗口尺寸
    try {
        Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth, configurable: false });
        Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight, configurable: false });
    } catch(e) {}

    // 锁定 DisableDevtool 全局变量
    const fakeDD = function() { return { success: false }; };
    fakeDD.md5 = () => '';
    fakeDD.version = '0.0.0';
    fakeDD.isRunning = false;
    fakeDD.isSuspend = true;
    fakeDD.config = () => fakeDD;
    fakeDD.close = () => {};
    fakeDD.ondevtoolopen = null;
    fakeDD.ondevtoolclose = null;

    ['DisableDevtool', 'disableDevtool', 'DISABLE_DEVTOOL', 'dd', 'devtoolsDetector'].forEach(name => {
        try {
            Object.defineProperty(window, name, {
                get: () => fakeDD,
                set: () => true,
                configurable: false
            });
        } catch(e) {}
    });

    // 拦截 Function / eval 中的 debugger
    const _Function = window.Function;
    window.Function = function(...args) {
        const code = args[args.length - 1];
        if (typeof code === 'string' && code.includes('debugger')) {
            args[args.length - 1] = code.replace(/debugger/g, '');
        }
        return _Function.apply(this, args);
    };
    window.Function.prototype = _Function.prototype;

    const _eval = window.eval;
    window.eval = function(code) {
        if (typeof code === 'string' && code.includes('debugger')) {
            code = code.replace(/debugger/g, '');
        }
        return _eval.call(this, code);
    };

    // 拦截 setInterval 创建的 debugger 循环
    const _setInterval = window.setInterval;
    window.setInterval = function(fn, delay, ...args) {
        if (typeof fn === 'string' && fn.includes('debugger')) {
            console.log('[Anti-DD] 拦截 setInterval debugger');
            return 0;
        }
        return _setInterval.call(this, fn, delay, ...args);
    };

    const _setTimeout = window.setTimeout;
    window.setTimeout = function(fn, delay, ...args) {
        if (typeof fn === 'string' && fn.includes('debugger')) {
            console.log('[Anti-DD] 拦截 setTimeout debugger');
            return 0;
        }
        return _setTimeout.call(this, fn, delay, ...args);
    };

    // ============================================================
    // 配置
    // ============================================================
    const CONFIG = {
        enableBlock: true,
        showPanel: false,  // 面板已禁用
        debug: false,
        threshold: 4
    };

    // ============================================================
    // 特征库
    // ============================================================
    const FEATURES = {
        urls: [
            'disable-devtool', 'disable_devtool', 'disabledevtool',
            'anti-debug', 'anti_debug', 'devtools-detect'
        ],
        codes: [
            [/DisableDevtool/i, 3, 'DisableDevtool'],
            [/theajack\\.github\\.io/i, 5, '官方地址'],
            [/ondevtoolopen/i, 3, 'ondevtoolopen'],
            [/ondevtoolclose/i, 2, 'ondevtoolclose'],
            [/isDevToolOpened/i, 2, 'isDevToolOpened'],
            [/clearIntervalWhenDevOpenTrigger/i, 5, '特有函数'],
            [/outerWidth\\s*-\\s*innerWidth/i, 2, '尺寸检测'],
            [/outerHeight\\s*-\\s*innerHeight/i, 2, '高度检测'],
            [/RegToString|FuncToString|DateToString/i, 3, 'ToString检测'],
            [/DefineId|DebugLib/i, 2, 'DefineId'],
            [/Function\\s*\\(\\s*["']debugger["']\\s*\\)/, 3, 'Function debugger'],
            [/setInterval[\\s\\S]{0,100}debugger/, 2, 'setInterval debugger'],
            [/eruda|vconsole/i, 1, '调试工具检测'],
            [/location\\s*[.=][\\s\\S]{0,30}(baidu|google|bing)\\.com/i, 3, '跳转检测'],
            [/oncontextmenu\\s*=\\s*(null|false)/i, 1, '右键禁用'],
            [/keyCode\\s*={2,3}\\s*123/i, 2, 'F12检测']
        ],
        globals: ['DisableDevtool', 'disableDevtool', 'DISABLE_DEVTOOL', 'dd']
    };

    // ============================================================
    // 数据
    // ============================================================
    const DATA = { scripts: [], blocked: [], cache: new Map(), count: 0 };

    const getName = (url) => {
        if (!url) return '(inline)';
        try { return new URL(url).pathname.split('/').pop() || url; }
        catch { return url.split('/').pop() || url; }
    };

    const getStack = () => {
        try { throw new Error(); }
        catch (e) { return (e.stack || '').split('\\n').slice(3, 7).join('\\n'); }
    };

    // ============================================================
    // 分析引擎
    // ============================================================
    const analyze = (code, url) => {
        const key = url || (code ? code.slice(0, 100) : '');
        if (DATA.cache.has(key)) return DATA.cache.get(key);

        const result = { dangerous: false, score: 0, matches: [] };

        if (url) {
            const lower = url.toLowerCase();
            for (const kw of FEATURES.urls) {
                if (lower.includes(kw)) {
                    result.score += 5;
                    result.matches.push({ name: 'URL:' + kw, weight: 5 });
                    break;
                }
            }
        }

        if (code && typeof code === 'string') {
            for (const [regex, weight, name] of FEATURES.codes) {
                if (regex.test(code)) {
                    result.score += weight;
                    result.matches.push({ name, weight });
                }
            }
        }

        result.dangerous = result.score >= CONFIG.threshold;
        DATA.cache.set(key, result);
        return result;
    };

    const record = (url, code, method, stack) => {
        const analysis = analyze(code || '', url || '');
        const entry = {
            id: ++DATA.count,
            url: url || '',
            name: getName(url),
            code: code ? code.slice(0, 3000) : '',
            method,
            stack: stack || '',
            analysis,
            blocked: false,
            time: Date.now()
        };
        DATA.scripts.push(entry);
        render();
        return entry;
    };

    // ============================================================
    // 拦截脚本加载
    // ============================================================
    const O = {
        createElement: Document.prototype.createElement,
        appendChild: Element.prototype.appendChild,
        insertBefore: Element.prototype.insertBefore,
        append: Element.prototype.append,
        prepend: Element.prototype.prepend,
        setAttribute: Element.prototype.setAttribute,
        innerHTML: Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML'),
        write: Document.prototype.write,
        writeln: Document.prototype.writeln
    };

    Document.prototype.createElement = function(tag, opts) {
        const el = O.createElement.call(this, tag, opts);
        if (tag && tag.toLowerCase() === 'script') {
            const stack = getStack();
            let _src = '';
            Object.defineProperty(el, 'src', {
                get: () => _src,
                set: (url) => {
                    const a = analyze('', url);
                    const r = record(url, '', 'src', stack);
                    if (CONFIG.enableBlock && a.dangerous) {
                        r.blocked = true;
                        DATA.blocked.push(r);
                        console.log('[Anti-DD] 拦截脚本:', getName(url));
                        render();
                        return;
                    }
                    _src = url;
                    O.setAttribute.call(el, 'src', url);
                },
                configurable: true
            });
            el._stack = stack;
        }
        return el;
    };

    const interceptInsert = (orig, name) => function(...args) {
        for (const node of args) {
            if (node && node.tagName === 'SCRIPT') {
                const url = node.src || (node.getAttribute && node.getAttribute('src')) || '';
                const code = node.textContent || node.innerHTML || '';
                const stack = node._stack || getStack();
                const a = analyze(code, url);
                const r = record(url, code, name, stack);
                if (CONFIG.enableBlock && a.dangerous) {
                    r.blocked = true;
                    DATA.blocked.push(r);
                    console.log('[Anti-DD] 拦截[' + name + ']:', r.name);
                    render();
                    return node;
                }
            }
        }
        return orig.apply(this, args);
    };

    Element.prototype.appendChild = interceptInsert(O.appendChild, 'appendChild');
    Element.prototype.insertBefore = interceptInsert(O.insertBefore, 'insertBefore');
    if (O.append) Element.prototype.append = interceptInsert(O.append, 'append');
    if (O.prepend) Element.prototype.prepend = interceptInsert(O.prepend, 'prepend');

    if (O.innerHTML && O.innerHTML.set) {
        Object.defineProperty(Element.prototype, 'innerHTML', {
            get: O.innerHTML.get,
            set: function(html) {
                if (typeof html === 'string' && /<script/i.test(html)) {
                    const matches = html.match(/<script[^>]*>([\\s\\S]*?)<\\/script>/gi) || [];
                    for (const m of matches) {
                        const srcMatch = m.match(/src=["']([^"']+)["']/i);
                        const url = srcMatch ? srcMatch[1] : '';
                        const codeMatch = m.match(/<script[^>]*>([\\s\\S]*?)<\\/script>/i);
                        const code = codeMatch ? codeMatch[1] : '';
                        const a = analyze(code, url);
                        const r = record(url, code, 'innerHTML', getStack());
                        if (CONFIG.enableBlock && a.dangerous) {
                            r.blocked = true;
                            DATA.blocked.push(r);
                            html = html.replace(m, '<!-- blocked -->');
                            console.log('[Anti-DD] 拦截[innerHTML]:', r.name);
                        }
                    }
                }
                return O.innerHTML.set.call(this, html);
            },
            configurable: true,
            enumerable: true
        });
    }

    const interceptWrite = (orig, name) => function(html) {
        if (typeof html === 'string' && /<script/i.test(html)) {
            const matches = html.match(/<script[^>]*>([\\s\\S]*?)<\\/script>/gi) || [];
            for (const m of matches) {
                const srcMatch = m.match(/src=["']([^"']+)["']/i);
                const url = srcMatch ? srcMatch[1] : '';
                const codeMatch = m.match(/<script[^>]*>([\\s\\S]*?)<\\/script>/i);
                const code = codeMatch ? codeMatch[1] : '';
                const a = analyze(code, url);
                const r = record(url, code, name, getStack());
                if (CONFIG.enableBlock && a.dangerous) {
                    r.blocked = true;
                    DATA.blocked.push(r);
                    html = html.replace(m, '');
                    console.log('[Anti-DD] 拦截[' + name + ']:', r.name);
                }
            }
        }
        return orig.call(this, html);
    };

    Document.prototype.write = interceptWrite(O.write, 'write');
    Document.prototype.writeln = interceptWrite(O.writeln, 'writeln');

    // MutationObserver
    const setupObserver = () => {
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.tagName === 'SCRIPT' && !node._tracked) {
                        node._tracked = true;
                        const url = node.src || '';
                        const code = node.textContent || '';
                        const a = analyze(code, url);
                        const r = record(url, code, 'Observer', '');
                        if (CONFIG.enableBlock && a.dangerous) {
                            r.blocked = true;
                            DATA.blocked.push(r);
                            node.remove();
                            console.log('[Anti-DD] 移除:', r.name);
                            render();
                        }
                    }
                }
            }
        });
        if (document.documentElement) {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.documentElement, { childList: true, subtree: true });
            });
        }
    };
    setupObserver();

    // 扫描
    const scan = () => {
        try {
            performance.getEntriesByType('resource').forEach(e => {
                if (e.initiatorType === 'script' && !DATA.scripts.some(s => s.url === e.name)) {
                    record(e.name, '', 'Performance', '');
                }
            });
        } catch {}
        document.querySelectorAll('script[src]').forEach(s => {
            if (!DATA.scripts.some(x => x.url === s.src)) {
                record(s.src, s.textContent || '', 'DOM', '');
            }
        });
    };

    // ============================================================
    // 面板
    // ============================================================
    let panel = null;
    let state = { min: false, tab: 'all', exp: {}, filter: '' };

    const render = () => {
        if (!panel) return;
        const all = DATA.scripts;
        const danger = all.filter(s => s.analysis.dangerous);
        const blocked = DATA.blocked;
        const safe = all.filter(s => !s.analysis.dangerous);

        let list;
        switch (state.tab) {
            case 'danger': list = danger; break;
            case 'blocked': list = blocked; break;
            case 'safe': list = safe; break;
            default: list = all;
        }
        if (state.filter) {
            const f = state.filter.toLowerCase();
            list = list.filter(s => s.url.toLowerCase().includes(f) || s.name.toLowerCase().includes(f));
        }

        if (state.min) {
            panel.style.width = 'auto';
            panel.innerHTML = '<div id="dd-expand" style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#667eea,#764ba2)"><span>🛡️</span><span style="font-weight:600">防护</span><span style="background:rgba(255,255,255,0.2);padding:2px 6px;border-radius:8px;font-size:10px">' + all.length + '</span>' + (danger.length ? '<span style="background:#f44336;padding:2px 6px;border-radius:8px;font-size:10px">' + danger.length + '</span>' : '') + (blocked.length ? '<span style="background:#4CAF50;padding:2px 6px;border-radius:8px;font-size:10px">' + blocked.length + '</span>' : '') + '</div>';
            document.getElementById('dd-expand').onclick = () => { state.min = false; render(); };
            return;
        }

        panel.style.width = '420px';
        let html = '<div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:12px 14px;display:flex;justify-content:space-between;align-items:center"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">🛡️</span><span style="font-weight:700;font-size:13px">Anti-Disable-Devtool</span><span style="font-size:9px;opacity:0.7">v10.1</span></div><div style="display:flex;gap:6px;align-items:center"><label style="display:flex;align-items:center;gap:3px;font-size:10px;cursor:pointer"><input type="checkbox" id="dd-block" ' + (CONFIG.enableBlock ? 'checked' : '') + '>拦截</label><span id="dd-min" style="cursor:pointer;font-size:16px;padding:2px">−</span></div></div>';
        html += '<div style="display:flex;background:#16213e;border-bottom:1px solid #0f3460">';
        html += '<div class="dd-tab" data-t="all" style="flex:1;padding:8px;text-align:center;cursor:pointer;border-bottom:2px solid ' + (state.tab==='all'?'#667eea':'transparent') + ';color:' + (state.tab==='all'?'#fff':'#666') + '">全部 ' + all.length + '</div>';
        html += '<div class="dd-tab" data-t="danger" style="flex:1;padding:8px;text-align:center;cursor:pointer;border-bottom:2px solid ' + (state.tab==='danger'?'#f44336':'transparent') + ';color:' + (state.tab==='danger'?'#f44336':'#666') + '">危险 ' + danger.length + '</div>';
        html += '<div class="dd-tab" data-t="blocked" style="flex:1;padding:8px;text-align:center;cursor:pointer;border-bottom:2px solid ' + (state.tab==='blocked'?'#4CAF50':'transparent') + ';color:' + (state.tab==='blocked'?'#4CAF50':'#666') + '">拦截 ' + blocked.length + '</div>';
        html += '<div class="dd-tab" data-t="safe" style="flex:1;padding:8px;text-align:center;cursor:pointer;border-bottom:2px solid ' + (state.tab==='safe'?'#2196F3':'transparent') + ';color:' + (state.tab==='safe'?'#2196F3':'#666') + '">安全 ' + safe.length + '</div></div>';
        html += '<div style="padding:6px;background:#16213e"><input type="text" id="dd-filter" placeholder="搜索..." value="' + state.filter + '" style="width:100%;padding:6px 10px;border:1px solid #0f3460;border-radius:4px;background:#1a1a2e;color:#eee;font-size:10px;box-sizing:border-box"></div>';
        html += '<div style="max-height:45vh;overflow-y:auto;padding:6px;background:#1a1a2e">';
        if (list.length === 0) {
            html += '<div style="text-align:center;color:#555;padding:20px">暂无</div>';
        } else {
            list.forEach(s => {
                const d = s.analysis.dangerous;
                const b = s.blocked;
                const e = state.exp[s.id];
                const bg = b ? '#1b4332' : d ? '#3d1f1f' : '#16213e';
                const bd = b ? '#2d6a4f' : d ? '#6b2c2c' : '#0f3460';
                html += '<div style="margin:4px 0;background:' + bg + ';border:1px solid ' + bd + ';border-radius:6px;overflow:hidden"><div style="padding:8px 10px"><div style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0"><span style="font-size:9px;color:#555">#' + s.id + '</span><span style="font-weight:600;color:' + (d?'#ef5350':'#ddd') + ';font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + s.name + '</span>' + (d ? '<span style="background:#f44336;color:#fff;padding:1px 4px;border-radius:2px;font-size:8px">危险</span>' : '') + (b ? '<span style="background:#4CAF50;color:#fff;padding:1px 4px;border-radius:2px;font-size:8px">已拦截</span>' : '') + '</div><div style="display:flex;gap:4px;flex-shrink:0">' + (s.url ? '<span class="dd-open" data-u="' + s.url + '" style="cursor:pointer;color:#667eea;font-size:9px;padding:2px 6px;background:rgba(102,126,234,0.2);border-radius:3px">打开</span><span class="dd-copy" data-u="' + s.url + '" style="cursor:pointer;color:#888;font-size:9px;padding:2px 6px;background:rgba(255,255,255,0.1);border-radius:3px">复制</span>' : '') + '<span class="dd-toggle" data-i="' + s.id + '" style="cursor:pointer;color:#666;font-size:9px;padding:2px 4px">' + (e ? '▼' : '▶') + '</span></div></div><div style="font-size:8px;color:#555;margin-top:3px;word-break:break-all">' + (s.url || '(inline)') + '</div></div>';
                if (e) {
                    html += '<div style="padding:8px 10px;background:rgba(0,0,0,0.2);border-top:1px solid ' + bd + '"><div style="font-size:9px;color:#777;margin-bottom:4px">方式: ' + s.method + ' | 分数: ' + s.analysis.score + '</div><div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px">' + s.analysis.matches.map(m => '<span style="background:rgba(244,67,54,0.2);color:#ef5350;padding:1px 4px;border-radius:2px;font-size:8px">' + m.name + '+' + m.weight + '</span>').join('') + '</div>' + (s.stack ? '<pre style="margin:0 0 6px 0;font-size:8px;color:#888;white-space:pre-wrap;background:rgba(0,0,0,0.3);padding:6px;border-radius:3px;max-height:80px;overflow-y:auto">' + s.stack + '</pre>' : '') + (s.code ? '<pre style="margin:0;font-size:8px;color:#888;white-space:pre-wrap;background:rgba(0,0,0,0.3);padding:6px;border-radius:3px;max-height:100px;overflow-y:auto">' + s.code.slice(0,500).replace(/</g,'&lt;') + (s.code.length>500?'...':'') + '</pre>' : '') + '</div>';
                }
                html += '</div>';
            });
        }
        html += '</div><div style="padding:8px 10px;background:#16213e;border-top:1px solid #0f3460;font-size:9px;color:#555;display:flex;justify-content:space-between"><span>共 ' + all.length + ' 个脚本</span><span id="dd-scan" style="cursor:pointer;color:#667eea">刷新</span></div>';

        panel.innerHTML = html;

        document.getElementById('dd-min').onclick = () => { state.min = true; render(); };
        document.getElementById('dd-block').onchange = (e) => { CONFIG.enableBlock = e.target.checked; };
        document.getElementById('dd-filter').oninput = (e) => { state.filter = e.target.value; render(); };
        document.getElementById('dd-scan').onclick = () => { scan(); render(); };
        panel.querySelectorAll('.dd-tab').forEach(el => { el.onclick = () => { state.tab = el.dataset.t; render(); }; });
        panel.querySelectorAll('.dd-toggle').forEach(el => { el.onclick = () => { state.exp[el.dataset.i] = !state.exp[el.dataset.i]; render(); }; });
        panel.querySelectorAll('.dd-open').forEach(el => { el.onclick = (e) => { e.stopPropagation(); window.open(el.dataset.u, '_blank'); }; });
        panel.querySelectorAll('.dd-copy').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(el.dataset.u).then(() => {
                    el.textContent = '✓';
                    setTimeout(() => { el.textContent = '复制'; }, 800);
                });
            };
        });
    };

    const createPanel = () => {
        if (!document.body || panel) return;
        panel = document.createElement('div');
        panel.style.cssText = 'position:fixed;top:10px;right:10px;background:#1a1a2e;color:#eee;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:11px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,0.4);z-index:2147483647;overflow:hidden;transition:width .2s';
        document.body.appendChild(panel);
        render();
    };

    if (CONFIG.showPanel) {
        if (document.body) createPanel();
        else document.addEventListener('DOMContentLoaded', createPanel);
    }

    setTimeout(scan, 100);
    setTimeout(scan, 500);
    setTimeout(scan, 2000);

    console.log('[Anti-DD] v10.1.0 已启动 (页面注入模式)');
    window._AntiDD = { version: '10.1.0', config: CONFIG, data: DATA, scan, analyze };
})();`;

// 注入到页面
const script = document.createElement('script');
script.textContent = injectedCode;

if (document.documentElement) {
    document.documentElement.insertBefore(script, document.documentElement.firstChild);
} else {
    const observer = new MutationObserver(() => {
        if (document.documentElement) {
            document.documentElement.insertBefore(script, document.documentElement.firstChild);
            observer.disconnect();
        }
    });
    observer.observe(document, { childList: true });
}
