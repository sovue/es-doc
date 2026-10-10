import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../static/js/search.js', import.meta.url), 'utf8');

async function searchBox(rows, fetchRows = async () => rows) {
    const handlers = {};
    const attrs = {};
    const input = {
        value: 'Луна', setAttribute: (key, value) => { attrs[key] = value; },
        removeAttribute: key => { delete attrs[key]; },
        addEventListener: (event, handler) => { handlers[event] = handler; },
    };
    const list = {
        hidden: true, innerHTML: '', scrollTop: 0, clientHeight: 200,
        addEventListener: (event, handler) => { handlers['list-' + event] = handler; },
        querySelectorAll: () => [...list.innerHTML.matchAll(/id="(ss-opt-\d+)"/g)].map((match, index) => ({
            id: match[1], offsetTop: index * 20, offsetHeight: 20, setAttribute: () => {},
        })),
    };
    const status = {};
    const form = { querySelector: () => status, contains: () => false };
    const window = { location: { href: '' } };
    vm.runInNewContext(readFileSync(new URL('../static/js/icons.js', import.meta.url), 'utf8'), { window });
    let update;
    vm.runInNewContext(script, {
        document: {
            getElementById: id => ({ 'site-search': form, 'site-search-input': input, 'site-search-results': list })[id],
            querySelector: () => null,
            addEventListener: (event, handler) => { handlers['document-' + event] = handler; },
            body: { classList: { add: () => {}, remove: () => {}, contains: () => false } },
        },
        window, fetch: async () => ({ ok: true, json: fetchRows }),
        setTimeout: fn => { update = fn; }, clearTimeout: () => {},
    });
    handlers.input();
    update();
    await new Promise(resolve => setImmediate(resolve));
    return { handlers, input, list, status, window, attrs, flush: () => update() };
}

for (const dismiss of ['clear', 'Escape', 'outside click']) {
    for (const fails of [false, true]) {
        test(`pending search ${fails ? 'failure' : 'results'} stays dismissed after ${dismiss}`, async () => {
            let resolve, reject;
            const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
            const box = await searchBox([], () => pending);
            if (dismiss === 'clear') {
                box.input.value = '';
                box.handlers.input();
                box.flush();
            } else if (dismiss === 'Escape') {
                box.handlers.keydown({ key: 'Escape', preventDefault: () => {} });
            } else {
                box.handlers['document-click']({ target: {} });
            }
            if (fails) reject(new Error('offline'));
            else resolve([{ label: 'Луна', url: '/stale' }]);
            await new Promise(done => setImmediate(done));
            assert.equal(box.list.hidden, true);
            assert.equal(box.attrs['aria-expanded'], 'false');
            assert.equal(box.status.textContent || '', '');
        });
    }
}

test('typing another query invalidates results before its debounce fires', async () => {
    let resolve;
    const pending = new Promise(done => { resolve = done; });
    const box = await searchBox([], () => pending);
    box.input.value = 'Ночь';
    box.handlers.input();
    resolve([{ label: 'Луна', url: '/stale' }]);
    await new Promise(done => setImmediate(done));
    assert.equal(box.list.hidden, true);
    assert.ok(!box.list.innerHTML.includes('Луна'));
});

test('an older response cannot replace results from the latest query', async () => {
    let resolveOld;
    const old = new Promise(done => { resolveOld = done; });
    let calls = 0;
    const box = await searchBox([], () => ++calls === 1 ? old : [{ label: 'Ночь', url: '/latest' }]);
    box.input.value = 'Ночь';
    box.handlers.input();
    box.flush();
    await new Promise(done => setImmediate(done));
    resolveOld([{ label: 'Луна', url: '/stale' }]);
    await new Promise(done => setImmediate(done));
    box.handlers.keydown({ key: 'Enter', preventDefault: () => {} });
    assert.equal(box.window.location.href, '/latest');
});

test('mixed global results have distinct groups and retain ranking within each group', async () => {
    const box = await searchBox([
        { kind: 'file', label: 'Луна.rpy', url: '/resources/browser/Луна.rpy' },
        { label: 'Луна в моде', doc: 'start' },
        { kind: 'specialist', label: 'Луна', url: '/specialists?category=coders#specialist-luna' },
        { kind: 'res', label: 'Луна ночью', url: '/resources/community/bg#luna' },
        { kind: 'section', label: 'Луна: раздел', url: '/docs/' },
        { kind: 'file', label: 'Луна.png', url: '/resources/browser/Луна.png' },
    ]);
    for (const group of ['Разделы', 'Документация', 'Ресурсы', 'Специалисты', 'Файлы и папки']) {
        assert.ok(box.list.innerHTML.includes('>' + group + '</li>'), group);
    }
    const labels = [...box.list.innerHTML.matchAll(/role="option"[^>]*>(.*?)<\/li>/g)]
        .map(match => match[1].replace(/<[^>]+>/g, ''));
    assert.ok(labels.indexOf('Луна.rpy') < labels.indexOf('Луна.png'));
    box.handlers.keydown({ key: 'Enter', preventDefault: () => {} });
    assert.equal(box.window.location.href, '/resources/browser/Луна.rpy');
    assert.equal(box.status.textContent, '6 результатов');
});

for (const kind of ['section', 'res', 'file', 'specialist']) {
    test(`keyboard and mouse navigate to the ${kind} result URL`, async () => {
        const url = '/destination/' + kind;
        const box = await searchBox([{ kind, label: 'Луна', url }]);
        box.handlers.keydown({ key: 'ArrowDown', preventDefault: () => {} });
        assert.equal(box.attrs['aria-activedescendant'], 'ss-opt-0');
        box.handlers.keydown({ key: 'Enter', preventDefault: () => {} });
        assert.equal(box.window.location.href, url);
        box.window.location.href = '';
        box.handlers['list-mousedown']({
            button: 0, target: { closest: () => ({ id: 'ss-opt-0' }) }, preventDefault: () => {},
        });
        assert.equal(box.window.location.href, url);
    });
}
