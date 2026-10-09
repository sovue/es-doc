(function () {
    'use strict';
    window.__esdocColorsCleanup?.();
    const app = document.getElementById('colors-app');
    if (!app) return;
    const c = window.ESDocColors, get = id => document.getElementById('colors-' + id);
    const controller = new AbortController();
    const on = (element, event, callback) => element.addEventListener(event, callback, {signal: controller.signal});
    const outputIds = ['hex','rgb','rgba','css','hsl','oklch','renpy'];
    const ids = ['hex', 'r', 'g', 'b', 'a', 'h', 's', 'v', 'hh', 'ss', 'll', ...outputIds.map(id => 'output-' + id), 'background'];
    let color = c.parseHex('#2f7524'), hsv = c.rgbToHsv(color), other = c.parseHex('#fff');
    let role = 'text', surface = 'field', pointer = null, disposed = false, imageRequest = 0, imagePoint = {x: 0, y: 0};
    const undos = [], redos = [], copyTimers = new Map();
    let eyedropperOverlayTimer, eyedropperController, screenCaptureStream, screenCaptureVideo, screenPickResolve;
    const same = (first, second) => JSON.stringify(first) === JSON.stringify(second);
    const readList = key => {
        try {
            const data = JSON.parse(window.localStorage?.getItem('es-colors-' + key) || '[]');
            return Array.isArray(data) ? data.filter(value => value && ['r', 'g', 'b'].every(channel => c.parseNumber(value[channel], 0, 255, true) !== null) && c.parseNumber(value.a, 0, 1) !== null) : [];
        } catch (_) { return []; }
    };
    let saved = readList('saved'), recent = readList('recent').slice(0, 12);
    let clearedSaved = null;
    const snapshot = () => ({color: {...color}, hsv: {...hsv}, other: {...other}, role, saved: saved.map(value => ({...value})), clearedSaved: clearedSaved?.map(value => ({...value})) || null});
    let committed = snapshot();
    const persist = () => {
        try {
            if (!window.localStorage) return;
            window.localStorage.setItem('es-colors-saved', JSON.stringify(saved));
            window.localStorage.setItem('es-colors-recent', JSON.stringify(recent));
        } catch (_) { get('status').textContent = 'Не удалось сохранить в браузере. Цвета доступны до закрытия страницы.'; }
    };
    const remember = () => {
        recent = [({...color}), ...recent.filter(value => !same(value, color))].slice(0, 12);
        persist();
    };
    const commit = (record = true) => {
        const next = snapshot();
        if (!same(committed, next)) {
            undos.push(committed);
            if (undos.length > 64) undos.shift();
            committed = next;
            redos.length = 0;
            if (record) remember();
        }
        renderHistory();
        renderUndo();
    };
    const validFields = () => ids.filter(id => get(id).getAttribute('aria-invalid') === 'true');
    const errors = new Map();
    const inputHelp = () => {
        for (const id of ids) {
            const invalid = get(id).getAttribute('aria-invalid') === 'true';
            if (!invalid) errors.delete(id);
            get('error-' + id).textContent = invalid ? errors.get(id) : '';
            get('error-' + id).hidden = !invalid;
        }
        const text = validFields().map(id => errors.get(id)).join(' ');
        get('input-help').textContent = text; get('input-help').hidden = !text;
    };
    const fieldError = (id, message) => { get(id).setAttribute('aria-invalid', 'true'); errors.set(id, message); inputHelp(); };
    const formats = () => ({hex: c.toHex(color), rgb: c.pythonRgb(color), rgba: c.pythonRgba(color), css: c.cssRgb(color), hsl: c.cssHsl(color), oklch: c.cssOklch(color), renpy: c.renpyColor(color)});
    const preset = {
        basic: [['Чёрный','#000'],['Белый','#fff'],['Красный','#f00'],['Оранжевый','#f80'],['Жёлтый','#ff0'],['Зелёный','#0a0'],['Бирюзовый','#0cc'],['Синий','#00f'],['Фиолетовый','#80f'],['Розовый','#f08']],
        pastel: [['Пудровый','#ffd1dc'],['Персиковый','#ffdab9'],['Ванильный','#fff4b8'],['Фисташковый','#d4efbf'],['Мятный','#b5ead7'],['Небесный','#c7e9ff'],['Лавандовый','#d9c7ff'],['Сиреневый','#e6c8f2'],['Песочный','#eadbc8'],['Серый','#d8dfe8']],
        characters: [
            ['Диалог','#e2c778'], ['Алиса','#ffaa00'], ['Виола','#a5a5ff'],
            ['Мику','#00deff'], ['Ольга Дмитриевна','#00ea32'], ['Семён','#e1dd7d'],
            ['Женя','#72a0ff'], ['Пионер','#e60101'], ['Шурик','#fff226'],
            ['Славя','#ffd200'], ['Лена','#b956ff'], ['Ульяна','#ff3200'], ['Юля','#4eff00'],
        ],
        named: window.ESDocNamedColors,
    };
    let paletteLimit = 100;
    const normalizeSearch = value => value.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е');
    const namedIndex = preset.named.map(([name, hex]) => ({name, hex, search: normalizeSearch(name + ' ' + hex + ' ' + c.toHex(c.parseHex(hex)))}));
    const paintSwatches = (id, values, names = [], empty = '') => {
        const host = get(id);
        const buttons = [...host.querySelectorAll('button')];
        if (buttons.length !== values.length || !values.length) {
            host.replaceChildren();
            if (!values.length && empty) {
                const note = document.createElement('p');
                note.className = 'picker-empty'; note.textContent = empty; host.appendChild(note);
            }
            for (const value of values) {
                const button = document.createElement('button');
                button.type = 'button'; button.className = 'picker-swatch';
                button.append(document.createElement('span'), document.createElement('small'), document.createElement('small'));
                button.children[2].className = 'picker-swatch-name';
                if (id !== 'swatches') on(button, 'click', () => choose(JSON.parse(button.dataset.color)));
                host.appendChild(button);
            }
        }
        host.style.setProperty('--swatch-count', values.length);
        [...host.querySelectorAll('button')].forEach((button, index) => {
            const value = values[index], hex = c.toHex(value), label = names[index] || hex;
            const encoded = JSON.stringify(value), pressed = String(c.toHex(color) === hex), title = label + (label === hex ? '' : ' / ' + hex);
            if (button.dataset.color !== encoded) {
                button.dataset.color = encoded;
                button.dataset.hex = c.toHex(value, false, false);
                button.children[0].style.background = 'linear-gradient(' + c.cssRgb(value) + ',' + c.cssRgb(value) + '), conic-gradient(#ccc 25%,#fff 0 50%,#ccc 0 75%,#fff 0) 0 0 / 12px 12px';
                button.children[1].textContent = hex;
            }
            if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
            if (button.title !== title) { button.title = title; button.setAttribute('aria-label', label + (label === hex ? '' : ', ' + hex)); }
            const nameHidden = id !== 'swatches' || get('palette').value !== 'named';
            if (button.children[2].hidden !== nameHidden) button.children[2].hidden = nameHidden;
            if (button.children[2].textContent !== label) button.children[2].textContent = label;
        });
    };
    on(get('swatches'), 'click', event => {
        const button = event.target.closest?.('button[data-color]');
        if (button && get('swatches').contains(button)) choose(JSON.parse(button.dataset.color));
    });
    let paletteKey = '';
    const paintPalette = entries => {
        const host = get('swatches'), key = JSON.stringify(entries);
        if (key !== paletteKey) {
            paletteKey = key; host.replaceChildren();
            if (!entries.length) {
                const note = document.createElement('p');
                note.className = 'picker-empty'; note.textContent = 'Не найдено. Измените название или HEX.'; host.appendChild(note);
            }
            for (const [name, hex] of entries) {
                const base = c.parseHex(hex), hsl = c.rgbToHsl(base);
                const row = document.createElement('div'); row.className = 'picker-palette-row'; row.dataset.hex = c.toHex(base, false, false);
                const variants = [.65, .75, .85].map(l => c.hslToRgb({h: hsl.h, s: hsl.s ? 100 : 0, l: l * 100}));
                for (const [index, value] of [...variants, base, ...variants.slice().reverse()].entries()) {
                    const button = document.createElement('button'), valueHex = c.toHex(value, false, false);
                    button.type = 'button'; button.className = index === 3 ? 'picker-palette-color' : 'picker-palette-variant';
                    button.dataset.color = JSON.stringify(value);
                    button.dataset.hex = valueHex;
                    button.style.backgroundColor = c.cssRgb(value);
                    button.style.color = c.contrast({r:23,g:38,b:26,a:1}, value) >= 4.5 ? '#17261a'
                        : c.contrast({r:0,g:0,b:0,a:1}, value) >= 4.5 ? '#000' : '#fff';
                    button.title = name + ' / ' + valueHex;
                    button.setAttribute('aria-label', (index === 3 ? name : 'Оттенок: ' + name) + ', ' + valueHex);
                    if (index === 3) {
                        const label = document.createElement('span'), code = document.createElement('code');
                        label.textContent = name; code.textContent = valueHex; button.append(label, code);
                    }
                    row.appendChild(button);
                }
                host.appendChild(row);
            }
        }
        const selectedHex = c.toHex(color, color.a < 1, false);
        for (const button of host.querySelectorAll('button')) {
            const pressed = String(button.dataset.hex === selectedHex);
            if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
        }
    };
    const renderPalette = () => {
        const named = get('palette').value === 'named';
        get('palette-search-control').hidden = !named;
        get('palette-summary').hidden = !named;
        const query = normalizeSearch(get('palette-search').value);
        const entries = named ? namedIndex.filter(entry => entry.search.includes(query)) : [];
        const values = named ? entries.slice(0, paletteLimit).map(({name, hex}) => [name, hex]) : preset[get('palette').value] || preset.basic;
        paintPalette(values);
        const summary = 'Показано ' + values.length + ' из ' + entries.length;
        if (get('palette-summary').textContent !== summary) get('palette-summary').textContent = summary;
        get('palette-more').hidden = !named || values.length >= entries.length;
    };
    const renderUndo = () => {
        get('undo').disabled = !undos.length && same(committed, snapshot());
        get('redo').disabled = !redos.length;
    };
    const renderHistory = () => {
        paintSwatches('saved', saved, [], 'Сохраните выбранный цвет кнопкой «Сохранить цвет».');
        paintSwatches('recent', recent, [], 'Здесь появятся цвета после выбора или копирования.');
        get('copy-saved').disabled = !saved.length;
        get('clear-saved').disabled = !saved.length;
        get('saved-recovery').hidden = !clearedSaved?.length || !!saved.length;
    };
    const renderContrast = () => {
        const asBackground = role === 'background';
        const foreground = asBackground ? other : color, background = asBackground ? color : other;
        const bg = c.composite(background, {r: 255, g: 255, b: 255, a: 1}), fg = c.composite(foreground, bg);
        get('sample').style.backgroundColor = c.cssRgb(bg);
        get('sample').style.color = c.cssRgb(fg);
        get('other-label').textContent = asBackground ? 'Текст' : 'Фон';
        const ratio = c.contrast(foreground, background);
        get('contrast-value').textContent = (Math.floor(ratio * 100) / 100).toFixed(2) + ':1';
        get('contrast-aa').textContent = ratio >= 7 ? 'AAA / обычный текст' : ratio >= 4.5 ? 'AA / обычный текст' : ratio >= 3 ? 'AA / только крупный текст' : 'Недостаточный контраст';
    };
    const render = (force = false) => {
        const hsl = c.rgbToHsl(color);
        if (!hsl.s) hsl.h = hsv.h;
        const values = {hex: c.toHex(color), r: color.r, g: color.g, b: color.b, a: c.decimal(color.a),
            h: c.decimal(hsv.h, 2), s: c.decimal(hsv.s, 2), v: c.decimal(hsv.v, 2),
            hh: c.decimal(hsl.h, 2), ss: c.decimal(hsl.s, 2), ll: c.decimal(hsl.l, 2)};
        for (const [id, value] of Object.entries(values)) {
            const input = get(id);
            if (force === true || document.activeElement !== input && input.getAttribute('aria-invalid') !== 'true') input.value = value;
        }
        for (const [id, value] of Object.entries(formats())) {
            const input = get('output-' + id);
            if (force === true || document.activeElement !== input && input.getAttribute('aria-invalid') !== 'true') input.value = value;
            get('copy-' + id).disabled = input.getAttribute('aria-invalid') === 'true';
        }
        get('preview-role').value = role;
        if (force === true || document.activeElement !== get('background') && get('background').getAttribute('aria-invalid') !== 'true') get('background').value = c.toHex(other);
        get('current').style.backgroundColor = c.cssRgb(color);
        get('hue').value = hsv.h; get('hue-value').textContent = c.decimal(hsv.h, 1) + '°';
        get('alpha').value = color.a * 100; get('alpha-value').textContent = c.decimal(color.a * 100, 1) + '%';
        get('brightness').value = hsv.v; get('brightness-value').textContent = c.decimal(hsv.v, 1) + '%';
        get('s-range').value = hsv.s; get('v-range').value = hsv.v;
        for (const id of ['s-range', 'v-range']) get(id).setAttribute('aria-valuetext', 'Насыщенность ' + c.decimal(hsv.s, 1) + '%, яркость ' + c.decimal(hsv.v, 1) + '%');
        get('sv').style.setProperty('--hue-color', 'hsl(' + hsv.h + ' 100% 50%)');
        get('sv').classList.toggle('is-wheel', surface === 'wheel');
        get('sv').style.setProperty('--wheel-shade', 1 - hsv.v / 100);
        get('brightness-row').hidden = surface !== 'wheel';
        get('area-help').textContent = surface === 'wheel' ? 'Тон' : 'Насыщенность';
        get('area-second').textContent = surface === 'wheel' ? 'Насыщенность' : 'Яркость';
        get('sv').setAttribute('aria-label', surface === 'wheel' ? 'Тон и насыщенность' : 'Насыщенность и яркость');
        get('area-value').textContent = surface === 'wheel' ? c.decimal(hsv.h, 1) + '°' : c.decimal(hsv.s, 1) + '%';
        get('area-second-value').textContent = c.decimal(surface === 'wheel' ? hsv.s : hsv.v, 1) + '%';
        const angle = hsv.h * Math.PI / 180;
        get('cursor').style.left = (surface === 'wheel' ? 50 + Math.cos(angle) * hsv.s / 2 : hsv.s) + '%';
        get('cursor').style.top = (surface === 'wheel' ? 50 + Math.sin(angle) * hsv.s / 2 : 100 - hsv.v) + '%';
        get('cursor').style.backgroundColor = c.cssRgb({...color, a: 1});
        get('alpha').style.setProperty('--range-bg', 'linear-gradient(to right, transparent, ' + c.cssRgb({...color, a: 1}) + ')');
        get('brightness').style.setProperty('--range-bg', 'linear-gradient(to right, #000, ' + c.cssRgb(c.hsvToRgb({...hsv, v: 100, a: 1})) + ')');
        renderPalette();
        paintSwatches('harmonies', c.harmony(color, get('harmony').value));
        paintSwatches('shades', c.shades(color));
        renderHistory(); renderContrast(); renderUndo();
    };
    const update = (next, nextHsv = null, clearInvalid = false) => {
        color = {...next}; hsv = nextHsv || c.rgbToHsv(color, hsv.h);
        if (clearInvalid) for (const id of ids) get(id).removeAttribute('aria-invalid');
        inputHelp(); get('status').textContent = ''; render();
    };
    const choose = next => { update(next, null, true); render(true); commit(); };
    for (const id of ids.filter(id => !id.startsWith('output-') && id !== 'background')) {
        const input = get(id);
        on(input, 'input', () => {
            const numeric = input.value.replace(',', '.');
            const value = id === 'hex' ? c.parseColor(input.value) : c.parseNumber(numeric, 0,
                id === 'a' ? 1 : ['h','hh'].includes(id) ? 360 : ['r','g','b'].includes(id) ? 255 : 100, ['r','g','b'].includes(id));
            if (value === null) {
                fieldError(id, id === 'hex' ? 'Не удалось прочитать цвет. Проверьте HEX, CSS или tuple (R, G, B).'
                    : ['r','g','b'].includes(id) ? 'Каналы RGB — целые числа от 0 до 255.'
                    : id === 'a' ? 'Прозрачность — число от 0 до 1.'
                    : ['h','hh'].includes(id) ? 'Тон — число от 0 до 360.' : 'Введите число от 0 до 100.');
                return;
            }
            input.removeAttribute('aria-invalid');
            if (id === 'hex') update(value, null, true);
            else if (['h','s','v'].includes(id)) { const next = {...hsv, [id]: value}; update(c.hsvToRgb(next), next); }
            else if (['hh','ss','ll'].includes(id)) {
                const next = c.rgbToHsl(color); if (!next.s) next.h = hsv.h;
                next[{hh:'h',ss:'s',ll:'l'}[id]] = value;
                const rgb = c.hslToRgb(next); update(rgb, c.rgbToHsv(rgb, next.h));
            }
            else update({...color, [id]: value}, id === 'a' ? {...hsv, a: value} : null);
        });
        on(input, 'change', () => { if (!validFields().length) commit(); });
        on(input, 'blur', () => { if (!validFields().length) commit(); render(); });
        on(input, 'keydown', event => {
            if (event.key === 'Enter' && !validFields().length) commit();
            if (id === 'hex' || !['ArrowUp','ArrowDown','Home','End'].includes(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
            event.preventDefault();
            const maximum = id === 'a' ? 1 : ['h','hh'].includes(id) ? 360 : ['r','g','b'].includes(id) ? 255 : 100;
            const current = c.parseNumber(input.value.replace(',', '.'), 0, maximum);
            if (current === null) return;
            const step = (id === 'a' ? .01 : 1) * (event.shiftKey ? 10 : 1);
            input.value = c.decimal(event.key === 'Home' ? 0 : event.key === 'End' ? maximum : c.clamp(current + (event.key === 'ArrowUp' ? step : -step), 0, maximum));
            input.dispatchEvent(new Event('input', {bubbles: true})); commit();
        });
    }
    for (const [id, channel, factor] of [['hue','h',1],['brightness','v',1],['alpha','a',.01],['s-range','s',1],['v-range','v',1]]) {
        on(get(id), 'input', () => { const next = {...hsv, [channel]: Number(get(id).value) * factor}; update(c.hsvToRgb(next), next, true); });
        on(get(id), 'change', () => commit());
    }
    on(get('space'), 'change', () => { for (const space of ['rgb','hsv','hsl']) get('fields-' + space).hidden = get('space').value !== space; });
    for (const radio of app.querySelectorAll('[name="color-surface"]')) on(radio, 'change', () => { surface = radio.value; render(); });
    for (const format of outputIds) {
        const input = get('output-' + format);
        on(input, 'input', () => {
            const text = input.value.trim();
            const matches = format === 'hex' ? !!c.parseHex(text) : format === 'renpy' ? /^renpy\.Color\(/i.test(text)
                : format === 'rgb' ? /^\([^,]+,[^,]+,[^,]+\)$/.test(text)
                : format === 'rgba' ? /^\([^,]+,[^,]+,[^,]+,[^,]+\)$/.test(text)
                : new RegExp('^' + (format === 'css' ? 'rgba?' : format === 'hsl' ? 'hsla?' : 'oklch') + '\\(', 'i').test(text);
            const parsed = matches ? c.parseColor(text) : null;
            if (!parsed) {
                get('copy-' + format).disabled = true;
                const examples = {hex: 'HEX: #abc или #aabbcc; с прозрачностью #abcd или #aabbccdd.',
                    rgb: 'RGB: (R, G, B), целые каналы от 0 до 255.', rgba: 'RGBA: (R, G, B, A), каналы от 0 до 255, прозрачность от 0 до 1.',
                    renpy: 'Ren’Py: renpy.Color("#aabbcc") или renpy.Color("#aabbcc", alpha=0.5). Прозрачность — от 0 до 1.',
                    css: 'CSS RGB: rgb(255 0 0 / 50%), каналы от 0 до 255.', hsl: 'HSL: hsl(120 100% 50% / 0.5), насыщенность и светлота от 0 до 100%.',
                    oklch: 'OKLCH: oklch(62.8% 0.258 29.2 / 0.5), светлота от 0 до 100%, цветность неотрицательная.'};
                fieldError('output-' + format, examples[format]); return;
            }
            if (format === 'rgb') parsed.a = color.a;
            update(parsed, null, true);
        });
        const finishEdit = () => { if (input.getAttribute('aria-invalid') !== 'true') { commit(); input.value = formats()[format]; } };
        on(input,'change', finishEdit); on(input,'blur', finishEdit);
        on(input,'keydown', event => { if (event.key === 'Enter') finishEdit(); });
    }
    const fromPointer = event => {
        const rect = get('sv').getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
        const next = surface === 'wheel' ? {...hsv, h: Math.hypot(x - .5, y - .5) < .001 ? hsv.h : (Math.atan2(y - .5, x - .5) * 180 / Math.PI + 360) % 360, s: c.clamp(Math.hypot(x - .5, y - .5) * 200, 0, 100)}
            : {...hsv, s: c.clamp(x * 100, 0, 100), v: 100 - c.clamp(y * 100, 0, 100)};
        update(c.hsvToRgb(next), next, true);
    };
    on(get('sv'), 'pointerdown', event => { if (event.button !== 0) return; pointer = event.pointerId; get('sv').setPointerCapture(pointer); get('sv').focus({preventScroll:true}); fromPointer(event); });
    on(get('sv'), 'pointermove', event => { if (event.pointerId === pointer) fromPointer(event); });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) on(get('sv'), type, () => { if (pointer !== null) { pointer = null; commit(); } });
    on(get('sv'), 'keydown', event => {
        if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
        event.preventDefault();
        const next = {...hsv}, step = event.shiftKey || event.key.startsWith('Page') ? 10 : 1;
        if (surface === 'wheel') {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next.h = (next.h + (event.key === 'ArrowLeft' ? -step : step) + 360) % 360;
            else if (event.key === 'ArrowUp' || event.key === 'PageUp') next.s = c.clamp(next.s + step,0,100);
            else if (event.key === 'ArrowDown' || event.key === 'PageDown') next.s = c.clamp(next.s - step,0,100);
            else next.s = event.key === 'Home' ? 0 : 100;
        }
        else if (event.key === 'ArrowLeft') next.s = c.clamp(next.s - step, 0, 100);
        else if (event.key === 'ArrowRight') next.s = c.clamp(next.s + step, 0, 100);
        else if (event.key === 'ArrowUp' || event.key === 'PageUp') next.v = c.clamp(next.v + step, 0, 100);
        else if (event.key === 'ArrowDown' || event.key === 'PageDown') next.v = c.clamp(next.v - step, 0, 100);
        else next[event.target === get('v-range') ? 'v' : 's'] = event.key === 'Home' ? 0 : 100;
        update(c.hsvToRgb(next), next, true); commit();
    });
    const travel = backwards => {
        commit(false);
        const from = backwards ? undos : redos, to = backwards ? redos : undos;
        if (!from.length) return;
        to.push(snapshot()); const next = from.pop();
        const collectionChanged = !same(saved, next.saved);
        color = {...next.color}; hsv = {...next.hsv}; other = {...next.other}; role = next.role;
        saved = next.saved.map(value => ({...value})); clearedSaved = next.clearedSaved?.map(value => ({...value})) || null; committed = snapshot();
        for (const id of ids) get(id).removeAttribute('aria-invalid');
        inputHelp(); render(true);
        get('status').textContent = collectionChanged && saved.length ? 'Сохранённые цвета восстановлены.' : backwards ? 'Изменение отменено.' : 'Изменение повторено.';
        persist();
    };
    on(get('undo'), 'click', () => travel(true)); on(get('redo'), 'click', () => travel(false));
    on(document, 'keydown', event => {
        if (!app.contains(event.target) && event.target !== document.body) return;
        if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'z') return;
        event.preventDefault(); travel(!event.shiftKey);
    });
    const copy = async (button, value, message, field = null) => {
        try {
            if (!window.navigator?.clipboard) throw new Error('Clipboard unavailable');
            await window.navigator.clipboard.writeText(value);
            if (disposed) return;
            commit(); remember(); renderHistory();
            button.classList.add('copied'); get('status').textContent = message || 'Скопировано: ' + value;
            clearTimeout(copyTimers.get(button));
            copyTimers.set(button, setTimeout(() => { button.classList.remove('copied'); copyTimers.delete(button); }, 1600));
        } catch (_) {
            if (disposed) return;
            const input = field || get('copy-fallback'); input.hidden = false; input.value = value; input.focus(); input.select();
            get('status').textContent = 'Не удалось скопировать. Значение выделено: нажмите Ctrl+C или скопируйте вручную.';
        }
    };
    for (const format of outputIds) on(get('copy-' + format), 'click', () => { if (get('output-' + format).getAttribute('aria-invalid') !== 'true') copy(get('copy-' + format), formats()[format], '', get('output-' + format)); });
    const copyList = (id, values) => copy(get(id), JSON.stringify(values.map(value => c.toHex(value))), 'Палитра скопирована в HEX.');
    on(get('copy-palette'), 'click', () => copyList('copy-palette', c.harmony(color, get('harmony').value)));
    on(get('copy-shades'), 'click', () => copyList('copy-shades', c.shades(color)));
    on(get('copy-saved'), 'click', () => copyList('copy-saved', saved));
    on(get('save'), 'click', () => {
        commit(); if (!saved.some(value => same(value, color))) saved.push({...color});
        commit(false); get('status').textContent = 'Цвет сохранён в «Мои цвета».'; persist();
    });
    on(get('clear-saved'), 'click', () => {
        if (!saved.length) return;
        commit(); clearedSaved = saved.map(value => ({...value})); saved = []; commit(false);
        get('status').textContent = 'Сохранённые цвета очищены. Их можно восстановить кнопкой или Ctrl+Z.'; persist();
    });
    on(get('restore-saved'), 'click', () => {
        if (!clearedSaved?.length) return;
        commit(); saved = clearedSaved.map(value => ({...value})); clearedSaved = null; commit(false);
        get('status').textContent = 'Сохранённые цвета восстановлены.'; persist();
    });
    on(get('palette'), 'change', () => { paletteLimit = 100; get('palette-search').value = ''; renderPalette(); });
    on(get('palette-search'), 'input', () => { paletteLimit = 100; renderPalette(); });
    on(get('palette-more'), 'click', () => { paletteLimit += 100; renderPalette(); });
    on(get('harmony'), 'change', render);
    on(get('preview-role'), 'change', () => { commit(); const nextRole = get('preview-role').value; const before = {...color}; color = {...other}; other = before; role = nextRole; hsv = c.rgbToHsv(color); for (const id of ids) get(id).removeAttribute('aria-invalid'); inputHelp(); render(true); commit(); });
    on(get('background'), 'input', () => {
        const parsed = c.parseColor(get('background').value);
        if (!parsed) { fieldError('background', 'Не удалось прочитать цвет. Проверьте HEX, CSS или tuple (R, G, B).'); return; }
        other = parsed; get('background').removeAttribute('aria-invalid'); inputHelp();
        get('contrast-note').textContent = 'WCAG / обычный текст 4.5:1, крупный 3:1. Прозрачность учитывается на белой подложке.';
        renderContrast();
    });
    for (const type of ['change','blur']) on(get('background'), type, () => { if (get('background').getAttribute('aria-invalid') !== 'true') commit(); });
    on(get('swap'), 'click', () => { commit(); const next = {...other}; other = {...color}; update(next, null, true); render(true); commit(); });
    on(get('reset'), 'click', () => { commit(); other = c.parseHex(role === 'text' ? '#fff' : '#2f7524'); update(c.parseHex(role === 'text' ? '#2f7524' : '#fff'), null, true); render(true); commit(); });
    const tabs = ['palettes','shades','saved','image'];
    const showTab = id => {
        for (const name of tabs) {
            get('tab-' + name).setAttribute('aria-selected', String(id === name));
            get('tab-' + name).tabIndex = id === name ? 0 : -1;
            get('panel-' + name).hidden = id !== name;
        }
    };
    for (const [index, id] of tabs.entries()) {
        on(get('tab-' + id), 'click', () => showTab(id));
        on(get('tab-' + id), 'keydown', event => {
            if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
            showTab(tabs[next]); get('tab-' + tabs[next]).focus();
        });
    }
    for (const [section, target] of [['code','code-heading'],['editor','editor-heading'],['contrast','contrast-heading']]) {
        on(get('jump-' + section), 'click', () => { get(target).focus({preventScroll: true}); get(target).scrollIntoView({block: 'start', behavior: 'auto'}); });
    }
    const shortcuts = get('shortcuts');
    on(get('shortcuts-open'), 'click', () => shortcuts.showModal());
    on(get('shortcuts-close'), 'click', () => shortcuts.close());
    on(shortcuts, 'click', event => {
        const rect = shortcuts.getBoundingClientRect();
        if (event.target === shortcuts && (event.clientX < rect.left || event.clientX > rect.left + rect.width || event.clientY < rect.top || event.clientY > rect.top + rect.height)) shortcuts.close();
    });
    on(shortcuts, 'close', () => { if (!disposed) get('shortcuts-open').focus({preventScroll: true}); });
    // Cancel events delivered to the page. Native browser eyedropper UI may
    // consume mouse input before it reaches the document.
    const cancelEyedropper = event => {
        if (!eyedropperController || eyedropperController.signal.aborted) return;
        event.preventDefault();
        eyedropperController.abort();
        clearTimeout(eyedropperOverlayTimer);
        get('eyedropper-overlay').hidden = true;
        get('status').textContent = 'Выбор пипеткой отменён.';
    };
    on(document, 'pointerdown', event => { if (event.button === 2) cancelEyedropper(event); });
    on(document, 'contextmenu', cancelEyedropper);
    on(document, 'keydown', event => { if (event.key === 'Escape') cancelEyedropper(event); });
    on(get('eyedropper-overlay'), 'pointerdown', event => {
        if (!screenCaptureVideo || event.button !== 0 || get('eyedropper-overlay').hidden) return;
        if (event.target.closest?.('.picker-eyedropper-help')) return;
        event.preventDefault();
        try {
            const sampleCanvas = document.createElement('canvas');
            const scale = Math.min(1, 4096 / screenCaptureVideo.videoWidth, 4096 / screenCaptureVideo.videoHeight, Math.sqrt(12000000 / (screenCaptureVideo.videoWidth * screenCaptureVideo.videoHeight)));
            sampleCanvas.width = Math.max(1, Math.round(screenCaptureVideo.videoWidth * scale)); sampleCanvas.height = Math.max(1, Math.round(screenCaptureVideo.videoHeight * scale));
            const context = sampleCanvas.getContext('2d', {willReadFrequently: true});
            context.drawImage(screenCaptureVideo, 0, 0, sampleCanvas.width, sampleCanvas.height);
            const x = c.clamp(Math.floor(event.clientX / window.innerWidth * screenCaptureVideo.videoWidth * scale), 0, sampleCanvas.width - 1);
            const y = c.clamp(Math.floor(event.clientY / window.innerHeight * screenCaptureVideo.videoHeight * scale), 0, sampleCanvas.height - 1);
            const pixel = context.getImageData(x, y, 1, 1).data;
            screenPickResolve?.({r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] / 255});
        } catch (_) {
            get('status').textContent = 'Не удалось прочитать цвет экрана. Выберите вкладку Firefox в окне захвата.';
        }
    });
    const nativeEyedropper = window.EyeDropper && window.isSecureContext;
    const screenEyedropper = window.isSecureContext && window.navigator.mediaDevices?.getDisplayMedia;
    if (nativeEyedropper || screenEyedropper) {
        get('eyedropper').hidden = false;
        on(get('eyedropper'), 'click', async () => {
            const pickController = new AbortController();
            eyedropperController = pickController;
            const abortPick = () => pickController.abort();
            controller.signal.addEventListener('abort', abortPick, {once: true});
            get('eyedropper').disabled = true;
            try {
                let result;
                if (nativeEyedropper) {
                    // Chromium snapshots the screen on open. Delay the dimmer until after
                    // that capture so the magnifier samples the original page colors.
                    eyedropperOverlayTimer = setTimeout(() => { if (!disposed) get('eyedropper-overlay').hidden = false; }, 300);
                    result = c.parseHex((await new window.EyeDropper().open({signal: pickController.signal})).sRGBHex);
                } else {
                    get('status').textContent = 'В окне Firefox выберите эту вкладку для захвата экрана.';
                    screenCaptureStream = await window.navigator.mediaDevices.getDisplayMedia({video: true, audio: false, preferCurrentTab: true});
                    screenCaptureVideo = document.createElement('video');
                    screenCaptureVideo.muted = true; screenCaptureVideo.playsInline = true; screenCaptureVideo.srcObject = screenCaptureStream;
                    await screenCaptureVideo.play();
                    if (!screenCaptureVideo.videoWidth || !screenCaptureVideo.videoHeight) throw new Error('Captured tab is not ready');
                    if (pickController.signal.aborted || disposed) return;
                    get('eyedropper-overlay').classList.add('picker-eyedropper-overlay-capture');
                    get('eyedropper-overlay').hidden = false;
                    get('status').textContent = 'Нажмите на нужный цвет. Esc отменяет выбор.';
                    result = await new Promise((resolve, reject) => {
                        screenPickResolve = resolve;
                        pickController.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true});
                    });
                }
                if (!disposed && !pickController.signal.aborted) choose(result);
            }
            catch (error) { if (!disposed) get('status').textContent = error.name === 'AbortError' ? 'Выбор пипеткой отменён.' : error.name === 'NotAllowedError' ? 'Захват вкладки отменён. Разрешите его или выберите цвет из изображения.' : 'Не удалось открыть пипетку. Используйте поле или изображение.'; }
            finally {
                controller.signal.removeEventListener('abort', abortPick);
                if (eyedropperController === pickController) eyedropperController = null;
                screenPickResolve = null; screenCaptureVideo = null;
                screenCaptureStream?.getTracks().forEach(track => track.stop()); screenCaptureStream = null;
                clearTimeout(eyedropperOverlayTimer);
                if (!disposed) { get('eyedropper').disabled = false; get('eyedropper-overlay').hidden = true; get('eyedropper-overlay').classList.remove('picker-eyedropper-overlay-capture'); get('eyedropper').focus({preventScroll: true}); }
            }
        });
    }
    const canvas = get('image-canvas');
    const imageContext = () => canvas.getContext('2d', {willReadFrequently: true});
    const placeImagePoint = () => {
        get('image-cursor').style.left = (imagePoint.x + .5) / canvas.width * 100 + '%';
        get('image-cursor').style.top = (imagePoint.y + .5) / canvas.height * 100 + '%';
    };
    const pickImagePoint = () => {
        const pixel = imageContext().getImageData(imagePoint.x, imagePoint.y, 1, 1).data;
        choose({r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] / 255}); placeImagePoint();
    };
    on(get('image-add'), 'click', () => { get('image-file').value = ''; get('image-file').click(); });
    on(get('image-file'), 'change', async () => {
        const file = get('image-file').files[0];
        if (!file) return;
        const request = ++imageRequest; get('image-add').disabled = false;
        if (!['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(file.type)) { get('image-status').textContent = 'Этот формат не поддерживается. Выберите PNG, JPEG, WebP, GIF или AVIF.'; return; }
        if (file.size > 40 * 1024 * 1024) { get('image-status').textContent = 'Изображение больше 40 МиБ. Откройте уменьшенную копию.'; return; }
        get('image-add').disabled = true; get('image-status').textContent = 'Читаем изображение…';
        let bitmap;
        try {
            bitmap = await createImageBitmap(file);
            if (disposed || request !== imageRequest) return;
            const scale = Math.min(1, 4096 / bitmap.width, 4096 / bitmap.height, Math.sqrt(12000000 / (bitmap.width * bitmap.height)));
            canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
            const context = imageContext();
            context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            get('image-stage').hidden = false;
            imagePoint = {x: Math.floor(canvas.width / 2), y: Math.floor(canvas.height / 2)}; placeImagePoint();
            const data = context.getImageData(0, 0, canvas.width, canvas.height).data, buckets = new Map(), stride = Math.max(1, Math.floor(canvas.width * canvas.height / 65536));
            for (let pixel = 0; pixel < data.length / 4; pixel += stride) {
                const i = pixel * 4; if (data[i + 3] < 128) continue;
                const key = (data[i] >> 4) + ',' + (data[i + 1] >> 4) + ',' + (data[i + 2] >> 4);
                const bucket = buckets.get(key) || {r:0,g:0,b:0,count:0};
                bucket.r += data[i]; bucket.g += data[i + 1]; bucket.b += data[i + 2]; bucket.count++; buckets.set(key,bucket);
            }
            const dominant = [];
            for (const bucket of [...buckets.values()].sort((a,b) => b.count - a.count)) {
                const value = {r:Math.round(bucket.r / bucket.count),g:Math.round(bucket.g / bucket.count),b:Math.round(bucket.b / bucket.count),a:1};
                if (dominant.every(existing => Math.hypot(existing.r-value.r,existing.g-value.g,existing.b-value.b) > 40)) dominant.push(value);
                if (dominant.length === 8) break;
            }
            paintSwatches('image-palette', dominant, [], 'Нет достаточно непрозрачных пикселей для палитры. Выберите отдельный пиксель.');
            get('image-status').textContent = '';
            get('image-meta').hidden = false; get('image-meta').textContent = canvas.width + ' × ' + canvas.height + (scale < 1 ? ' / уменьшено для просмотра' : '');
        } catch (_) { if (!disposed && request === imageRequest) get('image-status').textContent = 'Не удалось прочитать изображение. Попробуйте другой файл или сохраните его как PNG.'; }
        finally { bitmap?.close(); if (!disposed && request === imageRequest) get('image-add').disabled = false; }
    });
    on(canvas, 'pointerdown', event => {
        if (event.button !== 0) return;
        const rect = canvas.getBoundingClientRect();
        imagePoint = {x: c.clamp(Math.floor((event.clientX-rect.left)/rect.width*canvas.width),0,canvas.width-1), y: c.clamp(Math.floor((event.clientY-rect.top)/rect.height*canvas.height),0,canvas.height-1)};
        pickImagePoint();
    });
    on(canvas, 'keydown', event => {
        if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Enter' || event.key === ' ') { pickImagePoint(); return; }
        const step = event.shiftKey ? 10 : 1;
        if (event.key === 'ArrowLeft') imagePoint.x -= step;
        if (event.key === 'ArrowRight') imagePoint.x += step;
        if (event.key === 'ArrowUp') imagePoint.y -= step;
        if (event.key === 'ArrowDown') imagePoint.y += step;
        imagePoint.x = c.clamp(imagePoint.x,0,canvas.width-1); imagePoint.y = c.clamp(imagePoint.y,0,canvas.height-1);
        placeImagePoint();
    });
    window.__esdocColorsCleanup = () => {
        disposed = true; imageRequest++; controller.abort();
        clearTimeout(eyedropperOverlayTimer);
        screenCaptureStream?.getTracks().forEach(track => track.stop()); screenCaptureStream = null; screenCaptureVideo = null; screenPickResolve = null;
        shortcuts.close(); get('eyedropper-overlay').hidden = true; get('eyedropper-overlay').classList.remove('picker-eyedropper-overlay-capture');
        for (const timer of copyTimers.values()) clearTimeout(timer);
        canvas.width = canvas.height = 0;
        window.__esdocColorsCleanup = null;
    };
    app.hidden = false; render();
})();
