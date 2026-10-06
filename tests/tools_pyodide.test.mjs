import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadPyodide } from '../static/tools/pyodide/pyodide.mjs';

test('real Pyodide processes RPYC and RPA, then lists and previews each result', async () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const pyodide = await loadPyodide({ indexURL: path.join(root, 'static/tools/pyodide/'),
        stdout: () => {}, stderr: () => {} });
    pyodide.FS.mkdirTree('/tools');
    pyodide.FS.mkdirTree('/browse');
    pyodide.FS.mkdirTree('/catalog');
    pyodide.FS.writeFile('/tools/vendor.zip', fs.readFileSync(path.join(root, 'static/tools/vendor.zip')));
    pyodide.FS.writeFile('/tools/engine.py', fs.readFileSync(path.join(root, 'static/tools/engine.py')));
    pyodide.FS.writeFile('/tools/syntax.zip', fs.readFileSync(path.join(root, 'static/tools/syntax.zip')));
    pyodide.FS.writeFile('/tools/renpy_lexer.py', fs.readFileSync(path.join(root, 'app/utils/renpy_lexer.py')));
    await pyodide.runPythonAsync(String.raw`
import io, json, pickle, struct, sys, zipfile, zlib
sys.path.insert(0, '/tools')
with zipfile.ZipFile('/tools/vendor.zip') as bundled:
    bundled.extractall('/tools')
with zipfile.ZipFile('/tools/syntax.zip') as bundled:
    bundled.extractall('/tools')
import engine
import decompiler.renpycompat as compat
label = compat.CLASS_FACTORY('Label', 'renpy.ast')()
say = compat.CLASS_FACTORY('Say', 'renpy.ast')()
label.__dict__.update(name='start', linenumber=1, parameters=None, hide=False, block=[say])
say.__dict__.update(who=None, what='Hello', linenumber=2, interact=True,
                    attributes=None, arguments=None, temporary_attributes=None,
                    identifier=None, explicit_identifier=None)
payload = zlib.compress(compat.pickle_safe_dumps(({}, [label])))
compiled = b'RENPY RPC2' + struct.pack('<III', 1, 34, len(payload)) + b'\0' * 12 + payload
with open('/script.rpyc', 'wb') as source:
    source.write(compiled)
archive_offset = 25 + len(compiled)
index = {'scenario/script.rpyc': [(25, len(compiled))]}
with open('/data.rpa', 'wb') as source:
    source.write(f'RPA-2.0 {archive_offset:016x}\n'.encode() + compiled + zlib.compress(pickle.dumps(index, protocol=2)))
`);
    const waiting = new Map();
    const self = { postMessage: message => waiting.get(message.requestId)?.(message) };
    // Node has no browser Blob mount. Keep the actual Python ZIP reads and
    // conversions, with the completed archive already written to MEMFS.
    const runtime = {
        runPythonAsync: source => pyodide.runPythonAsync(source),
        globals: pyodide.globals,
        FS: { mkdirTree() {}, mount() {}, unmount() {}, filesystems: { WORKERFS: {} } },
    };
    const context = vm.createContext({ self, runtime });
    const worker = fs.readFileSync(path.join(root, 'static/js/tools-worker.js'), 'utf8');
    vm.runInContext(worker.replace('let runtimePromise;', 'let runtimePromise = Promise.resolve(runtime);'), context);
    globalThis.esdocPreview = self.esdocPreview;
    globalThis.esdocSourcePreview = self.esdocSourcePreview;
    const request = data => new Promise(resolve => {
        waiting.set(data.requestId, message => { waiting.delete(data.requestId); resolve(message); });
        self.onmessage({ data });
    });
    try {
        for (const [index, mode] of ['unrpyc', 'combined'].entries()) {
            pyodide.globals.set('test_mode', mode);
            const result = JSON.parse(await pyodide.runPythonAsync(`
source = '/script.rpyc' if test_mode == 'unrpyc' else '/data.rpa'
sink = io.BytesIO()
result = engine.process([{'path': source[1:], 'source': source}], test_mode, {}, sink)
with open('/browse/result.zip', 'wb') as destination:
    destination.write(sink.getvalue())
json.dumps(result)
`));
            assert.equal(result.failed, 0);
            const list = await request({ type: 'browse-list', blob: new Blob(), requestId: index * 2 + 1 });
            assert.equal(list.type, 'browse-list', list.error);
            const script = list.entries.find(entry => entry.path.endsWith('.rpy'));
            assert(script);
            const preview = await request({ type: 'browse-read', path: script.path, requestId: index * 2 + 2 });
            assert.equal(preview.type, 'browse-file', preview.error);
            assert.match(new TextDecoder().decode(preview.buffer), /label start:/);
            pyodide.FS.writeFile('/catalog/input-0', pyodide.FS.readFile(mode === 'unrpyc' ? '/script.rpyc' : '/data.rpa'));
            const catalog = await request({ type: 'catalog', files: [{ path: mode === 'unrpyc' ? 'script.rpyc' : 'data.rpa', file: new Blob() }],
                requestId: 10 + index * 2 });
            assert.equal(catalog.type, 'catalog', catalog.error);
            assert(catalog.entries[0].path.endsWith('.rpyc'));
            const opened = await request({ type: 'source-read', id: catalog.entries[0].id, options: {}, requestId: 11 + index * 2 });
            assert.equal(opened.type, 'source-file', opened.error);
            assert.match(new TextDecoder().decode(opened.buffer), /label start:/);
            assert.match(opened.html, /class="k"/);
            assert.match(opened.html, /class="w"/);
        }
    } finally {
        delete globalThis.esdocPreview;
        delete globalThis.esdocSourcePreview;
    }
});
