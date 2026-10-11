import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../static/js/navigation.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));

function navigation({ holdStyles = false, holdScripts = false } = {}) {
    const events = {}, requests = [], links = [], scripts = [], pushes = [], redirects = [];
    const content = { innerHTML: 'initial' };
    let current = new URL('https://example.test/docs/current');
    const location = {
        get href() { return current.href; },
        set href(value) { redirects.push(value); current = new URL(value, current); },
        get origin() { return current.origin; },
        get pathname() { return current.pathname; },
        get search() { return current.search; },
    };
    function element(kind) {
        const handlers = {};
        return {
            kind, dataset: {}, removed: false,
            addEventListener: (name, fn) => { handlers[name] = fn; },
            remove() { this.removed = true; },
            loaded() { handlers.load?.(); },
        };
    }
    const document = {
        title: 'initial', body: { className: '' }, documentElement: { dataset: {} },
        getElementById: () => content,
        addEventListener: (name, fn) => { events['document-' + name] = fn; },
        querySelectorAll: selector => selector.startsWith('script') ? scripts.filter(s => !s.removed) : [],
        createElement: element,
        head: {
            querySelectorAll: () => links.filter(link => !link.removed),
            appendChild(item) {
                (item.kind === 'link' ? links : scripts).push(item);
                if (item.kind === 'link' ? !holdStyles : !holdScripts) queueMicrotask(() => item.loaded());
            },
        },
    };
    const fetch = (url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }));
    const window = {
        fetch, DOMParser: true, scrollTo() {}, dispatchEvent() {},
        addEventListener: (name, fn) => { events[name] = fn; },
    };
    const history = {
        pushState(state, title, url) { pushes.push(url); current = new URL(url); },
        replaceState(state, title, url) { current = new URL(url); },
    };
    class DOMParser {
        parseFromString(text) {
            const page = JSON.parse(text);
            return {
                title: page.name, body: { className: page.name },
                getElementById: () => ({ innerHTML: page.name }),
                head: { querySelectorAll: selector => selector.startsWith('link')
                    ? (page.styles || []).map(href => ({ href }))
                    : (page.scripts || []).map(src => ({ src })) },
            };
        }
    }
    vm.runInNewContext(source, {
        window, document, fetch, location, history, DOMParser, URL, AbortController,
        CustomEvent: class {}, localStorage: { getItem: () => null },
    });
    return {
        content, document, location, requests, links, scripts, pushes, redirects, window,
        replace(url) { current = new URL(url, current); },
        pop(path) { current = new URL(path, current); events.popstate(); },
        click(path) {
            let prevented = false;
            events['document-click']({
                button: 0, target: { closest: () => ({ href: new URL(path, current).href, hasAttribute: () => false }) },
                preventDefault() { prevented = true; },
            });
            return prevented;
        },
        respond(index, page, { ok = true, type = 'text/html' } = {}) {
            requests[index].resolve({ ok, headers: { get: () => type }, text: async () => JSON.stringify(page) });
        },
    };
}

test('the latest Back or Forward event wins even while the previous fetch is pending', async () => {
    const nav = navigation();
    nav.pop('/docs/first');
    nav.pop('/docs/latest');
    assert.equal(nav.requests.length, 2);
    assert.equal(nav.requests[0].options.signal.aborted, true);
    nav.respond(1, { name: 'latest' });
    await tick();
    nav.respond(0, { name: 'first' });
    await tick();
    assert.equal(nav.content.innerHTML, 'latest');
    assert.equal(nav.location.pathname, '/docs/latest');
    assert.deepEqual(nav.pushes, []);
});

test('Back supersedes a pending clicked link without creating another history entry', async () => {
    const nav = navigation();
    assert.equal(nav.click('/docs/clicked'), true);
    nav.pop('/docs/back');
    assert.equal(nav.requests.length, 2);
    nav.respond(1, { name: 'back' });
    nav.respond(0, { name: 'clicked' });
    await tick();
    assert.equal(nav.content.innerHTML, 'back');
    assert.deepEqual(nav.pushes, []);
});

for (const failure of ['network', 'HTTP', 'body']) {
    test(`a stale ${failure} failure cannot redirect away from the latest navigation`, async () => {
        const nav = navigation();
        nav.pop('/docs/first');
        nav.pop('/docs/latest');
        assert.equal(nav.requests.length, 2);
        nav.respond(1, { name: 'latest' });
        await tick();
        if (failure === 'network') nav.requests[0].reject(new Error('offline'));
        else if (failure === 'body') nav.requests[0].resolve({
            ok: true, headers: { get: () => 'text/html' }, text: async () => { throw new Error('body failed'); },
        });
        else nav.respond(0, {}, { ok: false });
        await tick();
        assert.deepEqual(nav.redirects, []);
        assert.equal(nav.content.innerHTML, 'latest');
    });
}

test('superseded stylesheet loads are removed without removing the current page styles', async () => {
    const nav = navigation({ holdStyles: true });
    nav.pop('/docs/first');
    nav.respond(0, { name: 'first', styles: ['/first.css'] });
    await tick();
    nav.pop('/docs/latest');
    assert.equal(nav.requests.length, 2);
    nav.respond(1, { name: 'latest', styles: ['/latest.css'] });
    await tick();
    const latest = nav.links.find(link => link.href === '/latest.css');
    latest.loaded();
    await tick();
    nav.links.find(link => link.href === '/first.css').loaded();
    await tick();
    assert.equal(nav.content.innerHTML, 'latest');
    assert.deepEqual(nav.links.filter(link => !link.removed).map(link => link.href), ['/latest.css']);
});

test('pending page scripts finish before the next page replaces their DOM', async () => {
    const nav = navigation({ holdScripts: true });
    nav.pop('/docs/first');
    nav.respond(0, { name: 'first', scripts: ['/first.js', '/obsolete.js'] });
    await tick();
    nav.pop('/docs/latest');
    assert.equal(nav.requests.length, 2);
    nav.respond(1, { name: 'latest' });
    await tick();
    assert.equal(nav.content.innerHTML, 'first');
    nav.scripts[0].loaded();
    await tick();
    assert.equal(nav.content.innerHTML, 'latest');
    assert.ok(!nav.scripts.some(script => script.src === '/obsolete.js'));
});

test('a finishing script cannot leave its query parameters on the selected history entry', async () => {
    const nav = navigation({ holdScripts: true });
    nav.pop('/resources/original/bg');
    nav.respond(0, { name: 'resources', scripts: ['/resources.js'] });
    await tick();
    nav.pop('/docs/latest');
    nav.respond(1, { name: 'latest' });
    await tick();
    // Resource filters use replaceState while their script initializes.
    nav.replace('/docs/latest?time=night');
    nav.scripts[0].loaded();
    await tick();
    assert.equal(nav.content.innerHTML, 'latest');
    assert.equal(nav.location.href, 'https://example.test/docs/latest');
});

test('ordinary clicked navigation still pushes history and updates the page', async () => {
    const nav = navigation();
    assert.equal(nav.click('/docs/new'), true);
    nav.respond(0, { name: 'new', scripts: ['/new.js'], styles: ['/new.css'] });
    await tick();
    assert.equal(nav.content.innerHTML, 'new');
    assert.deepEqual(nav.pushes, ['https://example.test/docs/new']);
    assert.equal(nav.scripts.length, 1);
});

test('a second clicked link supersedes the first without a stale history push', async () => {
    const nav = navigation();
    assert.equal(nav.click('/docs/first'), true);
    assert.equal(nav.click('/docs/latest'), true);
    nav.respond(1, { name: 'latest' });
    await tick();
    nav.respond(0, { name: 'first' });
    await tick();
    assert.equal(nav.content.innerHTML, 'latest');
    assert.deepEqual(nav.pushes, ['https://example.test/docs/latest']);
});

test('an active navigation failure still falls back to the browser', async () => {
    const nav = navigation();
    nav.pop('/docs/unavailable');
    nav.requests[0].reject(new Error('offline'));
    await tick();
    assert.deepEqual(nav.redirects, ['https://example.test/docs/unavailable']);
});

test('article handlers are cleaned up before replacing the page content', async () => {
    const nav = navigation();
    let oldContent;
    nav.window.__esdocDocsCleanup = () => { oldContent = nav.content.innerHTML; };
    nav.pop('/docs/new');
    nav.respond(0, { name: 'new' });
    await tick();
    assert.equal(oldContent, 'initial');
    assert.equal(nav.content.innerHTML, 'new');
});
