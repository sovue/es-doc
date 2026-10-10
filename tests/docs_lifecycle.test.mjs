import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../static/js/docs.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const emit = (target, name, properties = {}) => {
    const event = new Event(name);
    for (const [name, value] of Object.entries(properties)) Object.defineProperty(event, name, { value });
    target.dispatchEvent(event);
};

function docs() {
    const window = new EventTarget(), frames = new Map(), media = [], observers = [], css = [], pushes = [];
    let frameId = 0, currentPage, resolveFonts;
    class ResizeObserver {
        constructor(callback) { this.callback = callback; observers.push(this); }
        observe() {}
        disconnect() { this.disconnected = true; }
    }
    window.ResizeObserver = ResizeObserver;
    const context = vm.createContext({
        window, ResizeObserver, AbortController, location: { hash: '' }, innerHeight: 1000, scrollY: 0,
        addEventListener: window.addEventListener.bind(window),
        requestAnimationFrame: fn => { const id = ++frameId; frames.set(id, fn); return id; },
        cancelAnimationFrame: id => frames.delete(id),
        getComputedStyle: () => ({ scrollPaddingTop: '64px' }),
        matchMedia: () => { const item = new EventTarget(); item.matches = false; media.push(item); return item; },
        history: { pushState: (...args) => pushes.push(args) },
        document: {
            getElementById: id => ({ 'sidebar-all': currentPage.tree, 'sidebar-contents': currentPage.contents,
                section: currentPage.heading })[id],
            querySelectorAll: selector => selector.startsWith('.sidebar-toc') ? currentPage.links : currentPage.headings,
            documentElement: { scrollHeight: 2000, style: { setProperty: (...args) => css.push(args) } },
            fonts: { ready: new Promise(resolve => { resolveFonts = resolve; }) },
        },
    });
    function page(hasHeadings = true) {
        const summary = { offsetHeight: 32, focus() {} };
        const tree = new EventTarget(), contents = new EventTarget();
        for (const details of [tree, contents]) {
            details.open = false;
            details.contains = () => false;
            details.querySelector = selector => selector === 'summary' ? summary : null;
            details.closest = () => null;
        }
        const link = { hash: '#section', classList: { add() {}, remove() {} }, setAttribute() {}, removeAttribute() {} };
        const result = {
            tree, contents, reads: 0, links: hasHeadings ? [link] : [],
            heading: { id: 'section',
                getBoundingClientRect() { result.reads++; return { top: 0 }; },
                setAttribute() {}, focus() {}, scrollIntoView() {},
            },
        };
        result.headings = hasHeadings ? [result.heading] : [];
        currentPage = result;
        vm.runInContext(source, context);
        result.reads = 0;
        return result;
    }
    function flush() {
        const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn());
    }
    return { window, page, flush, frames, media, observers, css, pushes, resolveFonts };
}

test('repeated article navigation retains only the current scroll handler', () => {
    const site = docs(), pages = [];
    for (let i = 0; i < 12; i++) pages.push(site.page());
    emit(site.window, 'scroll');
    site.flush();
    assert.ok(pages.at(-1).reads > 0);
    assert.ok(pages.slice(0, -1).every(page => page.reads === 0), 'Old articles still inspect their headings');
    assert.ok(site.observers.slice(0, -1).every(observer => observer.disconnected));
});

test('explicit cleanup removes global and media handlers and disconnects the observer', () => {
    const site = docs(), page = site.page();
    assert.equal(typeof site.window.__esdocDocsCleanup, 'function');
    site.window.__esdocDocsCleanup();
    for (const name of ['scroll', 'resize', 'hashchange', 'load']) emit(site.window, name);
    for (const media of site.media) { media.matches = true; emit(media, 'change'); }
    site.flush();
    assert.equal(page.reads, 0);
    assert.equal(page.tree.open, false);
    assert.equal(page.contents.open, false);
    assert.equal(site.observers[0].disconnected, true);
    const writes = site.css.length;
    site.observers[0].callback();
    assert.equal(site.css.length, writes);
});

test('pages without headings still clean up their disclosure handlers and observer', () => {
    const site = docs(), page = site.page(false);
    assert.equal(typeof site.window.__esdocDocsCleanup, 'function');
    site.window.__esdocDocsCleanup();
    for (const media of site.media) { media.matches = true; emit(media, 'change'); }
    assert.equal(page.tree.open, false);
    assert.equal(page.contents.open, false);
    assert.equal(site.observers[0].disconnected, true);
});

test('cleanup cancels scroll frames and prevents deferred font and TOC callbacks', async () => {
    const site = docs(), page = site.page();
    emit(site.window, 'scroll');
    emit(page.contents, 'click', { button: 0, target: { closest: () => page.links[0] } });
    assert.ok(site.frames.size > 0);
    assert.equal(typeof site.window.__esdocDocsCleanup, 'function');
    site.window.__esdocDocsCleanup();
    site.flush();
    site.resolveFonts();
    await tick();
    assert.equal(site.frames.size, 0);
    assert.equal(page.reads, 0);
    assert.deepEqual(site.pushes, []);
});
