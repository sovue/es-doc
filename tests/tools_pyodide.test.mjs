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
    pyodide.FS.writeFile('/tools/recovery.py', fs.readFileSync(path.join(root, 'static/tools/recovery.py')));
    pyodide.FS.writeFile('/tools/pyc_decompiler.py', fs.readFileSync(path.join(root, 'static/tools/pyc_decompiler.py')))
    pyodide.FS.writeFile('/tools/bytecode.zip', fs.readFileSync(path.join(root, 'static/tools/bytecode.zip')))
    pyodide.FS.writeFile('/tools/syntax.zip', fs.readFileSync(path.join(root, 'static/tools/syntax.zip')));
    pyodide.FS.writeFile('/tools/renpy_lexer.py', fs.readFileSync(path.join(root, 'app/utils/renpy_lexer.py')));
    await pyodide.runPythonAsync(String.raw`
import io, json, pickle, struct, sys, zipfile, zlib
sys.path.insert(0, '/tools')
with zipfile.ZipFile('/tools/vendor.zip') as bundled:
    bundled.extractall('/tools')
with zipfile.ZipFile('/tools/syntax.zip') as bundled:
    bundled.extractall('/tools')
with zipfile.ZipFile('/tools/bytecode.zip') as bundled:
    bundled.extractall('/tools')
import engine
pyc_data = bytes.fromhex('330d0d0a0000000000000000e30000000000000000000000000100000000000000730800000064005a00640153002802000000692a0000004e28010000007506000000616e73776572280000000028000000002800000000750a0000006578616d706c652e707975080000003c6d6f64756c653e010000007300000000')
with open('/module.pyc', 'wb') as source:
    source.write(pyc_data)
pyc_files = [{'path': 'module.pyc', 'source': '/module.pyc'}]
pyc_catalog = engine.Catalog(pyc_files)
name, text, warnings = pyc_catalog.read('0:module.pyc', {})
assert name == 'module.py' and b'answer = 42' in text and not warnings
pyc_sink = io.BytesIO()
pyc_result = engine.process(pyc_files, 'combined', {}, pyc_sink)
assert pyc_result['failed'] == 0, pyc_result
with zipfile.ZipFile(io.BytesIO(pyc_sink.getvalue())) as output:
    assert output.read('module.pyc') == pyc_data
    assert output.read('module.py') == text
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
    await pyodide.runPythonAsync(String.raw`
# Exercise recovery in the shipped WASM runtime, including the extended-index layout.
import recovery
assert recovery.safe_loads(pickle.dumps(b'foreign bytecode', protocol=2)) == b'foreign bytecode'
class PyCode(compat.magic.FakeStrict):
    __module__ = 'renpy.ast'
    def __getstate__(self):
        return (1, self.source, ('wrapper.rpy', 1), 'exec')
wrapper_code = PyCode()
container_literal = compat.pickle_safe_dumps(([label], [])).hex()
wrapper_code.source = '\nvpps_code_0 = ' + repr(container_literal)
wrapper_node = compat.CLASS_FACTORY('Python', 'renpy.ast')()
wrapper_node.__dict__.update(code=wrapper_code, linenumber=1, hide=False, store='store')
wrapper = zlib.compress(compat.pickle_safe_dumps(({}, [wrapper_node])))
text, logs = engine.decompile(wrapper, {'try_harder': True})
assert b'label start:' in text and any('Контейнер:' in log for log in logs)
encoded = __import__('base64').b64encode(compat.pickle_safe_dumps(({}, [label])).hex().encode())
text, _ = engine.decompile(encoded, {'try_harder': True})
assert b'label start:' in text
altered_script = b'RENPY RPC4' + compiled[10:]
key = 0x42424242
extended_offset = 34 + len(altered_script)
extended_index = {'scenario/script.rpyc': [(b'', 34 ^ key, len(altered_script) ^ key,
                                       len(altered_script) ^ key, b'', b'', b'')]}
with open('/extended.rpa', 'wb') as source:
    source.write(f'xehsoidx{extended_offset:016x} {key:08x}\n'.encode() + altered_script
                 + zlib.compress(pickle.dumps(extended_index, protocol=2)))
files = [{'path': 'extended.rpa', 'source': '/extended.rpa'}]
advanced = {'try_harder': True}
catalog = engine.Catalog(files, advanced)
assert not catalog.errors, catalog.errors
name, text, _ = catalog.read('0:scenario/script.rpyc', advanced)
assert name == 'scenario/script.rpy' and b'label start:' in text
sink = io.BytesIO()
result = engine.process(files, 'combined', advanced, sink)
assert result['failed'] == 0, result
with zipfile.ZipFile(io.BytesIO(sink.getvalue())) as output:
    assert output.read('scenario/script.rpyc') == altered_script
    assert output.read('scenario/script.rpy') == text
`);
    const waiting = new Map();
    const messages = [];
    const self = { postMessage: message => { messages.push(message); waiting.get(message.requestId)?.(message); } };
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
    globalThis.esdocEmit = self.esdocEmit;
    globalThis.esdocNotify = self.esdocNotify;
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
        pyodide.FS.mkdirTree('/input');
        for (const [index, source] of ['/script.rpyc', '/data.rpa', '/script.rpyc'].entries()) {
            pyodide.FS.writeFile(`/input/input-${index}`, pyodide.FS.readFile(source));
        }
        messages.length = 0;
        await vm.runInContext(`run({mode: 'combined', files: [
            {path: 'script.rpyc'}, {path: 'data.rpa'}, {path: 'other.rpyc'}], options: {}})`, context);
        const outputs = messages.filter(message => message.type === 'output');
        assert.equal(outputs.length, 2, 'All standalone scripts share one ZIP beside the archive ZIP');
        const scriptOutput = outputs.find(message => message.name === 'unrpyc.zip');
        assert.ok(scriptOutput, 'Standalone scripts must download with a ZIP filename');
        assert.equal(scriptOutput.result.succeeded, 2);
        assert.equal(outputs.find(message => message.name === 'data.zip').result.succeeded, 1);
        assert.equal(messages.at(-1).type, 'done');
        assert.equal(messages.at(-1).result.succeeded, 3);
        let chunks = [];
        for (const message of messages) {
            if (message.type === 'output-start') chunks = [];
            if (message.type === 'chunk') chunks.push(Buffer.from(message.buffer));
            if (message.type === 'output') {
                pyodide.FS.writeFile('/verify.zip', Buffer.concat(chunks));
                const paths = JSON.parse(await pyodide.runPythonAsync(`
with zipfile.ZipFile('/verify.zip') as output:
    output_paths = sorted(output.namelist())
json.dumps(output_paths)
`));
                assert.deepEqual(paths, message.name === 'unrpyc.zip'
                    ? ['other.rpy', 'script.rpy'] : ['scenario/script.rpy', 'scenario/script.rpyc']);
            }
        }
        for (const path of ['script.rpyc', 'data.rpa', 'other.rpyc']) {
            const event = messages.find(message => message.type === 'file' && message.path === path);
            assert.equal(event.index, ['script.rpyc', 'data.rpa', 'other.rpyc'].indexOf(path), 'Progress refers to the original queue index');
        }
        messages.length = 0;
        pyodide.FS.writeFile('/input/input-2', pyodide.FS.readFile('/data.rpa'));
        await vm.runInContext(`run({mode: 'combined', files: [
            {path: 'script.rpyc'}, {path: 'unrpyc.rpa'}, {path: 'folder/unrpyc.rpa'}], options: {}})`, context);
        assert.deepEqual(messages.filter(message => message.type === 'output').map(message => message.name),
            ['unrpyc.zip', 'unrpyc-2.zip', 'unrpyc-3.zip'], 'ZIP filenames must be unique across scripts and archives');
        assert.equal(messages.at(-1).result.failed, 0);
    } finally {
        delete globalThis.esdocPreview;
        delete globalThis.esdocSourcePreview;
        delete globalThis.esdocEmit;
        delete globalThis.esdocNotify;
    }
});
