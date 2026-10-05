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
    app.querySelectorAll = selector => selector === '[name="tool-mode"]' ? [radio] : [];
    const menu = get('tools-add-menu');
    menu.hidden = true;
    menu.children = [get('tools-pick-files'), get('tools-pick-folder')];
    const messages = [];
    const window = new Element();
    window.Worker = class { postMessage(message) { messages.push(message); } terminate() {} };
    window.WebAssembly = {};
    const context = vm.createContext({ window, document, Worker: window.Worker,
        AbortController, URL, queueMicrotask, innerWidth: 1200, innerHeight: 900 });
    vm.runInContext(fs.readFileSync(new URL('../static/js/tools-core.js', import.meta.url), 'utf8'), context);
    window.ESDocTools = context.ESDocTools;
    vm.runInContext(fs.readFileSync(new URL('../static/js/tools.js', import.meta.url), 'utf8'), context);
    return { get: name => get('tools-' + name), document, radio, messages };
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
