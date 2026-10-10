(function () {
    'use strict';
    window.__esdocCharactersCleanup?.();
    const app = document.getElementById('characters-app');
    if (!app) return;
    const c = window.ESDocCharacters, get = id => document.getElementById('character-' + id);
    const controller = new AbortController(), on = (el,event,fn) => el.addEventListener(event,fn,{signal:controller.signal});
    const defaults = () => ({variable:'e',name:'Семён',nameMode:'text',sample:'Я говорю так! Добро пожаловать в «Совёнок».',values:{}});
    const clone = s => JSON.parse(JSON.stringify(s));
    const storageKey = 'es-doc-character-draft-v1';
    const rows = new Map(), undos = [], redos = [], fontFaces = new Map(), fontRequests = new Map(), fonts = new Map();
    let state = defaults(), disposed = false, timer, typingTimer, committed, backgroundUrl, backgroundRequest = 0, lastField;
    const downloads = new Set();
    const status = message => { if (!disposed) get('status').textContent = message; };
    try {
        const saved = localStorage.getItem(storageKey);
        if (saved) { state = c.importProject(saved); get('storage-note').textContent = 'Черновик восстановлен из этого браузера.'; }
    } catch (_) { get('storage-note').textContent = 'Не удалось прочитать черновик. Настройки доступны до закрытия страницы; сохраните их в файл.'; }
    committed = clone(state);
    const remember = () => {
        clearTimeout(timer);
        if (JSON.stringify(committed) !== JSON.stringify(state)) {
            undos.push(committed); if (undos.length > 64) undos.shift();
            committed = clone(state); redos.length = 0;
        }
        get('undo').disabled = undos.length === 0; get('redo').disabled = redos.length === 0;
    };
    const persist = () => {
        try { localStorage.setItem(storageKey,c.project(state)); get('storage-note').textContent = 'Черновик сохранён в этом браузере.'; }
        catch (_) { get('storage-note').textContent = 'Браузер не разрешил сохранить черновик. Используйте «Сохранить настройки».'; }
    };
    const edited = (immediate = false) => {
        render(); persist(); clearTimeout(timer);
        if (immediate) remember(); else timer = setTimeout(remember,450);
    };
    const element = (tag,className,text) => {
        const el = document.createElement(tag); if (className) el.className = className;
        if (text !== undefined) el.textContent = text; return el;
    };
    const option = (select,value,label) => { const el = element('option','',label); el.value = value; select.append(el); };
    function addField(key, container, extra = false) {
        if (rows.has(key)) return rows.get(key);
        const field = c.field(key) || {key,label:key,mode:'expression',help:'Параметр вашего проекта. Значение передаётся в Character без изменений.'};
        const row = element('div','character-field' + (extra ? ' character-parameter' : ''));
        const head = element('div','character-field-head'), label = element('label','',field.label);
        label.htmlFor = 'character-value-' + key;
        const enableLabel = element('label','character-enable'), enabled = element('input'); enabled.type = 'checkbox'; enabled.id = 'character-enabled-' + key;
        enabled.setAttribute('aria-label','Передать значение явно: ' + key); enableLabel.append(enabled,document.createTextNode('Передать значение явно')); head.append(label);
        const meta = element('div','character-field-key');
        if (field.doc) { const link = element('a','',key); link.href = field.doc; link.title = 'Справка ' + key; meta.append(link); } else meta.textContent = key;
        const controls = element('div','character-field-value'), mode = element('select','character-mode');
        mode.id = 'character-mode-' + key;
        mode.setAttribute('aria-label','Тип значения ' + key);
        option(mode,field.mode,({text:'Текст',number:'Число',boolean:'Да / нет',expression:'Python'})[field.mode]);
        if (field.mode !== 'expression') option(mode,'expression','Python');
        else { option(mode,'text','Текст'); option(mode,'number','Число'); option(mode,'boolean','Да / нет'); }
        const holder = element('div','character-value'), error = element('p','character-error');
        error.id = 'character-error-' + key; error.hidden = true;
        const help = element('p','character-field-help',field.help); help.id = 'character-help-' + key;
        const advanced = element('details','character-field-options'), summary = element('summary','','Параметр / Python');
        summary.setAttribute('aria-label','Параметр и тип значения: ' + field.label + ' / ' + key);
        const reset = element('button','character-button',extra ? 'Удалить поле' : 'Сбросить значение'); reset.type = 'button';
        reset.id = 'character-remove-' + key; reset.setAttribute('aria-label',(extra ? 'Удалить поле: ' : 'Сбросить значение: ') + key);
        const modeLabel = element('label','','Тип значения'); modeLabel.htmlFor = mode.id;
        advanced.append(summary,meta,enableLabel,modeLabel,mode);
        advanced.append(element('p','character-field-help','Ввод включает параметр автоматически. Этот переключатель позволяет передать пустую строку явно. «Сбросить значение» возвращает наследование.'));
        if (extra) head.append(reset); else advanced.append(reset);
        const colorPicker = key.endsWith('_color') ? element('input','character-color') : null;
        if (colorPicker) {
            colorPicker.type = 'color'; colorPicker.id = 'character-color-' + key;
            colorPicker.setAttribute('aria-label','Выбрать цвет: ' + field.label + ' / ' + key);
            colorPicker.title = 'Выбрать непрозрачный цвет';
            on(colorPicker,'input',() => { input.value = colorPicker.value; state.values[key] = {mode:'text',value:input.value}; edited(); });
            on(colorPicker,'change',remember);
        }
        let input;
        const buildInput = () => {
            const oldFocus = document.activeElement === input;
            input = element(mode.value === 'boolean' ? 'select' : 'input');
            input.id = 'character-value-' + key;
            if (mode.value === 'boolean') {
                option(input,'','По умолчанию'); option(input,'True','Да / True'); option(input,'False','Нет / False'); option(input,'None','None');
            } else {
                input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false; input.maxLength = 20000;
                input.placeholder = mode.value === 'expression' ? (key.endsWith('outlines') ? '[(2, "#000", 0, 0)]' : 'По умолчанию') : 'По умолчанию';
                if (mode.value === 'number') input.inputMode = 'decimal';
            }
            input.setAttribute('aria-describedby',help.id + ' ' + error.id);
            holder.replaceChildren(input);
            on(input,mode.value === 'boolean' ? 'change' : 'input', () => {
                if (!input.value && (mode.value === 'boolean' || !(advanced.open && enabled.checked))) delete state.values[key];
                else state.values[key] = {mode:mode.value,value:input.value};
                enabled.checked = Boolean(state.values[key]); edited(mode.value === 'boolean');
            });
            on(input,'change',remember);
            if (oldFocus) input.focus();
        };
        on(enabled,'change',() => {
            if (enabled.checked) { if (mode.value === 'boolean' && !input.value) input.value = 'True'; state.values[key] = {mode:mode.value,value:input.value}; }
            else delete state.values[key];
            edited(true);
        });
        on(mode,'change',() => {
            const previous = input.value; buildInput();
            input.value = mode.value === 'boolean' ? (['True','False','None'].includes(previous) ? previous : 'True') : previous;
            state.values[key] = {mode:mode.value,value:input.value}; enabled.checked = true; edited(true);
        });
        on(reset,'click',() => {
            remember();
            delete state.values[key];
            if (extra) { row.remove(); rows.delete(key); get('add-property').focus(); }
            else { mode.value = field.mode; buildInput(); input.value = ''; input.focus(); }
            edited(true); status(extra ? 'Поле удалено. Значение можно вернуть кнопкой «Отменить».' : 'Значение сброшено: используется стиль игры.');
        });
        buildInput(); controls.append(holder); if (colorPicker) controls.append(colorPicker);
        row.append(head,controls,help,advanced,error); container.append(row);
        const record = {row,field,mode,enabled,error,colorPicker,get input() {return input;},sync() {
            const entry = state.values[key]; const nextMode = entry?.mode || field.mode;
            if (![...mode.options].some(item => item.value === nextMode)) option(mode,nextMode,({text:'Текст',number:'Число',boolean:'Да / нет',expression:'Python'})[nextMode]);
            if (mode.value !== nextMode) { mode.value = nextMode; buildInput(); }
            enabled.checked = Boolean(entry); input.value = entry?.value ?? '';
            if (entry && (nextMode !== field.mode || entry.value === '')) advanced.open = true;
        }};
        rows.set(key,record); record.sync(); return record;
    }
    const groups = {
        quick:['who_color','who_size','what_color','what_size','what_slow_cps'],
        identity:['kind','dynamic'],
        who:['who_font','who_bold','who_italic','who_underline'],
        what:['what_font','what_bold','what_italic','what_justify'],
        behavior:['image','voice_tag','condition','interact','advance','callback','retain','mode'],
        screen:['screen','show_layer','ctc','ctc_pause','ctc_timedpause','ctc_position'],
        engine:c.args.filter(field => field.group === 'engine').map(field => field.key),
    };
    const quickLabels = {who_color:'Цвет имени',who_size:'Размер имени',what_color:'Цвет реплики',what_size:'Размер реплики'};
    for (const [group,keys] of Object.entries(groups)) for (const key of keys) {
        const record = addField(key,get(group + '-fields'));
        if (quickLabels[key]) record.row.querySelector('.character-field-head > label').textContent = quickLabels[key];
    }
    const baselineKeys = new Set(rows.keys());
    function syncForm() {
        get('variable').value = state.variable; get('name').value = state.name;
        get('name-mode').value = state.nameMode; get('sample').value = state.sample;
        if (state.nameMode !== 'text' || state.values.kind || state.values.dynamic) get('identity-options').open = true;
        for (const key of Object.keys(state.values)) if (!rows.has(key)) addField(key,get('extra-fields'),true);
        for (const [key,row] of rows) {
            if (!baselineKeys.has(key) && !Object.hasOwn(state.values,key)) { row.row.remove(); rows.delete(key); }
            else { row.sync(); if (Object.hasOwn(state.values,key)) reveal(row.row); }
        }
        render();
    }
    function configured(key) {
        const entry = state.values[key]; if (!entry) return {ok:false};
        if (entry.mode === 'text') return {ok:true,value:entry.value};
        return c.literal(entry.value);
    }
    const previewed = new Set();
    const value = (key,fallback) => {
        const result = configured(key);
        if (!result.ok) return fallback;
        previewed.add(key); return result.value;
    };
    const color = candidate => {
        if (typeof candidate === 'string' && /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(candidate)) return candidate;
        if (Array.isArray(candidate) && [3,4].includes(candidate.length) && candidate.every(v => typeof v === 'number' && v >= 0 && v <= 255)) {
            // Ren'Py tuples use byte channels; alpha follows the same rule.
            return '#' + candidate.map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
        }
        return null;
    };
    const number = (candidate,min = -Infinity,max = Infinity) => typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= min && candidate <= max;
    const px = n => 'calc(' + (n / 19.2) + 'cqw * var(--character-preview-scale))';
    function paintText(target,prefix) {
        target.removeAttribute('style');
        const use = (prop,fn) => {
            const key = prefix + '_' + prop, result = configured(key);
            if (result.ok && fn(result.value) !== false) previewed.add(key);
        };
        use('color',v => { const parsed = color(v); if (!parsed) return false; target.style.color = parsed; });
        use('size',v => { if (!number(v,1,400)) return false; target.style.fontSize = px(v); });
        use('bold',v => { if (typeof v !== 'boolean') return false; target.style.fontWeight = v ? '700' : '400'; });
        use('italic',v => { if (typeof v !== 'boolean') return false; target.style.fontStyle = v ? 'italic' : 'normal'; });
        const decoration = [];
        for (const prop of ['underline','strikethrough']) use(prop,v => { if (typeof v !== 'boolean') return false; if (v) decoration.push(prop === 'underline' ? 'underline' : 'line-through'); });
        target.style.textDecoration = decoration.join(' ') || 'none';
        use('kerning',v => { if (!number(v,-100,500)) return false; target.style.letterSpacing = px(v); });
        use('line_spacing',v => { if (!number(v,-100,500)) return false; const size = value(prefix + '_size',32); target.style.lineHeight = px((number(size,1,400) ? size : 32) * 1.5 + v); });
        use('line_leading',v => { if (!number(v,-100,500)) return false; target.style.paddingTop = px(v); });
        use('justify',v => { if (typeof v !== 'boolean') return false; target.style.textAlign = v ? 'justify' : 'left'; });
        use('textalign',v => { if (!number(v,0,1)) return false; target.style.textAlign = v < .25 ? 'left' : v > .75 ? 'right' : 'center'; });
        use('outlines',v => {
            if (!Array.isArray(v) || v.length > 16 || v.some(item => !Array.isArray(item) || !number(item[0],0,30) || !color(item[1]) || !number(item[2],-100,100) || !number(item[3],-100,100))) return false;
            const shadows = [];
            for (const [radius,tint,x,y] of v) {
                const offsets = radius === 0 ? [[0,0]] : [[-radius,0],[radius,0],[0,-radius],[0,radius],[-radius,-radius],[radius,radius],[-radius,radius],[radius,-radius]];
                for (const [dx,dy] of offsets) shadows.push(px(x+dx) + ' ' + px(y+dy) + ' 0 ' + color(tint));
            }
            target.style.textShadow = shadows.join(',') || 'none';
        });
        for (const axis of ['x','y']) {
            use(axis + 'offset',v => { if (!number(v,-1920,1920)) return false; target.style.position = 'relative'; target.style[axis === 'x' ? 'left' : 'top'] = px(v); });
            use(axis + 'size',v => { if (!number(v,0,1920)) return false; target.style[axis === 'x' ? 'width' : 'height'] = px(v); });
        }
        if (fonts.has(prefix)) target.style.fontFamily = '"' + fonts.get(prefix) + '"';
    }
    function previewText(target,text) {
        // A small safe subset of Ren'Py tags; all content becomes DOM text.
        target.replaceChildren(); const stack = [target];
        const tokens = String(text).split(/(\{\{|\{[^{}]*\})/g);
        for (const token of tokens) {
            if (token === '{{') { stack.at(-1).append(document.createTextNode('{')); continue; }
            const match = /^\{(\/)?(b|i|u|s|color|size)(?:=([^}]+))?\}$/.exec(token);
            if (match && match[1]) { if (stack.length > 1) stack.pop(); continue; }
            if (match) {
                const span = element('span'), tag = match[2], arg = match[3];
                if (tag === 'b') span.style.fontWeight = '700';
                if (tag === 'i') span.style.fontStyle = 'italic';
                if (tag === 'u' || tag === 's') span.style.textDecoration = tag === 'u' ? 'underline' : 'line-through';
                if (tag === 'color' && color(arg)) span.style.color = color(arg);
                if (tag === 'size' && /^\d+$/.test(arg) && number(Number(arg),1,400)) span.style.fontSize = px(Number(arg));
                stack.at(-1).append(span); if (stack.length < 32) stack.push(span);
            } else stack.at(-1).append(document.createTextNode(token.replace(/\[\[/g,'[')));
        }
    }
    function paintPreview() {
        clearTimeout(typingTimer); previewed.clear();
        const who = get('preview-who'), what = get('preview-what');
        paintText(who,'who'); paintText(what,'what');
        const dynamic = value('dynamic',false);
        let name = state.name;
        if (state.nameMode === 'none') name = '';
        else if (state.nameMode === 'expression' || state.nameMode === 'inherit' || dynamic === true) name = get('preview-name').value;
        get('namebox').hidden = state.nameMode === 'none';
        previewText(who,value('who_prefix','') + name + value('who_suffix',''));
        previewText(what,value('what_prefix','') + state.sample + value('what_suffix',''));
        const box = get('dialogue-window'), namebox = get('namebox'); box.removeAttribute('style'); namebox.removeAttribute('style');
        for (const [prefix,target] of [['window',box],['namebox',namebox]]) {
            const bg = configured(prefix + '_background');
            if (bg.ok && color(bg.value)) { target.style.background = color(bg.value); previewed.add(prefix + '_background'); }
            const padding = configured(prefix + '_padding');
            if (padding.ok && Array.isArray(padding.value) && [2,4].includes(padding.value.length) && padding.value.every(v => number(v,0,500))) {
                const v = padding.value;
                const cssOrder = v.length === 2 ? [v[1],v[0]] : [v[1],v[2],v[3],v[0]];
                target.style.padding = cssOrder.map(px).join(' '); previewed.add(prefix + '_padding');
            }
        }
        // These settings affect only the replay button, never automatic input changes.
        for (const key of ['what_slow_cps','what_slow_cps_multiplier','slow','all_at_once','what_slow_abortable','slow_abortable']) {
            const result = configured(key);
            if (result.ok && (typeof result.value === 'boolean' || result.value === null || number(result.value,0,10000))) previewed.add(key);
        }
        const limits = [];
        for (const key of Object.keys(state.values)) {
            if (previewed.has(key)) continue;
            if ((key === 'who_font' || key === 'what_font') && fonts.has(key.split('_')[0])) continue;
            limits.push(key);
        }
        if (state.nameMode === 'expression') limits.unshift('name / Python');
        if (state.nameMode === 'inherit') limits.unshift('name / наследование');
        if (/\{(?!\{|\/?(?:b|i|u|s|color|size)(?:[}=]))|(?<!\[)\[(?!\[)/.test(state.name + state.sample)) limits.push('Текстовые теги и подстановки за пределами {b}, {i}, {u}, {s}, {color}, {size}');
        get('preview-limitations').hidden = limits.length === 0;
        get('limit-count').textContent = limits.length ? '(' + limits.length + ')' : '';
        get('limitations').replaceChildren(...limits.map(key => element('li','',key)));
    }
    function render() {
        get('name-control').hidden = state.nameMode === 'none' || state.nameMode === 'inherit';
        get('name-control').querySelector('label').textContent = state.nameMode === 'expression' ? 'Python-выражение / функция имени' : 'Имя';
        for (const key of ['variable','name']) { get(key).removeAttribute('aria-invalid'); get(key + '-error').hidden = true; }
        for (const [key,row] of rows) {
            row.enabled.checked = Boolean(state.values[key]); row.error.hidden = true; row.input.removeAttribute('aria-invalid');
            if (row.colorPicker) {
                row.colorPicker.hidden = row.mode.value !== 'text';
                const raw = state.values[key]?.value || (key.startsWith('who_') ? '#e2c778' : '#f5ecd7');
                if (/^#[\da-f]{3,4}$/i.test(raw)) row.colorPicker.value = '#' + raw.slice(1,4).split('').map(ch => ch + ch).join('');
                else if (/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(raw)) row.colorPicker.value = raw.slice(0,7);
            }
        }
        const result = c.compile(state);
        get('code').value = result.code || 'Исправьте значения в отмеченных полях, чтобы получить код.';
        get('code').rows = Math.max(4,Math.min(13,result.code.split('\n').length + 1));
        get('copy').disabled = get('download').disabled = result.errors.length > 0;
        get('validation').hidden = result.errors.length === 0;
        get('validation').textContent = result.errors.length ? 'Ошибок в настройках: ' + result.errors.length + '. Исправьте отмеченные поля.' : '';
        get('fix-error').hidden = result.errors.length === 0;
        get('fix-error').dataset.key = result.errors[0]?.key || '';
        get('usage').textContent = (c.identifier(state.variable) ? state.variable : 'e') + ' "Привет!"';
        for (const error of result.errors) {
            const row = rows.get(error.key), input = row?.input || get(error.key), hint = row?.error || get(error.key + '-error');
            input?.setAttribute('aria-invalid','true');
            if (hint) { hint.hidden = false; hint.textContent = error.message; }
        }
        get('extra-count').textContent = [...rows.keys()].filter(key => !baselineKeys.has(key)).length || '';
        paintPreview();
    }
    for (const [id,key] of [['variable','variable'],['name','name'],['sample','sample']]) {
        on(get(id),'input',() => { state[key] = get(id).value; edited(); }); on(get(id),'change',remember);
    }
    on(get('name-mode'),'change',() => { state.nameMode = get('name-mode').value; edited(true); });
    on(get('settings'),'submit',event => event.preventDefault());
    on(get('undo'),'click',() => {
        remember(); if (!undos.length) return;
        redos.push(clone(state)); state = undos.pop(); committed = clone(state); persist(); syncForm();
        get('undo').disabled = !undos.length; get('redo').disabled = !redos.length; status('Изменение отменено.');
    });
    on(get('redo'),'click',() => {
        if (!redos.length) return;
        undos.push(clone(state)); state = redos.pop(); committed = clone(state); persist(); syncForm();
        get('undo').disabled = !undos.length; get('redo').disabled = !redos.length; status('Изменение восстановлено.');
    });
    on(get('reset'),'click',() => { remember(); state = defaults(); syncForm(); persist(); remember(); status('Настройки сброшены. Кнопка «Отменить» восстановит персонажа.'); });
    on(get('copy'),'click',async () => {
        const code = c.compile(state).code; if (!code) return;
        try { await navigator.clipboard.writeText(code); status('Определение скопировано.'); }
        catch (_) { if (!disposed) { get('code').focus(); get('code').select(); status('Код выделен. Нажмите Ctrl+C или выберите «Копировать» в меню.'); } }
    });
    function download(name,content,type) {
        const url = URL.createObjectURL(new Blob([content],{type})); downloads.add(url);
        const link = element('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
        setTimeout(() => { URL.revokeObjectURL(url); downloads.delete(url); },1000);
    }
    on(get('download'),'click',() => { const code = c.compile(state).code; if (code) { download(state.variable + '.rpy',code + '\n','text/plain;charset=utf-8'); status('Определение сохранено в .rpy.'); } });
    on(get('save-project'),'click',() => { download((c.identifier(state.variable) ? state.variable : 'character') + '.character.json',c.project(state),'application/json'); status('Настройки сохранены. Их можно открыть в этом конструкторе.'); });
    on(get('load-project'),'click',() => get('project-file').click());
    on(get('project-file'),'change',async () => {
        const file = get('project-file').files[0]; if (!file) return;
        try {
            if (file.size > 1000000) throw new Error('Выберите JSON размером до 1 МБ.');
            const loaded = c.importProject(await file.text()); if (disposed) return;
            remember(); state = loaded; syncForm(); persist(); remember(); status('Настройки открыты. Предыдущие можно вернуть кнопкой «Отменить».');
        } catch (error) { status(error.message); }
        finally { if (!disposed) get('project-file').value = ''; }
    });
    const normalizeSearch = text => text.toLowerCase().replace(/ё/g,'е').replace(/[а-я]{4,}/g,word => word.replace(/(?:ами|ями|ого|ему|ой|ый|ая|ое|ов|ам|ям|ах|ях|ы|и|а|я|у|ю|е|о)$/,''));
    const aliases = {slow_cps:'скорость печать символ секунду',font:'шрифт путь файл',outlines:'обводка тень контур',color:'цвет прозрачность',justify:'выравнивание ширина',textalign:'выравнивание центр',size:'размер текст кегль',bold:'жирный полужирный',italic:'курсив наклон',underline:'подчеркивание'};
    const fieldScope = field => ['who','what','window','namebox'].includes(field.group) ? field.group : 'character';
    const filterProperties = () => {
        const scope = get('property-scope').value, query = get('property-search').value.toLowerCase().trim();
        const words = normalizeSearch(query).split(/\s+/);
        const matches = c.fields.filter(field => {
            const alias = Object.entries(aliases).filter(([key]) => field.key.endsWith('_' + key)).map(([,text]) => text).join(' ');
            const searchable = normalizeSearch(field.key + ' ' + field.label + ' ' + field.help + ' ' + alias);
            return !query || words.every(word => searchable.includes(word));
        });
        const fields = matches.filter(field => fieldScope(field) === scope);
        get('property').replaceChildren();
        for (const field of fields) option(get('property'),field.key,field.key + (field.label !== field.key ? ' / ' + field.label : ''));
        get('add-property').disabled = fields.length === 0; get('property').disabled = fields.length === 0;
        const elsewhere = fields.length ? null : matches.find(field => fieldScope(field) !== scope);
        const scopeLabel = elsewhere && [...get('property-scope').options].find(item => item.value === fieldScope(elsewhere)).textContent;
        get('property-help').textContent = fields.length ? 'Найдено: ' + fields.length + '. Выберите свойство и добавьте поле.' : elsewhere ? 'В этой области совпадений нет. Подходящий параметр есть в области «' + scopeLabel + '».' : 'Совпадений нет. Попробуйте другое название, например «скорость» или «обводка», либо добавьте свой параметр ниже.';
        get('switch-scope').hidden = !elsewhere;
        if (elsewhere) { get('switch-scope').dataset.scope = fieldScope(elsewhere); get('switch-scope').textContent = 'Искать в области «' + scopeLabel + '»'; }
    };
    on(get('switch-scope'),'click',() => { get('property-scope').value = get('switch-scope').dataset.scope; filterProperties(); get('property').focus(); });
    on(get('property-search'),'input',filterProperties); on(get('property-scope'),'change',filterProperties);
    function addExtra(key) {
        let row = rows.get(key);
        if (!row) row = addField(key,get('extra-fields'),true);
        reveal(row.row);
        row.input.focus(); row.row.scrollIntoView({block:'nearest'});
        get('extra-count').textContent = [...rows.keys()].filter(key => !baselineKeys.has(key)).length || '';
    }
    on(get('add-property'),'click',() => { const key = get('property').value; if (key) addExtra(key); });
    on(get('add-custom'),'click',() => {
        const key = get('custom-key').value.trim();
        if (!c.identifier(key) || ['name','__proto__','prototype','constructor'].includes(key)) { get('custom-error').hidden = false; get('custom-error').textContent = 'Введите имя параметра Python без пробелов. Параметр name уже задаётся полем имени.'; get('custom-key').setAttribute('aria-invalid','true'); return; }
        get('custom-error').hidden = true; get('custom-key').removeAttribute('aria-invalid'); addExtra(key); get('custom-key').value = '';
    });
    function reveal(target) {
        for (let parent = target.parentElement; parent && parent !== app; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
    }
    function focusTarget(target) {
        if (!target?.isConnected) return;
        reveal(target); target.focus({preventScroll:true}); target.scrollIntoView({block:'start'});
    }
    on(get('settings'),'focusin',event => { if (event.target.matches('input:not([type="checkbox"]), select')) lastField = event.target; });
    for (const button of app.querySelectorAll('[data-character-jump]')) on(button,'click',() => {
        const section = button.dataset.characterJump;
        focusTarget(section === 'settings' && lastField?.isConnected ? lastField : get(section + '-heading'));
    });
    on(get('fix-error'),'click',() => { const key = get('fix-error').dataset.key; focusTarget(rows.get(key)?.input || get(key)); });
    on(document,'keydown',event => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
        // Preserve the browser's native text undo inside editors.
        if (event.target.closest('input,textarea,[contenteditable="true"]')) return;
        if (event.key.toLowerCase() === 'z') { event.preventDefault(); get(event.shiftKey ? 'redo' : 'undo').click(); }
        if (event.key.toLowerCase() === 'y') { event.preventDefault(); get('redo').click(); }
    });
    on(get('preview-name'),'input',paintPreview);
    const zoom = active => {
        get('stage').classList.toggle('is-zoomed',active); get('zoom').setAttribute('aria-pressed',String(active)); get('zoom').textContent = active ? 'Вся сцена' : 'Крупнее';
    };
    on(get('zoom'),'click',() => zoom(get('zoom').getAttribute('aria-pressed') !== 'true'));
    zoom(true);
    on(get('background-color'),'input',() => { get('stage').style.backgroundColor = get('background-color').value; });
    const clearBackground = () => { backgroundRequest++; if (backgroundUrl) URL.revokeObjectURL(backgroundUrl); backgroundUrl = null; get('stage').style.backgroundImage = ''; get('background-file').value = ''; };
    on(get('clear-background'),'click',clearBackground);
    on(get('background-file'),'change',async () => {
        const file = get('background-file').files[0]; if (!file) return;
        const request = ++backgroundRequest; let url;
        try {
            if (file.size > 15000000 || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Выберите PNG, JPG или WebP размером до 15 МБ.');
            url = URL.createObjectURL(file); const image = new Image(); image.src = url; await image.decode();
            if (disposed || request !== backgroundRequest) { URL.revokeObjectURL(url); return; }
            if (backgroundUrl) URL.revokeObjectURL(backgroundUrl); backgroundUrl = url; get('stage').style.backgroundImage = 'url("' + url + '")'; status('Фон добавлен только в предпросмотр.');
        } catch (error) { if (url) URL.revokeObjectURL(url); status(error.message || 'Не удалось открыть изображение.'); }
    });
    for (const prefix of ['who','what']) on(get('font-' + prefix),'change',async () => {
        const file = get('font-' + prefix).files[0]; if (!file) return;
        const request = (fontRequests.get(prefix) || 0) + 1; fontRequests.set(prefix,request);
        try {
            if (file.size > 10000000 || !/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error('Выберите TTF, OTF, WOFF или WOFF2 размером до 10 МБ.');
            const name = 'character-preview-' + prefix + '-' + request;
            const face = new FontFace(name,await file.arrayBuffer()); await face.load();
            if (disposed || request !== fontRequests.get(prefix)) return;
            const previous = fontFaces.get(prefix); if (previous) document.fonts.delete(previous);
            document.fonts.add(face); fontFaces.set(prefix,face); fonts.set(prefix,name); paintPreview();
            status('Шрифт загружен для проверки. Укажите путь к нему в игре в поле ' + prefix + '_font.');
        } catch (_) { status('Не удалось загрузить шрифт. Выберите TTF, OTF, WOFF или WOFF2 размером до 10 МБ.'); }
    });
    on(get('clear-fonts'),'click',() => {
        for (const prefix of ['who','what']) { fontRequests.set(prefix,(fontRequests.get(prefix) || 0)+1); const face = fontFaces.get(prefix); if (face) document.fonts.delete(face); get('font-' + prefix).value = ''; }
        fontFaces.clear(); fonts.clear(); paintPreview();
    });
    on(get('replay'),'click',() => {
        paintPreview();
        const cps = value('what_slow_cps',30), multiplier = value('what_slow_cps_multiplier',1);
        if (matchMedia('(prefers-reduced-motion: reduce)').matches || value('slow',true) === false || value('all_at_once',false) === true || !number(cps,1,10000) || !number(multiplier,.01,10000)) return;
        const target = get('preview-what'), walker = document.createTreeWalker(target,NodeFilter.SHOW_TEXT), segments = [];
        let node, total = 0;
        while ((node = walker.nextNode())) { const characters = Array.from(node.textContent); segments.push({node,characters,start:total}); total += characters.length; node.textContent = ''; }
        const started = performance.now();
        const advance = () => {
            if (disposed) return;
            const count = Math.min(total,Math.floor((performance.now() - started)/1000*cps*multiplier));
            for (const segment of segments) segment.node.textContent = segment.characters.slice(0,Math.max(0,count - segment.start)).join('');
            if (count < total) typingTimer = setTimeout(advance,30); else paintPreview();
        };
        advance();
    });
    on(get('stage'),'click',() => {
        if (value('what_slow_abortable',value('slow_abortable',true)) !== false) paintPreview();
    });
    window.__esdocCharactersCleanup = () => {
        remember(); disposed = true; controller.abort(); clearTimeout(timer); clearTimeout(typingTimer); backgroundRequest++;
        if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
        for (const url of downloads) URL.revokeObjectURL(url);
        for (const face of fontFaces.values()) document.fonts.delete(face);
        window.__esdocCharactersCleanup = null;
    };
    syncForm(); filterProperties(); app.hidden = false;
})();
