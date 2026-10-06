/* Color conversions are independent of the page, clipboard and theme. */
(function () {
    'use strict';
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const decimal = (value, precision = 6) => String(Number(value.toFixed(precision)));
    const byte = value => Math.round(clamp(value, 0, 255));

    const parseHex = value => {
        if (typeof value !== 'string') return null;
        let text = value.trim().replace(/^#/, '');
        if (!/^(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(text)) return null;
        if (text.length <= 4) text = [...text].map(letter => letter + letter).join('');
        return {
            r: parseInt(text.slice(0, 2), 16),
            g: parseInt(text.slice(2, 4), 16),
            b: parseInt(text.slice(4, 6), 16),
            a: text.length === 8 ? parseInt(text.slice(6, 8), 16) / 255 : 1,
        };
    };
    const shortenHex = hex => {
        const text = hex.toLowerCase();
        if (/^#(?:[a-f\d]{6}|[a-f\d]{8})$/.test(text)) {
            const pairs = text.slice(1).match(/../g);
            if (pairs.every(pair => pair[0] === pair[1])) return '#' + pairs.map(pair => pair[0]).join('');
        }
        return text;
    };
    const toHex = (color, includeAlpha = color.a < 1, shorten = true) => {
        const values = [color.r, color.g, color.b];
        if (includeAlpha) values.push(color.a * 255);
        const hex = '#' + values.map(value => byte(value).toString(16).padStart(2, '0')).join('');
        return shorten ? shortenHex(hex) : hex;
    };
    const parseNumber = (value, min, max, integer = false) => {
        const text = String(value).trim();
        if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
        const number = Number(text);
        return Number.isFinite(number) && number >= min && number <= max
            && (!integer || Number.isInteger(number)) ? number : null;
    };
    const hsvToRgb = ({ h, s, v, a = 1 }) => {
        const hue = ((h % 360) + 360) % 360 / 60;
        const saturation = clamp(s, 0, 100) / 100;
        const value = clamp(v, 0, 100) / 100;
        const chroma = value * saturation;
        const x = chroma * (1 - Math.abs(hue % 2 - 1));
        const m = value - chroma;
        const sectors = [[chroma, x, 0], [x, chroma, 0], [0, chroma, x], [0, x, chroma], [x, 0, chroma], [chroma, 0, x]];
        const [r, g, b] = sectors[Math.floor(hue)].map(channel => byte((channel + m) * 255));
        return { r, g, b, a };
    };
    const rgbToHsv = ({ r, g, b, a = 1 }, fallbackHue = 0) => {
        const red = r / 255, green = g / 255, blue = b / 255;
        const max = Math.max(red, green, blue), min = Math.min(red, green, blue), delta = max - min;
        let h = fallbackHue;
        if (delta) {
            if (max === red) h = 60 * ((green - blue) / delta % 6);
            else if (max === green) h = 60 * ((blue - red) / delta + 2);
            else h = 60 * ((red - green) / delta + 4);
            if (h < 0) h += 360;
        }
        return { h, s: max ? delta / max * 100 : 0, v: max * 100, a };
    };
    const rgbToHsl = color => {
        const hsv = rgbToHsv(color);
        const v = hsv.v / 100, s = hsv.s / 100;
        const l = v * (1 - s / 2);
        return { h: hsv.h, s: l && l !== 1 ? (v - l) / Math.min(l, 1 - l) * 100 : 0, l: l * 100, a: color.a };
    };
    const pythonRgb = color => `(${color.r}, ${color.g}, ${color.b})`;
    const pythonRgba = color => `(${color.r}, ${color.g}, ${color.b}, ${decimal(color.a)})`;
    const cssHsl = color => {
        const hsl = rgbToHsl(color);
        return `hsl(${decimal(hsl.h, 2)} ${decimal(hsl.s, 2)}% ${decimal(hsl.l, 2)}%${color.a < 1 ? ' / ' + decimal(color.a) : ''})`;
    };
    const hslToRgb = ({ h, s, l, a = 1 }) => {
        const light = l / 100, saturation = s / 100;
        const v = light + saturation * Math.min(light, 1 - light);
        return hsvToRgb({h, s: v ? 200 * (1 - light / v) : 0, v: v * 100, a});
    };
    const parseColor = value => {
        if (typeof value !== 'string') return null;
        const hex = parseHex(value);
        if (hex) return hex;
        const text = value.trim();
        const alpha = text => text === undefined ? 1 : text.endsWith('%')
            ? parseNumber(text.slice(0, -1), 0, 100) === null ? null : Number(text.slice(0, -1)) / 100
            : parseNumber(text, 0, 1);
        const perceptual = text.match(/^oklch\(\s*([^()]+)\)$/i);
        if (perceptual) {
            const parts = perceptual[1].trim().split(/\s*\/\s*|\s+/);
            if (parts.length < 3 || parts.length > 4) return null;
            const channel = (part, scale, max) => part === 'none' ? 0 : part.endsWith('%')
                ? parseNumber(part.slice(0, -1), 0, max / scale * 100) === null ? null : Number(part.slice(0, -1)) / 100 * scale
                : parseNumber(part, 0, max);
            const l = channel(parts[0], 1, 1), chroma = channel(parts[1], .4, 1000);
            const angle = parts[2] === 'none' ? 0 : /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:deg|rad|grad|turn)?$/i.test(parts[2]) ? parseFloat(parts[2]) : NaN;
            const unit = parts[2].match(/(deg|rad|grad|turn)$/i)?.[1]?.toLowerCase();
            const h = angle * (unit === 'rad' ? 180 / Math.PI : unit === 'grad' ? .9 : unit === 'turn' ? 360 : 1);
            const a = parts[3] === 'none' ? 0 : alpha(parts[3]);
            if (l === null || chroma === null || !Number.isFinite(h) || a === null) return null;
            return oklabToRgb({l, x: chroma * Math.cos(h * Math.PI / 180), y: chroma * Math.sin(h * Math.PI / 180), a});
        }
        const tuple = text.match(/^\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
        const css = text.match(/^(rgb|rgba|hsl|hsla)\(\s*([^()]+)\s*\)$/i);
        let parts, space = 'rgb';
        if (tuple) parts = tuple.slice(1);
        else if (css) {
            space = css[1].toLowerCase().startsWith('hsl') ? 'hsl' : 'rgb';
            parts = css[2].trim().split(/\s*[,/]\s*|\s+/);
            if (parts.length < 3 || parts.length > 4) return null;
        } else return null;
        const a = alpha(parts[3]);
        if (a === null) return null;
        if (space === 'hsl') {
            const h = Number(parts[0].replace(/deg$/i, ''));
            const percentages = parts.slice(1, 3).map(part => part.endsWith('%') ? parseNumber(part.slice(0, -1), 0, 100) : null);
            if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:deg)?$/i.test(parts[0]) || !Number.isFinite(h) || percentages.includes(null)) return null;
            return hslToRgb({h, s: percentages[0], l: percentages[1], a});
        }
        const channels = parts.slice(0, 3).map(part => part.endsWith('%') ? parseNumber(part.slice(0, -1), 0, 100) : parseNumber(part, 0, 255, !!tuple));
        if (channels.includes(null)) return null;
        return {r: byte(channels[0] * (parts[0].endsWith('%') ? 2.55 : 1)), g: byte(channels[1] * (parts[1].endsWith('%') ? 2.55 : 1)), b: byte(channels[2] * (parts[2].endsWith('%') ? 2.55 : 1)), a};
    };
    const linear = channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    const encoded = channel => channel <= .0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - .055;
    const luminance = color => .2126 * linear(color.r / 255) + .7152 * linear(color.g / 255) + .0722 * linear(color.b / 255);
    const composite = (foreground, background) => ({
        r: foreground.r * foreground.a + background.r * (1 - foreground.a),
        g: foreground.g * foreground.a + background.g * (1 - foreground.a),
        b: foreground.b * foreground.a + background.b * (1 - foreground.a), a: 1,
    });
    const contrast = (foreground, background) => {
        const bg = composite(background, {r: 255, g: 255, b: 255, a: 1});
        const fg = composite(foreground, bg), first = luminance(fg), second = luminance(bg);
        return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
    };
    // D65 OKLab matrices from Björn Ottosson's published reference.
    const rgbToOklab = color => {
        const r = linear(color.r / 255), g = linear(color.g / 255), b = linear(color.b / 255);
        const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
        const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
        const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
        return {l: .2104542553 * l + .793617785 * m - .0040720468 * s,
            x: 1.9779984951 * l - 2.428592205 * m + .4505937099 * s,
            y: .0259040371 * l + .7827717662 * m - .808675766 * s, a: color.a};
    };
    const oklabToRgb = color => {
        const l = (color.l + .3963377774 * color.x + .2158037573 * color.y) ** 3;
        const m = (color.l - .1055613458 * color.x - .0638541728 * color.y) ** 3;
        const s = (color.l - .0894841775 * color.x - 1.291485548 * color.y) ** 3;
        return {r: byte(encoded(4.0767416621 * l - 3.3077115913 * m + .2309699292 * s) * 255),
            g: byte(encoded(-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s) * 255),
            b: byte(encoded(-.0041960863 * l - .7034186147 * m + 1.707614701 * s) * 255), a: color.a ?? 1};
    };
    const cssOklch = color => {
        const lab = rgbToOklab(color), chroma = Math.hypot(lab.x, lab.y);
        const hue = chroma < .000001 ? 0 : (Math.atan2(lab.y, lab.x) * 180 / Math.PI + 360) % 360;
        return `oklch(${decimal(lab.l * 100, 3)}% ${decimal(chroma, 5)} ${decimal(hue, 2)}${color.a < 1 ? ' / ' + decimal(color.a) : ''})`;
    };
    const cssRgb = color => `rgb(${color.r} ${color.g} ${color.b}${color.a < 1 ? ' / ' + decimal(color.a) : ''})`;
    const harmony = (color, kind) => {
        const hsl = rgbToHsl(color);
        const offsets = {analogous: [-30, -15, 0, 15, 30], complementary: [0, 180], split: [0, 150, 210], triadic: [0, 120, 240], tetradic: [0, 90, 180, 270]};
        return (offsets[kind] || offsets.analogous).map(offset => hslToRgb({...hsl, h: hsl.h + offset}));
    };
    const shades = color => {
        const base = rgbToOklab(color);
        if (base.l < .06 || base.l > .94) return [.98, .92, .85, .76, .67, .58, .49, .4, .3, .2, .1].map(l => oklabToRgb({l, x: 0, y: 0, a: color.a}));
        return [.95, .85, .7, .5, .25, 0, -.2, -.4, -.6, -.75, -.88].map(amount => {
            const target = amount >= 0 ? 1 : 0, mix = Math.abs(amount);
            return oklabToRgb({l: base.l * (1 - mix) + target * mix, x: base.x * (1 - mix), y: base.y * (1 - mix), a: color.a});
        });
    };

    window.ESDocColors = Object.freeze({
        clamp, decimal, parseHex, shortenHex, toHex, parseNumber,
        hsvToRgb, rgbToHsv, rgbToHsl, pythonRgb, pythonRgba, cssHsl,
        hslToRgb, parseColor, cssRgb, rgbToOklab, oklabToRgb, cssOklch,
        luminance, composite, contrast, harmony, shades,
    });
})();
