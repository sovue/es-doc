import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../static/js/animations.js', import.meta.url), 'utf8');
const frame = (src, hold, fade = 0, transition = 'dissolve') => ({src, hold, fade, transition});
const sequence = (loop = true) => ({kind: 'sequence', loop, frames: [frame('/a', 1), frame('/b', 1, 1)]});
class Element {
    style = {}; dataset = {}; attributes = {}; listeners = {}; hidden = false;
    classes = new Set();
    classList = {add: name => this.classes.add(name), remove: name => this.classes.delete(name)};
    setAttribute(key, value) {this.attributes[key] = value;}
    removeAttribute(key) {delete this.attributes[key]; if (key === 'hidden') this.hidden = false;}
    getAttribute(key) {return key === 'src' ? this.src : this.attributes[key] ?? null;}
    addEventListener(name, callback) {this.listeners[name] = callback;}
    removeEventListener(name) {delete this.listeners[name];}
    fire(name) {this.listeners[name]?.({target: this});}
    getBoundingClientRect() {return {width: 320, height: 180};}
}
function card(definition) {
    const card = new Element();
    card.dataset.kind = definition.kind;
    const elements = new Map();
    const layers = [new Element(), new Element()];
    const stage = new Element();
    const canvas = new Element();
    canvas.draws = 0;
    canvas.context = {clearRect() {}, drawImage() {canvas.draws += 1;}};
    canvas.getContext = () => canvas.context;
    elements.set('[data-stage]', stage);
    elements.set('[data-play]', new Element());
    const icons = new Map(['[data-play-icon]', '[data-stop-icon]'].map(key => [key, new Element()]));
    elements.get('[data-play]').querySelector = selector => icons.get(selector);
    elements.set('[data-error]', new Element());
    elements.set('[data-source]', new Element());
    for (const selector of ['[data-animation-name]', '[data-usage]', '.animation-card-actions .res-copy', '.animation-usage .res-copy', '[data-position]', '[data-time]', '[data-timeline]']) elements.set(selector, new Element());
    elements.set('.animation-definition', {textContent: JSON.stringify(definition)});
    if (definition.variants) {const select = new Element(); select.value = '0'; elements.set('[data-variant]', select);}
    const stageElements = new Map([
        ['.animation-frame', layers[0]], ['.animation-effect-overlay', new Element()],
        ['.animation-lid--upper', new Element()], ['.animation-lid--lower', new Element()],
        ['.animation-shake-echo', new Element()], ['canvas', canvas],
    ]);
    const base = new Element();
    stage.querySelector = selector => stageElements.get(selector);
    stage.querySelectorAll = selector => selector === '.animation-frame' ? layers : [base, stageElements.get('.animation-shake-echo')];
    card.querySelector = selector => elements.get(selector);
    card.stage = stage; card.layers = layers; card.canvas = canvas;
    card.button = elements.get('[data-play]'); card.select = elements.get('[data-variant]');
    card.playIcon = icons.get('[data-play-icon]'); card.stopIcon = icons.get('[data-stop-icon]');
    return card;
}
function setup(definitions, manual = false) {
    const cards = definitions.map(card);
    const rafs = new Map(); const pending = []; let next = 0;
    class Image {
        naturalWidth = 16; naturalHeight = 15;
        set src(value) {this.url = value; pending.push(this); if (!manual) queueMicrotask(() => this.onload?.());}
        decode() {return Promise.resolve();}
    }
    const window = new Element(); window.devicePixelRatio = 1;
    const document = new Element(); document.querySelectorAll = () => cards;
    const controls = new Map(['[data-animation-tools]', '[data-animation-search]', '[data-animation-count]', '[data-animation-empty]'].map(key => [key, new Element()]));
    controls.get('[data-animation-search]').value = '';
    document.querySelector = selector => controls.get(selector) || null;
    vm.runInNewContext(source, {window, document, Image, Math, Promise,
        requestAnimationFrame: callback => {rafs.set(++next, callback); return next;},
        cancelAnimationFrame: id => rafs.delete(id)});
    return {cards, window, document, pending, rafs, controls,
        advance(time) {const callbacks = [...rafs.values()]; rafs.clear(); callbacks.forEach(callback => callback(time));}};
}
async function settle() {for (let i = 0; i < 12; i++) await Promise.resolve();}
async function play(env, index = 0) {env.cards[index].button.fire('click'); await settle(); env.advance(0);}

test('old loads cannot restart a cancelled session, even after a new start on the same card', async () => {
    const env = setup([sequence()], true); const card = env.cards[0];
    card.button.fire('click');
    assert.equal(card.button.getAttribute('aria-label'), 'Отменить загрузку: анимация');
    assert.equal(card.playIcon.hidden, true); assert.equal(card.stopIcon.hidden, false);
    card.button.fire('click'); card.button.fire('click');
    env.pending.forEach(image => image.onload()); await settle();
    assert.equal(env.rafs.size, 1);
    env.advance(0); card.button.fire('click'); env.advance(2000);
    assert.equal(env.rafs.size, 0); assert.equal(card.button.attributes['aria-pressed'], 'false');
    assert.equal(card.playIcon.hidden, false); assert.equal(card.stopIcon.hidden, true);
});
test('starting another preview cancels the first and stop freezes its painted frame', async () => {
    const env = setup([sequence(), sequence()]); await play(env);
    env.advance(1500); const opacity = env.cards[0].layers[1].style.opacity;
    assert.equal(opacity, '0.5'); assert.equal(env.cards[0].layers[0].style.opacity, '1');
    await play(env, 1); env.advance(2500);
    assert.equal(env.cards[0].layers[1].style.opacity, opacity);
    assert.equal(env.cards[0].button.attributes['aria-pressed'], 'false');
    assert.equal(env.rafs.size, 1);
});
test('a loop dissolves from its last frame back to its first', async () => {
    const env = setup([{kind: 'sequence', loop: true, frames: [frame('/a', 1, 1), frame('/b', 1, 1)]}]);
    await play(env); env.advance(4500);
    assert.equal(env.cards[0].layers[0].src, '/b'); assert.equal(env.cards[0].layers[1].src, '/a');
    assert.equal(env.cards[0].layers[1].style.opacity, '0.5');
});
test('one-shot sequences retain a zero-hold terminal frame and replay from the beginning', async () => {
    const env = setup([{kind: 'sequence', loop: false, frames: [frame('/a', 1), frame('/b', 0)]}]);
    await play(env); env.advance(1000); const card = env.cards[0];
    assert.equal(card.layers[0].src, '/b'); assert.equal(card.button.getAttribute('aria-label'), 'Повторить: анимация');
    assert.equal(card.playIcon.hidden, false); assert.equal(card.stopIcon.hidden, true);
    assert.equal(env.rafs.size, 0); await play(env); assert.equal(card.layers[0].src, '/a');
});
test('Fade changes the frame at black and returns to a visible image', async () => {
    const env = setup([{kind: 'sequence', loop: false, frames: [frame('/a', 1), frame('/b', 0, 3, 'fade')]}]);
    await play(env); env.advance(2500);
    assert.equal(env.cards[0].stage.querySelector('.animation-effect-overlay').style.opacity, '1');
    env.advance(4000); assert.equal(env.cards[0].layers[0].src, '/b');
    assert.equal(env.cards[0].stage.querySelector('.animation-effect-overlay').style.opacity, '0');
});
test('lids start in the right position, stop safely, and finish their one-shot motion', async () => {
    for (const motion of ['open', 'close', 'blink']) {
        const env = setup([{kind: 'lids', src: '/up', second_src: '/down', duration: 1.5, hold: 0.5, motion}]);
        await play(env); env.advance(motion === 'blink' ? 3500 : 1500);
        assert.equal(env.cards[0].stage.querySelector('.animation-lid--upper').style.transform,
            motion === 'close' ? 'translateY(0%)' : 'translateY(-100%)');
        assert.equal(env.cards[0].button.getAttribute('aria-label'), 'Повторить: анимация'); assert.equal(env.rafs.size, 0);
    }
});
test('blackout retains black on completion, and flash has a peak hold and a scene pause', async () => {
    const env = setup([{kind: 'blackout', src: '/bg', duration: 5},
        {kind: 'flash', src: '/bg', duration: 1, peak_hold: 0.5, hold: 3}]);
    await play(env); env.advance(5000);
    assert.equal(env.cards[0].stage.querySelector('.animation-effect-overlay').style.opacity, '1');
    await play(env); assert.equal(env.cards[0].stage.querySelector('.animation-effect-overlay').style.opacity, '0');
    await play(env, 1); env.advance(1250);
    assert.equal(env.cards[1].stage.querySelector('.animation-effect-overlay').style.opacity, '1');
    env.advance(3000); assert.equal(env.cards[1].stage.querySelector('.animation-effect-overlay').style.opacity, '0');
    assert.equal(env.rafs.size, 1);
});
test('shake loops until stopped; changing a scene keeps playback active', async () => {
    const env = setup([{kind: 'shake', overlay_src: '/overlay', variants: [{src: '/one'}, {src: '/two', source_url: '/code#L20'}]}]);
    await play(env); env.advance(5000); assert.equal(env.rafs.size, 1);
    const card = env.cards[0]; card.select.value = '1'; card.select.fire('change'); await settle(); env.advance(0);
    assert.equal(card.stage.querySelector('.animation-shake-echo').src, '/two');
    assert.equal(card.querySelector('[data-source]').href, '/code#L20'); assert.equal(env.rafs.size, 1);
    card.button.fire('click'); assert.equal(env.rafs.size, 0);
});
test('snow updates density at rest and while playing, and scales with the canvas', async () => {
    const env = setup([{kind: 'snow', src: '/snow', particles: 50, variants: [{particles: 50}, {particles: 500}]}]);
    await settle(); const card = env.cards[0]; assert.equal(card.canvas.draws, 50);
    card.select.value = '1'; card.select.fire('change'); await settle(); assert.equal(card.canvas.draws, 550);
    await play(env); assert.equal(card._animationState.flakes.length, 500); assert.equal(card.canvas.width, 320);
    card.select.value = '0'; card.select.fire('change'); await settle(); env.advance(0);
    assert.equal(card._animationState.flakes.length, 50); assert.equal(env.rafs.size, 1);
});
test('load failure exits playback and permits a successful retry', async () => {
    const env = setup([sequence()], true); env.cards[0].button.fire('click');
    env.pending.forEach(image => image.onerror()); await settle();
    assert.equal(env.cards[0].button.attributes['aria-pressed'], 'false');
    assert.equal(env.cards[0].querySelector('[data-error]').hidden, false);
    env.cards[0].button.fire('click'); env.pending.slice(2).forEach(image => image.onload()); await settle();
    assert.equal(env.rafs.size, 1); assert.equal(env.cards[0].querySelector('[data-error]').hidden, true);
});
test('page visibility and soft-navigation cleanup cancel playback and pending loads', async () => {
    const env = setup([sequence()]); await play(env);
    env.document.hidden = true; env.document.fire('visibilitychange'); assert.equal(env.rafs.size, 0);
    const loading = setup([sequence()], true); loading.cards[0].button.fire('click');
    loading.window.__esdocAnimationsCleanup(); loading.pending.forEach(image => image.onload()); await settle();
    assert.equal(loading.rafs.size, 0); assert.equal(loading.cards[0].button.attributes['aria-pressed'], 'false');
    assert.equal(Object.keys(loading.window.listeners).length, 0);
});

test('black_long preserves the original two-second dissolve and fifty-second fade', async () => {
    const env = setup([{kind: 'blackout', src: '/sepia', intro: 2, duration: 50, total_duration: 52}]);
    await play(env);
    const overlay = env.cards[0].stage.querySelector('.animation-effect-overlay');
    assert.equal(overlay.style.opacity, '1');
    env.advance(1000); assert.equal(overlay.style.opacity, '0.5');
    env.advance(2000); assert.equal(overlay.style.opacity, '0');
    env.advance(27000); assert.equal(overlay.style.opacity, '0.5');
    assert.equal(env.rafs.size, 1);
    env.advance(52000); assert.equal(overlay.style.opacity, '1');
    assert.equal(env.rafs.size, 0);
});

test('timeline inspection pauses playback and leaves the play icon ready to restart', async () => {
    const env = setup([sequence(false)]);
    const card = env.cards[0];
    await play(env);
    assert.equal(card.button.getAttribute('aria-label'), 'Остановить: анимация');
    card.querySelector('[data-position]').value = '1.5';
    card.querySelector('[data-position]').fire('input'); await settle();
    assert.equal(card.layers[1].style.opacity, '0.5');
    assert.equal(env.rafs.size, 0);
    assert.equal(card.button.hidden, false);
    assert.equal(card.playIcon.hidden, false); assert.equal(card.stopIcon.hidden, true);
    await play(env); assert.equal(card._position, 0); assert.equal(env.rafs.size, 1);
});

test('selecting a variant updates visible name, both copy payloads, example and source', async () => {
    const env = setup([{kind: 'snow', title: 'Снег', name: 'snow', src: '/snow', particles: 50, variants: [
        {name: 'snow', particles: 50, usage: 'show snow'},
        {name: 'heavy_snow', particles: 500, usage: 'show heavy_snow', source_url: '/globals#L191'},
    ]}]);
    const card = env.cards[0]; card.select.value = '1'; card.select.fire('change'); await settle();
    assert.equal(card.querySelector('[data-animation-name]').textContent, 'heavy_snow');
    assert.equal(card.querySelector('.animation-card-actions .res-copy').dataset.copy, 'heavy_snow');
    assert.equal(card.querySelector('.animation-usage .res-copy').dataset.copy, 'show heavy_snow');
    assert.equal(card.querySelector('[data-usage]').textContent, 'show heavy_snow');
    assert.equal(card.querySelector('[data-source]').href, '/globals#L191');
});

test('gallery search includes variant identifiers, stops hidden previews and recovers from empty results', async () => {
    const env = setup([{...sequence(), name: 'stars', title: 'Звёзды'},
        {kind: 'snow', src: '/snow', name: 'snow', particles: 50, variants: [{name: 'heavy_snow', label: 'Сильный'}]}]);
    await play(env);
    const input = env.controls.get('[data-animation-search]');
    input.value = 'heavy_snow'; input.fire('input');
    assert.equal(env.cards[0].hidden, true); assert.equal(env.cards[1].hidden, false);
    assert.equal(env.rafs.size, 0);
    input.value = 'missing'; input.fire('input');
    assert.equal(env.controls.get('[data-animation-empty]').hidden, false);
    input.value = ''; input.fire('input');
    assert.equal(env.cards.every(card => !card.hidden), true);
    assert.equal(env.controls.get('[data-animation-empty]').hidden, true);
});

test('backdrop preserves its initial pause and first frame timing', async () => {
    const env = setup([{kind: 'sequence', loop: true, delay: 0.1,
        frames: [frame('/1', 0.1), frame('/2', 0.1), frame('/3', 0.1), frame('/2', 0)]}]);
    await play(env);
    assert.equal(env.cards[0].layers[0].style.opacity, '0');
    env.advance(100); assert.equal(env.cards[0].layers[0].src, '/1');
    env.advance(200); assert.equal(env.cards[0].layers[0].src, '/2');
});
