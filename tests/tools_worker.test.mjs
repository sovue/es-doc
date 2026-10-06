import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

async function run(mode, paths, errors = []) {
    const messages = [], jobs = [], limits = [];
    let job;
    const self = { postMessage: message => messages.push(message) };
    const runtime = {
        FS: { mkdirTree() {}, mount() {}, unmount() {}, filesystems: { WORKERFS: {} } },
        globals: { set: (name, value) => {
            if (name === 'job_json') job = JSON.parse(value);
            else if (name === 'output_limit') limits.push(value);
        }, delete() {} },
        runPythonAsync: async source => {
            if (source.includes('archive.infolist()')) {
                return JSON.stringify([{ path: 'scenario/script.rpy', size: 12 }]);
            }
            if (source.includes('esdocPreview(item.filename')) {
                self.esdocPreview('scenario/script.rpy', { toJs: () => new Uint8Array([65, 66]) });
                return;
            }
            if (!source.includes('engine.process')) return;
            jobs.push(job);
            self.esdocNotify({ toJs: () => ({ type: 'file', index: 0, state: 'done', path: job.files[0].path }) });
            self.esdocEmit({ toJs: () => new Uint8Array([1, jobs.length]) });
            return JSON.stringify({ succeeded: job.files.length, failed: errors.length, written: 1, warnings: 0, errors });
        },
    };
    const context = vm.createContext({ self, runtime });
    const source = fs.readFileSync(new URL('../static/js/tools-worker.js', import.meta.url), 'utf8');
    // Replace only lazy runtime bootstrapping; execute the real job controller.
    vm.runInContext(source.replace('let runtimePromise;', 'let runtimePromise = Promise.resolve(runtime);'), context);
    await self.onmessage({ data: { type: 'run', mode, config: {}, options: {},
        files: paths.map(path => ({ path, file: {} })) } });
    return { messages, jobs, limits, self };
}

test('multiple RPAs produce separate named ZIP streams and preserve their input sources', async () => {
    const { messages, jobs, limits } = await run('combined', ['game/data.rpa', 'folder/images.RPA']);
    assert.deepEqual(jobs.map(job => job.files.map(file => file.source)), [['/input/input-0'], ['/input/input-1']]);
    assert.deepEqual(messages.filter(message => message.type === 'output').map(message => message.name), ['data.zip', 'images.zip']);
    assert.deepEqual(messages.filter(message => message.type === 'file').map(message => message.index), [0, 1]);
    assert.deepEqual(messages.map(message => message.type), ['ready', 'output-start', 'file', 'chunk', 'output',
        'output-start', 'file', 'chunk', 'output', 'done']);
    assert.equal(messages.at(-1).result.succeeded, 2);
    assert.deepEqual(limits, []);
});

test('loose compiled scripts remain in one unrpyc.zip', async () => {
    const { messages, jobs } = await run('unrpyc', ['a.rpyc', 'folder/b.rpymc']);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].files.length, 2);
    assert.equal(messages.find(message => message.type === 'output').name, 'unrpyc.zip');
});

test('large error lists do not exceed the JavaScript argument limit', async () => {
    const errors = Array(200000).fill('script.rpyc: invalid');
    const { messages } = await run('combined', ['data.rpa'], errors);
    assert.equal(messages.at(-1).type, 'done');
    assert.equal(messages.at(-1).result.failed, errors.length);
    assert.equal(messages.at(-1).result.errors.length, errors.length);
});

test('completed output supports listing and reading files in the worker', async () => {
    const { messages, self } = await run('unrpyc', ['script.rpyc']);
    await self.onmessage({ data: { type: 'browse-list', blob: new Blob(), requestId: 3 } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(messages.at(-1).entries[0].path, 'scenario/script.rpy');
    assert.equal(messages.at(-1).entries[0].size, 12);
    await self.onmessage({ data: { type: 'browse-read', path: 'scenario/script.rpy', requestId: 4 } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(messages.at(-1).type, 'browse-file');
    assert.equal(messages.at(-1).requestId, 4);
    assert.deepEqual([...new Uint8Array(messages.at(-1).buffer)], [65, 66]);
});
