import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'static/js/warpers.js'), 'utf8');

function createPageContext(copyNames = []) {
    const mediaQuery = {
        matches: false,
        addEventListener() {},
        removeEventListener() {},
    };
    return vm.createContext({
        console: { warn() {} },
        document: {
            documentElement: {},
            body: { append() {} },
            createElement() {
                return { style: {}, setAttribute() {}, remove() {} };
            },
            querySelector() { return null; },
            querySelectorAll(selector) {
                return selector === '.wp-cell .res-copy[data-copy]' ? copyNames : [];
            },
        },
        getComputedStyle() {
            return { getPropertyValue() { return ''; } };
        },
        navigator: {},
        window: {
            matchMedia() { return mediaQuery; },
            addEventListener() {},
            ResizeObserver: null,
        },
        MutationObserver: class {
            observe() {}
        },
        performance: { now() { return 0; } },
        requestAnimationFrame() { return 0; },
        cancelAnimationFrame() {},
        isFinite,
        Math,
    });
}

test('warpers script can be loaded again after soft navigation', () => {
    const context = createPageContext();

    assert.doesNotThrow(() => {
        vm.runInContext(source, context);
        vm.runInContext(source, context);
    });
});

test('warper names stay visible when the Clipboard API is unavailable', () => {
    const nameButton = { hidden: true, disabled: false, dataset: { copy: 'easeout_cubic' } };
    vm.runInContext(source, createPageContext([nameButton]));
    assert.equal(nameButton.hidden, false, 'clipboard enhancement must not hide the warper name');
    assert.equal(nameButton.disabled, true, 'unsupported copying must not offer a dead action');
});
