import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../static/js/specialists.js', import.meta.url), 'utf8');

test('an empty category preserves view and filters for the return to a populated category', () => {
    const replacements = [];
    const root = {
        dataset: { category: 'composers' },
        querySelector: () => null,
        querySelectorAll: () => [],
    };
    vm.runInNewContext(script, {
        document: { querySelector: () => root },
        location: { pathname: '/specialists', search: '?category=composers&view=table&status=open' },
        history: { replaceState: (...args) => replacements.push(args[2]) },
        URLSearchParams,
        Intl,
    });
    assert.deepEqual(replacements, [], 'empty categories must keep the incoming URL state');
});
