import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

function page(search = '', withClipboard = false) {
    class Element {
        listeners = new Map(); children = []; hidden = false; disabled = false;
        value = ''; files = []; clicks = 0; style = {}; attributes = {};
        classList = { add() {}, remove() {}, toggle() {} };
        addEventListener(type, callback) {
            const handlers = this.listeners.get(type) || [];
            handlers.push(callback); this.listeners.set(type, handlers);
        }
        emit(type, detail = {}) {
            for (const callback of this.listeners.get(type) || []) callback({ target: this, ...detail });
        }
        click() { this.clicks++; this.emit('click'); }
        focus() { document.activeElement = this; }
        contains(target) { return target === this || this.children.includes(target); }
        getBoundingClientRect() { return { left: 0, bottom: 40, width: 210, height: 100 }; }
        setAttribute(key, value) { this.attributes[key] = value; }
        removeAttribute(key) { delete this.attributes[key]; }
        querySelectorAll() { return []; }
        replaceChildren(...children) {
            for (const child of this.children) child.parentNode = null;
            this.children = []; this.append(...children);
        }
        get lastElementChild() { return this.children.at(-1); }
        appendChild(child) {
            if (child.parentNode) child.parentNode.children = child.parentNode.children.filter(item => item !== child);
            child.parentNode = this; this.children.push(child);
        }
        append(...children) { for (const child of children) this.appendChild(child); }
    }
    const elements = new Map();
    const get = id => {
        if (!elements.has(id)) elements.set(id, new Element());
        return elements.get(id);
    };
    const document = new Element();
    document.getElementById = get;
    document.createElement = () => new Element();
    document.createDocumentFragment = () => new Element();
    const app = get('tools-app');
    app.dataset = { config: '{"worker":"tools-worker.js"}' };
    const archiveRadio = new Element(); archiveRadio.value = 'unrpa';
    const scriptRadio = new Element(); scriptRadio.value = 'unrpyc';
    const option = get('tools-no-init-offset');
    get('tools-operation-actions').append(get('tools-start'), get('tools-cancel'));
    app.querySelectorAll = selector => selector === '[name="tool-mode"]' ? [archiveRadio, scriptRadio]
        : selector === '.tools-options input' ? [option] : [];
    const menu = get('tools-add-menu'); menu.hidden = true;
    menu.children = [get('tools-pick-files'), get('tools-pick-folder')];
    const messages = [], workers = [], revoked = [];
    const window = new Element(); window.location = { search };
    const copied = [];
    if (withClipboard) {
        window.navigator = { clipboard: {} };
        window.copyControl = (button, value) => () => copied.push(value());
    }
    window.Worker = class {
        constructor() { workers.push(this); }
        postMessage(message) { messages.push(message); }
        terminate() { this.terminated = true; }
    };
    window.WebAssembly = {};
    const context = vm.createContext({ window, document, Worker: window.Worker,
        AbortController, Blob, URLSearchParams, URL: { createObjectURL: () => 'blob:' + Math.random(),
            revokeObjectURL: url => revoked.push(url) }, TextDecoder, queueMicrotask, innerWidth: 1200, innerHeight: 900 });
    vm.runInContext(fs.readFileSync(new URL('../static/js/tools-core.js', import.meta.url), 'utf8'), context);
    window.ESDocTools = context.ESDocTools;
    vm.runInContext(fs.readFileSync(new URL('../static/js/tools.js', import.meta.url), 'utf8'), context);
    const result = { succeeded: 1, written: 1, failed: 0, warnings: 0, errors: [] };
    const send = data => workers.at(-1).onmessage({ data });
    const catalog = entries => send({ type: 'catalog', requestId: messages.at(-1).requestId, entries, errors: [] });
    const add = async (names, entries) => {
        get('tools-files').files = names.map(name => ({ name, size: 1 }));
        get('tools-files').emit('change'); await Promise.resolve();
        if (entries && messages.at(-1)?.type === 'catalog') catalog(entries);
    };
    const exportDone = (names = ['unrpyc.zip'], total = result) => {
        for (const name of names) {
            send({ type: 'output-start' });
            send({ type: 'chunk', buffer: new Uint8Array([1, 2]).buffer });
            send({ type: 'output', name, result });
        }
        send({ type: 'done', result: total });
    };
    return { get: name => get('tools-' + name), document, archiveRadio, scriptRadio,
        messages, workers, revoked, window, send, catalog, add, exportDone, result, copied };
}
const script = { id: '0:script.rpyc', path: 'script.rpyc', source: 0, size: 1 };

test('picker menu survives transient focus loss and closes when tabbing out', () => {
    const { get, document } = page();
    get('add').click(); document.activeElement = null;
    get('add-menu').emit('focusout', { relatedTarget: null });
    assert.equal(get('add-menu').hidden, false);
    get('pick-folder').click(); assert.equal(get('folder').clicks, 1);
    get('add').click();
    get('add-menu').emit('focusout', { relatedTarget: get('start') });
    assert.equal(get('add-menu').hidden, true);
});

test('adding scripts prepares a catalog without decompiling or auto-opening', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]);
    assert.equal(ui.messages.length, 0);
    assert.equal(ui.get('browser').hidden, false);
    assert.equal(ui.get('browser-preview').children[0].textContent, 'Файл не выбран');
    assert.equal(ui.get('start').hidden, true); assert.equal(ui.get('file-list').hidden, true);
});

test('click requests one source and renders highlighted code with a separate gutter', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]);
    ui.get('browser-list').children[0].children[0].click();
    const read = ui.messages.at(-1);
    assert.equal(read.type, 'source-read'); assert.equal(read.id, script.id);
    const html = '<span class="k">label</span> start:\n';
    ui.send({ type: 'source-file', requestId: read.requestId, name: 'script.rpy', html,
        buffer: new TextEncoder().encode('label start:\n').buffer });
    const pre = ui.get('browser-preview').children[1].children[0];
    assert.equal(pre.children[0].textContent, '1');
    assert.equal(pre.children[1].children[0].innerHTML, html);
    assert.equal(ui.get('browser-preview').children[2].download, 'script.rpy');
    assert.equal(ui.get('downloads').children.length, 0);
});

test('preview uses the shared code panel and copies source text without the gutter', async () => {
    const ui = page('', true); await ui.add(['script.rpyc'], [script]);
    ui.get('browser-list').children[0].children[0].click();
    const text = 'label start:\n    pass\n';
    ui.send({ type: 'source-file', requestId: ui.messages.at(-1).requestId, name: 'script.rpy',
        buffer: new TextEncoder().encode(text).buffer });
    const frame = ui.get('browser-preview').children[1];
    assert.equal(frame.className, 'code-block code-block--numbered tools-code-frame');
    assert.equal(frame.children[1].className, 'code-copy');
    const pre = frame.children[0], scroll = pre.children[1];
    assert.equal(pre.tabIndex, 0);
    assert.equal(pre.attributes['aria-label'], 'Код файла');
    assert.notEqual(scroll.tabIndex, 0);
    scroll.scrollLeft = 0;
    let prevented = false;
    pre.emit('keydown', { key: 'ArrowRight', preventDefault: () => { prevented = true; } });
    assert.equal(scroll.scrollLeft, 40);
    assert.equal(prevented, true);
    frame.children[1].click();
    assert.deepEqual(ui.copied, [text]);
});

test('options reprocess only the open file', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]);
    ui.get('browser-list').children[0].children[0].click();
    ui.send({ type: 'source-file', requestId: ui.messages.at(-1).requestId, name: 'script.rpy',
        buffer: new TextEncoder().encode('label start:').buffer });
    ui.get('no-init-offset').checked = true; ui.get('no-init-offset').emit('change');
    assert.equal(ui.messages.at(-1).type, 'source-read');
    assert.equal(ui.messages.at(-1).options.no_init_offset, true);
    assert.equal(ui.messages.filter(message => message.type === 'run').length, 0);
});

test('preview cancellation stays below its loading message and returns after completion', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]);
    ui.get('browser-list').children[0].children[0].click();
    const pending = ui.get('browser-preview').children[0];
    assert.equal(pending.children[0].textContent, 'Декомпилируем файл…');
    assert.equal(pending.children[1], ui.get('cancel'));
    assert.equal(ui.get('browser-status').textContent, '');
    ui.send({ type: 'source-file', requestId: ui.messages.at(-1).requestId, name: 'script.rpy', buffer: new ArrayBuffer(0) });
    assert.equal(ui.get('cancel').parentNode, ui.get('operation-actions'));
    assert.equal(ui.get('cancel').hidden, true);
});

test('switching files reuses ready previews and warnings without another worker request', async () => {
    const ui = page(); await ui.add(['script.rpyc', 'other.rpyc']);
    const open = index => ui.get('browser-list').children[index].children[0].click();
    const respond = name => ui.send({ type: 'source-file', requestId: ui.messages.at(-1).requestId,
        name, warnings: ['Warning: analysis found signs that this .rpyc file was generated by renpy version 7 or below'],
        buffer: new TextEncoder().encode(name).buffer });
    open(0); respond('script.rpy'); open(1); respond('other.rpy');
    const requests = ui.messages.length;
    open(0);
    assert.equal(ui.messages.length, requests);
    assert.equal(ui.get('browser-preview').children[0].children[0].textContent, 'script.rpy');
    assert.equal(ui.get('browser-preview').children[0].children[1].hidden, false);
    assert.equal(ui.get('cancel').hidden, true);
    ui.get('no-init-offset').checked = true; ui.get('no-init-offset').emit('change');
    assert.equal(ui.messages.length, requests + 1);
    respond('script.rpy');
    ui.get('clear').click(); await ui.add(['script.rpyc']); open(0);
    assert.equal(ui.messages.at(-1).type, 'source-read');
    assert.equal(ui.get('browser-preview').attributes['aria-busy'], 'true');
});

test('preview cache evicts the least recently used file after 32 ready previews', async () => {
    const ui = page(); await ui.add(Array.from({ length: 33 }, (_, i) => `${i}.rpyc`));
    const open = index => ui.get('browser-list').children[index].children[0].click();
    const respond = () => ui.send({ type: 'source-file', requestId: ui.messages.at(-1).requestId,
        name: 'script.rpy', buffer: new ArrayBuffer(10) });
    for (let i = 0; i < 32; i++) { open(i); respond(); }
    open(0); open(32); respond();
    const requests = ui.messages.length;
    open(0); assert.equal(ui.messages.length, requests);
    open(1); assert.equal(ui.messages.length, requests + 1);
});

test('download-all processes all sources, downloads automatically, and retains retry links', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]); ui.get('download-all').click();
    assert.equal(ui.messages.at(-1).type, 'run'); assert.equal(ui.messages.at(-1).mode, 'unrpyc');
    ui.exportDone();
    assert.equal(ui.get('downloads').children[0].download, 'unrpyc.zip');
    assert.equal(ui.get('downloads').children[0].clicks, 1);
    assert.equal(ui.get('queue').hidden, true);
    ui.get('download-all').click(); assert.equal(ui.get('downloads').children[0].clicks, 2);
    ui.window.__esdocToolsCleanup(); assert.equal(ui.revoked.length, 1);
});

test('archives show contents before extraction and each exports as a separate ZIP', async () => {
    const ui = page('?mode=unrpa');
    await ui.add(['a.rpa', 'b.rpa'], [script, { ...script, id: '1:other.txt', path: 'other.txt', source: 1 }]);
    assert.equal(ui.messages[0].type, 'catalog'); assert.equal(ui.get('browse-actions').hidden, false);
    assert.equal(ui.get('browser-list').children.length, 1);
    ui.get('archive').value = '1'; ui.get('archive').emit('change');
    assert.equal(ui.get('browser-title').textContent, 'b.rpa'); assert.equal(ui.messages.length, 1);
    ui.get('download-all').click(); assert.equal(ui.messages.at(-1).mode, 'combined');
    ui.exportDone(['a.zip', 'b.zip'], { ...ui.result, succeeded: 2, written: 2 });
    assert.deepEqual(ui.get('downloads').children.map(link => link.clicks), [1, 1]);
});

test('clearing only the current mode preserves the other queue', async () => {
    const ui = page(); await ui.add(['script.rpyc', 'data.rpa'], [script]);
    ui.get('clear').click(); assert.equal(ui.get('queue').hidden, true);
    ui.archiveRadio.emit('change'); assert.equal(ui.messages.at(-1).type, 'catalog');
    assert.equal(ui.messages.at(-1).files[0].path, 'data.rpa');
});

test('bulk download clears only its own mode', async () => {
    const ui = page(); await ui.add(['script.rpyc', 'data.rpa'], [script]);
    ui.get('download-all').click(); ui.exportDone(); ui.archiveRadio.emit('change');
    assert.equal(ui.messages.at(-1).files[0].path, 'data.rpa');
});

test('cancellation keeps sources and permits reindexing', async () => {
    const ui = page('?mode=unrpa'); await ui.add(['data.rpa']); ui.get('cancel').click();
    assert.equal(ui.workers[0].terminated, true); assert.equal(ui.get('start').hidden, false);
    ui.get('start').click(); assert.equal(ui.messages.at(-1).type, 'catalog');
    assert.equal(ui.messages.at(-1).files.length, 1);
});

test('preview errors are recoverable without starting a full conversion', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]);
    ui.get('browser-list').children[0].children[0].click();
    ui.send({ type: 'source-error', requestId: ui.messages.at(-1).requestId, error: 'Invalid RPYC' });
    assert.equal(ui.get('download-all').disabled, false);
    assert.match(ui.get('status').textContent, /формат сценария/);
    assert.doesNotMatch(ui.get('status').textContent, /Invalid RPYC/);
    assert.equal(ui.get('browser-status').textContent, '');
    assert.equal(ui.get('browser-preview').attributes['aria-busy'], 'false');
    const error = ui.get('browser-preview').children[0];
    assert.equal(error.children.at(-2).open, false);
    assert.equal(error.children.at(-2).children[1].textContent, 'Invalid RPYC');
    ui.get('browser-list').children[0].children[0].click();
    assert.equal(ui.messages.at(-1).type, 'source-read');
    ui.send({ type: 'source-file', requestId: ui.messages.at(-1).requestId, name: 'script.rpy',
        buffer: new TextEncoder().encode('label start:').buffer });
    assert.equal(ui.get('start').hidden, true);
});

test('partial export failure retains completed ZIP links', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]); ui.get('download-all').click();
    ui.send({ type: 'output', name: 'unrpyc.zip', result: ui.result });
    ui.send({ type: 'fatal', error: 'Out of memory' });
    assert.equal(ui.get('downloads').children.length, 1); assert.equal(ui.revoked.length, 0);
    assert.match(ui.get('status').textContent, /памяти/);
    assert.doesNotMatch(ui.get('status').textContent, /Out of memory/);
    assert.equal(ui.get('errors').hidden, false);
});

test('cancelling a pending preview replaces loading and ignores late replies before retry', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]);
    ui.get('browser-list').children[0].children[0].click();
    const read = ui.messages.at(-1);
    const oldHandler = ui.workers.at(-1).onmessage;
    ui.get('cancel').click();
    assert.equal(ui.get('browser-status').textContent, '');
    assert.match(ui.get('browser-preview').children[0].textContent, /отменён/);
    assert.equal(ui.get('browser-preview').attributes['aria-busy'], 'false');
    oldHandler({ data: { type: 'source-file', requestId: read.requestId, name: 'script.rpy', buffer: new ArrayBuffer(0) } });
    assert.match(ui.get('browser-preview').children[0].textContent, /отменён/);
    ui.get('browser-list').children[0].children[0].click();
    assert.equal(ui.messages.at(-1).type, 'source-read');
    ui.send({ type: 'source-file', requestId: ui.messages.at(-1).requestId, name: 'script.rpy',
        buffer: new TextEncoder().encode('label start:').buffer });
    assert.equal(ui.get('start').hidden, true);
});

test('fatal errors finish a pending preview and render technical text safely once', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]);
    ui.get('browser-list').children[0].children[0].click();
    ui.send({ type: 'fatal', error: 'Traceback\n<script>unknown failure</script>' });
    assert.equal(ui.get('browser-status').textContent, '');
    assert.doesNotMatch(ui.get('browser-preview').children[0].textContent || '', /Декомпилируем/);
    assert.equal(ui.get('browser-preview').attributes['aria-busy'], 'false');
    assert.doesNotMatch(ui.get('status').textContent, /Traceback|<script>/);
    const technical = ui.get('errors').children[0].children.at(-1).children[1];
    assert.equal(technical.textContent, 'Traceback\n<script>unknown failure</script>');
    assert.equal(technical.innerHTML, undefined);
});

test('equal totals are not duplicated and warning causes are shown', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]); ui.get('download-all').click();
    ui.exportDone(['unrpyc.zip'], { ...ui.result, warnings: 1, warning_details: ['script.rpyc: partial recovery'] });
    assert.equal(ui.get('result-description').textContent, 'Обработано: 1.');
    assert.equal(ui.get('warnings').hidden, false);
    const diagnostic = ui.get('warning-list').children[0];
    assert.equal(diagnostic.children[0].textContent, 'script.rpyc');
    assert.match(diagnostic.children[2].textContent, /Файл получен/);
    assert.match(diagnostic.children[3].children[1].textContent, /partial recovery/);
    const summary = ui.get('warnings-summary');
    assert.equal(summary.children[0].className, 'tools-ui-icon tools-icon-warning');
    assert.equal(summary.children[1].textContent, '1');
    assert.equal(summary.attributes['aria-label'], 'Предупреждения: 1');
    assert.equal(summary.title, 'Показать предупреждения');
    ui.get('warnings').open = true; ui.get('warnings').ontoggle();
    assert.equal(summary.title, 'Скрыть предупреждения');
});

test('file warnings use the same indicator next to the filename, with safely rendered causes', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]);
    ui.get('browser-list').children[0].children[0].click();
    ui.send({ type: 'source-file', requestId: ui.messages.at(-1).requestId, name: 'script.rpy',
        buffer: new TextEncoder().encode('label start:').buffer, warnings: ['<script>not executable</script>'] });
    const heading = ui.get('browser-preview').children[0];
    assert.equal(heading.children[0].textContent, 'script.rpy');
    const warning = heading.children[1];
    assert.equal(warning.open, false);
    assert.equal(warning.children[0].children[0].className, 'tools-ui-icon tools-icon-warning');
    assert.equal(warning.children[0].children[1].textContent, '1');
    const diagnostic = warning.children[1].children[0];
    assert.equal(diagnostic.children[2].children[0].textContent, 'Техническое сообщение');
    assert.equal(diagnostic.children[2].children[1].textContent, '<script>not executable</script>');
    assert.equal(warning.children[1].attributes['aria-label'], 'Причины предупреждений файла');
    assert.equal(ui.get('browser-preview').children[2].download, 'script.rpy');
});

test('legacy warnings show the Russian explanation before the original log in the file preview', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]);
    ui.get('browser-list').children[0].children[0].click();
    const message = "Warning: analysis found signs that this .rpyc file was generated by ren'py\n version 7 or below, while this unrpyc version targets ren'py\n version 8. Decompilation will still be attempted.";
    ui.send({ type: 'source-file', requestId: ui.messages.at(-1).requestId, name: 'script.rpy',
        buffer: new TextEncoder().encode('label start:').buffer, warnings: [message] });
    const diagnostic = ui.get('browser-preview').children[0].children[1].children[1].children[0];
    assert.match(diagnostic.children[1].textContent, /Файл декомпилирован/);
    assert.match(diagnostic.children[1].textContent, /возможны ошибки и неточности/);
    assert.equal(diagnostic.children[2].children[1].textContent, message);
});

test('warning count is retained when diagnostics are truncated, and the next clean export hides it', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]); ui.get('download-all').click();
    ui.exportDone(['unrpyc.zip'], { ...ui.result, warnings: 13, warning_details: ['only first cause'] });
    assert.equal(ui.get('warnings-summary').children[1].textContent, '13');
    assert.equal(ui.get('warning-list').children[1].textContent, 'Показано: 1 из 13.');
    ui.get('warnings').open = true;
    await ui.add(['script.rpyc'], [script]); ui.get('download-all').click(); ui.exportDone();
    assert.equal(ui.get('warnings').hidden, true);
    assert.equal(ui.get('warnings').open, false);
    assert.equal(ui.get('warning-list').children.length, 0);
    assert.equal(ui.get('warnings-summary').children.length, 0);
});

test('partial conversion keeps sources available for a fresh export', async () => {
    const ui = page(); await ui.add(['script.rpyc', 'bad.rpyc'], [script]);
    ui.get('download-all').click();
    ui.exportDone(['unrpyc.zip'], { ...ui.result, failed: 1, errors: ['bad.rpyc: invalid'] });
    assert.equal(ui.get('queue').hidden, false);
    assert.equal(ui.get('downloads').children[0].clicks, 1);
    ui.get('download-all').click();
    assert.equal(ui.messages.at(-1).type, 'run');
    assert.equal(ui.messages.at(-1).files.length, 2);
});

test('search returns a visible empty state and removing a source refreshes the browser', async () => {
    const ui = page(); await ui.add(['script.rpyc'], [script]);
    ui.get('browser-search').value = 'missing'; ui.get('browser-search').emit('input');
    assert.equal(ui.get('browser-list').children[0].textContent, 'Файлы не найдены');
    ui.get('browser-search').value = ''; ui.get('browser-search').emit('input');
    ui.get('browser-list').children[0].children[2].click();
    assert.equal(ui.get('queue').hidden, true);
    assert.equal(ui.get('result').hidden, true);
    assert.equal(ui.messages.length, 0);
});

test('5001 sources are all exported despite limiting rendered rows', async () => {
    const ui = page(); await ui.add(Array.from({ length: 5001 }, (_, i) => i + '.rpyc'), []);
    ui.get('download-all').click(); assert.equal(ui.messages.at(-1).files.length, 5001);
});

test('a drop selects its mode without processing files', async () => {
    const ui = page('?mode=unrpa');
    ui.get('drop').emit('drop', { preventDefault() {}, dataTransfer: { files: [{ name: 'a.rpymc', size: 1 }] } });
    await Promise.resolve(); await Promise.resolve();
    assert.equal(ui.get('drop-help').textContent, '.rpyc, .rpymc');
    assert.equal(ui.messages.length, 0);
});
