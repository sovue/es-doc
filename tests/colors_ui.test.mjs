import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function page() {
    class Element {
        value = ''; textContent = ''; hidden = true; children = []; attributes = {}; dataset = {};
        listeners = new Map(); style = { setProperty() {} };
        classList = {add() {}, remove() {}, toggle() {}};
        addEventListener(type, callback, options) {
            const handlers = this.listeners.get(type) || [];
            handlers.push(callback); this.listeners.set(type, handlers);
            options?.signal?.addEventListener('abort', () => this.listeners.delete(type));
        }
        emit(type, event = {}) { for (const callback of this.listeners.get(type) || []) callback({ target: this, ...event }); if (type === 'click') this.parentElement?.emit(type, {target: this, ...event}); }
        setAttribute(key, value) { this.attributes[key] = value; }
        getAttribute(key) { return this.attributes[key] ?? null; }
        removeAttribute(key) { delete this.attributes[key]; }
        querySelectorAll() { return this.children.filter(child => child.tagName === 'BUTTON'); }
        replaceChildren() { this.children = []; }
        append(...children) { for (const child of children) this.appendChild(child); }
        appendChild(child) { child.parentElement = this; this.children.push(child); }
        closest() { return this.tagName === 'BUTTON' ? this : this.parentElement?.closest(); }
        focus() { document.activeElement = this; }
        scrollIntoView(options) { this.scrollOptions = options; }
        select() {}
        click() { this.emit('click'); }
        dispatchEvent(event) { this.emit(event.type); }
        contains() { return true; }
        setPointerCapture() {}
        getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 100 }; }
    }
    const elements = new Map();
    const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
    const document = Object.assign(new Element(), { getElementById: get, activeElement: null,
        createElement: name => Object.assign(new Element(), { tagName: name.toUpperCase() }),
        createTextNode: text => ({ textContent: text }) });
    get('colors-app').querySelectorAll = () => [];
    get('colors-palette').value = 'basic'; get('colors-hex-mode').value = 'auto';
    get('colors-format').value = 'hex'; get('colors-space').value = 'rgb';
    get('colors-preview-role').value = 'text'; get('colors-harmony').value = 'analogous';
    const copied = [];
    const stored = new Map();
    const window = {navigator: {clipboard: {writeText: async value => copied.push(value)}},
        localStorage: {getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value)}};
    const context = vm.createContext({ document, window, AbortController, Event, setTimeout: () => 1, clearTimeout() {} });
    for (const file of ['colors-named.js', 'colors-core.js', 'colors.js']) vm.runInContext(fs.readFileSync(new URL('../static/js/' + file, import.meta.url), 'utf8'), context);
    const input = (id, value) => { const element = get('colors-' + id); element.focus(); element.value = value; element.emit('input'); };
    return { get: id => get('colors-' + id), input, copied, window, stored, document };
}

test('valid hex synchronizes outputs while preserving active input and RGB excludes alpha', async () => {
    const ui = page(); ui.input('hex', '#AABBCCDD');
    assert.equal(ui.get('hex').value, '#AABBCCDD');
    assert.equal(ui.get('output-hex').value, '#abcd');
    assert.equal(ui.get('r').value, 170);
    ui.get('copy-rgb').emit('click'); await Promise.resolve(); assert.deepEqual(ui.copied, ['(170, 187, 204)']);
    ui.input('hex', '#aabbcd'); assert.equal(ui.get('output-hex').value, '#aabbcd');
});

test('invalid channel and HEX edits retain the last valid color until corrected', () => {
    const ui = page(); const previous = ui.get('output-hex').value;
    ui.input('r', '256'); assert.equal(ui.get('output-hex').value, previous);
    assert.equal(ui.get('r').getAttribute('aria-invalid'), 'true');
    ui.input('r', '255'); assert.equal(ui.get('r').getAttribute('aria-invalid'), null);
    ui.input('hex', '#zzzz'); assert.equal(ui.get('hex').getAttribute('aria-invalid'), 'true');
    ui.input('hex', '#1234'); assert.equal(ui.get('output-hex').value, '#1234');
    assert.equal(ui.get('hex').getAttribute('aria-invalid'), null);
});

test('HEX automatically includes alpha and still shortens losslessly', () => {
    const ui = page(); ui.input('hex', '#11223344');
    assert.equal(ui.get('output-hex').value, '#1234');
    assert.equal(ui.get('output-rgb').value, '(17, 34, 51)');
});

test('HSV keyboard and pointer update channels and selected hue survives black', () => {
    const ui = page(); ui.input('hex', '#f00');
    let prevented = false;
    ui.get('sv').emit('keydown', { key: 'ArrowDown', shiftKey: true, preventDefault() { prevented = true; } });
    assert.equal(prevented, true); assert.equal(ui.get('output-rgb').value, '(230, 0, 0)');
    ui.get('sv').emit('pointerdown', { button: 0, pointerId: 1, clientX: 100, clientY: 50 });
    assert.equal(ui.get('output-rgb').value, '(128, 64, 64)');
    ui.input('v', '0'); ui.get('hue').value = '240'; ui.get('hue').emit('input');
    ui.input('a', '.5');
    ui.get('alpha').value = '75'; ui.get('alpha').emit('input');
    ui.input('v', '100'); assert.equal(ui.get('output-rgb').value, '(128, 128, 255)');
    assert.equal(ui.get('output-rgba').value, '(128, 128, 255, 0.75)');
});

test('changing palette and selecting a swatch resets alpha and invalid inputs', () => {
    const ui = page(); ui.input('a', '.5'); ui.input('hex', '#badvalue');
    ui.get('palette').value = 'esdoc'; ui.get('palette').emit('change');
    assert.equal(ui.get('swatches').children.length, 10);
    ui.get('swatches').children[0].emit('click');
    assert.equal(ui.get('output-hex').value, '#2f7524');
    assert.equal(ui.get('a').value, '1');
    assert.equal(ui.get('hex').getAttribute('aria-invalid'), null);
    assert.equal(ui.get('swatches').children[0].getAttribute('aria-pressed'), 'true');
});

test('soft navigation cleanup removes color input listeners', () => {
    const ui = page(); ui.window.__esdocColorsCleanup();
    const previous = ui.get('output-hex').value;
    ui.input('hex', '#f00'); assert.equal(ui.get('output-hex').value, previous);
    assert.equal(ui.window.__esdocColorsCleanup, null);
});

test('undo restores the previous color and redo restores the completed edit', () => {
    const ui = page(); const initial = ui.get('output-hex').value;
    ui.input('hex', '#1234'); ui.get('hex').emit('change');
    ui.get('undo').click(); assert.equal(ui.get('output-hex').value, initial);
    ui.get('redo').click(); assert.equal(ui.get('output-hex').value, '#1234');
    ui.get('undo').click(); ui.input('hex','#f00'); ui.get('hex').emit('change');
    assert.equal(ui.get('redo').disabled, true);
});

test('saved colors persist once and recent colors stay bounded across many committed edits', () => {
    const ui = page(); ui.get('save').click(); ui.get('save').click();
    assert.equal(ui.get('saved').children.length, 1);
    assert.equal(JSON.parse(ui.stored.get('es-colors-saved')).length, 1);
    for (let i = 0; i < 20; i++) { ui.input('r', String(i)); ui.get('r').emit('change'); }
    assert.equal(JSON.parse(ui.stored.get('es-colors-recent')).length, 12);
});

test('row copies Python RGB and clipboard failure selects its editable field', async () => {
    const ui = page(); ui.input('hex', '#11223344');
    ui.get('copy-rgb').click(); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(ui.copied, ['(17, 34, 51)']);
    ui.window.navigator.clipboard.writeText = async () => { throw new Error('Denied'); };
    ui.get('copy-rgb').click(); await new Promise(resolve => setImmediate(resolve));
    assert.match(ui.get('status').textContent, /Ctrl\+C/);
    assert.equal(ui.document.activeElement, ui.get('output-rgb'));
});

test('contrast preview swaps colors and warns when foreground matches the background', () => {
    const ui = page(); ui.input('hex', '#fff');
    assert.equal(ui.get('contrast-value').textContent, '1.00:1');
    assert.match(ui.get('contrast-aa').textContent, /Недостаточный/);
    ui.get('background').value = '#000'; ui.get('background').emit('input');
    assert.equal(ui.get('contrast-value').textContent, '21.00:1');
    ui.get('swap').click(); assert.equal(ui.get('output-hex').value, '#000');
    assert.equal(ui.get('contrast-value').textContent, '21.00:1');
});

test('tab keyboard navigation updates tab stops and panels', () => {
    const ui = page();
    ui.get('tab-palettes').emit('keydown', {key: 'ArrowRight', preventDefault(){}});
    assert.equal(ui.get('tab-shades').getAttribute('aria-selected'), 'true');
    assert.equal(ui.get('panel-palettes').hidden, true);
    assert.equal(ui.get('panel-shades').hidden, false);
    assert.equal(ui.document.activeElement, ui.get('tab-shades'));
});

test('all six editable formats update the same color and invalid text retains it', () => {
    const ui = page();
    for (const [format,value] of [['hex','#f008'],['rgb','(0, 255, 0)'],['rgba','(0, 0, 255, 0.5)'],['css','rgb(255 0 0 / 25%)'],['hsl','hsl(120 100% 50% / .75)'],['oklch','oklch(62.7955% 0.25768 29.23 / .5)']]) {
        ui.input('output-' + format, value);
        assert.equal(ui.get('output-' + format).getAttribute('aria-invalid'), null, format);
        assert.equal(ui.get('output-' + format).value, value, 'active typing');
    }
    assert.equal(ui.get('r').value, 255);
    assert.equal(ui.get('a').value, '0.5');
    ui.input('output-rgb', '(1, 2, 3)'); assert.equal(ui.get('a').value, '0.5');
    const before = ui.get('output-hex').value;
    ui.input('output-rgb','(999, 2, 3)');
    assert.equal(ui.get('output-hex').value, before);
    assert.equal(ui.get('output-rgb').getAttribute('aria-invalid'),'true');
});

test('numeric arrows and global undo work while an input remains focused', () => {
    const ui = page(); ui.input('r','40'); ui.get('r').emit('change');
    ui.get('r').emit('keydown',{key:'ArrowUp',shiftKey:true,preventDefault(){}});
    assert.equal(ui.get('r').value, '50');
    ui.document.emit('keydown',{key:'z',ctrlKey:true,target:ui.get('r'),preventDefault(){}});
    assert.equal(ui.get('r').value, 40);
    ui.document.emit('keydown',{key:'z',ctrlKey:true,shiftKey:true,target:ui.get('r'),preventDefault(){}});
    assert.equal(ui.get('r').value, 50);
});

test('role edits the other existing color, swap and reset are undoable as a pair', () => {
    const ui = page(); ui.input('hex','#123'); ui.get('hex').emit('change');
    ui.get('preview-role').value='background'; ui.get('preview-role').emit('change');
    assert.equal(ui.get('hex').value, '#fff');
    assert.equal(ui.get('background').value, '#123');
    ui.input('hex','#000'); ui.get('hex').emit('change');
    ui.get('swap').click(); assert.equal(ui.get('hex').value, '#123');
    assert.equal(ui.get('background').value, '#000');
    ui.get('reset').click(); assert.equal(ui.get('hex').value, '#fff');
    assert.equal(ui.get('background').value, '#2f7524');
    ui.get('undo').click(); assert.equal(ui.get('hex').value, '#123');
    assert.equal(ui.get('background').value, '#000');
});

test('clear saved colors supports undo, redo and explicit recovery without losing later color edits', () => {
    const ui = page(); ui.get('save').click();
    ui.input('hex', '#123'); ui.get('hex').emit('change'); ui.get('save').click();
    const collection = ui.stored.get('es-colors-saved');
    ui.get('clear-saved').click();
    assert.equal(ui.stored.get('es-colors-saved'), '[]');
    assert.equal(ui.get('saved-recovery').hidden, false);
    ui.get('undo').click();
    assert.equal(ui.stored.get('es-colors-saved'), collection);
    assert.equal(ui.get('saved-recovery').hidden, true);
    ui.get('redo').click(); assert.equal(ui.stored.get('es-colors-saved'), '[]');
    ui.input('hex', '#abc'); ui.get('hex').emit('change');
    ui.get('restore-saved').click();
    assert.equal(ui.stored.get('es-colors-saved'), collection);
    assert.equal(ui.get('output-hex').value, '#abc');
    assert.equal(ui.get('saved-recovery').hidden, true);
    ui.get('undo').click(); assert.equal(ui.stored.get('es-colors-saved'), '[]');
    assert.equal(ui.get('saved-recovery').hidden, false);
    ui.get('redo').click(); assert.equal(ui.stored.get('es-colors-saved'), collection);
});

test('save is undoable and duplicate save does not create a phantom history step', () => {
    const ui = page(); ui.get('save').click(); ui.get('save').click();
    ui.get('undo').click(); assert.equal(ui.stored.get('es-colors-saved'), '[]');
    ui.get('redo').click(); assert.equal(JSON.parse(ui.stored.get('es-colors-saved')).length, 1);
});

test('validation messages belong to each erroneous field and clear independently', () => {
    const ui = page(); ui.input('r', '256'); ui.input('a', '2');
    assert.equal(ui.get('error-r').hidden, false);
    assert.match(ui.get('error-r').textContent, /0.*255/);
    assert.equal(ui.get('error-a').hidden, false);
    assert.match(ui.get('error-a').textContent, /0.*1/);
    ui.input('r', '100');
    assert.equal(ui.get('error-r').hidden, true);
    assert.equal(ui.get('error-a').hidden, false);
    ui.input('a', '1'); assert.equal(ui.get('error-a').hidden, true);
    ui.input('output-oklch', 'oklch(bad)');
    assert.match(ui.get('error-output-oklch').textContent, /OKLCH/);
    assert.equal(ui.get('copy-oklch').disabled, true);
    ui.get('reset').click();
    assert.equal(ui.get('error-output-oklch').hidden, true);
    assert.equal(ui.get('copy-oklch').disabled, false);
    ui.input('background', 'wrong');
    assert.equal(ui.get('error-background').hidden, false);
    ui.input('background', '#000'); assert.equal(ui.get('error-background').hidden, true);
});

test('mobile section jumps focus the target without changing the chosen color or history', () => {
    const ui = page(); ui.input('hex', '#abc8'); ui.get('hex').emit('change');
    ui.get('jump-editor').click();
    assert.equal(ui.document.activeElement, ui.get('editor-heading'));
    assert.equal(ui.get('output-hex').value, '#abc8');
    assert.equal(ui.get('editor-heading').scrollOptions.block, 'start');
    ui.get('undo').click(); assert.equal(ui.get('output-hex').value, '#2f7524');
});

test('named palette includes every supplied color, limits rendering and searches names and short HEX', () => {
    const ui = page();
    assert.equal(ui.window.ESDocNamedColors.length, 1012);
    assert.equal(new Set(ui.window.ESDocNamedColors.map(([, hex]) => hex)).size, 1012);
    assert.ok(ui.window.ESDocNamedColors.every(([name, hex]) => name.trim() && /^#[a-f0-9]{6}$/.test(hex)));
    ui.get('palette').value = 'named'; ui.get('palette').emit('change');
    assert.equal(ui.get('swatches').children.length, 100);
    assert.match(ui.get('palette-summary').textContent, /100.*1012/);
    ui.get('palette-more').click(); assert.equal(ui.get('swatches').children.length, 200);
    for (let page = 0; page < 9; page++) ui.get('palette-more').click();
    assert.equal(ui.get('swatches').children.length, 1012);
    assert.equal(ui.get('palette-more').hidden, true);
    ui.input('palette-search', 'белоснежный');
    assert.equal(ui.get('swatches').children.length, 1);
    ui.get('swatches').children[0].children[1].emit('click');
    assert.equal(ui.get('output-hex').value, '#fffafa');
    ui.input('palette-search', '#fff');
    assert.ok(ui.get('swatches').children.some(button => button.dataset.hex === '#ffffff'));
    ui.input('palette-search', 'несуществующее название');
    assert.equal(ui.get('palette-more').hidden, true);
    assert.match(ui.get('swatches').children[0].textContent, /Не найдено/);
    ui.get('palette').value = 'basic'; ui.get('palette').emit('change');
    assert.equal(ui.get('swatches').children.length, 10);
    assert.equal(ui.get('palette-search-control').hidden, true);
});
