import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../static/js/code.js', import.meta.url), 'utf8');
function setup(reject = false) {
    const status = {textContent: ''};
    const written = [];
    const chip = {textContent: 'snow', classList: {add() {}, remove() {}}, listeners: {},
        closest() {return null;}, addEventListener(name, listener) {this.listeners[name] = listener;}};
    const window = {};
    vm.runInNewContext(source, {window,
        document: {getElementById: () => status, querySelectorAll: selector => selector === '#site-content code' ? [chip] : []},
        navigator: {clipboard: {writeText: value => {written.push(value); return reject ? Promise.reject(new Error('Denied')) : Promise.resolve();}}},
        setTimeout: () => 1, clearTimeout() {},
    });
    return {chip, status, written};
}
test('inline code copies the current identifier after a variant changes', async () => {
    const env = setup(); env.chip.textContent = 'heavy_snow';
    await env.chip.listeners.click();
    assert.deepEqual(env.written, ['heavy_snow']);
    assert.equal(env.status.textContent, 'Скопировано: heavy_snow');
});
test('clipboard rejection announces a manual recovery path', async () => {
    const env = setup(true); await env.chip.listeners.click();
    assert.match(env.status.textContent, /Выделите текст/);
});
