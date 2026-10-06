(function () {
    window.__esdocToolsCleanup?.();
    const app = document.getElementById('tools-app');
    if (!app) return;
    const { accepts, safePath, walkEntry, size } = window.ESDocTools;
    const config = JSON.parse(app.dataset.config);
    const get = id => document.getElementById('tools-' + id);
    const controls = get('controls'), drop = get('drop'), menu = get('add-menu');
    const addButton = get('add'), fileInput = get('files'), folderInput = get('folder');
    const start = get('start'), cancel = get('cancel'), status = get('status');
    const queue = get('queue'), list = get('file-list'), progress = get('progress');
    const progressBar = get('progress-bar'), current = get('current');
    const resultPanel = get('result'), downloads = get('downloads'), downloadAll = get('download-all');
    const controller = new AbortController();
    const on = (element, event, callback) => element.addEventListener(event, callback, { signal: controller.signal });
    const labels = { unrpyc: 'Декомпилировать', unrpa: 'Распаковать' };
    const files = new Map();
    const rows = new Map();
    const supported = Boolean(window.Worker && window.WebAssembly);
    let mode = 'unrpyc', busy = false, enumerating = false, disposed = false;
    let worker = null, chunks = [], activeFiles = [], dragDepth = 0;
    const outputs = [];
    let operation = 0;

    const say = (message, error = false) => {
        status.textContent = message;
        status.classList.toggle('is-error', error);
    };
    const clearResult = () => {
        for (const output of outputs) URL.revokeObjectURL(output.url);
        outputs.length = 0;
        chunks = [];
        downloads.replaceChildren();
        downloadAll.hidden = true;
        resultPanel.hidden = true;
        start.classList.add('tools-button-primary');
    };
    const closeMenu = (restore = false) => {
        menu.hidden = true;
        addButton.setAttribute('aria-expanded', 'false');
        if (restore) addButton.focus();
    };
    const showMenu = (x, y) => {
        if (busy || enumerating) return;
        menu.hidden = false;
        const bounds = menu.getBoundingClientRect();
        menu.style.left = Math.max(8, Math.min(x, innerWidth - bounds.width - 8)) + 'px';
        menu.style.top = Math.max(8, Math.min(y, innerHeight - bounds.height - 8)) + 'px';
        addButton.setAttribute('aria-expanded', 'true');
        get('pick-files').focus();
    };
    const selected = () => [...files.values()].filter(entry => accepts(entry.path, mode));
    const setMode = next => {
        mode = next;
        for (const radio of app.querySelectorAll('[name="tool-mode"]')) radio.checked = radio.value === mode;
        progress.hidden = true;
        start.textContent = labels[mode];
        get('drop-help').textContent = mode === 'unrpa' ? '.rpa' : '.rpyc, .rpymc';
    };
    const updateControls = () => {
        const locked = busy || enumerating || !supported;
        start.disabled = locked || !selected().length;
        addButton.disabled = locked;
        get('clear').disabled = locked;
        for (const field of app.querySelectorAll('.tools-modes input, .tools-options input')) field.disabled = locked;
        for (const button of list.querySelectorAll('button')) button.disabled = locked;
        cancel.hidden = !locked;
    };
    const render = () => {
        list.replaceChildren();
        rows.clear();
        const visible = selected();
        queue.hidden = !files.size;
        get('count').textContent = `${visible.length.toLocaleString('ru-RU')} файлов / ${size(visible.reduce((total, entry) => total + entry.file.size, 0))}`
            + (visible.length < files.size ? ` / для другого режима: ${files.size - visible.length}` : '');
        const fragment = document.createDocumentFragment();
        // Bound the DOM for folders with thousands of scripts; all queued files
        // are still processed even when their rows are not rendered.
        for (const entry of visible.slice(0, 200)) {
            const row = document.createElement('li');
            const name = document.createElement('div');
            name.className = 'tools-file-name';
            name.textContent = entry.path;
            const state = document.createElement('span');
            state.className = 'tools-file-state';
            state.textContent = 'В очереди';
            name.appendChild(state);
            const bytes = document.createElement('span');
            bytes.className = 'tools-file-size';
            bytes.textContent = size(entry.file.size);
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'tools-remove';
            remove.setAttribute('aria-label', 'Убрать ' + entry.path);
            remove.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
            remove.addEventListener('click', () => { files.delete(entry.path); clearResult(); render(); });
            row.append(name, bytes, remove);
            rows.set(entry.path, state);
            fragment.appendChild(row);
        }
        if (visible.length > 200) {
            const remainder = document.createElement('li');
            remainder.textContent = `И ещё ${visible.length - 200} файлов. Будут обработаны все.`;
            fragment.appendChild(remainder);
        }
        list.appendChild(fragment);
        updateControls();
    };

    const importFiles = async collect => {
        if (busy || enumerating) return;
        enumerating = true;
        const id = ++operation;
        closeMenu();
        clearResult();
        updateControls();
        say('Чтение списка файлов…');
        let added = 0, skipped = 0, duplicates = 0;
        const incomingModes = new Set();
        try {
            await collect(entry => {
                if (disposed || id !== operation) throw new Error('Добавление отменено.');
                entry.path = safePath(entry.path);
                if (!accepts(entry.path, 'combined')) { skipped++; return; }
                incomingModes.add(accepts(entry.path, 'unrpa') ? 'unrpa' : 'unrpyc');
                if (files.has(entry.path)) { duplicates++; return; }
                files.set(entry.path, entry);
                added++;
            });
            if (id === operation && incomingModes.size === 1) setMode([...incomingModes][0]);
            if (id === operation) say(`Добавлено файлов: ${added}.`
                + (skipped ? ` Другие форматы пропущены: ${skipped}.` : '')
                + (duplicates ? ` Повторные пути пропущены: ${duplicates}.` : '')
                + (!selected().length && files.size ? ' Выберите подходящий режим выше.' : '')
                + (!files.size ? ' Выберите .rpyc, .rpymc или .rpa.' : ''));
        } catch (error) {
            if (id === operation) say(error.message, true);
        } finally {
            if (!disposed && id === operation) { enumerating = false; render(); }
        }
    };
    const pick = input => { closeMenu(true); input.value = ''; input.click(); };
    for (const input of [fileInput, folderInput]) on(input, 'change', () => {
        const picked = [...input.files];
        importFiles(add => { for (const file of picked) add({ file, path: file.webkitRelativePath || file.name }); });
    });
    on(get('pick-files'), 'click', () => pick(fileInput));
    on(get('pick-folder'), 'click', () => pick(folderInput));
    on(addButton, 'click', () => {
        if (!menu.hidden) { closeMenu(true); return; }
        const bounds = addButton.getBoundingClientRect();
        showMenu(bounds.left, bounds.bottom + 4);
    });
    on(drop, 'contextmenu', event => { event.preventDefault(); showMenu(event.clientX, event.clientY); });
    on(drop, 'keydown', event => {
        if (event.target !== drop) return;
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey) {
            event.preventDefault();
            const bounds = addButton.getBoundingClientRect();
            showMenu(bounds.left, bounds.bottom + 4);
        }
    });
    on(document, 'pointerdown', event => {
        if (!menu.contains(event.target) && !addButton.contains(event.target)) closeMenu();
    });
    on(document, 'keydown', event => { if (event.key === 'Escape' && !menu.hidden) closeMenu(true); });
    // Some browser hosts clear focus between pointerdown and click. Hiding the
    // menu then removes the clicked button before its click handler can run.
    on(menu, 'focusout', event => {
        if (event.relatedTarget && event.relatedTarget !== addButton && !menu.contains(event.relatedTarget)) closeMenu();
    });
    on(window, 'resize', () => closeMenu());
    on(window, 'scroll', () => closeMenu());
    for (const radio of app.querySelectorAll('[name="tool-mode"]')) on(radio, 'change', () => {
        setMode(radio.value);
        clearResult();
        say('');
        render();
    });
    on(get('clear'), 'click', () => { files.clear(); clearResult(); progress.hidden = true; say('Очередь очищена.'); render(); });

    const resetWorker = () => { worker?.terminate(); worker = null; };
    const finish = () => { busy = false; progress.hidden = true; updateControls(); };
    const showOutputs = () => {
        resultPanel.hidden = false;
        start.classList.remove('tools-button-primary');
        downloadAll.hidden = outputs.length < 2;
        downloadAll.textContent = `Скачать все (${outputs.length})`;
        if (outputs.length === 1) outputs[0].link.classList.add('tools-button-primary');
    };
    const fail = message => {
        chunks = [];
        resetWorker();
        finish();
        if (outputs.length) {
            showOutputs();
            get('result-description').textContent = `Готовых архивов: ${outputs.length}.`;
        } else clearResult();
        say(message, true);
    };
    on(cancel, 'click', () => {
        operation++;
        enumerating = false;
        resetWorker();
        clearResult();
        finish();
        render();
        say('Обработка отменена. Файлы остались в очереди.');
    });
    const handleMessage = ({ data }) => {
        if (disposed || !busy) return;
        if (data.type === 'loading') say(data.text);
        else if (data.type === 'ready') { say('Инструменты готовы. Обработка файлов…'); progressBar.max = activeFiles.length; progressBar.value = 0; }
        else if (data.type === 'chunk') chunks.push(new Blob([data.buffer]));
        else if (data.type === 'entry') {
            current.textContent = `${data.path} / ${data.current} из ${data.total}`;
            progressBar.value = data.index + data.current / data.total;
        } else if (data.type === 'file') {
            const state = rows.get(data.path);
            if (state) {
                state.textContent = { working: 'Обработка…', done: 'Готово', error: 'Ошибка: ' + data.error }[data.state];
                state.classList.toggle('is-error', data.state === 'error');
            }
            current.textContent = data.path;
            if (data.state !== 'working') progressBar.value = data.index + 1;
        } else if (data.type === 'output-start') chunks = [];
        else if (data.type === 'output') {
            if (data.result.written) {
                const blob = new Blob(chunks, { type: 'application/zip' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.className = 'tools-button';
                link.href = url;
                link.download = data.name;
                link.textContent = `${data.name} / ${size(blob.size)}`;
                // Downloads do not expose a completion event to the page.
                // Clear source selections when the user starts a download;
                // keep result URLs available for retries and remaining ZIPs.
                on(link, 'click', () => {
                    files.clear();
                    activeFiles = [];
                    fileInput.value = '';
                    folderInput.value = '';
                    render();
                });
                outputs.push({ url, link });
                downloads.appendChild(link);
            }
            chunks = [];
        } else if (data.type === 'fatal') fail('Обработка прервана. ' + data.error);
        else if (data.type === 'done') {
            const result = data.result;
            chunks = [];
            finish();
            resultPanel.hidden = false;
            if (outputs.length) {
                showOutputs();
                get('result-description').textContent = `Обработано: ${result.succeeded} / файлов в результате: ${result.written}.`
                    + (result.failed ? ` Ошибок: ${result.failed}.` : '')
                    + (result.warnings ? ` Предупреждений: ${result.warnings}. Проверьте восстановленный код.` : '');
                say(result.failed ? result.errors.slice(0, 3).join('\n') : 'Готово.', result.failed > 0);
                (outputs.length > 1 ? downloadAll : outputs[0].link).focus();
            } else {
                get('result-description').textContent = 'Файлы не удалось обработать.';
                say(result.errors.slice(0, 3).join('\n') || 'Нет готовых файлов.', true);
            }
        }
    };
    on(downloadAll, 'click', () => {
        for (const output of outputs) output.link.click();
    });
    on(start, 'click', () => {
        if (busy || enumerating || !selected().length) return;
        clearResult();
        busy = true;
        activeFiles = selected();
        render();
        progress.hidden = false;
        progressBar.removeAttribute('value');
        current.textContent = '';
        say('Подготовка к обработке…');
        try {
            if (!worker) {
                worker = new Worker(config.worker, { type: 'module', name: 'esdoc-renpy-tools' });
                worker.onmessage = handleMessage;
                worker.onerror = () => fail('Не удалось запустить инструменты. Обновите страницу или попробуйте другой браузер.');
                worker.onmessageerror = () => fail('Браузер не смог передать файлы инструменту. Попробуйте добавить меньше файлов.');
            }
            worker.postMessage({ type: 'run', config, mode: mode === 'unrpa' ? 'combined' : mode, files: activeFiles,
                options: { try_harder: get('try-harder').checked, no_init_offset: get('no-init-offset').checked } });
        } catch (error) { fail(error.message); }
    });

    // Capture entries synchronously: browsers invalidate DataTransfer once
    // the drop handler returns. Folder readers are consumed afterwards.
    on(drop, 'drop', event => {
        event.preventDefault();
        dragDepth = 0;
        drop.classList.remove('is-dragging');
        if (busy || enumerating) return;
        const items = [...(event.dataTransfer?.items || [])].filter(item => item.kind === 'file');
        const captured = items.map(item => ({ entry: item.webkitGetAsEntry?.(), file: item.getAsFile() }));
        const fallback = [...(event.dataTransfer?.files || [])];
        importFiles(async add => {
            if (captured.length) {
                for (const item of captured) {
                    if (item.entry) await walkEntry(item.entry, '', add);
                    else if (item.file) add({ file: item.file, path: item.file.name });
                }
            } else for (const file of fallback) add({ file, path: file.webkitRelativePath || file.name });
        });
    });
    on(drop, 'dragenter', event => { event.preventDefault(); if (!busy && !enumerating) { dragDepth++; drop.classList.add('is-dragging'); } });
    on(drop, 'dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; drop.classList.remove('is-dragging'); } });
    on(document, 'dragover', event => {
        if ([...(event.dataTransfer?.types || [])].includes('Files')) {
            event.preventDefault();
            event.dataTransfer.dropEffect = !busy && !enumerating && drop.contains(event.target) ? 'copy' : 'none';
        }
    });
    on(document, 'drop', event => {
        if ([...(event.dataTransfer?.types || [])].includes('Files')) event.preventDefault();
    });
    on(window, 'beforeunload', event => {
        if (busy || enumerating) { event.preventDefault(); event.returnValue = ''; }
    });
    window.__esdocToolsCleanup = () => {
        disposed = true;
        operation++;
        controller.abort();
        resetWorker();
        clearResult();
        files.clear();
        window.__esdocToolsCleanup = null;
    };
    if (!supported) {
        say('Этот браузер не поддерживает локальные инструменты. Используйте актуальный Firefox, Chrome или Edge.', true);
        controls.hidden = false;
        updateControls();
        return;
    }
    controls.hidden = false;
    render();
})();
