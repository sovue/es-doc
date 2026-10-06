/* All runtime and Python code is served by ES Doc; user Files stay in this
   worker. WORKERFS reads Blob slices instead of copying a whole RPA to MEMFS. */
let runtimePromise;
let inputOffset = 0;
let browseMounted = false;
let commandQueue = Promise.resolve();
let previewRequestId = 0;
let catalogMounted = false;

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
    const [vendor, engine, syntax, lexer] = await Promise.all([
        checkedFetch(config.vendor).then(response => response.arrayBuffer()),
        checkedFetch(config.engine).then(response => response.text()),
        checkedFetch(config.syntax).then(response => response.arrayBuffer()),
        checkedFetch(config.lexer).then(response => response.text()),
    ]);
    pyodide.FS.mkdirTree('/tools');
    pyodide.FS.writeFile('/tools/vendor.zip', new Uint8Array(vendor));
    pyodide.FS.writeFile('/tools/engine.py', engine, { encoding: 'utf8' });
    pyodide.FS.writeFile('/tools/syntax.zip', new Uint8Array(syntax));
    pyodide.FS.writeFile('/tools/renpy_lexer.py', lexer, { encoding: 'utf8' });
    await pyodide.runPythonAsync(`
import sys, zipfile
sys.path.insert(0, '/tools')
with zipfile.ZipFile('/tools/vendor.zip') as bundled:
    bundled.extractall('/tools')
with zipfile.ZipFile('/tools/syntax.zip') as bundled:
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
self.esdocPreview = (name, bytes) => {
    const data = bytes.toJs();
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    self.postMessage({ type: 'browse-file', name, buffer, requestId: previewRequestId }, [buffer]);
};
self.esdocSourcePreview = (metadata, bytes) => {
    const data = bytes.toJs();
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    self.postMessage({ type: 'source-file', ...JSON.parse(metadata), buffer,
        requestId: previewRequestId }, [buffer]);
};

async function source(data) {
    let pyodide;
    try {
        runtimePromise ||= initialize(data.config).catch(error => { runtimePromise = null; throw error; });
        pyodide = await runtimePromise;
        if (data.type === 'catalog') {
            await pyodide.runPythonAsync("globals().pop('catalog', None)");
            if (catalogMounted) { pyodide.FS.unmount('/catalog'); catalogMounted = false; }
            pyodide.FS.mkdirTree('/catalog');
            pyodide.FS.mount(pyodide.FS.filesystems.WORKERFS, {
                blobs: data.files.map((entry, index) => ({ name: `input-${index}`, data: entry.file })),
            }, '/catalog');
            catalogMounted = true;
            pyodide.globals.set('catalog_json', JSON.stringify(data.files.map((entry, index) => ({
                path: entry.path, source: `/catalog/input-${index}`,
            }))));
            const listing = JSON.parse(await pyodide.runPythonAsync(`
import json
catalog = engine.Catalog(json.loads(catalog_json))
json.dumps({'entries': catalog.listing(), 'errors': catalog.errors}, ensure_ascii=False)
`));
            self.postMessage({ type: 'catalog', ...listing, requestId: data.requestId });
        } else {
            if (!catalogMounted) throw new Error('Добавьте файлы ещё раз.');
            previewRequestId = data.requestId;
            pyodide.globals.set('read_json', JSON.stringify({ id: data.id, options: data.options }));
            await pyodide.runPythonAsync(`
import json
from js import esdocSourcePreview
read_job = json.loads(read_json)
preview_name, preview_data, preview_warnings = catalog.read(read_job['id'], read_job['options'])
preview_markup = engine.preview_html(preview_name, preview_data)
esdocSourcePreview(json.dumps({'name': preview_name, 'html': preview_markup, 'warnings': preview_warnings}, ensure_ascii=False), preview_data)
`);
        }
    } catch (error) {
        self.postMessage({ type: 'source-error', operation: data.type, error: String(error.message || error), requestId: data.requestId });
    } finally {
        if (pyodide) await pyodide.runPythonAsync(`
for key in ('catalog_json', 'read_json', 'read_job', 'preview_name', 'preview_data', 'preview_warnings', 'preview_markup'):
    globals().pop(key, None)
import gc
gc.collect()
`);
    }
}

async function browse(data) {
    try {
        if (!runtimePromise) throw new Error('Дождитесь завершения обработки.');
        const pyodide = await runtimePromise;
        if (data.type === 'browse-list') {
            if (browseMounted) { pyodide.FS.unmount('/browse'); browseMounted = false; }
            pyodide.FS.mkdirTree('/browse');
            pyodide.FS.mount(pyodide.FS.filesystems.WORKERFS,
                { blobs: [{ name: 'result.zip', data: data.blob }] }, '/browse');
            browseMounted = true;
            const entries = JSON.parse(await pyodide.runPythonAsync(`
import json, zipfile
with zipfile.ZipFile('/browse/result.zip') as archive:
    entries = [{'path': item.filename, 'size': item.file_size}
               for item in archive.infolist() if not item.is_dir()]
json.dumps(entries, ensure_ascii=False)
`));
            self.postMessage({ type: 'browse-list', entries, requestId: data.requestId });
        } else if (data.type === 'browse-read') {
            if (!browseMounted) throw new Error('Откройте архив ещё раз.');
            previewRequestId = data.requestId;
            pyodide.globals.set('browse_path', data.path);
            await pyodide.runPythonAsync(`
import zipfile
from js import esdocPreview
with zipfile.ZipFile('/browse/result.zip') as archive:
    item = archive.getinfo(browse_path)
    if item.file_size > 64 * 1024 * 1024:
        raise ValueError('Файл больше 64 МБ. Скачайте архив для просмотра.')
    esdocPreview(item.filename, archive.read(item))
`);
            pyodide.globals.delete('browse_path');
        }
    } catch (error) {
        self.postMessage({ type: 'browse-error', error: String(error.message || error), requestId: data.requestId });
    }
}

async function run(data) {
    let pyodide;
    let mounted = false;
    try {
        runtimePromise ||= initialize(data.config).catch(error => { runtimePromise = null; throw error; });
        pyodide = await runtimePromise;
        if (browseMounted) { pyodide.FS.unmount('/browse'); browseMounted = false; }
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
        const totals = { succeeded: 0, failed: 0, written: 0, warnings: 0, warning_details: [], errors: [] };
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
            for (const warning of result.warning_details || []) {
                if (totals.warning_details.length < 100) totals.warning_details.push(warning);
            }
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
    }
}

self.onmessage = ({ data }) => {
    if (!['run', 'catalog', 'source-read', 'browse-list', 'browse-read'].includes(data.type)) return;
    commandQueue = commandQueue.then(() => data.type === 'run' ? run(data)
        : ['catalog', 'source-read'].includes(data.type) ? source(data) : browse(data))
        .catch(error => self.postMessage({ type: 'fatal', error: String(error.message || error) }));
    return commandQueue;
};
