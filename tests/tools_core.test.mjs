import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../static/js/tools-core.js', import.meta.url), 'utf8'), context);
const core = context.ESDocTools;

test('filter extensions by tool, including uppercase and modules', () => {
    assert.equal(core.accepts('game/SCRIPT.RPYC', 'unrpyc'), true);
    assert.equal(core.accepts('game/file.rpymc', 'combined'), true);
    assert.equal(core.accepts('game/data.rpa', 'combined'), true);
    assert.equal(core.accepts('game/data.rpa', 'unrpyc'), false);
    assert.equal(core.accepts('game/a.png', 'combined'), false);
});
test('reject unsafe paths before passing files to worker', () => {
    for (const path of ['../file', '/absolute', 'C:\\file', 'a/../../b', 'a\0b']) {
        assert.throws(() => core.safePath(path));
    }
    assert.equal(core.safePath('game/сцены/script.rpyc'), 'game/сцены/script.rpyc');
});

test('read every batch of a dropped folder and preserve nested paths', async () => {
    const file = name => ({ isFile: true, name, file: done => done({ name, size: 1 }) });
    const folder = (name, batches) => ({ isDirectory: true, name, createReader: () => ({
        readEntries: done => done(batches.shift() || []),
    }) });
    const entry = folder('game', [[file('a.rpyc')], [folder('scenario', [[file('b.rpyc')], []])], []]);
    const paths = [];
    await core.walkEntry(entry, '', item => paths.push(item.path));
    assert.deepEqual(paths, ['game/a.rpyc', 'game/scenario/b.rpyc']);
});

test('permission errors from folder enumeration propagate', async () => {
    const entry = { name: 'blocked', isDirectory: true, createReader: () => ({
        readEntries: (done, error) => error(new Error('permission denied')),
    }) };
    await assert.rejects(core.walkEntry(entry, '', () => {}), /permission denied/);
});

