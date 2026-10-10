/* Typed Character export. User Python is stored as text, never executed. */
(function () {
    'use strict';
    const catalog = window.ESDocCharacterCatalog;
    const definitions = [
        ['kind','Основа персонажа','expression','identity','adv / nvl / свой персонаж'],
        ['dynamic','Динамическое имя','boolean','identity','Имя вычисляется перед каждой репликой.'],
        ['image','Тег изображения','text','identity','Связывает персонажа с изображением и side image.'],
        ['voice_tag','Тег голоса','text','identity','Для отдельных настроек голоса персонажа.'],
        ['who_prefix','Префикс имени','text','who','Текст перед именем.'],
        ['who_suffix','Суффикс имени','text','who','Текст после имени.'],
        ['what_prefix','Префикс реплики','text','what','Текст перед репликой.'],
        ['what_suffix','Суффикс реплики','text','what','Текст после реплики.'],
        ['who_style','Стиль имени','text','who','Имя стиля из проекта.'],
        ['what_style','Стиль реплики','text','what','Имя стиля из проекта.'],
        ['window_style','Стиль окна','text','window','Имя стиля из проекта.'],
        ['namebox_style','Стиль плашки имени','text','namebox','Для стандартного GUI Ren\'Py.'],
        ['condition','Условие показа','text','behavior','Python-выражение в строке, например has_met_eileen.'],
        ['interact','Ожидание ввода','boolean','behavior','Останавливает игру на реплике.'],
        ['advance','Разрешить переход дальше','boolean','behavior','Разрешает клик, пропуск и автопереход.'],
        ['callback','Обработчик событий','expression','behavior','Функция или список функций, без кавычек.'],
        ['mode','Режим','text','behavior','Режим взаимодействия, например say.'],
        ['retain','Сохранять экран','boolean','behavior','Обычно используется с речевыми облачками.'],
        ['ctc','Индикатор продолжения','expression','ctc','Displayable, например Text("…").'],
        ['ctc_pause','Индикатор при паузе','expression','ctc','Для тегов {p} и {w}.'],
        ['ctc_timedpause','Индикатор временной паузы','expression','ctc','Для {p=} и {w=}; Null() отключает индикатор.'],
        ['ctc_position','Положение индикатора','text','ctc','nestled / nestled-close / fixed / screen-variable'],
        ['screen','Экран диалога','text','screen','Например say или bubble.'],
        ['show_layer','Слой экрана','text','screen','Слой для экрана диалога.'],
        ['show_function','Функция показа','expression','engine','Пользовательская функция показа.'],
        ['predict_function','Функция предсказания','expression','engine','Пользовательская функция предзагрузки.'],
        ['slow','Постепенный вывод','boolean','engine','Разрешает медленный вывод текста.'],
        ['slow_abortable','Прерывать печать кликом','boolean','engine','Устаревший алиас what_slow_abortable.'],
        ['afm','Автопереход','boolean','engine','Учитывать автоматический переход.'],
        ['all_at_once','Вся реплика сразу','boolean','engine','Выводит все сегменты реплики одновременно.'],
        ['with_none','Переход with None','boolean','engine','Поведение перехода после реплики.'],
        ['type','Тип реплики','text','engine','Тип для истории и внутренних обработчиков.'],
        ['warp','Пропуск при warp','boolean','engine','Поведение при быстром переходе по сценарию.'],
        ['statement_name','Имя оператора','text','engine','Внутреннее имя оператора.'],
    ];
    const args = definitions.map(([key,label,mode,group,help]) => ({key,label,mode,group,help,type: mode}));
    const labels = {
        color:'Цвет', size:'Размер', font:'Шрифт', bold:'Полужирный', italic:'Курсив', underline:'Подчёркивание', strikethrough:'Перечёркивание',
        kerning:'Межбуквенный интервал', outlines:'Обводки и тени', justify:'По ширине', textalign:'Выравнивание текста',
        line_spacing:'Межстрочный интервал', line_leading:'Отступ перед строкой', line_overlap_split:'Перекрытие строк',
        slow_cps:'Скорость печати', slow_cps_multiplier:'Множитель скорости', background:'Фон', padding:'Внутренние отступы',
        xpos:'Позиция X', ypos:'Позиция Y', xalign:'Выравнивание X', yalign:'Выравнивание Y', xsize:'Ширина', ysize:'Высота',
    };
    const styleHelp = {
        color:'HEX: #RRGGBB или #RRGGBBAA с прозрачностью. Выбор цвета задаёт непрозрачный цвет.',
        size:'Пиксели в сцене игры. Здесь размер пересчитан из 1920 × 1080.',
        font:'Путь к шрифту в game, например fonts/my-font.ttf. Файл для проверки можно выбрать под сценой.',
        outlines:'Список обводок: [(толщина, "цвет", смещение X, смещение Y)]. Например [(2, "#000", 0, 1)]. Размеры в пикселях сцены.',
        slow_cps:'Символов в секунду. 0 выводит текст сразу. Проверьте результат кнопкой «Проиграть реплику».',
        slow_cps_multiplier:'Множитель скорости печати: 1 оставляет её без изменения.',
        padding:'Отступы в пикселях: (по горизонтали, по вертикали) или (слева, сверху, справа, снизу).',
        textalign:'0 — слева, 0.5 — по центру, 1 — справа.',
        xpos:'Положение по X: целое число — пиксели, дробное — доля ширины сцены.',
        ypos:'Положение по Y: целое число — пиксели, дробное — доля высоты сцены.',
        xalign:'Выравнивание по X: 0 — слева, 0.5 — по центру, 1 — справа.',
        yalign:'Выравнивание по Y: 0 — сверху, 0.5 — по центру, 1 — снизу.',
        kerning:'Межбуквенный интервал в пикселях сцены.',
        line_spacing:'Дополнительный интервал между строками в пикселях сцены.',
        background:'Цвет или ресурс фона, например "#18232e" или "gui/textbox.png".',
    };
    const typeHelp = {
        text:'Текстовое значение. Кавычки в коде будут добавлены автоматически.',
        number:'Числовое значение. Для переменной или выражения раскройте «Параметр / Python».',
        boolean:'Оставьте «По умолчанию», чтобы сохранить поведение игры.',
        expression:'Выражение Python: переменная, функция, список или кортеж. Оно попадёт в код без кавычек.',
    };
    const styleFields = [];
    for (const prefix of ['who','what','window','namebox']) {
        for (const prop of catalog.styles) {
            const applicable = ['position', ...(prefix === 'who' || prefix === 'what' ? ['text'] : ['window','margin'])];
            if (!applicable.includes(prop.group)) continue;
            const help = styleHelp[prop.name] || typeHelp[prop.mode];
            styleFields.push({key: prefix + '_' + prop.name, label: labels[prop.name] || prop.name, mode: prop.mode, type: prop.type, group: prefix, styleGroup: prop.group, help, doc: catalog.source + '#style-property-' + prop.name});
        }
    }
    const fields = [...args, ...styleFields];
    const byKey = new Map(fields.map(item => [item.key, item]));
    const keywords = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'.split(' '));
    const identifier = value => typeof value === 'string' && /^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(value) && !keywords.has(value);
    const quote = value => JSON.stringify(String(value)).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

    // This is a structural check, not a Python interpreter or full parser.
    function expression(value) {
        const source = value.trim();
        if (!source || source.length > 20000) throw new Error('Введите Python-выражение (до 20 000 символов).');
        const stack = []; let string = '', escaped = false;
        for (const ch of source) {
            if (string) {
                if (escaped) escaped = false;
                else if (ch === '\\') escaped = true;
                else if (ch === string) string = '';
                else if (ch === '\n' || ch === '\r') throw new Error('Используйте \\n внутри строки.');
                continue;
            }
            if (ch === '"' || ch === "'") string = ch;
            else if ('([{'.includes(ch)) stack.push(ch);
            else if (')]}'.includes(ch)) {
                if (stack.pop() !== ({')':'(',']':'[','}':'{'})[ch]) throw new Error('Проверьте скобки в Python-выражении.');
            } else if (ch === ';' || ch === '#' || ((ch === '\n' || ch === '\r') && !stack.length)) {
                throw new Error('Введите одно выражение, без комментариев и операторов через точку с запятой.');
            }
        }
        if (string || stack.length || /[+\-*/=,:.]$/.test(source)) throw new Error('Завершите Python-выражение: проверьте кавычки и скобки.');
        return source;
    }
    function serialize(entry) {
        if (!entry || typeof entry.value !== 'string') throw new Error('Введите значение.');
        if (entry.value.length > 20000) throw new Error('Максимум 20 000 символов в одном значении.');
        if (entry.mode === 'text') return quote(entry.value);
        if (entry.mode === 'boolean') {
            if (!['True','False','None'].includes(entry.value)) throw new Error('Выберите True, False или None.');
            return entry.value;
        }
        if (entry.mode === 'number') {
            const raw = entry.value.trim();
            if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw) || !Number.isFinite(Number(raw))) throw new Error('Введите конечное число, дробную часть отделите точкой.');
            if (/^[+-]?0\d+$/.test(raw) && Number(raw) !== 0) throw new Error('Уберите ведущие нули из целого числа.');
            return raw.replace(/^\+/, '');
        }
        if (entry.mode === 'expression') return expression(entry.value);
        throw new Error('Неизвестный тип значения.');
    }
    function compile(state) {
        const errors = [], parts = [];
        if (!identifier(state.variable)) errors.push({key:'variable', message:'Введите имя переменной Python: буквы, цифры и _, без пробелов; не ключевое слово.'});
        try {
            if (state.nameMode === 'none') parts.push('None');
            else if (state.nameMode === 'text') parts.push(quote(state.name));
            else if (state.nameMode === 'expression') parts.push(expression(state.name));
            else if (state.nameMode !== 'inherit') throw new Error('Выберите способ задания имени.');
        } catch (error) { errors.push({key:'name',message:error.message}); }
        for (const [key, entry] of Object.entries(state.values || {})) {
            try {
                if (!identifier(key) || ['name','__proto__','constructor','prototype'].includes(key)) throw new Error('Недопустимое имя или повторный параметр name.');
                parts.push(key + '=' + serialize(entry));
            } catch (error) { errors.push({key,message:error.message}); }
        }
        const call = parts.length < 2 ? 'Character(' + parts.join(', ') + ')' : 'Character(\n    ' + parts.join(',\n    ') + ',\n)';
        return {code: errors.length ? '' : 'define ' + state.variable + ' = ' + call, errors};
    }
    function project(state) { return JSON.stringify({tool:'es-doc-character', version:1, state}, null, 2); }
    function literal(source) {
        // Only scalar literals and nested lists/tuples. No names, calls or eval.
        let at = 0, depth = 0;
        const skip = () => { while (/\s/.test(source[at] || '') && at < source.length) at++; };
        const parse = () => {
            skip(); if (++depth > 32) throw new Error('Too deep');
            const ch = source[at]; let value;
            if (ch === '[' || ch === '(') {
                at++; const close = ch === '[' ? ']' : ')'; value = []; skip();
                while (source[at] !== close) {
                    value.push(parse()); skip();
                    if (source[at] !== ',') break;
                    at++; skip();
                }
                if (source[at++] !== close) throw new Error('Incomplete literal');
            } else if (ch === '"' || ch === "'") {
                const quote = source[at++]; value = ''; let ended = false;
                while (at < source.length) {
                    let next = source[at++];
                    if (next === quote) { ended = true; break; }
                    if (next === '\\') {
                        next = source[at++];
                        if (next === 'u' || next === 'x') {
                            const count = next === 'u' ? 4 : 2, hex = source.slice(at, at + count);
                            if (!new RegExp('^[0-9a-f]{' + count + '}$','i').test(hex)) throw new Error('Escape');
                            value += String.fromCharCode(parseInt(hex,16)); at += count; continue;
                        }
                        value += ({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',"'":"'",'"':'"','\\':'\\'})[next] ?? ('\\' + next);
                    } else value += next;
                }
                if (!ended) throw new Error('String');
            } else {
                const match = /^(True|False|None|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/i.exec(source.slice(at));
                if (!match) throw new Error('Not a literal');
                at += match[0].length;
                value = ({True:true,False:false,None:null})[match[0]];
                if (value === undefined) { value = Number(match[0]); if (!Number.isFinite(value)) throw new Error('Number'); }
            }
            depth--; return value;
        };
        try { const value = parse(); skip(); return at === source.length ? {ok:true,value} : {ok:false}; } catch (_) { return {ok:false}; }
    }
    function importProject(source) {
        if (typeof source !== 'string' || source.length > 1000000) throw new Error('Проект слишком большой (максимум 1 МБ).');
        let data;
        try { data = JSON.parse(source); } catch (_) { throw new Error('Не удалось прочитать JSON. Выберите проект, сохранённый этим инструментом.'); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Неподдерживаемый формат проекта.');
        const s = data.state;
        if (data.tool !== 'es-doc-character' || data.version !== 1 || !s || !['text','none','inherit','expression'].includes(s.nameMode)
            || ['variable','name','sample'].some(key => typeof s[key] !== 'string' || s[key].length > 20000)
            || !s.values || Array.isArray(s.values) || typeof s.values !== 'object' || Object.keys(s.values).length > 500) throw new Error('Неподдерживаемый формат проекта.');
        const values = Object.create(null);
        for (const [key,value] of Object.entries(s.values)) {
            if (!identifier(key) || ['name','__proto__','constructor','prototype'].includes(key) || !value || !['text','boolean','number','expression'].includes(value.mode) || typeof value.value !== 'string' || value.value.length > 20000) throw new Error('Некорректный параметр в проекте: ' + key);
            values[key] = {mode:value.mode,value:value.value};
        }
        return {variable:s.variable,name:s.name,nameMode:s.nameMode,sample:s.sample,values};
    }
    window.ESDocCharacters = {fields, args, field:key => byKey.get(key), identifier, quote, expression, serialize, literal, compile, project, importProject};
})();
