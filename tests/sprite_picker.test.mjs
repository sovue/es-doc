import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../static/js/resources.js', import.meta.url), 'utf8');
const pickerSource = source.split('/* ── Sprite distance picker')[1].split('/* ── Filters and sorting')[0];

function fixture() {
    const listeners = new Map();
    const classes = values => {
        const state = new Set(values);
        return {
            add: value => state.add(value),
            remove: value => state.delete(value),
            contains: value => state.has(value),
            toggle: value => {
                if (state.has(value)) { state.delete(value); return false; }
                state.add(value);
                return true;
            },
        };
    };
    const element = (initialClasses = []) => ({
        classList: classes(initialClasses),
        attributes: new Map(),
        addEventListener(type, handler) { this.handlers ??= {}; this.handlers[type] = handler; },
        setAttribute(name, value) { this.attributes.set(name, value); },
        getAttribute(name) { return this.attributes.get(name); },
        contains(node) { return node === this; },
    });
    const makePicker = () => {
        const row = element(['res-row--sprite']);
        const picker = element(['res-sprite-picker']);
        const trigger = element();
        const name = element();
        const distance = element();
        const option = element();
        option.dataset = { code: 'dv angry pioneer', distance: 'normal' };
        option.attributes.set('aria-selected', 'true');
        trigger.querySelector = selector => selector === '.res-name' ? name : distance;
        trigger.focus = () => { document.activeElement = trigger; };
        picker.closest = () => row;
        picker.querySelector = () => trigger;
        picker.querySelectorAll = () => [option];
        picker.contains = node => node === trigger || node === option;
        row.querySelector = () => null;
        row.scrollIntoView = () => {};
        row.contains = node => node === picker || picker.contains(node);
        return { row, picker, trigger, option };
    };
    const first = makePicker();
    const second = makePicker();
    const document = {
        activeElement: null,
        querySelectorAll: () => [first.picker, second.picker],
        querySelector: selector => selector === '.res-row--sprite:target' ? first.row : null,
        addEventListener(type, handler) { listeners.set(type, handler); },
    };
    const window = { addEventListener() {} };
    vm.runInNewContext(`/* ── Sprite distance picker${pickerSource}`, {
        document, window, location: { hash: '' },
    });
    return { first, second, document, listeners };
}

test('manual distance menu closes when the pointer leaves even while the trigger is focused', () => {
    const { first, document } = fixture();
    first.trigger.handlers.click();
    first.trigger.focus();
    assert.equal(first.picker.classList.contains('is-open'), true);

    first.picker.handlers.pointerleave();

    assert.equal(first.picker.classList.contains('is-open'), false);
    assert.equal(first.trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(document.activeElement, first.trigger);
});

test('hovering another sprite removes the old hash-target highlight', () => {
    const { first, second, listeners } = fixture();

    listeners.get('pointerover')({ target: { closest: () => second.row } });

    assert.equal(first.row.classList.contains('is-stale-target'), true);
});
