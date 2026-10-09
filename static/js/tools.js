(function () {
    window.__esdocToolsCleanup?.();
    const app = document.getElementById('tools-app');
    if (!app) return;
    const { accepts, safePath, walkEntry, size, explainWarning, explainError, countLabel,
        archiveName, packPath, commonFolders } = window.ESDocTools;
    const config = JSON.parse(app.dataset.config);
    const get = id => document.getElementById('tools-' + id);
    const controls = get('controls'), drop = get('drop'), menu = get('add-menu');
    const addButton = get('add'), fileInput = get('files'), folderInput = get('folder');
    const start = get('start'), cancel = get('cancel'), status = get('status');
    const operationActions = get('operation-actions');
    const queue = get('queue'), list = get('file-list'), progress = get('progress');
    const progressBar = get('progress-bar'), current = get('current');
    const resultPanel = get('result'), downloads = get('downloads'), downloadAll = get('download-all');
    const warningsPanel = get('warnings'), warningList = get('warning-list');
    const browseActions = get('browse-actions'), browseArchive = get('archive');
    const browser = get('browser'), browserList = get('browser-list');
    const browserPreview = get('browser-preview'), browserStatus = get('browser-status');
    const browserSearch = get('browser-search'), browserCrumbs = get('browser-crumbs');
    const errorsPanel = get('errors');
    const packName = get('pack-name'), packStrip = get('pack-strip'), packPrefix = get('pack-prefix');
    let mode = new URLSearchParams(window.location.search).get('mode') === 'pack' ? 'pack' : 'unpack';
    let packValid = true, pathPreviewValid = true;
    let validPackPaths = new Map(), queuePage = 0, queueMatches = 0;
    const queuePageSize = 100;
    const queueSearch = browserSearch;
    const queuePrevious = get('queue-previous'), queueNext = get('queue-next');
    const controller = new AbortController();
    const on = (element, event, callback) => element.addEventListener(event, callback, { signal: controller.signal });
    const modeFiles = { pack: new Map(), unpack: new Map() };
    let files = modeFiles[mode];
    const rows = new Map();
    const supported = Boolean(window.Worker && window.WebAssembly);
    let busy = false, enumerating = false, disposed = false, retryAvailable = false;
    let worker = null, chunks = [], activeFiles = [], dragDepth = 0;
    let processedFiles = 0;
    const outputs = [];
    let browseEntries = [], browseFolder = '', browseRequest = 0, previewUrl = null;
    let catalogEntries = [], catalogFiles = [], catalogRequest = 0, selectedEntry = null;
    let task = '', exportReady = false, catalogSubmitted = false, previewFont = null, clearOnDownload = false;
    let operation = 0;
    let previewPending = null, pendingPreviewKey = '';
    const previewCache = new Map();
    const previewCacheLimit = 64 * 1024 * 1024;
    let previewCacheBytes = 0;
    const cachePreview = (key, data) => {
        const bytes = data.buffer.byteLength + (data.html?.length || 0) * 2
            + JSON.stringify(data.warnings || []).length * 2;
        if (bytes > previewCacheLimit) return;
        const previous = previewCache.get(key);
        if (previous) { previewCacheBytes -= previous.bytes; previewCache.delete(key); }
        while (previewCache.size && (previewCacheBytes + bytes > previewCacheLimit || previewCache.size >= 32)) {
            const oldest = previewCache.keys().next().value;
            previewCacheBytes -= previewCache.get(oldest).bytes;
            previewCache.delete(oldest);
        }
        previewCache.set(key, { data, bytes });
        previewCacheBytes += bytes;
    };

    const say = (message, error = false) => {
        status.textContent = message;
        status.classList.toggle('is-error', error);
        errorsPanel.hidden = true;
        errorsPanel.replaceChildren();
    };
    const clearResult = () => {
        previewCache.clear();
        previewCacheBytes = 0;
        pendingPreviewKey = '';
        catalogRequest++;
        browseRequest++;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (previewFont) document.fonts.delete(previewFont);
        previewFont = null;
        previewUrl = null;
        browseEntries = [];
        catalogEntries = [];
        catalogFiles = [];
        catalogSubmitted = false;
        selectedEntry = null;
        exportReady = false;
        clearOnDownload = false;
        if (mode !== 'pack') browseFolder = '';
        browser.hidden = true;
        browseActions.hidden = true;
        warningsPanel.hidden = true;
        warningList.replaceChildren();
        for (const output of outputs) URL.revokeObjectURL(output.url);
        outputs.length = 0;
        chunks = [];
        downloads.replaceChildren();
        downloadAll.hidden = true;
        resultPanel.hidden = true;
        get('result-description').textContent = '';
        browserPreview.replaceChildren();
        browserPreview.setAttribute('aria-busy', 'false');
        browserStatus.textContent = '';
        say('');
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
    const selected = () => [...files.values()];
    const isArchive = entry => /\.rpa$/i.test(entry.path);
    const updateControls = () => {
        const locked = busy || enumerating || !supported;
        start.disabled = locked || !selected().length || (mode === 'pack' && !packValid);
        start.hidden = mode === 'pack' || !retryAvailable || locked || !selected().length;
        addButton.disabled = locked;
        get('clear').disabled = locked || !selected().length;
        for (const field of app.querySelectorAll('.tools-options input')) field.disabled = locked;
        for (const field of [packName, packStrip, packPrefix, get('mode-pack'), get('mode-unpack')]) field.disabled = locked;
        for (const button of list.querySelectorAll('button')) button.disabled = locked;
        queueSearch.disabled = locked;
        queuePrevious.disabled = locked || queuePage === 0;
        queueNext.disabled = locked || (queuePage + 1) * queuePageSize >= queueMatches;
        cancel.hidden = !busy && !enumerating;
        const cancelHost = busy && task === 'preview' && previewPending ? previewPending : operationActions;
        if (cancel.parentNode !== cancelHost) cancelHost.appendChild(cancel);
        downloadAll.disabled = locked || (!selected().length && !outputs.length) || (mode === 'pack' && !packValid);
        browseArchive.disabled = locked;
        browser.setAttribute('aria-busy', String(busy));
        for (const button of browserList.querySelectorAll('button')) button.disabled = locked;
    };
    const render = () => {
        list.replaceChildren();
        rows.clear();
        const allFiles = selected();
        queue.hidden = !allFiles.length;
        list.hidden = mode === 'pack';
        get('count').textContent = `${countLabel(allFiles.length, 'файл', 'файла', 'файлов')} / ${size(allFiles.reduce((total, entry) => total + entry.file.size, 0))}`;
        get('pack-preview-note').hidden = mode !== 'pack' || pathPreviewValid;
        if (mode === 'pack') { updateControls(); return; }
        const visible = allFiles.slice(0, 200);
        const fragment = document.createDocumentFragment();
        // Bound the DOM for folders with thousands of scripts; all queued files
        // are still processed even when their rows are not rendered.
        for (const entry of visible) {
            const row = document.createElement('li');
            const name = document.createElement('div');
            name.className = 'tools-file-name';
            const open = document.createElement(mode === 'pack' ? 'span' : 'button');
            open.type = 'button';
            open.className = 'tools-text-button';
            if (mode === 'pack') {
                open.textContent = validPackPaths.get(entry.path) || 'Путь не рассчитан';
                open.className = 'tools-pack-path';
            } else open.textContent = entry.path;
            open.addEventListener('click', () => {
                if (mode === 'pack') return;
                browseArchive.value = isArchive(entry) ? String(catalogFiles.findIndex(item => item.path === entry.path)) : 'scripts';
                openBrowse();
                if (!isArchive(entry)) {
                    const source = catalogEntries.find(item => item.path === entry.path && catalogFiles[item.source]?.path === entry.path);
                    if (source) readBrowse(source);
                }
            });
            name.appendChild(open);
            const state = document.createElement('span');
            state.className = 'tools-file-state';
            state.textContent = mode === 'pack' && !validPackPaths.has(entry.path) ? 'Исходный файл: ' + entry.path
                : mode === 'pack' && open.textContent !== entry.path ? 'Из ' + entry.path : 'Добавлен';
            name.appendChild(state);
            const bytes = document.createElement('span');
            bytes.className = 'tools-file-size';
            bytes.textContent = size(entry.file.size);
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'tools-remove';
            remove.setAttribute('aria-label', 'Убрать ' + entry.path);
            remove.innerHTML = window.ESDocIcons.svg('x', 16);
            remove.addEventListener('click', () => {
                const focused = document.activeElement === remove;
                const index = visible.indexOf(entry);
                files.delete(entry.path);
                validPackPaths.delete(entry.path);
                clearResult();
                retryAvailable = false;
                if (mode === 'pack') refreshPackFolders();
                render();
                loadCatalog();
                if (focused) {
                    const buttons = list.querySelectorAll('.tools-remove');
                    (buttons[Math.min(index, buttons.length - 1)] || addButton).focus();
                }
            });
            row.append(name, bytes, remove);
            rows.set(open.textContent, state);
            fragment.appendChild(row);
        }
        if (mode !== 'pack' && allFiles.length > 200) {
            const remainder = document.createElement('li');
            remainder.textContent = `И ещё ${countLabel(allFiles.length - 200, 'файл', 'файла', 'файлов')}. Будут обработаны все.`;
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
        try {
            await collect(entry => {
                if (disposed || id !== operation) throw new Error('Добавление отменено.');
                entry.path = safePath(entry.path);
                if (mode !== 'pack' && !accepts(entry.path, 'combined')) { skipped++; return; }
                if (files.has(entry.path)) { duplicates++; return; }
                files.set(entry.path, entry);
                added++;
            });
            if (id === operation) say(`Добавлено файлов: ${added}.`
                + (skipped ? ` Другие форматы пропущены: ${skipped}.` : '')
                + (duplicates ? ` Повторные пути пропущены: ${duplicates}.` : '')
                + (!files.size ? (mode === 'pack' ? ' Выберите ресурсы для архива.' : ' Выберите .rpyc, .rpymc, .pyc или .rpa.') : ''));
        } catch (error) {
            if (id === operation) showErrors([error.message]);
        } finally {
            if (!disposed && id === operation) {
                enumerating = false;
                if (mode === 'pack') refreshPackFolders();
                render();
                if (added) loadCatalog();
            }
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
    on(get('clear'), 'click', () => {
        for (const entry of selected()) files.delete(entry.path);
        clearResult();
        resetWorker();
        retryAvailable = false;
        progress.hidden = true;
        if (mode === 'pack') {
            validPackPaths.clear();
            queueSearch.value = '';
            queuePage = 0;
            refreshPackFolders();
        }
        say('Добавленные файлы удалены.');
        render();
        addButton.focus();
    });

    const resetWorker = () => {
        if (worker) {
            worker.onmessage = worker.onerror = worker.onmessageerror = null;
            worker.terminate();
        }
        worker = null;
        catalogSubmitted = false;
    };
    const finish = () => {
        busy = false;
        progress.hidden = true;
        updateControls();
        previewPending = null;
        pendingPreviewKey = '';
    };
    const showOutputs = () => {
        resultPanel.hidden = false;
        start.classList.remove('tools-button-primary');
        downloadAll.hidden = false;
        downloadAll.innerHTML = '<span class="tools-ui-icon tools-icon-download" aria-hidden="true"></span><span>'
            + (exportReady ? 'Скачать ещё раз' : mode === 'pack' ? 'Создать и скачать RPA' : 'Скачать всё в ZIP') + '</span>';
        if (outputs.length === 1 && mode !== 'pack') outputs[0].link.classList.add('tools-button-primary');
    };
    const options = () => ({ try_harder: get('try-harder').checked, no_init_offset: get('no-init-offset').checked });
    const validatePack = () => {
        let errorMessage = '';
        let nameError = '', prefixError = '', pathError = '';
        packName.removeAttribute('aria-invalid');
        packPrefix.removeAttribute('aria-invalid');
        try {
            const filename = archiveName(packName.value);
            get('pack-filename').textContent = filename;
            get('pack-install-archive').textContent = 'game/my_mod/' + filename;
            get('pack-install-string').textContent = JSON.stringify('my_mod/' + filename.slice(0, -4));
            get('pack-install-example').hidden = false;
        } catch (error) {
            nameError = error.message;
            get('pack-filename').textContent = 'Укажите имя архива';
            get('pack-install-example').hidden = true;
            packName.setAttribute('aria-invalid', 'true');
        }
        let prefixValid = false;
        try {
            packPath('resource', '', packPrefix.value);
            prefixValid = true;
            const paths = new Set();
            const mapped = new Map();
            for (const entry of selected()) {
                const path = packPath(entry.path, packStrip.value, packPrefix.value);
                const canonical = path.normalize('NFC').toLowerCase();
                if (paths.has(canonical)) throw new Error(`Повторный путь в архиве: ${path}. Уберите один из файлов.`);
                paths.add(canonical);
                mapped.set(entry.path, path);
            }
            validPackPaths = mapped;
            pathPreviewValid = true;
        } catch (error) {
            pathPreviewValid = false;
            if (!prefixValid) {
                packPrefix.setAttribute('aria-invalid', 'true');
                prefixError = error.message;
            } else pathError = error.message;
        }
        for (const [id, message] of [['pack-name-error', nameError], ['pack-prefix-error', prefixError]]) {
            get(id).textContent = message;
            get(id).hidden = !message;
        }
        errorMessage = nameError || prefixError || pathError;
        packValid = !errorMessage;
        get('pack-error').textContent = pathError || (errorMessage ? 'Исправьте отмеченные поля, чтобы создать архив.' : '');
        get('pack-error').hidden = packValid;
        const example = selected()[0];
        get('pack-example-title').textContent = example ? 'Как изменится путь файла' : 'Пример';
        get('pack-example-settings').hidden = Boolean(example);
        get('pack-example-source').textContent = example ? example.path : 'images/bg.png';
        get('pack-example-target').textContent = example
            ? pathPreviewValid ? validPackPaths.get(example.path) : 'Исправьте настройки пути'
            : 'my_mod/images/bg.png';
        return packValid;
    };
    const refreshPackFolders = () => {
        const previous = packStrip.value;
        const initial = packStrip.children.length <= 1;
        const folders = commonFolders(selected().map(entry => entry.path));
        packStrip.replaceChildren();
        for (const prefix of ['', ...folders]) {
            const option = document.createElement('option');
            option.value = prefix;
            option.textContent = prefix || 'Ничего не удалять';
            packStrip.appendChild(option);
        }
        packStrip.value = initial && folders.includes('game/') ? 'game/'
            : folders.includes(previous) ? previous : '';
        validatePack();
    };
    const applyMode = () => {
        app.dataset.mode = mode;
        get('pack-clear-label').hidden = mode !== 'pack';
        get('pack-notice').hidden = mode !== 'pack';
        get('queue-tools').hidden = mode !== 'pack';
        get('pack-integration').hidden = mode !== 'pack';
        get('mode-pack').checked = mode === 'pack';
        get('mode-unpack').checked = mode !== 'pack';
        get('pack-settings').hidden = mode !== 'pack';
        get('options').hidden = mode === 'pack';
        get('pack-help').hidden = mode !== 'pack';
        get('unpack-help').hidden = mode === 'pack';
        get('queue-heading').textContent = mode === 'pack' ? 'Файлы в архиве' : 'Добавленные файлы';
        list.setAttribute('aria-label', mode === 'pack' ? 'Пути внутри архива' : 'Добавленные файлы');
        get('drop-help').textContent = mode === 'pack' ? 'Изображения, музыка, шрифты и другие файлы' : '.rpa, .rpyc, .rpymc, .pyc';
        fileInput.accept = mode === 'pack' ? '' : '.rpa,.rpyc,.rpymc,.pyc';
        if (mode === 'pack') validatePack();
    };
    on(queuePrevious, 'click', () => { queuePage--; renderBrowse(); });
    on(queueNext, 'click', () => { queuePage++; renderBrowse(); });
    for (const field of [packName, packPrefix, packStrip]) on(field, field === packStrip ? 'change' : 'input', () => {
        clearResult();
        validatePack();
        render();
        if (selected().length) loadCatalog();
    });
    for (const value of ['pack', 'unpack']) on(get('mode-' + value), 'change', () => {
        if (busy || enumerating || mode === value) return;
        mode = value;
        browseFolder = '';
        browserSearch.value = '';
        queuePage = 0;
        files = modeFiles[mode];
        resetWorker();
        clearResult();
        activeFiles = [];
        retryAvailable = false;
        fileInput.value = folderInput.value = '';
        applyMode();
        render();
        if (files.size) loadCatalog();
        else say(mode === 'pack' ? 'Добавьте файлы для нового RPA-архива.' : 'Добавьте архивы или скомпилированные скрипты.');
    });
    const readBrowse = entry => {
        if (busy) return;
        retryAvailable = false;
        say('');
        selectedEntry = entry;
        const previewOptions = options();
        const cacheKey = JSON.stringify([entry.id, previewOptions]);
        for (const button of browserList.querySelectorAll('[data-entry-id]')) {
            if (button.getAttribute('data-entry-id') === entry.id) button.setAttribute('aria-current', 'true');
            else button.removeAttribute('aria-current');
        }
        if (mode === 'pack' && (!/\.(rpy|rpym|txt|md|json|yaml|yml|xml|html|css|js|py|csv|ini|log|sh|bat)$/i.test(entry.path)
            || entry.size > 2 * 1024 * 1024)) {
            showPreview({ name: entry.path, file: catalogFiles[entry.source].file, buffer: new ArrayBuffer(0), warnings: [] });
            updateControls();
            return;
        }
        const cached = previewCache.get(cacheKey);
        if (cached) {
            // Touch the entry so the least recently used preview is evicted first.
            previewCache.delete(cacheKey);
            previewCache.set(cacheKey, cached);
            showPreview(cached.data);
            updateControls();
            return;
        }
        pendingPreviewKey = cacheKey;
        busy = true;
        task = 'preview';
        browserPreview.setAttribute('aria-busy', 'true');
        browserPreview.replaceChildren();
        previewPending = document.createElement('div');
        previewPending.className = 'tools-preview-pending';
        const pending = document.createElement('p');
        pending.textContent = /\.(rpyc|rpymc|pyc)$/i.test(entry.path) ? 'Декомпилируем файл…' : 'Открываем файл…';
        previewPending.appendChild(pending);
        browserPreview.appendChild(previewPending);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (previewFont) document.fonts.delete(previewFont);
        previewFont = null;
        previewUrl = null;
        browserStatus.textContent = '';
        updateControls();
        try {
            ensureWorker();
            if (mode === 'pack') {
                worker.postMessage({ type: 'pack-preview', name: entry.path, file: catalogFiles[entry.source].file,
                    config, requestId: ++browseRequest });
            } else {
                if (!catalogSubmitted) submitCatalog();
                worker.postMessage({ type: 'source-read', id: entry.id, options: previewOptions, requestId: ++browseRequest });
            }
        } catch (error) { fail(error.message); }
    };
    const renderBrowse = () => {
        browserList.replaceChildren();
        browserCrumbs.replaceChildren();
        const crumb = (label, folder) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = label;
            button.disabled = folder === browseFolder && !browserSearch.value;
            button.addEventListener('click', () => {
                browseFolder = folder;
                queuePage = 0;
                browserSearch.value = '';
                renderBrowse();
            });
            browserCrumbs.appendChild(button);
        };
        crumb('Все файлы', '');
        let path = '';
        for (const part of browseFolder.split('/').filter(Boolean)) {
            path += part + '/';
            crumb(part, path);
        }
        const query = browserSearch.value.trim().toLocaleLowerCase();
        const folders = new Set();
        const entries = [];
        for (const entry of browseEntries) {
            if (query) {
                if (entry.path.toLocaleLowerCase().includes(query)
                    || mode === 'pack' && entry.originalPath.toLocaleLowerCase().includes(query)) entries.push(entry);
            } else if (entry.path.startsWith(browseFolder)) {
                const rest = entry.path.slice(browseFolder.length);
                const slash = rest.indexOf('/');
                if (slash >= 0) folders.add(rest.slice(0, slash));
                else entries.push(entry);
            }
        }
        const row = (label, detail, action, kind, active = false, entryId = null) => {
            const item = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            const icon = document.createElement('i');
            icon.className = 'tools-ui-icon tools-icon-' + kind;
            icon.setAttribute('aria-hidden', 'true');
            const name = document.createElement('span');
            name.textContent = label;
            button.append(icon, name);
            if (active) button.setAttribute('aria-current', 'true');
            if (entryId) button.setAttribute('data-entry-id', entryId);
            button.disabled = busy;
            button.addEventListener('click', action);
            const meta = document.createElement('span');
            meta.textContent = detail;
            item.append(button, meta);
            browserList.appendChild(item);
        };
        const folderNames = [...folders].sort((a, b) => a.localeCompare(b, 'ru'));
        if (mode === 'pack') entries.sort((a, b) => a.path.localeCompare(b.path, 'ru'));
        queueMatches = folderNames.length + entries.length;
        const pageSize = mode === 'pack' ? queuePageSize : 500;
        queuePage = Math.min(queuePage, Math.max(0, Math.ceil(queueMatches / pageSize) - 1));
        const offset = mode === 'pack' ? queuePage * pageSize : 0;
        const visibleFolders = mode === 'pack' ? folderNames.slice(offset, offset + pageSize) : folderNames;
        const visibleEntries = entries.slice(mode === 'pack' ? Math.max(0, offset - folderNames.length) : 0,
            mode === 'pack' ? Math.max(0, offset + pageSize - folderNames.length) : 500);
        const addRemove = (originalPaths, label, title) => {
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'tools-icon-button tools-remove-source';
            remove.title = title;
            remove.setAttribute('aria-label', label);
            remove.innerHTML = '<span class="tools-ui-icon tools-icon-close" aria-hidden="true"></span>';
            remove.disabled = busy;
            remove.addEventListener('click', () => {
                if (busy || enumerating) return;
                const focused = document.activeElement === remove;
                const index = Array.from(browserList.querySelectorAll('.tools-remove-source')).indexOf(remove);
                for (const originalPath of originalPaths) {
                    files.delete(originalPath);
                    if (mode === 'pack') validPackPaths.delete(originalPath);
                }
                clearResult();
                if (mode === 'pack') refreshPackFolders();
                render();
                loadCatalog();
                if (focused && mode === 'pack') {
                    const buttons = files.size ? browserList.querySelectorAll('.tools-remove-source') : [];
                    (buttons[Math.min(index, buttons.length - 1)] || addButton).focus();
                }
            });
            browserList.lastElementChild.appendChild(remove);
        };
        for (const folder of visibleFolders) {
            row(folder + '/', 'папка', () => { browseFolder += folder + '/'; queuePage = 0; renderBrowse(); }, 'folder');
            if (mode === 'pack') {
                const folderPath = browseFolder + folder + '/';
                const originalPaths = browseEntries.filter(entry => entry.path.startsWith(folderPath)).map(entry => entry.originalPath);
                addRemove(originalPaths, 'Убрать папку ' + folderPath + ' и все вложенные файлы', 'Убрать папку и все вложенные файлы');
            }
        }
        for (const entry of visibleEntries) {
            const kind = /\.(rpyc|rpymc|pyc|rpy|rpym|py|js|json|css|txt)$/i.test(entry.path) ? 'code'
                : /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(entry.path) ? 'image'
                : /\.(ogg|mp3|wav|opus|flac|mp4|webm)$/i.test(entry.path) ? 'media' : 'file';
            row(query ? entry.path : entry.path.slice(browseFolder.length), size(entry.size), () => readBrowse(entry), kind,
                selectedEntry?.id === entry.id, entry.id);
            if (mode === 'pack' || catalogFiles[entry.source]?.path === entry.path && !isArchive(catalogFiles[entry.source]) && files.has(entry.path)) {
                addRemove([mode === 'pack' ? entry.originalPath : entry.path], 'Убрать ' + entry.path, 'Убрать файл');
            }
        }
        if (!folders.size && !entries.length) {
            const empty = document.createElement('li');
            empty.className = 'tools-list-empty';
            empty.textContent = query ? 'Файлы не найдены' : 'В этой папке нет файлов';
            browserList.appendChild(empty);
        }
        browserStatus.textContent = countLabel(folders.size + entries.length, 'элемент', 'элемента', 'элементов')
            + (mode !== 'pack' && entries.length > 500 ? ' (показаны первые 500; уточните поиск)' : '');
        if (mode === 'pack') {
            get('queue-pages').hidden = queueMatches <= pageSize;
            get('queue-range').textContent = queueMatches ? `${offset + 1}–${Math.min(offset + pageSize, queueMatches)} из ${queueMatches}` : '';
            updateControls();
        }
    };
    const renderWarnings = (panel, summary, list, count, messages) => {
        panel.hidden = !count;
        panel.open = false;
        summary.replaceChildren();
        list.replaceChildren();
        if (!count) return;
        const icon = document.createElement('span');
        icon.className = 'tools-ui-icon tools-icon-warning';
        icon.setAttribute('aria-hidden', 'true');
        const total = document.createElement('span');
        total.className = 'tools-warning-count';
        total.textContent = count.toLocaleString('ru-RU');
        const chevron = document.createElement('span');
        chevron.className = 'tools-ui-icon tools-icon-chevron';
        chevron.setAttribute('aria-hidden', 'true');
        summary.append(icon, total, chevron);
        summary.setAttribute('aria-label', `Предупреждения: ${count}`);
        summary.title = 'Показать предупреждения';
        panel.ontoggle = () => { summary.title = panel.open ? 'Скрыть предупреждения' : 'Показать предупреждения'; };
        for (const message of messages) {
            const warning = explainWarning(message);
            const item = document.createElement('li');
            item.className = 'tools-diagnostic';
            if (warning.path) {
                const path = document.createElement('span');
                path.className = 'tools-diagnostic-path';
                path.textContent = warning.path;
                item.appendChild(path);
            }
            const title = document.createElement('strong');
            title.textContent = warning.title;
            const explanation = document.createElement('p');
            explanation.className = 'tools-diagnostic-explanation';
            explanation.textContent = warning.explanation;
            const original = document.createElement('details');
            original.className = 'tools-warning-details';
            const originalSummary = document.createElement('summary');
            originalSummary.textContent = 'Техническое сообщение';
            const text = document.createElement('p');
            text.className = 'tools-warning-original';
            text.textContent = warning.technical;
            text.tabIndex = 0;
            text.setAttribute('aria-label', 'Техническое сообщение');
            original.append(originalSummary, text);
            item.append(title, explanation, original);
            list.appendChild(item);
        }
        if (count > messages.length) {
            const item = document.createElement('li');
            item.className = 'tools-warnings-more';
            item.textContent = messages.length ? `Показано: ${messages.length} из ${count}.`
                : 'Подробности предупреждений недоступны.';
            list.appendChild(item);
        }
    };
    const showPreview = data => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (previewFont) document.fonts.delete(previewFont);
        previewFont = null;
        const path = data.name;
        const extension = path.split('.').pop().toLowerCase();
        const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
            svg: 'image/svg+xml', ogg: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav', opus: 'audio/ogg', flac: 'audio/flac',
            mp4: 'video/mp4', webm: 'video/webm', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' }[extension] || 'application/octet-stream';
        previewUrl = URL.createObjectURL(data.file || new Blob([data.buffer], { type: mime }));
        browserPreview.replaceChildren();
        const title = document.createElement('h4');
        title.textContent = path;
        const heading = document.createElement('div');
        heading.className = 'tools-warning-host tools-preview-heading';
        heading.appendChild(title);
        if (data.warnings?.length) {
            const warning = document.createElement('details');
            warning.className = 'tools-warnings';
            const summary = document.createElement('summary');
            const list = document.createElement('ul');
            list.tabIndex = 0;
            list.setAttribute('aria-label', 'Причины предупреждений файла');
            warning.append(summary, list);
            renderWarnings(warning, summary, list, data.warnings.length, data.warnings);
            heading.appendChild(warning);
        }
        browserPreview.appendChild(heading);
        if (mime.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = previewUrl;
            img.alt = path;
            browserPreview.appendChild(img);
        } else if (mime.startsWith('audio/') || mime.startsWith('video/')) {
            const media = document.createElement(mime.startsWith('audio/') ? 'audio' : 'video');
            media.controls = true;
            media.preload = 'metadata';
            media.src = previewUrl;
            browserPreview.appendChild(media);
        } else if (mime.startsWith('font/') && window.FontFace) {
            const specimen = document.createElement('div');
            specimen.className = 'tools-font-specimen';
            for (const sample of ['Съешь ещё этих мягких французских булок, да выпей чаю.',
                'The quick brown fox jumps over the lazy dog.',
                'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
                'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789']) {
                const line = document.createElement('p');
                line.textContent = sample;
                specimen.appendChild(line);
            }
            browserPreview.appendChild(specimen);
            const font = new FontFace('tools-specimen', `url(${previewUrl})`);
            previewFont = font;
            font.load().then(loaded => {
                if (previewFont === font && !disposed) {
                    document.fonts.add(loaded);
                    specimen.style.fontFamily = 'tools-specimen';
                }
            }).catch(() => { if (previewFont === font) browserStatus.textContent = 'Не удалось открыть шрифт.'; });
        } else if (/\.(rpy|rpym|txt|md|json|yaml|yml|xml|html|css|js|py|csv|ini|log|sh|bat)$/i.test(path) && (data.file?.size || data.buffer.byteLength) > 2 * 1024 * 1024) {
            const note = document.createElement('p');
            note.textContent = 'Файл слишком большой для предпросмотра. Его можно скачать целиком.';
            browserPreview.appendChild(note);
        } else if (/\.(rpy|rpym|txt|md|json|yaml|yml|xml|html|css|js|py|csv|ini|log|sh|bat)$/i.test(path)) {
            const text = new TextDecoder().decode(data.buffer);
            const copy = document.createElement('button');
            copy.type = 'button';
            copy.className = 'code-copy';
            copy.title = 'Скопировать код';
            copy.setAttribute('aria-label', 'Скопировать код');
            // Same copy/check icons and shared CSS as fenced code blocks.
            copy.innerHTML = window.ESDocIcons.svg('copy', 14) + window.ESDocIcons.svg('check', 14);
            const frame = document.createElement('div');
            frame.className = 'code-block code-block--numbered tools-code-frame';
            const pre = document.createElement('pre');
            pre.tabIndex = 0;
            pre.setAttribute('aria-label', 'Код файла');
            const gutter = document.createElement('span');
            gutter.className = 'code-gutter';
            gutter.setAttribute('aria-hidden', 'true');
            const lines = text.replace(/\n$/, '').split('\n');
            gutter.textContent = lines.map((_, i) => String(i + 1)).join('\n');
            const scroll = document.createElement('span');
            scroll.className = 'code-scroll';
            // Focus the bounded viewport, not its very tall code column:
            // focusing that column can scroll the panel halfway through a file.
            pre.addEventListener('keydown', event => {
                if (event.target !== pre || event.altKey || event.ctrlKey || event.metaKey) return;
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                scroll.scrollLeft += event.key === 'ArrowRight' ? 40 : -40;
            });
            const code = document.createElement('code');
            // Only HTML escaped by our local Pygments formatter is inserted.
            if (data.html) code.innerHTML = data.html;
            else code.textContent = text;
            scroll.appendChild(code);
            pre.append(gutter, scroll);
            frame.appendChild(pre);
            if (window.copyControl && window.navigator?.clipboard) {
                copy.addEventListener('click', window.copyControl(copy, () => text, { message: 'Код скопирован.', status: browserStatus }));
                frame.appendChild(copy);
            }
            browserPreview.appendChild(frame);
        } else {
            const note = document.createElement('p');
            note.textContent = 'Предпросмотр для этого формата недоступен.';
            browserPreview.appendChild(note);
        }
        const link = document.createElement('a');
        link.className = 'tools-button';
        link.href = previewUrl;
        link.download = path.split('/').pop();
        link.innerHTML = '<span class="tools-ui-icon tools-icon-download" aria-hidden="true"></span><span>Скачать файл</span>';
        browserPreview.appendChild(link);
        browserPreview.setAttribute('aria-busy', 'false');
        browserStatus.textContent = '';
    };
    const openBrowse = () => {
        selectedEntry = null;
        browseRequest++;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (previewFont) document.fonts.delete(previewFont);
        previewFont = null;
        previewUrl = null;
        const source = Number(browseArchive.value) || 0;
        const scripts = browseArchive.value === 'scripts';
        browseEntries = mode === 'pack' ? catalogEntries : catalogEntries.filter(entry => scripts
            ? catalogFiles[entry.source] && !isArchive(catalogFiles[entry.source]) : entry.source === source);
        if (mode !== 'pack') {
            browseFolder = '';
            browserSearch.value = '';
        } else if (!browseEntries.some(entry => entry.path.startsWith(browseFolder))) browseFolder = '';
        browserList.replaceChildren();
        browserPreview.replaceChildren();
        const empty = document.createElement('p');
        empty.className = 'tools-preview-empty';
        empty.textContent = 'Файл не выбран';
        browserPreview.appendChild(empty);
        browser.hidden = false;
        get('browser-title').textContent = mode === 'pack' ? 'Пути внутри архива' : scripts ? 'Сценарии' : catalogFiles[source]?.path || 'Файлы';
        renderBrowse();
    };
    on(browseArchive, 'change', openBrowse);
    on(browserSearch, 'input', () => { queuePage = 0; renderBrowse(); });
    const errorDiagnostic = error => {
        const block = document.createElement('div');
        block.className = 'tools-diagnostic';
        if (error.path) {
            const path = document.createElement('h4');
            path.className = 'tools-diagnostic-path';
            path.textContent = error.path;
            block.appendChild(path);
        }
        const title = document.createElement('strong');
        title.textContent = error.title;
        const explanation = document.createElement('p');
        explanation.textContent = error.explanation;
        const details = document.createElement('details');
        details.className = 'tools-warning-details';
        details.open = false;
        const summary = document.createElement('summary');
        summary.textContent = 'Техническое сообщение';
        const technical = document.createElement('p');
        technical.className = 'tools-warning-original';
        technical.textContent = error.technical;
        technical.tabIndex = 0;
        technical.setAttribute('aria-label', 'Техническое сообщение');
        details.append(summary, technical);
        block.append(title, explanation, details);
        return block;
    };
    const showErrors = messages => {
        const errors = messages.slice(0, 100).map(message => explainError(message));
        say(messages.length === 1 ? errors[0].title + (errors[0].path ? `: ${errors[0].path}` : '') + '.'
            : `Не удалось обработать файлов: ${messages.length.toLocaleString('ru-RU')}. Причины указаны ниже.`, true);
        errorsPanel.hidden = false;
        for (const error of errors) errorsPanel.appendChild(errorDiagnostic(error));
        if (messages.length > 100) {
            const remainder = document.createElement('p');
            remainder.textContent = `Показаны причины первых 100 ошибок из ${messages.length.toLocaleString('ru-RU')}. Обрабатывайте файлы меньшими наборами, чтобы увидеть остальные.`;
            errorsPanel.appendChild(remainder);
        }
    };
    const endPreview = message => {
        browserPreview.setAttribute('aria-busy', 'false');
        browserStatus.textContent = '';
        browserPreview.replaceChildren();
        const note = document.createElement('p');
        note.className = 'tools-preview-empty';
        note.textContent = message;
        browserPreview.appendChild(note);
    };
    const showPreviewError = message => {
        const error = explainError(message, selectedEntry?.path);
        endPreview('');
        const diagnostic = errorDiagnostic(error);
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'tools-button';
        retry.textContent = 'Повторить просмотр';
        on(retry, 'click', () => { if (selectedEntry) readBrowse(selectedEntry); });
        diagnostic.appendChild(retry);
        browserPreview.replaceChildren();
        browserPreview.appendChild(diagnostic);
        say(error.title + (error.path ? `: ${error.path}` : '') + '.', true);
    };
    const fail = message => {
        const interrupted = task;
        task = '';
        catalogRequest++;
        browseRequest++;
        chunks = [];
        resetWorker();
        retryAvailable = true;
        finish();
        if (outputs.length) {
            showOutputs();
            get('result-description').textContent = `Готовых архивов: ${outputs.length}.`;
        }
        if (interrupted === 'preview' || interrupted === 'catalog') endPreview('Просмотр прерван. Повторите действие или выберите другой файл.');
        browserStatus.textContent = '';
        showErrors([message]);
    };
    on(cancel, 'click', () => {
        const interrupted = task;
        task = '';
        operation++;
        enumerating = false;
        resetWorker();
        catalogRequest++;
        browseRequest++;
        chunks = [];
        retryAvailable = true;
        finish();
        render();
        if (interrupted === 'preview' || interrupted === 'catalog') endPreview('Просмотр отменён. Выберите файл, чтобы открыть его ещё раз.');
        browserStatus.textContent = '';
        say('Обработка отменена. Добавленные файлы сохранены.');
    });
    const handleMessage = ({ data }) => {
        if (disposed) return;
        if (data.type === 'catalog' && data.requestId === catalogRequest) {
            catalogEntries = data.entries;
            if (task !== 'catalog') return;
            task = '';
            finish();
            openBrowse();
            if (data.errors.length) showErrors(data.errors);
            else say('');
            return;
        }
        if (data.type === 'source-file' && data.requestId === browseRequest) {
            cachePreview(pendingPreviewKey, data);
            task = '';
            finish();
            showPreview(data);
            say('');
            return;
        }
        if (data.type === 'source-error' && (data.operation === 'catalog' ? data.requestId === catalogRequest
            : data.operation === 'source-read' ? data.requestId === browseRequest
                : data.requestId === browseRequest || data.requestId === catalogRequest)) {
            const wasCatalog = data.operation === 'catalog' || task === 'catalog';
            if (wasCatalog) catalogSubmitted = false;
            retryAvailable = wasCatalog;
            task = '';
            finish();
            if (wasCatalog) {
                // A queued read depends on this catalog. Do not let it complete
                // against a failed or previous mount after we unlock controls.
                browseRequest++;
                resetWorker();
                endPreview('Список файлов не прочитан. Повторите чтение списка или добавьте другой файл.');
                showErrors([data.error]);
            } else showPreviewError(data.error);
            return;
        }
        if (!busy) return;
        if (data.type === 'loading') say(data.text);
        else if (data.type === 'ready') { say('Инструменты готовы. Обработка файлов…'); processedFiles = 0; progressBar.max = activeFiles.length; progressBar.value = 0; }
        else if (data.type === 'chunk') chunks.push(new Blob([data.buffer]));
        else if (data.type === 'pack-progress') {
            current.textContent = `${data.path} / ${size(data.current)} из ${size(data.total)}`;
            progressBar.max = data.total || 1;
            progressBar.value = data.current;
        }
        else if (data.type === 'entry') {
            current.textContent = `${data.path} / ${data.current} из ${data.total}`;
            progressBar.value = processedFiles + data.current / data.total;
        } else if (data.type === 'file') {
            const state = rows.get(data.path);
            if (state) {
                state.textContent = data.state === 'error' ? explainError(data.error).title
                    : { working: 'Обработка…', done: 'Готово' }[data.state];
                state.classList.toggle('is-error', data.state === 'error');
            }
            current.textContent = data.path;
            if (data.state !== 'working' && mode !== 'pack') progressBar.value = ++processedFiles;
        } else if (data.type === 'output-start') chunks = [];
        else if (data.type === 'output') {
            if (data.result.written) {
                const blob = new Blob(chunks, { type: data.mime || 'application/zip' });
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
                    if (!clearOnDownload) return;
                    for (const entry of activeFiles) files.delete(entry.path);
                    activeFiles = [];
                    fileInput.value = '';
                    folderInput.value = '';
                    render();
                });
                outputs.push({ url, link, blob, name: data.name });
                downloads.appendChild(link);
            }
            chunks = [];
        } else if (data.type === 'fatal') fail(data.error);
        else if (data.type === 'done') {
            const result = data.result;
            chunks = [];
            retryAvailable = false;
            clearOnDownload = result.failed === 0 && mode !== 'pack';
            exportReady = result.failed === 0;
            finish();
            if (mode === 'pack') render();
            resultPanel.hidden = false;
            if (outputs.length) {
                showOutputs();
                get('result-description').textContent = (mode === 'pack' ? `Файлов в RPA: ${result.written}.` : `Обработано: ${result.succeeded}.`)
                    + (result.written !== result.succeeded ? ` Файлов в результате: ${result.written}.` : '')
                    + (result.failed ? ` Ошибок: ${result.failed}.` : '');
                renderWarnings(warningsPanel, get('warnings-summary'), warningList,
                    result.warnings, result.warning_details || []);
                if (result.failed) showErrors(result.errors.length ? result.errors : ['Нет готовых файлов.']);
                else say('Готово.');
                for (const output of outputs) output.link.click();
            } else {
                get('result-description').textContent = 'Файлы не удалось обработать.';
                showErrors(result.errors.length ? result.errors : ['Нет готовых файлов.']);
            }
        }
    };
    on(downloadAll, 'click', () => {
        if (exportReady) for (const output of outputs) output.link.click();
        else processFiles();
    });
    const ensureWorker = () => {
        if (worker) return;
        worker = new Worker(config.worker, { type: 'module', name: 'esdoc-renpy-tools' });
        worker.onmessage = handleMessage;
        worker.onerror = () => fail('Не удалось запустить инструменты. Обновите страницу или попробуйте другой браузер.');
        worker.onmessageerror = () => fail('Браузер не смог передать файлы инструменту. Попробуйте добавить меньше файлов.');
    };
    const submitCatalog = () => {
        worker.postMessage({ type: 'catalog', files: catalogFiles, config, options: options(), requestId: ++catalogRequest });
        catalogSubmitted = true;
    };
    const loadCatalog = () => {
        if (!supported || busy || enumerating || !selected().length) return;
        if (mode === 'pack') {
            refreshPackFolders();
            validatePack();
            resultPanel.hidden = false;
            downloadAll.hidden = false;
            catalogFiles = selected();
            catalogEntries = catalogFiles.map((entry, source) => ({ id: entry.path,
                originalPath: entry.path, path: validPackPaths.get(entry.path) || entry.path,
                size: entry.file.size, source }));
            openBrowse();
            showOutputs();
            updateControls();
            return;
        }
        catalogFiles = selected();
        retryAvailable = false;
        const archives = catalogFiles.map((entry, source) => ({ entry, source })).filter(({ entry }) => isArchive(entry));
        const scripts = catalogFiles.map((entry, source) => ({
            id: `${source}:${entry.path}`, path: entry.path, size: entry.file.size, source,
        })).filter(entry => !isArchive(catalogFiles[entry.source]));
        catalogEntries = scripts;
        browseArchive.replaceChildren();
        if (scripts.length) {
            const option = document.createElement('option');
            option.value = 'scripts';
            option.textContent = 'Сценарии';
            browseArchive.appendChild(option);
        }
        for (const { source, entry } of archives) {
            const option = document.createElement('option');
            option.value = String(source);
            option.textContent = entry.path;
            browseArchive.appendChild(option);
        }
        browseArchive.value = scripts.length ? 'scripts' : String(archives[0]?.source || 0);
        browseActions.hidden = archives.length + (scripts.length ? 1 : 0) < 2;
        get('archive-label').hidden = browseActions.hidden;
        resultPanel.hidden = false;
        downloadAll.hidden = false;
        downloadAll.innerHTML = '<span class="tools-ui-icon tools-icon-download" aria-hidden="true"></span><span>Скачать всё в ZIP</span>';
        openBrowse();
        if (!archives.length) {
            updateControls();
            return;
        }
        busy = true;
        task = 'catalog';
        retryAvailable = false;
        updateControls();
        browserStatus.textContent = 'Читаем оглавление архивов…';
        try {
            ensureWorker();
            submitCatalog();
        } catch (error) { fail(error.message); }
    };
    const processFiles = () => {
        if (!supported || busy || enumerating || !selected().length) return;
        if (mode === 'pack' && !validatePack()) return;
        for (const output of outputs) URL.revokeObjectURL(output.url);
        outputs.length = 0;
        downloads.replaceChildren();
        warningsPanel.hidden = true;
        chunks = [];
        exportReady = false;
        clearOnDownload = false;
        retryAvailable = false;
        busy = true;
        task = 'export';
        activeFiles = selected();
        render();
        progress.hidden = false;
        progressBar.removeAttribute('value');
        current.textContent = '';
        say('Подготовка к обработке…');
        try {
            ensureWorker();
            if (mode === 'pack') worker.postMessage({ type: 'pack', config, name: archiveName(packName.value),
                files: activeFiles.map(entry => ({ file: entry.file, path: packPath(entry.path, packStrip.value, packPrefix.value) })) });
            else worker.postMessage({ type: 'run', config, mode: 'combined', files: activeFiles, options: options() });
        } catch (error) { fail(error.message); }
    };
    on(start, 'click', loadCatalog);
    for (const option of app.querySelectorAll('.tools-options input')) on(option, 'change', () => {
        for (const output of outputs) URL.revokeObjectURL(output.url);
        outputs.length = 0;
        downloads.replaceChildren();
        exportReady = false;
        downloadAll.hidden = !selected().length;
        updateControls();
        if (selected().length) downloadAll.innerHTML = '<span class="tools-ui-icon tools-icon-download" aria-hidden="true"></span><span>Скачать всё в ZIP</span>';
        if (option === get('try-harder')) {
            catalogSubmitted = false;
            if (selected().some(isArchive)) {
                loadCatalog();
                return;
            }
        }
        if (selectedEntry) readBrowse(selectedEntry);
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
        modeFiles.pack.clear();
        modeFiles.unpack.clear();
        validPackPaths.clear();
        activeFiles = [];
        window.__esdocToolsCleanup = null;
    };
    if (!supported) {
        say('Этот браузер не поддерживает локальные инструменты. Используйте актуальный Firefox, Chrome или Edge.', true);
        controls.hidden = false;
        updateControls();
        return;
    }
    controls.hidden = false;
    applyMode();
    render();
})();
