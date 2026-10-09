import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const path = new URL('../static/js/colors-core.js', import.meta.url);
const window = {};
if (existsSync(path)) vm.runInNewContext(readFileSync(path, 'utf8'), { window });
const core = () => {
    assert.ok(window.ESDocColors, 'The color conversion core must be available');
    return window.ESDocColors;
};
const plain = value => JSON.parse(JSON.stringify(value));
const near = (actual, expected, epsilon = 0.000001) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} ≈ ${expected}`);

test('RenPy Color literals preserve alpha and reject executable or invalid input', () => {
    const c = core();
    assert.equal(c.renpyColor(c.parseHex('#123')), 'renpy.Color("#112233")');
    assert.equal(c.renpyColor({r: 17, g: 34, b: 51, a: .5}), 'renpy.Color("#112233", alpha=0.5)');
    assert.deepEqual(plain(c.parseColor('renpy.Color("#123", alpha=0.5)')), {r:17,g:34,b:51,a:.5});
    assert.deepEqual(plain(c.parseColor("renpy.Color('#1234')")), plain(c.parseHex('#1234')));
    for (const value of ['renpy.Color("#123", alpha=2)', 'renpy.Color("#123", alpha=-1)', 'renpy.Color("#1234", alpha=0.5)', 'renpy.Color(__import__("os"))', 'renpy.Color("#123"); run()', 'renpy.Color("#123\')']) {
        assert.equal(c.parseColor(value), null, value);
    }
});

test('HEX expands short RGB and RGBA without losing alpha', () => {
    assert.deepEqual(plain(core().parseHex('  #AbC  ')), { r: 170, g: 187, b: 204, a: 1 });
    const color = core().parseHex('#1234');
    assert.deepEqual([color.r, color.g, color.b], [17, 34, 51]);
    near(color.a, 68 / 255);
    assert.equal(core().toHex(color, true, false), '#11223344');
});

test('HEX accepts only complete hexadecimal color values', () => {
    for (const value of ['', '#12', '#12345', '#1234567', '#123456789', '#ggg', '#123 junk', '#0xFF00', null]) {
        assert.equal(core().parseHex(value), null, String(value));
    }
    assert.equal(core().toHex(core().parseHex('abcdef'), false, false), '#abcdef');
});

test('HEX shortening requires every pair to repeat, including alpha', () => {
    const c = core();
    assert.equal(c.shortenHex('#aabbcc'), '#abc');
    assert.equal(c.shortenHex('#aabbccdd'), '#abcd');
    assert.equal(c.shortenHex('#aabbcd'), '#aabbcd');
    assert.equal(c.shortenHex('#aabbccde'), '#aabbccde');
    assert.equal(c.toHex({ r: 0, g: 255, b: 136, a: 1 }, true, true), '#0f8f');
});

test('numeric input validates ranges and complete decimals before changing state', () => {
    const c = core();
    assert.equal(c.parseNumber('255', 0, 255, true), 255);
    assert.equal(c.parseNumber('0.5', 0, 1), 0.5);
    for (const value of ['', ' ', '256', '-1', 'NaN', 'Infinity', '1e2', '20px', '1.5']) {
        assert.equal(c.parseNumber(value, 0, 255, true), null, value);
    }
    assert.equal(c.parseNumber('1.1', 0, 1), null);
});

test('HSV converts primaries, hue endpoint and grayscale to RGB', () => {
    assert.deepEqual(plain(core().hsvToRgb({ h: 0, s: 100, v: 100, a: 0.5 })), { r: 255, g: 0, b: 0, a: 0.5 });
    assert.deepEqual(plain(core().hsvToRgb({ h: 120, s: 100, v: 100, a: 1 })), { r: 0, g: 255, b: 0, a: 1 });
    assert.equal(core().toHex(core().hsvToRgb({ h: 360, s: 100, v: 100, a: 1 }), false, false), '#ff0000');
    assert.equal(core().toHex(core().hsvToRgb({ h: 230, s: 0, v: 50, a: 1 }), false, false), '#808080');
});

test('achromatic RGB preserves the chosen hue for subsequent saturation changes', () => {
    const c = core();
    const hsv = c.rgbToHsv({ r: 64, g: 64, b: 64, a: 0.25 }, 210);
    assert.equal(hsv.h, 210);
    assert.equal(hsv.s, 0);
    near(hsv.v, 64 / 255 * 100);
    assert.equal(hsv.a, 0.25);
});

test('RGB to HSV to RGB round trips byte channels including transparent colors', () => {
    const c = core();
    for (const r of [0, 17, 128, 255]) for (const g of [0, 91, 255]) for (const b of [0, 204, 255]) {
        const input = { r, g, b, a: 51 / 255 };
        assert.deepEqual(plain(c.hsvToRgb(c.rgbToHsv(input))), input);
    }
});

test('Python RGB excludes alpha and RGBA includes a normalized alpha', () => {
    const input = { r: 17, g: 34, b: 51, a: 0.5 };
    assert.equal(core().pythonRgb(input), '(17, 34, 51)');
    assert.equal(core().pythonRgba(input), '(17, 34, 51, 0.5)');
    assert.equal(core().pythonRgba({ ...input, a: 0 }), '(17, 34, 51, 0)');
});

test('CSS HSL expresses hue, saturation, lightness and optional alpha', () => {
    const c = core();
    assert.equal(c.cssHsl({ r: 0, g: 255, b: 0, a: 0.5 }), 'hsl(120 100% 50% / 0.5)');
    assert.equal(c.cssHsl({ r: 255, g: 0, b: 0, a: 1 }), 'hsl(0 100% 50%)');
    const hsl = c.rgbToHsl({ r: 128, g: 128, b: 128, a: 1 });
    assert.equal(hsl.s, 0);
    near(hsl.l, 128 / 255 * 100);
});

test('color paste accepts CSS RGB/HSL and Python tuples with exact alpha', () => {
    const c = core();
    for (const text of ['rgb(255 0 0 / 50%)', 'rgba(255, 0, 0, 0.5)', '(255, 0, 0, 0.5)', 'hsl(360 100% 50% / .5)']) {
        assert.deepEqual(plain(c.parseColor(text)), {r: 255, g: 0, b: 0, a: .5}, text);
    }
    assert.equal(c.toHex(c.parseColor('rgb(100% 0% 0%)')), '#f00');
    assert.equal(c.toHex(c.parseColor('(17, 34, 51)')), '#123');
    for (const text of ['rgb(256 0 0)', '(1, 2)', 'hsl(0 101% 50%)', 'rgba(1,2,3,2)', 'url(x)', 'rgb(NaN 0 0)']) assert.equal(c.parseColor(text), null, text);
});

test('WCAG contrast includes composited transparent foreground and backgrounds', () => {
    const c = core(), black = c.parseHex('#000'), white = c.parseHex('#fff');
    near(c.contrast(black, white), 21);
    near(c.contrast(white, white), 1);
    near(c.contrast({...black, a: 0}, white), 1);
    assert.equal(c.contrast({...black, a: .5}, white) > 3.9, true);
    assert.equal(c.contrast({...black, a: .5}, white) < 4.1, true);
});

test('perceptual conversions round trip colors and generate ordered shades', () => {
    const c = core();
    for (const hex of ['#000', '#fff', '#f00', '#00f', '#2f7524', '#abcdef']) {
        const color = c.parseHex(hex);
        assert.equal(c.toHex(c.oklabToRgb(c.rgbToOklab(color))), c.toHex(color));
    }
    const red = c.rgbToOklab(c.parseHex('#f00')); near(red.l, .62795536, .00001);
    assert.match(c.cssOklch(c.parseHex('#f00')), /^oklch\(/);
    const shades = c.shades(c.parseHex('#2f7524'));
    assert.equal(shades.length, 11);
    assert.equal(new Set(shades.map(color => c.toHex(color))).size, 11);
    for (let i = 1; i < shades.length; i++) assert.ok(c.luminance(shades[i - 1]) > c.luminance(shades[i]));
});

test('harmonies derive from the selected color without mutating it', () => {
    const c = core(), color = c.parseHex('#f00');
    const triad = c.harmony(color, 'triadic');
    assert.deepEqual(plain(triad.map(value => c.toHex(value))), ['#f00', '#0f0', '#00f']);
    assert.equal(c.toHex(color), '#f00');
});

test('HEX alpha writes the nearest byte and is included when requested', () => {
    const c = core();
    assert.equal(c.toHex({ r: 1, g: 2, b: 3, a: 0.5 }, true, false), '#01020380');
    assert.equal(c.toHex({ r: 1, g: 2, b: 3, a: 0 }, true, false), '#01020300');
    assert.equal(c.toHex({ r: 1, g: 2, b: 3, a: 0.5 }, false, false), '#010203');
});

 test('black and white still produce eleven distinct ordered shades', () => {
    const c = core();
    for (const hex of ['#000', '#fff']) {
        const shades = c.shades(c.parseHex(hex));
        assert.equal(new Set(shades.map(value => c.toHex(value))).size, 11);
        for (let i = 1; i < shades.length; i++) assert.ok(c.luminance(shades[i-1]) > c.luminance(shades[i]));
    }
});

test('OKLCH editable output round trips sRGB and rejects malformed channels', () => {
    const c = core();
    for (const hex of ['#000','#fff','#f00','#2f752480']) {
        const value = c.parseHex(hex);
        assert.equal(c.toHex(c.parseColor(c.cssOklch(value))), c.toHex(value));
    }
    assert.equal(c.toHex(c.parseColor('oklch(0.5 0 none / 50%)')), '#63636380');
    for (const invalid of ['oklch(120% .2 20)','oklch(50% -1 20)','oklch(50% .2 bad)','oklch(50% .2 20 / 2)']) assert.equal(c.parseColor(invalid),null);
});
