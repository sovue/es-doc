/* =====================================================================
   Warper previews (/tools/warpers).

   The table below is Ren'Py's warper set, ported 1:1 from
   renpy/common/000atl.rpy. The engine keeps the formula in `easeout_*`
   and derives the other two variants from it — except elastic and
   bounce, where the formula lives in `easein_*` and easeout is the
   derived one. Keep that asymmetry: swapping it silently mirrors two
   of the ten families.

   Each canvas draws its curve at rest and runs a marker along it (plus
   a travel track under the plot) while its cell is hovered or focused.
   Colours are read from the stylesheet so previews follow the day /
   lake themes instead of pinning their own palette.
   ===================================================================== */

/* Page scripts are re-evaluated by navigation.js when the user returns to
   this page without a full reload. Keep the implementation scoped so a
   second visit cannot redeclare its lexical bindings in the document. */
(function () {

const previousCleanup = window.__esdocWarperCleanup;
if (previousCleanup) previousCleanup();

const cleanupTasks = [];
const registerCleanup = task => cleanupTasks.push(task);
window.__esdocWarperCleanup = () => {
    while (cleanupTasks.length) {
        try {
            cleanupTasks.pop()();
        } catch (error) {
            // A detached preview must never prevent the next page from loading.
            console.warn('Unable to clean up warper preview:', error);
        }
    }
};

const Warpers = {

    // Special warpers
    pause: t => t >= 1.0 ? 1.0 : 0.0,
    instant: t => 1.0,
    linear: t => t,

    // Default easings
    easeout: t => 1.0 - Math.cos(t * Math.PI / 2.0),
    easein: t => Math.cos((1.0 - t) * Math.PI / 2.0),
    ease: t => 0.5 - Math.cos(t * Math.PI) / 2.0,

    // Quad
    easeout_quad: t => Math.pow(t, 2.0),
    easein_quad: t => 1.0 - Warpers.easeout_quad(1.0 - t),
    ease_quad: t => t < 0.5 ? Warpers.easeout_quad(t * 2.0) / 2.0 : 1.0 - Warpers.easeout_quad((1.0 - t) * 2.0) / 2.0,

    // Cubic
    easeout_cubic: t => Math.pow(t, 3.0),
    easein_cubic: t => 1.0 - Warpers.easeout_cubic(1.0 - t),
    ease_cubic: t => t < 0.5 ? Warpers.easeout_cubic(t * 2.0) / 2.0 : 1.0 - Warpers.easeout_cubic((1.0 - t) * 2.0) / 2.0,

    // Quart
    easeout_quart: t => Math.pow(t, 4.0),
    easein_quart: t => 1.0 - Warpers.easeout_quart(1.0 - t),
    ease_quart: t => t < 0.5 ? Warpers.easeout_quart(t * 2.0) / 2.0 : 1.0 - Warpers.easeout_quart((1.0 - t) * 2.0) / 2.0,

    // Quint
    easeout_quint: t => Math.pow(t, 5.0),
    easein_quint: t => 1.0 - Warpers.easeout_quint(1.0 - t),
    ease_quint: t => t < 0.5 ? Warpers.easeout_quint(t * 2.0) / 2.0 : 1.0 - Warpers.easeout_quint((1.0 - t) * 2.0) / 2.0,

    // Exponential
    easeout_expo: t => Math.pow(2.0, 10.0 * (t - 1.0)),
    easein_expo: t => 1.0 - Warpers.easeout_expo(1.0 - t),
    ease_expo: t => t < 0.5 ? Warpers.easeout_expo(t * 2.0) / 2.0 : 1.0 - Warpers.easeout_expo((1.0 - t) * 2.0) / 2.0,

    // Circular
    easeout_circ: t => 1.0 - Math.sqrt(1.0 - t * t),
    easein_circ: t => 1.0 - Warpers.easeout_circ(1.0 - t),
    ease_circ: t => t < 0.5 ? Warpers.easeout_circ(t * 2.0) / 2.0 : 1.0 - Warpers.easeout_circ((1.0 - t) * 2.0) / 2.0,

    // Back
    easeout_back: t => {
        const overshoot = 1.7015;
        return t * t * ((overshoot + 1.0) * t - overshoot);
    },
    easein_back: t => 1.0 - Warpers.easeout_back(1.0 - t),
    ease_back: t => t < 0.5 ? Warpers.easeout_back(t * 2.0) / 2.0 : 1.0 - Warpers.easeout_back((1.0 - t) * 2.0) / 2.0,

    // Elastic — the engine's formula sits in easein, easeout is derived
    easein_elastic: t => {
        const period = 0.3;
        return 1.0 + Math.pow(2.0, -10.0 * t) * Math.sin((t - period / 4.0) * (2.0 * Math.PI) / period);
    },
    easeout_elastic: t => 1.0 - Warpers.easein_elastic(1.0 - t),
    ease_elastic: t => t < 0.5 ? Warpers.easeout_elastic(t * 2.0) / 2.0 : 1.0 - Warpers.easeout_elastic((1.0 - t) * 2.0) / 2.0,

    // Bounce — same asymmetry as elastic
    easein_bounce: t => {
        const period = 2.75;
        const overshoot = Math.pow(period, 2.0);
        if (t < (1.0 / period)) return overshoot * t * t;
        if (t < (2.0 / period)) return 1.0 + overshoot * (Math.pow(t - 1.5 / period, 2.0) - Math.pow(-0.5 / period, 2.0));
        if (t < (2.5 / period)) return 1.0 + overshoot * (Math.pow(t - 2.25 / period, 2.0) - Math.pow(-0.25 / period, 2.0));
        return 1.0 + overshoot * (Math.pow(t - 2.625 / period, 2.0) - Math.pow(-0.125 / period, 2.0));
    },
    easeout_bounce: t => 1.0 - Warpers.easein_bounce(1.0 - t),
    ease_bounce: t => t < 0.5 ? Warpers.easeout_bounce(t * 2.0) / 2.0 : 1.0 - Warpers.easeout_bounce((1.0 - t) * 2.0) / 2.0,
};

/* Community warpers aren't in the table above: they come from warpers.yaml,
   already sampled server-side (utils/lifespan/warpers_cache.py), so the page
   ships plain numbers instead of a formula the browser would have to eval.
   Linear interpolation between samples is enough — the curve is sampled far
   finer than a 240px-wide plot can show. */
const fromPoints = points => t => {
    const last = points.length - 1;
    const x = Math.min(Math.max(t, 0), 1) * last;
    const i = Math.min(Math.floor(x), last - 1);

    return points[i] + (points[i + 1] - points[i]) * (x - i);
};

/* ── Formula parser ──────────────────────────────────────── */

/* The generator compiles what you type into a closure tree — never eval or
   new Function. That keeps a pasted formula from being pasted *code*, and it
   survives a Content-Security-Policy the site may grow later.

   The grammar is deliberately the one warpers_cache.py accepts, Python and
   all (`**`, `a if c else b`, chained comparisons), so a formula that draws
   here is a formula that can go straight into warpers.yaml. `^` is allowed
   as a second spelling of `**`: it's what people type. */

const FORMULA_FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sqrt: Math.sqrt, exp: Math.exp,
    log: (value, base) => {
        if (value <= 0 || (base !== undefined && (base <= 0 || base === 1))) return NaN;
        return base === undefined ? Math.log(value) : Math.log(value) / Math.log(base);
    },
    floor: Math.floor, ceil: Math.ceil,
    round: value => {
        const floor = Math.floor(value);
        return value - floor === 0.5 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(value);
    },
    abs: Math.abs, min: Math.min, max: Math.max, pow: Math.pow,
};

const FORMULA_CONSTS = { pi: Math.PI, e: Math.E };

// Python signatures: never let Math.* silently discard an extra argument.
// Only round(x) is supported; decimal rounding has version-specific semantics.
const FORMULA_ARITY = { log: [1, 2], min: [2, Infinity], max: [2, Infinity], pow: [2, 2] };

const COMPARISONS = {
    '<': (a, b) => a < b,
    '<=': (a, b) => a <= b,
    '>': (a, b) => a > b,
    '>=': (a, b) => a >= b,
    '==': (a, b) => a === b,
    '!=': (a, b) => a !== b,
};

const truthy = value => value !== 0 && value !== false;

const tokenize = source => {
    const pattern = /\s*(\*\*|\/\/|<=|>=|==|!=|[-+*/%^(),<>]|\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?|[A-Za-z_][A-Za-z0-9_]*)/y;
    const tokens = [];

    let at = 0;

    while (at < source.length) {
        pattern.lastIndex = at;
        const match = pattern.exec(source);

        if (!match) throw new Error(`Недопустимый символ «${source[at]}»`);

        at = pattern.lastIndex;
        tokens.push(match[1]);
    }

    return tokens;
};

const parseFormula = source => {
    if (source.length > 2048) throw new Error('Формула слишком длинная (максимум 2048 символов)');
    const tokens = tokenize(source.trim());

    if (!tokens.length) throw new Error('Введите формулу');

    let at = 0;

    const peek = () => tokens[at];
    const eat = token => (tokens[at] === token ? (at++, true) : false);
    const expect = token => {
        if (!eat(token)) throw new Error(`Ожидается «${token}»`);
    };

    const atom = () => {
        const token = peek();

        if (token === undefined) throw new Error('Незавершённое выражение');

        if (eat('(')) {
            const inner = expression();
            expect(')');
            return inner;
        }

        if (/^[\d.]/.test(token)) {
            at++;
            const number = parseFloat(token);
            if (!isFinite(number)) throw new Error(`Некорректное число «${token}»`);
            return () => number;
        }

        if (/^[A-Za-z_]/.test(token)) {
            at++;

            if (token === 't') return t => t;
            if (Object.hasOwn(FORMULA_CONSTS, token)) {
                const constant = FORMULA_CONSTS[token];
                return () => constant;
            }

            if (eat('(')) {
                const fn = Object.hasOwn(FORMULA_FUNCS, token) && FORMULA_FUNCS[token];
                if (!fn) throw new Error(`Неизвестная функция ${token}. Допустимые функции перечислены в разделе «Как написать формулу»`);

                const args = [];
                if (!eat(')')) {
                    do { args.push(expression()); } while (eat(','));
                    expect(')');
                }

                const [minimum, maximum] = FORMULA_ARITY[token] || [1, 1];
                if (args.length < minimum || args.length > maximum) {
                    const expected = maximum === Infinity ? `не менее ${minimum}`
                        : minimum === maximum ? String(minimum) : `${minimum}–${maximum}`;
                    throw new Error(`Функция ${token}: указано ${args.length} аргументов, требуется ${expected}`);
                }

                return t => fn(...args.map(arg => arg(t)));
            }

            throw new Error(`Неизвестное имя ${token}. Используйте t, pi или e`);
        }

        throw new Error(`Недопустимый элемент «${token}»`);
    };

    // Right-associative, and binds tighter than unary minus on its left:
    // -t ** 2 is -(t ** 2), the same way Python reads it.
    const power = () => {
        const base = atom();
        if (eat('**') || eat('^')) {
            const exponent = unary();
            return t => Math.pow(base(t), exponent(t));
        }
        return base;
    };

    const unary = () => {
        if (eat('-')) {
            const value = unary();
            return t => -value(t);
        }
        if (eat('+')) return unary();
        return power();
    };

    const product = () => {
        let left = unary();

        for (;;) {
            const previous = left;

            if (eat('*')) { const right = unary(); left = t => previous(t) * right(t); }
            else if (eat('/')) { const right = unary(); left = t => previous(t) / right(t); }
            else if (eat('//')) { const right = unary(); left = t => Math.floor(previous(t) / right(t)); }
            // Python's modulo, not JavaScript's: -1 % 3 is 2 there and -1
            // here, and this has to agree with the server-side sampler.
            else if (eat('%')) {
                const right = unary();
                left = t => ((previous(t) % right(t)) + right(t)) % right(t);
            }
            else return left;
        }
    };

    const sum = () => {
        let left = product();

        for (;;) {
            const previous = left;

            if (eat('+')) { const right = product(); left = t => previous(t) + right(t); }
            else if (eat('-')) { const right = product(); left = t => previous(t) - right(t); }
            else return left;
        }
    };

    // Chained like Python: `0.3 < t < 0.7` is both comparisons, not
    // `(0.3 < t) < 0.7` — which would quietly evaluate to something else.
    const comparison = () => {
        const first = sum();
        const ops = [];
        const operands = [first];

        while (Object.hasOwn(COMPARISONS, peek())) {
            ops.push(COMPARISONS[tokens[at++]]);
            operands.push(sum());
        }

        if (!ops.length) return first;

        return t => {
            const values = operands.map(operand => operand(t));
            return ops.every((op, i) => op(values[i], values[i + 1]));
        };
    };

    const negation = () => {
        if (eat('not')) {
            const value = negation();
            return t => !truthy(value(t));
        }
        return comparison();
    };

    const conjunction = () => {
        let left = negation();

        while (eat('and')) {
            const right = negation();
            const previous = left;
            left = t => (truthy(previous(t)) ? right(t) : previous(t));
        }

        return left;
    };

    const disjunction = () => {
        let left = conjunction();

        while (eat('or')) {
            const right = conjunction();
            const previous = left;
            left = t => (truthy(previous(t)) ? previous(t) : right(t));
        }

        return left;
    };

    function expression() {
        const value = disjunction();

        if (eat('if')) {
            const condition = disjunction();
            if (!eat('else')) throw new Error('После «if» нужен «else»');
            const otherwise = expression();
            return t => (truthy(condition(t)) ? value(t) : otherwise(t));
        }

        return value;
    }

    const compiled = expression();
    const numeric = t => {
        const value = compiled(t);
        return typeof value === 'boolean' ? Number(value) : value;
    };

    if (at < tokens.length) throw new Error(`Лишний элемент в конце формулы: «${tokens[at]}»`);

    // A formula that parses can still be undefined somewhere on 0…1 —
    // log(t) at zero, sqrt of a negative. Better to say where than to hand
    // the plotter a NaN and draw a hole.
    for (let i = 0; i <= 120; i++) {
        const t = i / 120;
        const value = numeric(t);

        if (typeof value !== 'number' || !isFinite(value)) {
            throw new Error(`При t = ${t.toFixed(2)} значение не определено`);
        }
    }

    return numeric;
};

// A shared elapsed-time clock keeps all three effects and both curves in sync.
class WarperPlayback {
    constructor() {
        this.elapsed = 0;
        this.progress = 0;
        this.running = false;
        this.started = 0;
    }
    resume(now) { this.started = now - this.elapsed; this.running = true; }
    pause() { this.running = false; }
    rebase(now, duration) {
        this.elapsed = this.progress * duration;
        this.started = now - this.elapsed;
    }
    seek(t, duration) {
        this.pause();
        this.progress = Math.min(1, Math.max(0, t));
        this.elapsed = this.progress * duration;
    }
    tick(now, duration, repeat) {
        if (!this.running) return this.progress;
        this.elapsed = Math.max(0, now - this.started);
        this.progress = repeat
            ? Math.min((this.elapsed % (duration + 450)) / duration, 1)
            : Math.min(this.elapsed / duration, 1);
        if (!repeat && this.progress === 1) this.pause();
        return this.progress;
    }
}

/* ── Preview canvas ──────────────────────────────────────── */

const TAU = Math.PI * 2;

/* Plot geometry, in CSS pixels. The curve keeps the top-left of the square;
   the value track runs down the right edge (same vertical mapping as the
   plot, so its marker sits at exactly the height the curve is at) and the
   time scale runs along the bottom. Together they read as what a warper
   does: time in along the bottom, value out along the right. */
const PAD_X = 14;
const PAD_TOP = 14;
const TRACK_W = 9;      // the value track's tick width
const TRACK_GAP = 14;
const AXIS_H = 26;      // time scale: line, ticks, end labels
const TICK = 3.5;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const palette = { line: '#000', curve: '#000', mark: '#000', mono: 'monospace' };
const paletteProbe = document.createElement('span');
paletteProbe.hidden = true;
paletteProbe.setAttribute('aria-hidden', 'true');
document.body.append(paletteProbe);
registerCleanup(() => paletteProbe.remove());

const resolvedColor = token => {
    paletteProbe.style.color = `var(${token})`;
    return getComputedStyle(paletteProbe).color;
};

const readPalette = () => {
    const style = getComputedStyle(document.documentElement);
    // Resolve the theme functions through a real CSS color property before
    // passing them to canvas; custom properties themselves may still contain
    // `light-dark(...)`, which Chromium's canvas color parser can reject.
    palette.line = resolvedColor('--border');
    palette.curve = resolvedColor('--text-soft');
    palette.mark = resolvedColor('--accent');
    // Scale labels are the page's own mono face, not a canvas default.
    palette.mono = style.getPropertyValue('--font-mono').trim() || 'monospace';
};

// Hairlines land on a device pixel instead of straddling two of them.
const snap = v => Math.round(v) + 0.5;

class WarperCanvas {
    constructor(canvas, warper) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.warper = warper;

        this.duration = 1400;   // one pass along the curve
        this.hold = 450;        // beat at the target before it runs again

        this.w = 0;
        this.h = 0;

        this.points = [];
        this.lo = 0;
        this.hi = 1;

        this.progress = 0;
        this.active = false;
        this.frame = null;

        canvas._preview = this;
    }

    // Split in two so a page of 33 previews can do one read pass and one
    // write pass instead of thrashing layout canvas by canvas.
    readSize() {
        const rect = this.canvas.getBoundingClientRect();

        const w = Math.round(rect.width);
        const h = Math.round(rect.height);

        if (w === this.w && h === this.h) return false;

        this.w = w;
        this.h = h;

        return true;
    }

    // The backing store is sized in device pixels so the curve stays crisp
    // on HiDPI screens.
    render() {
        if (!this.w || !this.h) return;

        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = Math.round(this.w * dpr);
        this.canvas.height = Math.round(this.h * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.sample();
        this.draw();
    }

    measure() {
        if (this.readSize()) this.render();
    }

    // The generator's preview is one canvas whose curve keeps changing, so
    // it swaps the function under itself instead of being rebuilt per keystroke.
    setWarper(warper) {
        this.warper = warper;
        this.sample();
        this.draw();
    }

    // The curve is sampled once per size instead of per frame — 33 previews
    // share the page, and only the marker actually moves.
    sample() {
        const steps = 120;

        this.points = [];

        let lo = 0;
        let hi = 1;

        for (let i = 0; i <= steps; i++) {
            const v = this.warper(i / steps);

            if (v < lo) lo = v;
            if (v > hi) hi = v;

            this.points.push(v);
        }

        // back, elastic and bounce leave the 0…1 band, so the vertical range
        // follows the curve rather than clipping the overshoot away.
        const pad = (hi - lo) * 0.1;

        this.lo = lo - pad;
        this.hi = hi + pad;
    }

    play() {
        if (this.active) return;

        // Nothing has measured this one yet (it was hovered before the page
        // finished settling), so there's no canvas to draw on.
        if (!this.w) this.measure();

        this.active = true;

        // Reduced motion still gets the answer, just without the travel:
        // the marker sits at the target and nothing moves.
        if (reduceMotion.matches) {
            this.progress = 1;
            this.draw();
            return;
        }

        const start = performance.now();
        const cycle = this.duration + this.hold;

        const step = now => {
            this.progress = Math.min(((now - start) % cycle) / this.duration, 1);
            this.draw();
            this.frame = requestAnimationFrame(step);
        };

        this.frame = requestAnimationFrame(step);
    }

    stop() {
        if (this.frame !== null) {
            cancelAnimationFrame(this.frame);
            this.frame = null;
        }

        this.active = false;
        this.progress = 0;

        this.draw();
    }

    replay() {
        this.stop();
        this.play();
    }

    draw() {
        const ctx = this.ctx;
        const w = this.w;
        const h = this.h;

        if (!ctx || !w || !h) return;

        const left = PAD_X;
        const right = w - PAD_X - TRACK_GAP - TRACK_W;
        const top = PAD_TOP;
        const base = h - AXIS_H;
        const trackX = w - PAD_X - TRACK_W / 2;
        const axisY = h - AXIS_H + 8;
        const span = this.hi - this.lo;

        const px = t => left + t * (right - left);
        const py = v => base - (v - this.lo) / span * (base - top);

        ctx.clearRect(0, 0, w, h);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        /* Start level solid, target level dashed — the dashed line is the only
           way to see that back, elastic and bounce shoot past their goal. */
        ctx.strokeStyle = palette.line;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(left, snap(py(0)));
        ctx.lineTo(right, snap(py(0)));
        ctx.stroke();

        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(left, snap(py(1)));
        ctx.lineTo(right, snap(py(1)));
        ctx.stroke();
        ctx.setLineDash([]);

        if (this.linearReference) {
            ctx.setLineDash([4, 5]);
            ctx.strokeStyle = palette.curve;
            ctx.beginPath();
            ctx.moveTo(px(0), py(0));
            ctx.lineTo(px(1), py(1));
            ctx.stroke();
            ctx.setLineDash([]);
        }

        const steps = this.points.length - 1;

        ctx.strokeStyle = this.linearReference ? palette.mark : palette.curve;
        ctx.lineWidth = this.linearReference ? 2 : 1.5;
        ctx.beginPath();

        for (let i = 0; i <= steps; i++) {
            const x = px(i / steps);
            const y = py(this.points[i]);

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.stroke();

        /* Value track, down the right edge: the same motion as the curve but
           as actual travel. Its ticks sit on the two guide levels, so start
           and target line up with the lines they belong to. */
        ctx.strokeStyle = palette.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(snap(trackX), top);
        ctx.lineTo(snap(trackX), base);

        for (const v of [0, 1]) {
            ctx.moveTo(trackX - TRACK_W / 2, snap(py(v)));
            ctx.lineTo(trackX + TRACK_W / 2, snap(py(v)));
        }

        ctx.stroke();

        /* Time scale along the bottom: quarters of the interpolation's
           duration, 0 to 1. Reading the two together is the whole point —
           time moves evenly down here while the value up there doesn't. */
        ctx.beginPath();
        ctx.moveTo(left, snap(axisY));
        ctx.lineTo(right, snap(axisY));

        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
            const x = snap(px(t));
            ctx.moveTo(x, snap(axisY));
            ctx.lineTo(x, snap(axisY) + (t === 0 || t === 1 ? TICK + 2 : TICK));
        }

        ctx.stroke();

        ctx.fillStyle = palette.curve;
        ctx.font = `9px ${palette.mono}`;
        ctx.textBaseline = 'top';

        ctx.textAlign = 'left';
        ctx.fillText('0', left, axisY + TICK + 5);
        ctx.textAlign = 'right';
        ctx.fillText('1', right, axisY + TICK + 5);

        if (!this.active) {
            // At rest the preview stays ink-quiet: the leaf shows up only
            // on the one curve you're pointing at (DESIGN.md, One-Leaf Rule).
            ctx.strokeStyle = palette.line;

            ctx.beginPath();
            ctx.arc(trackX, py(0), 3, 0, TAU);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(px(0), axisY, 3, 0, TAU);
            ctx.stroke();
            return;
        }

        const t = this.progress;
        const value = this.warper(t);

        ctx.strokeStyle = palette.mark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px(0), py(this.points[0]));

        for (let i = 1; i <= steps; i++) {
            if (i / steps > t) break;
            ctx.lineTo(px(i / steps), py(this.points[i]));
        }

        ctx.lineTo(px(t), py(value));
        ctx.stroke();

        ctx.fillStyle = palette.mark;

        // On the curve, on the value track, and on the time scale — one
        // moment shown three ways.
        ctx.beginPath();
        ctx.arc(px(t), py(value), 3.5, 0, TAU);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(trackX, py(value), 4, 0, TAU);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px(t), axisY, 4, 0, TAU);
        ctx.fill();
    }
}

/* ── Wiring ──────────────────────────────────────────────── */

readPalette();

const previews = [];

document.querySelectorAll('canvas.wp-plot').forEach(canvas => {
    const name = canvas.dataset.warper;

    const warper = canvas.dataset.points
        ? fromPoints(canvas.dataset.points.split(',').map(Number))
        : Warpers[name];

    if (!warper) {
        console.warn(`Unknown warper: ${name}`);
        return;
    }

    previews.push(new WarperCanvas(canvas, warper));
});

previews.forEach(preview => {
    const cell = preview.canvas.closest('.wp-cell') || preview.canvas;

    cell.addEventListener('pointerenter', () => preview.play());
    cell.addEventListener('pointerleave', () => preview.stop());

    // Tabbing to the cell's copy button counts as pointing at it, so the
    // preview isn't mouse-only.
    cell.addEventListener('focusin', () => preview.play());
    cell.addEventListener('focusout', () => preview.stop());

    // Selection belongs to the native link around the graph.
});

/* Read every box first, then write every backing store: interleaving the two
   thrashes layout across 33 canvases. */
const measureAll = () => {
    const stale = previews.filter(preview => preview.readSize());
    stale.forEach(preview => preview.render());
};

registerCleanup(() => previews.forEach(preview => preview.stop()));

/* Draw straight away rather than waiting for the observer's first delivery.
   A tab that isn't compositing yet (opened in the background, restored
   session) skips the rendering steps entirely, and with them both the
   observer callback and any rAF — so `load` is the backstop that gets those
   previews their first real measurement. */
measureAll();
const onLoad = () => measureAll();
window.addEventListener('load', onLoad);
registerCleanup(() => window.removeEventListener('load', onLoad));

// measure() is a no-op while the box is unchanged, so the observer's own
// first callback doesn't redraw what's already on screen.
const sizeObserver = window.ResizeObserver
    ? new ResizeObserver(entries => {
        for (const entry of entries) entry.target._preview.measure();
    })
    : null;

// Previews created later (the generator's) register through this too.
const track = preview => {
    previews.push(preview);
    if (sizeObserver) sizeObserver.observe(preview.canvas);
};

if (sizeObserver) previews.forEach(preview => sizeObserver.observe(preview.canvas));
else {
    const onResize = () => previews.forEach(preview => preview.measure());
    window.addEventListener('resize', onResize);
    registerCleanup(() => window.removeEventListener('resize', onResize));
}
if (sizeObserver) registerCleanup(() => sizeObserver.disconnect());

/* Theme swap: the toggle rewrites data-theme, the OS flips the media query.
   Either way the cached palette is stale, so re-read it and repaint. */
const refresh = () => {
    readPalette();
    previews.forEach(preview => preview.draw());
};

const themeObserver = new MutationObserver(refresh);
themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
});
registerCleanup(() => themeObserver.disconnect());

const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
colorScheme.addEventListener('change', refresh);
registerCleanup(() => colorScheme.removeEventListener('change', refresh));

/* ── Explicit name copying ───────────────────────────────── */

/* Selection and copying are separate native controls. */
const nameButtons = document.querySelectorAll('.wp-cell .res-copy[data-copy]');
nameButtons.forEach(button => {
    button.hidden = false;
    button.disabled = !(navigator.clipboard && window.copyControl);
});
if (navigator.clipboard && window.copyControl) {
    const status = document.getElementById('code-copy-status');

    const copies = (element, value, label) => {
        // The flash-and-announce half is code.js's `copyControl`, shared with
        // the docs' fence button, the inline chips and the resource rows; what
        // stays here is the promotion of a plain element into a control.
        const copy = window.copyControl(element, () => value, {
            message: `Скопировано: ${value}`, status,
        });

        element.title = label;
        element.addEventListener('click', copy);

        // Native buttons already do this; the promoted ones (canvas, formula
        // chip) need it spelled out.
        if (element.tagName !== 'BUTTON') {
            element.setAttribute('role', 'button');
            element.setAttribute('tabindex', '0');
            element.setAttribute('aria-label', label);
            element.removeAttribute('aria-hidden');

            element.addEventListener('keydown', event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                copy();
            });
        }
    };

    nameButtons.forEach(button => {
        copies(button, button.dataset.copy, `Скопировать имя ${button.dataset.copy}`);
    });

}

/* ── Formula tester and three synchronized ATL examples ───── */
(function () {
    const lab = document.querySelector('.wp-lab');
    if (!lab) return;

    const pick = lab.querySelector('#wp-lab-warper');
    const seconds = lab.querySelector('#wp-lab-time');
    const playButtons = [...lab.querySelectorAll('.wp-lab-play')];
    const setPlayLabel = label => playButtons.forEach(button => { button.textContent = label; });
    const resetButton = lab.querySelector('.wp-lab-reset');
    const repeat = lab.querySelector('#wp-lab-repeat');
    const timeNote = lab.querySelector('#wp-lab-time-note');
    const formulaInput = lab.querySelector('#wp-lab-expr');
    const nameInput = lab.querySelector('#wp-lab-name');
    const note = lab.querySelector('#wp-lab-note');
    const nameNote = lab.querySelector('#wp-lab-name-note');
    const values = lab.querySelector('#wp-lab-values');
    const description = lab.querySelector('#wp-lab-description');
    const scrub = lab.querySelector('#wp-lab-scrub');
    const progress = lab.querySelector('#wp-lab-progress');
    const snippet = lab.querySelector('#wp-lab-snippet');
    const codeOutput = lab.querySelector('#wp-lab-code-output');
    const codeEmpty = lab.querySelector('#wp-lab-code-empty');
    const codeFile = lab.querySelector('#wp-lab-code-file');
    const demos = Object.fromEntries([...lab.querySelectorAll('[data-demo]')].map(node => [node.dataset.demo, node]));
    const linear = Object.fromEntries([...lab.querySelectorAll('[data-linear]')].map(node => [node.dataset.linear, node]));
    const curveCanvas = lab.querySelector('.wp-lab-curve');
    const curve = new WarperCanvas(curveCanvas, t => t);
    curve.linearReference = true;
    track(curve);

    const property = lab.querySelector('#wp-lab-prop');
    const image = lab.querySelector('.wp-lab-img');
    const sceneRange = lab.querySelector('#wp-lab-scene-range');
    const HINT = 't — доля времени от 0 до 1.';
    const keywords = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(' '));
    let fn = t => t;
    let valid = true;
    let frame = null;
    const clock = new WarperPlayback();
    let travel = 0;
    const measureTravel = () => {
        travel = Math.max(0, demos.xalign.parentElement.getBoundingClientRect().width - 20);
        if (valid) apply(Number(scrub.value));
    };

    const isCustom = () => !!pick.selectedOptions[0]?.dataset.custom;
    const warperName = () => isCustom() ? nameInput.value.trim() : pick.value;
    const duration = () => {
        const value = Number(seconds.value);
        return seconds.value.trim() && Number.isFinite(value) && value >= 0.2 ? value : NaN;
    };
    const stop = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        clock.pause();
        setPlayLabel(clock.progress >= 1 ? 'Ещё раз' : clock.progress > 0 ? 'Продолжить' : 'Проиграть');
    };
    registerCleanup(stop);

    const apply = t => {
        const value = fn(t);
        if (!Number.isFinite(value)) {
            stop();
            valid = false;
            formulaInput.setAttribute('aria-invalid', 'true');
            note.classList.add('is-error');
            note.textContent = `При t = ${t.toFixed(4)} значение не определено. Исправьте формулу.`;
            write();
            return false;
        }
        for (const [objects, v] of [[demos, value], [linear, t]]) {
            objects.xalign.style.setProperty('--travel', String(v * travel));
            objects.zoom.style.transform = `translateX(-50%) scale(${0.5 + 0.5 * v})`;
            objects.alpha.style.opacity = Math.min(Math.max(v, 0), 1);
        }
        scrub.value = t;
        progress.textContent = `t = ${t.toFixed(2)} / f(t) = ${value.toFixed(3)}`;
        curve.active = true;
        curve.progress = t;
        curve.draw();
        if (image) {
            image.style.opacity = property.value === 'alpha' ? Math.min(Math.max(value, 0), 1) : '';
            image.style.transform = property.value === 'zoom'
                ? `scale(${1.05 + 0.4 * value})`
                : property.value === 'xalign' ? `translateX(${12 - 24 * value}%) scale(1.4)` : 'scale(1.02)';
        }
        return true;
    };

    // Generated output uses the same token classes as the site's Ren'Py lexer.
    const token = (cls, text) => {
        const span = document.createElement('span');
        span.className = cls;
        span.textContent = text;
        return span;
    };
    const indent = (times = 1) => token('w', '    '.repeat(times));
    const formulaTokens = source => {
        const chunks = source.match(/\s+|\*\*|\/\/|<=|>=|==|!=|[-+*/%^(),<>]|\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?|[A-Za-z_][A-Za-z0-9_]*/g) || [];
        return chunks.map(part => /^\s+$/.test(part) ? part : token(
            /^\d|^\.\d/.test(part) ? 'm' : Object.hasOwn(FORMULA_FUNCS, part) ? 'nb' : keywords.has(part) ? 'k' : 'n',
            part === '^' ? '**' : part,
        ));
    };
    const write = () => {
        const name = warperName();
        const nameValid = !isCustom() || (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && !keywords.has(name)
            && !Object.hasOwn(Warpers, name) && !Object.hasOwn(FORMULA_FUNCS, name) && !Object.hasOwn(FORMULA_CONSTS, name));
        nameInput.disabled = !isCustom();
        nameInput.closest('label').hidden = !isCustom();
        nameInput.setAttribute('aria-invalid', String(!nameValid));
        nameNote.textContent = nameValid ? '' : (Object.hasOwn(Warpers, name) || Object.hasOwn(FORMULA_FUNCS, name) || Object.hasOwn(FORMULA_CONSTS, name) || keywords.has(name))
            ? 'Это имя уже занято варпером, функцией или словом Python. Выберите другое.'
            : 'Имя: латинские буквы, цифры и _. Начните с буквы или _.';
        nameNote.classList.toggle('is-error', !nameValid);
        const timeValid = Number.isFinite(duration());
        seconds.setAttribute('aria-invalid', String(!timeValid));
        timeNote.hidden = timeValid;
        timeNote.textContent = timeValid ? '' : 'Введите длительность от 0,2 секунды.';
        playButtons.forEach(button => { button.disabled = !valid || !timeValid; });
        scrub.disabled = !valid;
        codeOutput.hidden = !valid || !nameValid || (!isCustom() && !timeValid);
        codeEmpty.hidden = !codeOutput.hidden;
        codeEmpty.textContent = !valid || !nameValid
            ? 'Исправьте формулу или имя, чтобы получить код варпера.'
            : 'Исправьте длительность, чтобы получить код ATL.';
        codeFile.textContent = isCustom()
            ? 'Сохраните объявление в game/00_warpers.rpy, до файлов с использованием этого варпера.'
            : '';
        snippet.textContent = '';
        if (!valid || !nameValid) return;
        if (isCustom()) {
            snippet.append(
                token('k', 'python early hide'), ':\n', indent(),
                token('k', 'from'), ' ', token('n', 'math'), ' ', token('k', 'import'), ' ',
                token('n', 'pi, e, sin, cos, tan, asin, acos, atan, sqrt, exp, log, floor, ceil'), '\n\n',
                indent(), token('nd', '@renpy.atl_warper'), '\n', indent(), token('k', 'def'), ' ',
                token('nf', name), '(t):\n', indent(2), token('k', 'return'), ' ',
                ...formulaTokens(formulaInput.value.trim()), '\n\n',
            );
        }
        if (!timeValid) return;
        const prop = property.value;
        const [from, to] = {xalign: ['0.0', '1.0'], zoom: ['0.5', '1.0'], alpha: ['0.0', '1.0']}[prop];
        snippet.append(token('k', 'transform'), ' ', token('nf', 'warper_preview'), ':\n',
            indent(), token('n', prop), ' ', token('m', from), '\n', indent(),
            token('kt', name), ' ', token('m', String(duration())), ' ', token('n', prop), ' ', token('m', to), '\n');
    };

    const validate = () => {
        stop();
        clock.seek(Number(scrub.value), Number.isFinite(duration()) ? duration() * 1000 : 1500);
        try {
            const compiled = parseFormula(formulaInput.value);
            fn = compiled;
            valid = true;
            curve.setWarper(fn);
            formulaInput.removeAttribute('aria-invalid');
            note.classList.remove('is-error');
            note.textContent = HINT + (formulaInput.value.includes('^') ? ' Знак ^ в коде станет **.' : '');
            const samples = Array.from({ length: 121 }, (_, i) => fn(i / 120));
            values.textContent = `f(0) = ${fn(0).toFixed(3)} / f(1) = ${fn(1).toFixed(3)} / диапазон ${Math.min(...samples).toFixed(3)}…${Math.max(...samples).toFixed(3)}`;
            if (Math.abs(fn(0)) > 0.001 || Math.abs(fn(1) - 1) > 0.001) {
                values.textContent += ' / Кривая начинается не в 0 или заканчивается не в 1: возможен скачок.';
            }
            apply(Number(scrub.value));
        } catch (error) {
            valid = false;
            formulaInput.setAttribute('aria-invalid', 'true');
            note.classList.add('is-error');
            note.textContent = `${error.message}. На графике показана предыдущая корректная формула.`;
            values.textContent = '';
        }
        write();
        return valid;
    };
    const run = () => {
        if (!valid || playButtons[0].disabled) return;
        if (clock.running) { stop(); return; }
        if (clock.progress >= 1) clock.seek(0, duration() * 1000);
        clock.resume(performance.now());
        setPlayLabel('Пауза');
        const step = now => {
            const t = clock.tick(now, duration() * 1000, repeat.checked);
            if (!apply(t)) return;
            frame = clock.running ? requestAnimationFrame(step) : null;
            if (!clock.running) setPlayLabel('Ещё раз');
        };
        apply(clock.progress);
        frame = requestAnimationFrame(step);
    };
    const select = (animate = true) => {
        const option = pick.selectedOptions[0];
        description.textContent = option.dataset.description || '';
        description.hidden = !description.textContent;
        if (option.dataset.expr) formulaInput.value = option.dataset.expr;
        else formulaInput.value = customFormula;
        if (option.dataset.custom && option.value) nameInput.value = option.value;
        else nameInput.value = 'my_warper';
        scrub.value = 0;
        validate();
        property.addEventListener('change', () => {
        if (sceneRange) sceneRange.textContent = {xalign: 'Сдвиг фона: от 12% до −12% ширины. Масштаб: 1,4.', zoom: 'Масштаб фона: от 1,05 до 1,45.', alpha: 'Прозрачность фона: от 0 до 1.'}[property.value];
        if (valid) apply(Number(scrub.value));
        write();
    });
    document.querySelectorAll('[data-test-warper]').forEach(link => {
            if (pick.value && link.dataset.testWarper === pick.value) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        });
        curveCanvas.setAttribute('aria-label', `График ${warperName() || 'своей формулы'} и линейная кривая для сравнения`);
        if (animate && !reduceMotion.matches) run();
    };
    let customFormula = 't * t * (2.4 * t - 1.4)';
    pick.addEventListener('change', () => select());
    formulaInput.addEventListener('input', () => {
        pick.value = '';
        description.textContent = '';
        description.hidden = true;
        customFormula = formulaInput.value;
        property.addEventListener('change', () => {
        if (sceneRange) sceneRange.textContent = {xalign: 'Сдвиг фона: от 12% до −12% ширины. Масштаб: 1,4.', zoom: 'Масштаб фона: от 1,05 до 1,45.', alpha: 'Прозрачность фона: от 0 до 1.'}[property.value];
        if (valid) apply(Number(scrub.value));
        write();
    });
    document.querySelectorAll('[data-test-warper]').forEach(link => link.removeAttribute('aria-current'));
        curveCanvas.setAttribute('aria-label', 'График своей формулы и линейная кривая для сравнения');
        validate();
    });
    nameInput.addEventListener('input', write);
    seconds.addEventListener('input', () => {
        stop();
        clock.seek(Number(scrub.value), Number.isFinite(duration()) ? duration() * 1000 : 1500);
        write();
    });
    playButtons.forEach(button => button.addEventListener('click', run));
    repeat.addEventListener('change', () => {
        if (Number.isFinite(duration())) clock.rebase(performance.now(), duration() * 1000);
    });
    resetButton.addEventListener('click', () => {
        stop();
        clock.seek(0, Number.isFinite(duration()) ? duration() * 1000 : 1500);
        if (valid) apply(0);
        setPlayLabel('Проиграть');
    });
    for (const input of [formulaInput, nameInput]) {
        input.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            run();
        });
    }
    scrub.addEventListener('input', () => {
        stop();
        clock.seek(Number(scrub.value), Number.isFinite(duration()) ? duration() * 1000 : 1500);
        if (valid) apply(Number(scrub.value));
    });
    const describeScene = () => {
        if (sceneRange) sceneRange.textContent = {
            xalign: 'Сдвиг фона: от 12% до −12% ширины. Масштаб: 1,4.',
            zoom: 'Масштаб фона: от 1,05 до 1,45.',
            alpha: 'Прозрачность фона: от 0 до 1.',
        }[property.value];
    };
    property.addEventListener('change', () => {
        describeScene();
        if (valid) apply(Number(scrub.value));
        write();
    });
    describeScene();
    document.querySelectorAll('[data-test-warper]').forEach(link => {
        link.addEventListener('click', event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            pick.value = link.dataset.testWarper;
            select(false);
            history.replaceState(history.state, '', '#wp-lab-label');
            lab.querySelector('#wp-lab-label').focus({ preventScroll: true });
            lab.scrollIntoView({ behavior: 'instant', block: 'start' });
            if (!reduceMotion.matches) run();
        });
    });
    // Fragment navigation emits popstate in some browser hosts. Keep local
    // section jumps local so the site's page router never recreates the tester.
    const jumpTo = target => {
        history.replaceState(history.state, '', `#${target.id}`);
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
    };
    document.querySelectorAll('.wp-jumps a, .wp-main a[href^="#"]:not([data-test-warper])').forEach(link => {
        link.addEventListener('click', event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            const target = document.getElementById(link.hash.slice(1));
            if (!target) return;
            event.preventDefault();
            jumpTo(target);
        });
    });
    lab.querySelectorAll('[data-expression]').forEach(button => {
        button.addEventListener('click', () => {
            formulaInput.value = button.dataset.expression;
            formulaInput.dispatchEvent(new Event('input'));
        });
    });
    const travelObserver = window.ResizeObserver ? new ResizeObserver(measureTravel) : null;
    if (travelObserver) {
        travelObserver.observe(demos.xalign.parentElement);
        registerCleanup(() => travelObserver.disconnect());
    } else {
        window.addEventListener('resize', measureTravel);
        registerCleanup(() => window.removeEventListener('resize', measureTravel));
    }
    const onMotionChange = () => {
        stop();
        clock.seek(1, Number.isFinite(duration()) ? duration() * 1000 : 1500);
        if (valid) apply(1);
    };
    reduceMotion.addEventListener('change', onMotionChange);
    registerCleanup(() => reduceMotion.removeEventListener('change', onMotionChange));
    const onVisibility = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', onVisibility);
    registerCleanup(() => document.removeEventListener('visibilitychange', onVisibility));

    const onNavigation = () => {
        if (!lab.isConnected) window.__esdocWarperCleanup();
    };
    window.addEventListener('esdoc:navigation', onNavigation);
    registerCleanup(() => window.removeEventListener('esdoc:navigation', onNavigation));

    lab.hidden = false;
    curve.measure();
    select(false);
    measureTravel();
    const hashTarget = location.hash === '#wp-naming-label' ? '#wp-families-label' : location.hash;
    if (hashTarget) {
        let hashId = hashTarget.slice(1);
        try { hashId = decodeURIComponent(hashId); } catch { /* Keep malformed fragments inert. */ }
        const target = document.getElementById(hashId);
        if (target && target.closest('.wp-main')) {
            if (hashTarget !== location.hash) history.replaceState(history.state, '', hashTarget);
            const initialJump = requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant', block: 'start' }));
            registerCleanup(() => cancelAnimationFrame(initialJump));
        }
    }
})();

})();
