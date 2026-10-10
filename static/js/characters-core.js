/* Typed Character export. User Python is stored as text, never executed. */
(function () {
    'use strict';
    const args = [
        {key:'kind', label:'Основа персонажа', mode:'expression', group:'identity'},
        {key:'dynamic', label:'Динамическое имя', mode:'boolean', group:'identity'},
    ];
    const labels = {color:'Цвет', prefix:'Префикс', suffix:'Постфикс', font:'Шрифт', bold:'Полужирный', italic:'Курсив', strikethrough:'Перечёркивание', underline:'Подчёркивание'};
    const fields = [...args];
    for (const group of ['who','what']) for (const [prop,label] of Object.entries(labels)) {
        fields.push({key:group + '_' + prop, label, group, mode:['bold','italic','strikethrough','underline'].includes(prop) ? 'boolean' : 'text'});
    }
    const byKey = new Map(fields.map(item => [item.key,item]));
    function simpleState(state) {
        const values = Object.create(null);
        for (const [key,entry] of Object.entries(state.values || {})) {
            const field = byKey.get(key);
            if (field && entry.mode === field.mode && (field.mode !== 'boolean' || ['True','False'].includes(entry.value))) values[key] = {...entry};
        }
        if (!values.dynamic) values.dynamic = {mode:'boolean',value:'False'};
        return {...state, name:state.nameMode === 'none' ? '' : state.name, nameMode:'text', values};
    }
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
            else if (state.nameMode === 'text') parts.push(state.name === '' ? 'None' : quote(state.name));
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
    window.ESDocCharacters = {simpleState, fields, args, field:key => byKey.get(key), identifier, quote, expression, serialize, literal, compile, project, importProject};
})();
