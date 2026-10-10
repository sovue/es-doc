(function () {
    'use strict';
    window.__esdocCharactersCleanup?.();
    const app = document.getElementById('characters-app');
    if (!app) return;
    const c = window.ESDocCharacters, get = id => document.getElementById('character-' + id);
    const controller = new AbortController();
    const on = (el,event,fn) => el.addEventListener(event,fn,{signal:controller.signal});
    const defaults = () => ({variable:'e',name:'Семён',nameMode:'text',sample:'Я говорю так! Добро пожаловать в «Совёнок».',values:{dynamic:{mode:'boolean',value:'False'}}});
    const clone = s => JSON.parse(JSON.stringify(s)), storageKey = 'es-doc-character-draft-v1';
    const rows = new Map(), undos = [], redos = [], urls = new Set(), bases = window.ESDocCharacterCatalog.bases;
    let state = defaults(), committed, disposed = false, timer, scrambleTimer;
    const status = message => { if (!disposed) get('status').textContent = message; };
    try {
        const saved = localStorage.getItem(storageKey);
        if (saved) { state = c.simpleState(c.importProject(saved)); get('storage-note').textContent = 'Черновик восстановлен. Доступны только свойства простого персонажа.'; }
    } catch (_) { get('storage-note').textContent = 'Не удалось прочитать черновик. Сохраните настройки в файл.'; }
    committed = clone(state);
    const element = (tag,text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; };
    const option = (select,value,label) => { const el = element('option',label); el.value = value; select.append(el); };
    for (const base of bases) option(get('kind'),base.key,base.label + ' / ' + base.key);
    option(get('kind'),'custom','Кастомная основа');
    for (const field of c.fields.filter(field => ['who','what'].includes(field.group))) {
        const row = element('div'); row.className = 'character-field';
        const label = element('label',field.label + ' / ' + field.key); label.htmlFor = 'character-value-' + field.key;
        const input = element(field.mode === 'boolean' ? 'select' : 'input'); input.id = label.htmlFor;
        if (field.mode === 'boolean') { option(input,'','По умолчанию'); option(input,'True','Да'); option(input,'False','Нет'); }
        else { input.type = 'text'; input.maxLength = 20000; input.placeholder = 'По умолчанию'; input.autocomplete = 'off'; }
        const error = element('p'); error.className = 'character-error'; error.id = 'character-error-' + field.key; error.hidden = true;
        input.setAttribute('aria-describedby',error.id); row.append(label);
        let picker;
        if (field.key.endsWith('_color')) {
            const controls = element('div'); controls.className = 'character-field-value';
            picker = element('input'); picker.type = 'color'; picker.id = 'character-color-' + field.key;
            picker.setAttribute('aria-label','Выбрать цвет / ' + field.key); picker.className = 'character-color';
            controls.append(input,picker); row.append(controls);
            on(picker,'input',() => { input.value = picker.value; state.values[field.key] = {mode:'text',value:picker.value}; edit(); }); on(picker,'change',remember);
        } else row.append(input);
        if (field.key.endsWith('_font')) {
            const help = element('p','Путь в game, например fonts/my-font.ttf. Другой шрифт невозможно предсмотреть в браузере.');
            help.className = 'character-field-help'; help.id = 'character-help-' + field.key; row.append(help); input.setAttribute('aria-describedby',help.id + ' ' + error.id);
        }
        if (field.key.endsWith('_suffix')) input.title = 'Постфикс передаётся в Ren\'Py как ' + field.key;
        row.append(error); get(field.group + '-fields').append(row); rows.set(field.key,{input,picker,error});
        on(input,field.mode === 'boolean' ? 'change' : 'input',() => { if (input.value === '') delete state.values[field.key]; else state.values[field.key] = {mode:field.mode,value:input.value}; edit(field.mode === 'boolean'); });
        on(input,'change',remember);
    }
    function remember() {
        clearTimeout(timer);
        if (JSON.stringify(state) !== JSON.stringify(committed)) { undos.push(committed); if (undos.length > 64) undos.shift(); committed = clone(state); redos.length = 0; }
        get('undo').disabled = !undos.length; get('redo').disabled = !redos.length;
    }
    function persist() {
        try { localStorage.setItem(storageKey,c.project(state)); get('storage-note').textContent = 'Черновик сохранён в этом браузере.'; }
        catch (_) { get('storage-note').textContent = 'Не удалось сохранить черновик. Используйте «Сохранить настройки».'; }
    }
    function edit(immediate = false) { render(); persist(); clearTimeout(timer); if (immediate) remember(); else timer = setTimeout(remember,450); }
    const value = (key,fallback) => { const entry = state.values[key]; if (!entry) return fallback; return entry.mode === 'boolean' ? entry.value === 'True' : entry.value; };
    function scramble() {
        const chars = 'АБВГДЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ0123456789!?%#';
        get('preview-who').textContent = value('who_prefix','') + Array.from(state.name || 'Имя',ch => /\s/u.test(ch) ? ch : chars[Math.floor(Math.random()*chars.length)]).join('') + value('who_suffix','');
    }
    function preview() {
        clearInterval(scrambleTimer);
        const base = bases.find(base => base.key === state.values.kind?.value);
        for (const prefix of ['who','what']) {
            const target = get('preview-' + prefix); target.removeAttribute('style');
            const color = value(prefix + '_color',prefix === 'who' ? base?.color || '#e1dd7d' : '#ffdd7d');
            if (/^#(?:[a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(color)) target.style.color = color;
            target.style.fontWeight = value(prefix + '_bold',false) ? '700' : '400'; target.style.fontStyle = value(prefix + '_italic',false) ? 'italic' : 'normal';
            target.style.textDecoration = [value(prefix + '_underline',false) ? 'underline' : '',value(prefix + '_strikethrough',false) ? 'line-through' : ''].filter(Boolean).join(' ') || 'none';
        }
        get('namebox').hidden = state.name === '';
        get('preview-who').textContent = value('who_prefix','') + state.name + value('who_suffix','');
        get('preview-what').textContent = value('what_prefix',base?.key === 'th' ? '~ ' : '') + state.sample + value('what_suffix',base?.key === 'th' ? ' ~' : '');
        if (value('dynamic',false) && state.name !== '') { scramble(); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) scrambleTimer = setInterval(scramble,100); }
    }
    function render() {
        get('dynamic-warning').hidden = !value('dynamic',false); get('custom-kind-control').hidden = get('kind').value !== 'custom';
        for (const id of ['variable','name','kind']) { get(id + '-error').hidden = true; (id === 'kind' ? get('custom-kind') : get(id)).removeAttribute('aria-invalid'); }
        for (const [key,row] of rows) {
            row.error.hidden = true; row.input.removeAttribute('aria-invalid');
            if (row.picker) {
                const hex = value(key,key.startsWith('who') ? bases.find(base => base.key === state.values.kind?.value)?.color || '#e1dd7d' : '#ffdd7d');
                if (/^#[a-f\d]{3,4}$/i.test(hex)) row.picker.value = '#' + hex.slice(1,4).split('').map(ch => ch+ch).join('');
                else if (/^#[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(hex)) row.picker.value = hex.slice(0,7);
            }
        }
        const result = c.compile(state);
        if (state.values.kind && !c.identifier(state.values.kind.value)) result.errors.push({key:'kind',message:'Введите имя переменной персонажа: буквы, цифры и _, без пробелов.'});
        for (const [key] of rows) if (key.endsWith('_color') && state.values[key] && !/^#(?:[a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(state.values[key].value)) result.errors.push({key,message:'Введите HEX-цвет, например #aabbcc или #aabbccdd.'});
        get('code').value = result.errors.length ? 'Исправьте отмеченные поля, чтобы получить код.' : result.code;
        get('code').rows = Math.max(4,Math.min(13,result.code.split('\n').length+1)); get('copy').disabled = get('download').disabled = Boolean(result.errors.length);
        get('validation').hidden = !result.errors.length; get('validation').textContent = 'Ошибок в настройках: ' + result.errors.length + '.';
        get('fix-error').hidden = !result.errors.length; get('fix-error').dataset.key = result.errors[0]?.key || '';
        for (const error of result.errors) {
            const row = rows.get(error.key), input = row?.input || (error.key === 'kind' ? get('custom-kind') : get(error.key));
            const hint = row?.error || get(error.key + '-error'); input?.setAttribute('aria-invalid','true'); if (hint) { hint.hidden = false; hint.textContent = error.message; }
        }
        get('usage').textContent = (c.identifier(state.variable) ? state.variable : 'e') + ' "Привет!"'; preview();
    }
    function sync() {
        for (const key of ['variable','name','sample']) get(key).value = state[key];
        const kind = state.values.kind?.value || ''; get('kind').value = !kind || bases.some(base => base.key === kind) ? kind : 'custom';
        get('custom-kind').value = get('kind').value === 'custom' ? kind : ''; get('dynamic').checked = value('dynamic',false);
        for (const [key,row] of rows) row.input.value = state.values[key]?.value || ''; render();
    }
    for (const key of ['variable','name','sample']) { on(get(key),'input',() => { state[key] = get(key).value; edit(); }); on(get(key),'change',remember); }
    on(get('kind'),'change',() => { const kind = get('kind').value === 'custom' ? get('custom-kind').value : get('kind').value; if (get('kind').value) state.values.kind = {mode:'expression',value:kind}; else delete state.values.kind; edit(true); });
    on(get('custom-kind'),'input',() => { state.values.kind = {mode:'expression',value:get('custom-kind').value}; edit(); });
    on(get('dynamic'),'change',() => { state.values.dynamic = {mode:'boolean',value:get('dynamic').checked ? 'True' : 'False'}; edit(true); });
    on(get('zoom'),'click',() => {
        const zoomed = get('preview-viewport').classList.toggle('is-zoomed');
        get('zoom').setAttribute('aria-pressed',String(zoomed));
        get('zoom').textContent = zoomed ? 'Исходный размер' : 'Увеличить';
        get('preview-viewport').scrollLeft = 0;
    });
    on(get('settings'),'submit',event => event.preventDefault());
    function undo() { remember(); if (!undos.length) return; redos.push(clone(state)); state = undos.pop(); committed = clone(state); persist(); sync(); get('undo').disabled = !undos.length; get('redo').disabled = !redos.length; }
    function redo() { if (!redos.length) return; undos.push(clone(state)); state = redos.pop(); committed = clone(state); persist(); sync(); get('undo').disabled = !undos.length; get('redo').disabled = !redos.length; }
    on(get('undo'),'click',undo); on(get('redo'),'click',redo);
    on(document,'keydown',event => { if (!(event.ctrlKey || event.metaKey) || event.altKey || event.target.matches('input,textarea,select,[contenteditable]')) return; if (event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); } else if (event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); } });
    on(get('reset'),'click',() => { remember(); state = defaults(); persist(); sync(); remember(); status('Настройки сброшены. Их можно вернуть кнопкой «Отменить».'); });
    on(get('fix-error'),'click',() => { const key = get('fix-error').dataset.key, input = rows.get(key)?.input || (key === 'kind' ? get('custom-kind') : get(key)); for (let el = input?.parentElement; el; el = el.parentElement) if (el.tagName === 'DETAILS') el.open = true; input?.focus(); });
    on(get('copy'),'click',async () => { if (get('copy').disabled) return; try { await navigator.clipboard.writeText(get('code').value); status('Определение скопировано.'); } catch (_) { if (!disposed) { get('code').focus(); get('code').select(); status('Код выделен. Нажмите Ctrl+C.'); } } });
    function download(name,content,type) { const url = URL.createObjectURL(new Blob([content],{type})); urls.add(url); const link = element('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url); },1000); }
    on(get('download'),'click',() => { if (!get('download').disabled) download(state.variable + '.rpy',get('code').value + '\n','text/plain;charset=utf-8'); });
    on(get('save-project'),'click',() => download((c.identifier(state.variable) ? state.variable : 'character') + '.character.json',c.project(state),'application/json'));
    on(get('load-project'),'click',() => get('project-file').click());
    on(get('project-file'),'change',async () => { const file = get('project-file').files[0]; if (!file) return; try { if (file.size > 1000000) throw new Error('Выберите JSON размером до 1 МБ.'); const loaded = c.simpleState(c.importProject(await file.text())); if (disposed) return; remember(); state = loaded; sync(); persist(); remember(); status('Настройки открыты.'); } catch (error) { status(error.message); } finally { if (!disposed) get('project-file').value = ''; } });
    for (const button of app.querySelectorAll('[data-character-jump]')) on(button,'click',() => get(button.dataset.characterJump + '-heading')?.focus());
    window.__esdocCharactersCleanup = () => { remember(); disposed = true; controller.abort(); clearTimeout(timer); clearInterval(scrambleTimer); for (const url of urls) URL.revokeObjectURL(url); window.__esdocCharactersCleanup = null; };
    sync(); app.hidden = false;
})();
