import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../static/js/search.js', import.meta.url), 'utf8');

async function searchBox(rows) {
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
    let update;
    vm.runInNewContext(script, {
        document: {
            getElementById: id => ({ 'site-search': form, 'site-search-input': input, 'site-search-results': list })[id],
            querySelector: () => null, addEventListener: () => {},
            body: { classList: { add: () => {} } },
        },
        window, fetch: async () => ({ ok: true, json: async () => rows }),
        setTimeout: fn => { update = fn; }, clearTimeout: () => {},
    });
    handlers.input();
    update();
    await new Promise(resolve => setImmediate(resolve));
    return { handlers, input, list, status, window, attrs };
}

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
