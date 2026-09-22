import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'static/js/warpers.js'), 'utf8');

test('warpers script can be loaded again after soft navigation', () => {
    const mediaQuery = {
        matches: false,
        addEventListener() {},
        removeEventListener() {},
    };
    const context = vm.createContext({
        console: { warn() {} },
        document: {
            documentElement: {},
            querySelector() { return null; },
            querySelectorAll() { return []; },
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

    assert.doesNotThrow(() => {
        vm.runInContext(source, context);
        vm.runInContext(source, context);
    });
});
