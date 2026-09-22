import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'static/js/warpers.js'), 'utf8');
const durationBody = source.match(/const duration = \(\) => \{([\s\S]*?)\n    \};/)?.[1];

test('keeps durations above ten seconds in generated code', () => {
    assert.ok(durationBody, 'warper duration function should exist');

    const readDuration = vm.runInNewContext(`value => {
        const seconds = { value };
        const duration = () => {${durationBody}
        };
        return duration();
    }`);

    assert.equal(readDuration('67'), 67);
});
