import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const load = name => readFileSync(new URL('../static/js/' + name, import.meta.url), 'utf8');

class Element {
    constructor() {
        this.attrs = {}; this.dataset = {}; this.handlers = {}; this.children = new Map();
        this.style = { setProperty() {} };
        const classes = new Set();
        this.classList = {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            contains: name => classes.has(name),
        };
    }
    addEventListener(name, fn) { (this.handlers[name] ||= []).push(fn); }
    emit(name, event = {}) { (this.handlers[name] || []).forEach(fn => fn(event)); }
    setAttribute(name, value) { this.attrs[name] = value; }
    querySelector(selector) {
        if (!this.children.has(selector)) this.children.set(selector, new Element());
        return this.children.get(selector);
    }
    contains() { return false; }
    matches() { return false; }
}

function storage(values = {}, fails) {
    const items = new Map(Object.entries(values));
    const check = operation => { if (fails === operation) throw new Error('Storage denied'); };
    return {
        getItem(key) { check('getItem'); return items.get(key) ?? null; },
        setItem(key, value) { check('setItem'); items.set(key, value); },
        removeItem(key) { check('removeItem'); items.delete(key); },
        items,
    };
}

function player(local, session, deniedGetter) {
    const button = new Element();
    button.hidden = true;
    button.dataset = { playSrc: '/resource/audio/test.ogg', playName: 'Test track' };
    let audio;
    class Audio extends Element {
        constructor() { super(); audio = this; this.paused = true; this.currentTime = 0; this.duration = 120; }
        play() { this.paused = false; this.emit('play'); return Promise.resolve(); }
        pause() { this.paused = true; this.emit('pause'); }
    }
    const bars = [], status = {}, window = new Element();
    const document = {
        getElementById: () => status,
        createElement: () => new Element(),
        querySelectorAll: selector => selector === '[data-play-src]' ? [button] : [],
        body: { appendChild: item => bars.push(item) },
    };
    const context = vm.createContext({ window, document, Audio, localStorage: local, sessionStorage: session });
    if (deniedGetter) Object.defineProperty(context, deniedGetter, {
        get() { throw new Error('SecurityError: storage access denied'); },
    });
    vm.runInContext(load('icons.js'), context);
    vm.runInContext(load('player-state.js'), context);
    vm.runInContext(load('player.js'), context);
    return { audio, button, bar: bars[0], window, status };
}

for (const target of ['localStorage', 'sessionStorage']) {
    for (const failure of ['getter', 'getItem', 'setItem', 'removeItem']) {
        test(`audio controls work when ${target} ${failure} is denied`, () => {
            const local = storage({}, target === 'localStorage' ? failure : undefined);
            const session = storage({}, target === 'sessionStorage' ? failure : undefined);
            const ui = player(local, session, failure === 'getter' ? target : undefined);
            assert.equal(ui.button.hidden, false);
            ui.button.emit('click');
            assert.equal(ui.audio.paused, false);
            assert.equal(ui.button.attrs['aria-pressed'], 'true');
            assert.equal(ui.bar.classList.contains('res-nowplaying--visible'), true);
            const volume = ui.bar.querySelector('.res-volume input');
            volume.value = '0.35';
            volume.emit('input');
            assert.equal(ui.audio.volume, 0.35);
            assert.equal(volume.value, 0.35);
            ui.bar.querySelector('.res-nowplaying-pause').emit('click');
            assert.equal(ui.audio.paused, true);
            ui.window.emit('pagehide', { persisted: false });
        });
    }
}

test('available storage still restores volume and track position and persists playback', () => {
    const local = storage({ 'es-doc-volume': '0.25' });
    const session = storage({ 'es-doc-player-v2': JSON.stringify({
        src: '/resource/audio/test.ogg', name: 'Saved track', time: 15, playing: true, repeat: true,
    }) });
    const ui = player(local, session);
    assert.equal(ui.audio.volume, 0.25);
    assert.equal(ui.audio.paused, false);
    assert.equal(ui.audio.loop, true);
    ui.audio.emit('loadedmetadata');
    assert.equal(ui.audio.currentTime, 15);
    ui.audio.emit('timeupdate');
    assert.equal(JSON.parse(session.items.get('es-doc-player-v2')).time, 15);
    ui.window.emit('pagehide', { persisted: false });
    assert.equal(session.items.has('es-doc-player-v2'), false);
});
