import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

// Model the embedded browser's transient focus loss, which does not happen
// consistently in headless Chromium. Run the complete page controller.
function page() {
    class Element {
        listeners = new Map();
        children = [];
        hidden = false;
        disabled = false;
        value = '';
        files = [];
        clicks = 0;
        style = {};
        classList = { add() {}, remove() {}, toggle() {} };
        addEventListener(type, callback) {
            const handlers = this.listeners.get(type) || [];
            handlers.push(callback);
            this.listeners.set(type, handlers);
        }
        emit(type, detail = {}) {
            for (const callback of this.listeners.get(type) || []) callback({ target: this, ...detail });
        }
        click() { this.clicks++; this.emit('click'); }
        focus() { document.activeElement = this; }
        contains(target) { return target === this || this.children.includes(target); }
        getBoundingClientRect() { return { left: 0, bottom: 40, width: 210, height: 100 }; }
        setAttribute() {}
        removeAttribute() {}
        querySelectorAll() { return []; }
        replaceChildren() { this.children = []; }
        appendChild(child) { this.children.push(child); }
        append(...children) { this.children.push(...children); }
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
    const radio = new Element();
    radio.value = 'unrpa';
    const scriptRadio = new Element();
    scriptRadio.value = 'unrpyc';
    app.querySelectorAll = selector => selector === '[name="tool-mode"]' ? [radio, scriptRadio] : [];
    const menu = get('tools-add-menu');
    menu.hidden = true;
    menu.children = [get('tools-pick-files'), get('tools-pick-folder')];
    const messages = [];
    const workers = [];
    const revoked = [];
    const window = new Element();
    window.Worker = class {
        constructor() { workers.push(this); }
        postMessage(message) { messages.push(message); }
        terminate() {}
    };
    window.WebAssembly = {};
    const context = vm.createContext({ window, document, Worker: window.Worker,
        AbortController, Blob, URL: { createObjectURL: () => 'blob:' + Math.random(),
            revokeObjectURL: url => revoked.push(url) }, queueMicrotask, innerWidth: 1200, innerHeight: 900 });
    vm.runInContext(fs.readFileSync(new URL('../static/js/tools-core.js', import.meta.url), 'utf8'), context);
    window.ESDocTools = context.ESDocTools;
    vm.runInContext(fs.readFileSync(new URL('../static/js/tools.js', import.meta.url), 'utf8'), context);
    return { get: name => get('tools-' + name), document, radio, messages, workers, revoked, window };
}

test('folder menu click survives transient focus loss in embedded browsers', async () => {
    const { get, document } = page();
    get('add').click();
    document.activeElement = null;
    get('add-menu').emit('focusout', { relatedTarget: null });
    await Promise.resolve();
    assert.equal(get('add-menu').hidden, false);
    get('pick-folder').click();
    assert.equal(get('folder').clicks, 1);
    assert.equal(get('add-menu').hidden, true);
});

test('tabbing outside closes the picker menu', () => {
    const { get } = page();
    get('add').click();
    get('add-menu').emit('focusout', { relatedTarget: get('start') });
    assert.equal(get('add-menu').hidden, true);
});

test('clicking the add button again closes its menu', () => {
    const { get } = page();
    get('add').click();
    get('add-menu').emit('focusout', { relatedTarget: get('add') });
    get('add').click();
    assert.equal(get('add-menu').hidden, true);
});

test('archive extraction sends automatic decompilation to the worker', async () => {
    const { get, radio, messages } = page();
    radio.emit('change');
    get('files').files = [{ name: 'data.rpa', size: 441 }];
    get('files').emit('change');
    await Promise.resolve();
    assert.equal(get('start').disabled, false);
    get('start').click();
    assert.equal(messages.length, 1);
    assert.equal(messages[0].mode, 'combined');
    assert.equal(messages[0].files[0].path, 'data.rpa');
    assert.equal(get('options').hidden, false);
});

test('each archive has its named download, download-all clicks both, cleanup releases both', async () => {
    const { get, radio, workers, revoked, window } = page();
    radio.emit('change');
    get('files').files = [{ name: 'a.rpa', size: 1 }, { name: 'b.rpa', size: 1 }];
    get('files').emit('change');
    await Promise.resolve();
    get('start').click();
    const send = data => workers[0].onmessage({ data });
    const result = { succeeded: 1, failed: 0, written: 1, warnings: 0, errors: [] };
    for (const name of ['a.zip', 'b.zip']) {
        send({ type: 'output-start' });
        send({ type: 'chunk', buffer: new Uint8Array([1, 2]).buffer });
        send({ type: 'output', name, result });
    }
    send({ type: 'done', result: { ...result, succeeded: 2, written: 2 } });
    const links = get('downloads').children;
    assert.deepEqual(links.map(link => link.download), ['a.zip', 'b.zip']);
    assert.equal(get('download-all').hidden, false);
    get('download-all').click();
    assert.deepEqual(links.map(link => link.clicks), [1, 1]);
    window.__esdocToolsCleanup();
    assert.equal(revoked.length, 2);
    assert.equal(get('downloads').children.length, 0);
});

test('a later fatal error keeps completed ZIPs and discards only the unfinished output', async () => {
    const { get, radio, workers, revoked } = page();
    radio.emit('change');
    get('files').files = [{ name: 'a.rpa', size: 1 }, { name: 'b.rpa', size: 1 }];
    get('files').emit('change');
    await Promise.resolve();
    get('start').click();
    const send = data => workers[0].onmessage({ data });
    send({ type: 'output-start' });
    send({ type: 'chunk', buffer: new Uint8Array([1]).buffer });
    send({ type: 'output', name: 'a.zip', result: { written: 1 } });
    send({ type: 'output-start' });
    send({ type: 'chunk', buffer: new Uint8Array([2]).buffer });
    send({ type: 'fatal', error: 'Download size limit exceeded' });
    assert.equal(get('downloads').children.length, 1);
    assert.equal(get('downloads').children[0].download, 'a.zip');
    assert.equal(get('result').hidden, false);
    assert.equal(revoked.length, 0);
    assert.match(get('status').textContent, /limit exceeded/);
});

test('downloading clears the queue and keeps other ZIP links usable', async () => {
    const { get, workers, revoked } = page();
    get('files').files = [{ name: 'a.rpyc', size: 1 }];
    get('files').emit('change');
    await Promise.resolve();
    get('start').click();
    const send = data => workers[0].onmessage({ data });
    const result = { succeeded: 1, written: 1, failed: 0, warnings: 0, errors: [] };
    send({ type: 'output', name: 'unrpyc.zip', result });
    send({ type: 'done', result });
    get('downloads').children[0].click();
    assert.equal(get('queue').hidden, true);
    assert.equal(get('start').disabled, true);
    assert.equal(get('downloads').children.length, 1);
    assert.equal(revoked.length, 0);
});

test('dropping code into the archive tool switches tools and processes the dropped code', async () => {
    const { get, radio, messages } = page();
    radio.emit('change');
    get('drop').emit('drop', { preventDefault() {}, dataTransfer: { files: [{ name: 'a.rpymc', size: 1 }] } });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(get('start').textContent, 'Декомпилировать');
    get('start').click();
    assert.equal(messages[0].mode, 'unrpyc');
    assert.equal(messages[0].files[0].path, 'a.rpymc');
});

test('dropping an archive into the code tool switches to extraction', async () => {
    const { get, messages } = page();
    get('drop').emit('drop', { preventDefault() {}, dataTransfer: { files: [{ name: 'data.RPA', size: 1 }] } });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(get('start').textContent, 'Распаковать');
    get('start').click();
    assert.equal(messages[0].mode, 'combined');
});

test('a mixed drop keeps the chosen mode while retaining files for both tools', async () => {
    const { get, messages } = page();
    get('drop').emit('drop', { preventDefault() {}, dataTransfer: { files: [
        { name: 'data.rpa', size: 1 }, { name: 'a.rpyc', size: 1 },
    ] } });
    await Promise.resolve();
    await Promise.resolve();
    get('start').click();
    assert.equal(messages[0].mode, 'unrpyc');
    assert.equal(messages[0].files.length, 1);
    assert.match(get('count').textContent, /для другого режима: 1/);
});

test('more than 5000 queued files are all sent to processing', async () => {
    const { get, messages } = page();
    get('files').files = Array.from({ length: 5001 }, (_, i) => ({ name: i + '.rpyc', size: 1 }));
    get('files').emit('change');
    await Promise.resolve();
    get('start').click();
    assert.equal(messages[0].files.length, 5001);
});
