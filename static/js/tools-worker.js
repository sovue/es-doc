/* All runtime and Python code is served by ES Doc; user Files stay in this
   worker. WORKERFS reads Blob slices instead of copying a whole RPA to MEMFS. */
let runtimePromise;
let running = false;
let inputOffset = 0;

const checkedFetch = async url => {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Не удалось загрузить инструменты (${response.status}). Обновите страницу и повторите.`);
    return response;
};

async function initialize(config) {
    self.postMessage({ type: 'loading', text: 'Загрузка инструментов для локальной обработки…' });
    const { loadPyodide } = await import(new URL(config.runtime + 'pyodide.mjs', self.location.origin).href);
    const pyodide = await loadPyodide({
        indexURL: new URL(config.runtime, self.location.origin).href,
        stdout: () => {}, stderr: () => {},
    });
    const [vendor, engine] = await Promise.all([
        checkedFetch(config.vendor).then(response => response.arrayBuffer()),
        checkedFetch(config.engine).then(response => response.text()),
    ]);
    pyodide.FS.mkdirTree('/tools');
    pyodide.FS.writeFile('/tools/vendor.zip', new Uint8Array(vendor));
    pyodide.FS.writeFile('/tools/engine.py', engine, { encoding: 'utf8' });
    await pyodide.runPythonAsync(`
import sys, zipfile
sys.path.insert(0, '/tools')
with zipfile.ZipFile('/tools/vendor.zip') as bundled:
    bundled.extractall('/tools')
import engine
`);
    if (!pyodide.FS.filesystems.WORKERFS) throw new Error('Браузер не поддерживает чтение файлов инструментом. Попробуйте актуальный Firefox, Chrome или Edge.');
    return pyodide;
}

self.esdocNotify = event => {
    const message = event.toJs({ dict_converter: Object.fromEntries });
    if (typeof message.index === 'number') message.index += inputOffset;
    self.postMessage(message);
};
self.esdocEmit = bytes => {
    const data = bytes.toJs();
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    self.postMessage({ type: 'chunk', buffer }, [buffer]);
};

self.onmessage = async ({ data }) => {
    if (running || data.type !== 'run') return;
    running = true;
    let pyodide;
    let mounted = false;
    try {
        runtimePromise ||= initialize(data.config).catch(error => { runtimePromise = null; throw error; });
        pyodide = await runtimePromise;
        pyodide.FS.mkdirTree('/input');
        pyodide.FS.mount(pyodide.FS.filesystems.WORKERFS, {
            blobs: data.files.map((entry, index) => ({ name: `input-${index}`, data: entry.file })),
        }, '/input');
        mounted = true;
        self.postMessage({ type: 'ready' });
        const inputs = data.files.map((entry, index) => ({ path: entry.path, source: `/input/input-${index}` }));
        const jobs = data.mode === 'combined'
            ? inputs.map((entry, index) => ({ files: [entry], offset: index,
                name: entry.path.split('/').pop().replace(/\.rpa$/i, '.zip') }))
            : [{ files: inputs, offset: 0, name: 'unrpyc.zip' }];
        const totals = { succeeded: 0, failed: 0, written: 0, warnings: 0, errors: [] };
        for (const job of jobs) {
            inputOffset = job.offset;
            pyodide.globals.set('job_json', JSON.stringify({ files: job.files, mode: data.mode, options: data.options }));
            self.postMessage({ type: 'output-start' });
            const result = JSON.parse(await pyodide.runPythonAsync(`
import json
from js import esdocNotify, esdocEmit
job = json.loads(job_json)
sink = engine.ChunkSink(esdocEmit)
result = engine.process(job['files'], job['mode'], job['options'], sink, esdocNotify)
json.dumps(result, ensure_ascii=False)
`));
            self.postMessage({ type: 'output', name: job.name, result });
            for (const key of ['succeeded', 'failed', 'written', 'warnings']) totals[key] += result[key];
            for (const error of result.errors) totals.errors.push(error);
        }
        self.postMessage({ type: 'done', result: totals });
    } catch (error) {
        self.postMessage({ type: 'fatal', error: String(error.message || error) });
    } finally {
        if (mounted) pyodide.FS.unmount('/input');
        if (pyodide) {
            await pyodide.runPythonAsync(`
for key in ('job_json', 'job', 'sink', 'result'):
    globals().pop(key, None)
import gc
gc.collect()
`);
        }
        running = false;
    }
};
