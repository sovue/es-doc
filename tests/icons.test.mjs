import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const window = {};
vm.runInNewContext(fs.readFileSync(new URL('../static/js/icons.js', import.meta.url), 'utf8'), { window });
const { svg } = window.ESDocIcons;
const dir = new URL('../static/icons/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', dir), 'utf8'));

test('every browser icon uses the canonical Lucide geometry and accessibility attributes', () => {
    for (const name of manifest.icons) {
        const source = fs.readFileSync(new URL(name + '.svg', dir), 'utf8');
        const body = source.slice(source.indexOf('>') + 1, source.lastIndexOf('</svg>')).trim();
        const markup = svg(name, 24);
        assert.ok(markup.includes(body), name);
        assert.ok(markup.includes('viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'), name);
        assert.ok(markup.includes('aria-hidden="true" focusable="false"'), name);
    }
});

test('browser helper rejects non-catalog names and invalid sizes and escapes extra classes', () => {
    for (const name of ['__proto__', 'missing', '../config']) assert.throws(() => svg(name));
    for (const size of [0, 129, '18', NaN]) assert.throws(() => svg('copy', size));
    assert.ok(svg('copy', 14, 'x" onload="bad').includes('x&quot; onload=&quot;bad'));
});
