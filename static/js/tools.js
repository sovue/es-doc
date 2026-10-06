(function () {
    window.__esdocToolsCleanup?.();
    const app = document.getElementById('tools-app');
    if (!app) return;
    const { accepts, safePath, walkEntry, size, explainWarning } = window.ESDocTools;
    const config = JSON.parse(app.dataset.config);
    const get = id => document.getElementById('tools-' + id);
    const controls = get('controls'), drop = get('drop'), menu = get('add-menu');
    const addButton = get('add'), fileInput = get('files'), folderInput = get('folder');
    const start = get('start'), cancel = get('cancel'), status = get('status');
    const queue = get('queue'), list = get('file-list'), progress = get('progress');
    const progressBar = get('progress-bar'), current = get('current');
    const resultPanel = get('result'), downloads = get('downloads'), downloadAll = get('download-all');
    const warningsPanel = get('warnings'), warningList = get('warning-list');
    const browseActions = get('browse-actions'), browseArchive = get('archive');
    const browser = get('browser'), browserList = get('browser-list');
    const browserPreview = get('browser-preview'), browserStatus = get('browser-status');
    const browserSearch = get('browser-search'), browserCrumbs = get('browser-crumbs');
    const controller = new AbortController();
    const on = (element, event, callback) => element.addEventListener(event, callback, { signal: controller.signal });
    const files = new Map();
    const rows = new Map();
    const supported = Boolean(window.Worker && window.WebAssembly);
    let mode = new URLSearchParams(window.location.search).get('mode') === 'unrpa' ? 'unrpa' : 'unrpyc';
    let busy = false, enumerating = false, disposed = false, retryAvailable = false;
    let worker = null, chunks = [], activeFiles = [], dragDepth = 0;
    const outputs = [];
    let browseEntries = [], browseFolder = '', browseRequest = 0, previewUrl = null;
    let catalogEntries = [], catalogFiles = [], catalogRequest = 0, selectedEntry = null;
    let task = '', exportReady = false, catalogSubmitted = false, previewFont = null, clearOnDownload = false;
    let operation = 0;

    const say = (message, error = false) => {
        status.textContent = message;
        status.classList.toggle('is-error', error);
    };
    const clearResult = () => {
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
        browseFolder = '';
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
        get('drop-help').textContent = mode === 'unrpa' ? '.rpa' : '.rpyc, .rpymc';
    };
    const updateControls = () => {
        const locked = busy || enumerating || !supported;
        start.disabled = locked || !selected().length;
        start.hidden = !retryAvailable || locked || !selected().length;
        addButton.disabled = locked;
        get('clear').disabled = locked || !selected().length;
        for (const field of app.querySelectorAll('.tools-modes input, .tools-options input')) field.disabled = locked;
        for (const button of list.querySelectorAll('button')) button.disabled = locked;
        cancel.hidden = !busy && !enumerating;
        downloadAll.disabled = locked || (!selected().length && !outputs.length);
        browseArchive.disabled = locked;
        browser.setAttribute('aria-busy', String(busy));
        for (const button of browserList.querySelectorAll('button')) button.disabled = locked;
    };
    const render = () => {
        list.replaceChildren();
        rows.clear();
        const visible = selected();
        queue.hidden = !visible.length;
        list.hidden = mode !== 'unrpa';
        get('count').textContent = `${visible.length.toLocaleString('ru-RU')} файлов / ${size(visible.reduce((total, entry) => total + entry.file.size, 0))}`
            + (visible.length < files.size ? ` / для другого режима: ${files.size - visible.length}` : '');
        const fragment = document.createDocumentFragment();
        // Bound the DOM for folders with thousands of scripts; all queued files
        // are still processed even when their rows are not rendered.
        for (const entry of visible.slice(0, 200)) {
            const row = document.createElement('li');
            const name = document.createElement('div');
            name.className = 'tools-file-name';
            const open = document.createElement('button');
            open.type = 'button';
            open.className = 'tools-text-button';
            open.textContent = entry.path;
            open.addEventListener('click', () => {
                browseArchive.value = String(catalogFiles.findIndex(item => item.path === entry.path));
                openBrowse();
            });
            name.appendChild(open);
            const state = document.createElement('span');
            state.className = 'tools-file-state';
            state.textContent = 'Добавлен';
            name.appendChild(state);
            const bytes = document.createElement('span');
            bytes.className = 'tools-file-size';
            bytes.textContent = size(entry.file.size);
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'tools-remove';
            remove.setAttribute('aria-label', 'Убрать ' + entry.path);
            remove.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
            remove.addEventListener('click', () => { files.delete(entry.path); clearResult(); retryAvailable = false; render(); loadCatalog(); });
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
            if (!disposed && id === operation) {
                enumerating = false;
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
    for (const radio of app.querySelectorAll('[name="tool-mode"]')) on(radio, 'change', () => {
        setMode(radio.value);
        clearResult();
        say('');
        render();
        loadCatalog();
    });
    on(get('clear'), 'click', () => {
        for (const entry of selected()) files.delete(entry.path);
        clearResult();
        resetWorker();
        retryAvailable = false;
        progress.hidden = true;
        say('Очередь выбранного режима очищена.');
        render();
    });

    const resetWorker = () => {
        if (worker) {
            worker.onmessage = worker.onerror = worker.onmessageerror = null;
            worker.terminate();
        }
        worker = null;
        catalogSubmitted = false;
    };
    const finish = () => { busy = false; progress.hidden = true; updateControls(); };
    const showOutputs = () => {
        resultPanel.hidden = false;
        start.classList.remove('tools-button-primary');
        downloadAll.hidden = false;
        downloadAll.innerHTML = '<span class="tools-ui-icon tools-icon-download" aria-hidden="true"></span><span>'
            + (exportReady ? 'Скачать ещё раз' : 'Скачать всё в ZIP') + '</span>';
        if (outputs.length === 1) outputs[0].link.classList.add('tools-button-primary');
    };
    const options = () => ({ try_harder: get('try-harder').checked, no_init_offset: get('no-init-offset').checked });
    const readBrowse = entry => {
        if (busy) return;
        selectedEntry = entry;
        busy = true;
        task = 'preview';
        browserPreview.setAttribute('aria-busy', 'true');
        browserPreview.replaceChildren();
        const pending = document.createElement('p');
        pending.className = 'tools-preview-empty';
        pending.textContent = /\.(rpyc|rpymc)$/i.test(entry.path) ? 'Декомпилируем файл…' : 'Открываем файл…';
        browserPreview.appendChild(pending);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (previewFont) document.fonts.delete(previewFont);
        previewFont = null;
        previewUrl = null;
        for (const button of browserList.querySelectorAll('[data-entry-id]')) {
            if (button.getAttribute('data-entry-id') === entry.id) button.setAttribute('aria-current', 'true');
            else button.removeAttribute('aria-current');
        }
        browserStatus.textContent = pending.textContent;
        updateControls();
        try {
            ensureWorker();
            if (!catalogSubmitted) submitCatalog();
            worker.postMessage({ type: 'source-read', id: entry.id, options: options(), requestId: ++browseRequest });
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
                if (entry.path.toLocaleLowerCase().includes(query)) entries.push(entry);
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
        for (const folder of [...folders].sort((a, b) => a.localeCompare(b, 'ru'))) {
            row(folder + '/', 'папка', () => { browseFolder += folder + '/'; renderBrowse(); }, 'folder');
        }
        for (const entry of entries.slice(0, 500)) {
            const kind = /\.(rpyc|rpymc|rpy|rpym|py|js|json|css|txt)$/i.test(entry.path) ? 'code'
                : /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(entry.path) ? 'image'
                : /\.(ogg|mp3|wav|mp4|webm)$/i.test(entry.path) ? 'media' : 'file';
            row(query ? entry.path : entry.path.slice(browseFolder.length), size(entry.size), () => readBrowse(entry), kind,
                selectedEntry?.id === entry.id, entry.id);
            if (mode === 'unrpyc' && files.has(entry.path)) {
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'tools-icon-button tools-remove-source';
                remove.title = 'Убрать файл';
                remove.setAttribute('aria-label', 'Убрать ' + entry.path);
                remove.innerHTML = '<span class="tools-ui-icon tools-icon-close" aria-hidden="true"></span>';
                remove.disabled = busy;
                remove.addEventListener('click', () => {
                    files.delete(entry.path);
                    clearResult();
                    render();
                    loadCatalog();
                });
                browserList.lastElementChild.appendChild(remove);
            }
        }
        if (!folders.size && !entries.length) {
            const empty = document.createElement('li');
            empty.className = 'tools-list-empty';
            empty.textContent = query ? 'Файлы не найдены' : 'В этой папке нет файлов';
            browserList.appendChild(empty);
        }
        browserStatus.textContent = `${folders.size + entries.length} элементов`
            + (entries.length > 500 ? ' (показаны первые 500; уточните поиск)' : '');
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
            svg: 'image/svg+xml', ogg: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav',
            mp4: 'video/mp4', webm: 'video/webm', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' }[extension] || 'application/octet-stream';
        previewUrl = URL.createObjectURL(new Blob([data.buffer], { type: mime }));
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
        } else if (/\.(rpy|rpym|txt|md|json|yaml|yml|xml|html|css|js|py|csv|ini|log|sh|bat)$/i.test(path) && data.buffer.byteLength > 2 * 1024 * 1024) {
            const note = document.createElement('p');
            note.textContent = 'Файл слишком большой для предпросмотра. Его можно скачать целиком.';
            browserPreview.appendChild(note);
        } else if (/\.(rpy|rpym|txt|md|json|yaml|yml|xml|html|css|js|py|csv|ini|log|sh|bat)$/i.test(path)) {
            const text = new TextDecoder().decode(data.buffer);
            const toolbar = document.createElement('div');
            toolbar.className = 'tools-preview-toolbar';
            const copy = document.createElement('button');
            copy.type = 'button';
            copy.className = 'tools-icon-button';
            copy.title = 'Скопировать код';
            copy.setAttribute('aria-label', 'Скопировать код');
            copy.innerHTML = '<span class="tools-ui-icon tools-icon-copy" aria-hidden="true"></span>';
            if (window.copyControl && window.navigator?.clipboard) {
                copy.addEventListener('click', window.copyControl(copy, () => text, { message: 'Код скопирован.', status: browserStatus }));
                toolbar.appendChild(copy);
            }
            const frame = document.createElement('div');
            frame.className = 'tools-code-frame';
            const pre = document.createElement('pre');
            pre.className = 'tools-code';
            const gutter = document.createElement('span');
            gutter.className = 'tools-code-gutter';
            gutter.setAttribute('aria-hidden', 'true');
            const lines = text.replace(/\n$/, '').split('\n');
            gutter.textContent = lines.map((_, i) => String(i + 1)).join('\n');
            const scroll = document.createElement('span');
            scroll.className = 'code-scroll';
            scroll.tabIndex = 0;
            scroll.setAttribute('aria-label', 'Код файла');
            const code = document.createElement('code');
            // Only HTML escaped by our local Pygments formatter is inserted.
            if (data.html) code.innerHTML = data.html;
            else code.textContent = text;
            scroll.appendChild(code);
            pre.append(gutter, scroll);
            frame.appendChild(pre);
            browserPreview.append(toolbar, frame);
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
        browseEntries = mode === 'unrpa' ? catalogEntries.filter(entry => entry.source === source) : catalogEntries;
        browseFolder = '';
        browserSearch.value = '';
        browserList.replaceChildren();
        browserPreview.replaceChildren();
        const empty = document.createElement('p');
        empty.className = 'tools-preview-empty';
        empty.textContent = 'Файл не выбран';
        browserPreview.appendChild(empty);
        browser.hidden = false;
        get('browser-title').textContent = mode === 'unrpa' ? catalogFiles[source]?.path || 'Файлы' : 'Файлы';
        renderBrowse();
    };
    on(browseArchive, 'change', openBrowse);
    on(browserSearch, 'input', renderBrowse);
    const fail = message => {
        chunks = [];
        resetWorker();
        retryAvailable = true;
        finish();
        if (outputs.length) {
            showOutputs();
            get('result-description').textContent = `Готовых архивов: ${outputs.length}.`;
        }
        say(message, true);
        browserPreview.setAttribute('aria-busy', 'false');
    };
    on(cancel, 'click', () => {
        operation++;
        enumerating = false;
        resetWorker();
        catalogRequest++;
        browseRequest++;
        chunks = [];
        retryAvailable = true;
        finish();
        render();
        browserPreview.setAttribute('aria-busy', 'false');
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
            say(data.errors.length ? data.errors.join('\n') : '', data.errors.length > 0);
            return;
        }
        if (data.type === 'source-file' && data.requestId === browseRequest) {
            task = '';
            finish();
            showPreview(data);
            say('');
            return;
        }
        if (data.type === 'source-error' && (data.requestId === browseRequest || data.requestId === catalogRequest)) {
            const wasCatalog = data.operation === 'catalog' || task === 'catalog';
            if (wasCatalog) catalogSubmitted = false;
            retryAvailable = wasCatalog;
            task = '';
            finish();
            browserPreview.setAttribute('aria-busy', 'false');
            browserStatus.textContent = data.error;
            say(data.error, true);
            return;
        }
        if (!busy) return;
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
        } else if (data.type === 'fatal') fail('Обработка прервана. ' + data.error);
        else if (data.type === 'done') {
            const result = data.result;
            chunks = [];
            retryAvailable = false;
            clearOnDownload = result.failed === 0;
            exportReady = result.failed === 0;
            finish();
            resultPanel.hidden = false;
            if (outputs.length) {
                showOutputs();
                get('result-description').textContent = `Обработано: ${result.succeeded}.`
                    + (result.written !== result.succeeded ? ` Файлов в результате: ${result.written}.` : '')
                    + (result.failed ? ` Ошибок: ${result.failed}.` : '');
                renderWarnings(warningsPanel, get('warnings-summary'), warningList,
                    result.warnings, result.warning_details || []);
                say(result.failed ? result.errors.slice(0, 3).join('\n') : 'Готово.', result.failed > 0);
                for (const output of outputs) output.link.click();
            } else {
                get('result-description').textContent = 'Файлы не удалось обработать.';
                say(result.errors.slice(0, 3).join('\n') || 'Нет готовых файлов.', true);
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
        worker.postMessage({ type: 'catalog', files: catalogFiles, config, requestId: ++catalogRequest });
        catalogSubmitted = true;
    };
    const loadCatalog = () => {
        if (!supported || busy || enumerating || !selected().length) return;
        catalogFiles = selected();
        retryAvailable = false;
        catalogEntries = mode === 'unrpyc' ? catalogFiles.map((entry, source) => ({
            id: `${source}:${entry.path}`, path: entry.path, size: entry.file.size, source,
        })) : [];
        browseArchive.replaceChildren();
        for (const [index, entry] of catalogFiles.entries()) {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = entry.path;
            browseArchive.appendChild(option);
        }
        browseArchive.value = '0';
        browseActions.hidden = mode !== 'unrpa' || catalogFiles.length < 2;
        get('archive-label').hidden = browseActions.hidden;
        resultPanel.hidden = false;
        downloadAll.hidden = false;
        downloadAll.innerHTML = '<span class="tools-ui-icon tools-icon-download" aria-hidden="true"></span><span>Скачать всё в ZIP</span>';
        openBrowse();
        if (mode === 'unrpyc') {
            updateControls();
            return;
        }
        busy = true;
        task = 'catalog';
        retryAvailable = false;
        updateControls();
        browserStatus.textContent = mode === 'unrpa' ? 'Читаем оглавление архива…' : 'Подготовка файлов…';
        try {
            ensureWorker();
            submitCatalog();
        } catch (error) { fail(error.message); }
    };
    const processFiles = () => {
        if (!supported || busy || enumerating || !selected().length) return;
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
            worker.postMessage({ type: 'run', config, mode: mode === 'unrpa' ? 'combined' : mode, files: activeFiles,
                options: options() });
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
    setMode(mode);
    render();
})();
