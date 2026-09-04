/* =====================================================================
   Warper previews (/warpers).

   The table below is Ren'Py's warper set, ported 1:1 from
   renpy/common/000atl.rpy. The engine keeps the formula in `easeout_*`
   and derives the other two variants from it — except elastic and
   bounce, where the formula lives in `easein_*` and easeout is the
   derived one. Keep that asymmetry: swapping it silently mirrors two
   of the ten families.

   Each canvas draws its curve at rest and runs a marker along it (plus
   a travel track under the plot) while its cell is hovered or focused.
   Colours are read from the stylesheet so previews follow the paper /
   lake themes instead of pinning their own palette.
   ===================================================================== */

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
    sqrt: Math.sqrt, exp: Math.exp, log: Math.log,
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
    abs: Math.abs, min: Math.min, max: Math.max, pow: Math.pow,
};

const FORMULA_CONSTS = { pi: Math.PI, e: Math.E };

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
    const pattern = /\s*(\*\*|\/\/|<=|>=|==|!=|[-+*/%^(),<>]|\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+|[A-Za-z_][A-Za-z0-9_]*)/y;
    const tokens = [];

    let at = 0;

    while (at < source.length) {
        pattern.lastIndex = at;
        const match = pattern.exec(source);

        if (!match) throw new Error(`не понимаю символ «${source[at]}»`);

        at = pattern.lastIndex;
        tokens.push(match[1]);
    }

    return tokens;
};

const parseFormula = source => {
    const tokens = tokenize(source.trim());

    if (!tokens.length) throw new Error('формула пустая');

    let at = 0;

    const peek = () => tokens[at];
    const eat = token => (tokens[at] === token ? (at++, true) : false);
    const expect = token => {
        if (!eat(token)) throw new Error(`ожидается «${token}»`);
    };

    const atom = () => {
        const token = peek();

        if (token === undefined) throw new Error('формула обрывается');

        if (eat('(')) {
            const inner = expression();
            expect(')');
            return inner;
        }

        if (/^[\d.]/.test(token)) {
            at++;
            const number = parseFloat(token);
            if (!isFinite(number)) throw new Error(`не число: «${token}»`);
            return () => number;
        }

        if (/^[A-Za-z_]/.test(token)) {
            at++;

            if (token === 't') return t => t;
            if (token in FORMULA_CONSTS) {
                const constant = FORMULA_CONSTS[token];
                return () => constant;
            }

            if (eat('(')) {
                const fn = FORMULA_FUNCS[token];
                if (!fn) throw new Error(`неизвестная функция: ${token}`);

                const args = [];
                if (!eat(')')) {
                    do { args.push(expression()); } while (eat(','));
                    expect(')');
                }

                return t => fn(...args.map(arg => arg(t)));
            }

            throw new Error(`неизвестное имя: ${token}`);
        }

        throw new Error(`не ожидал «${token}»`);
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

        while (peek() in COMPARISONS) {
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
            if (!eat('else')) throw new Error('после «if» нужен «else»');
            const otherwise = expression();
            return t => (truthy(condition(t)) ? value(t) : otherwise(t));
        }

        return value;
    }

    const compiled = expression();

    if (at < tokens.length) throw new Error(`лишнее в конце: «${tokens[at]}»`);

    // A formula that parses can still be undefined somewhere on 0…1 —
    // log(t) at zero, sqrt of a negative. Better to say where than to hand
    // the plotter a NaN and draw a hole.
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const value = compiled(t);

        if (typeof value !== 'number' || !isFinite(value)) {
            throw new Error(`при t = ${t.toFixed(2)} значение не определено`);
        }
    }

    return compiled;
};

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

const readPalette = () => {
    const style = getComputedStyle(document.documentElement);
    palette.line = style.getPropertyValue('--border').trim();
    palette.curve = style.getPropertyValue('--text-soft').trim();
    palette.mark = style.getPropertyValue('--accent').trim();
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

        const steps = this.points.length - 1;

        ctx.strokeStyle = palette.curve;
        ctx.lineWidth = 1.5;
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
            // At rest the preview stays ink-quiet: pioneer red shows up only
            // on the one curve you're pointing at (DESIGN.md, Galstuk Rule).
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

    // Touch never sends pointerleave, so a tap on the graph replays it and
    // the animation keeps looping until something else takes the pointer.
    preview.canvas.addEventListener('click', () => preview.replay());
});

/* Read every box first, then write every backing store: interleaving the two
   thrashes layout across 33 canvases. */
const measureAll = () => {
    const stale = previews.filter(preview => preview.readSize());
    stale.forEach(preview => preview.render());
};

/* Draw straight away rather than waiting for the observer's first delivery.
   A tab that isn't compositing yet (opened in the background, restored
   session) skips the rendering steps entirely, and with them both the
   observer callback and any rAF — so `load` is the backstop that gets those
   previews their first real measurement. */
measureAll();
window.addEventListener('load', measureAll);

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
else window.addEventListener('resize', () => previews.forEach(preview => preview.measure()));

/* Theme swap: the toggle rewrites data-theme, the OS flips the media query.
   Either way the cached palette is stale, so re-read it and repaint. */
const refresh = () => {
    readPalette();
    previews.forEach(preview => preview.draw());
};

new MutationObserver(refresh).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refresh);

/* ── Copying: the name, the graph, the formula ────────────── */

/* Three payloads per row and all of them worth taking away: the name goes
   into an ATL line, the formula into the generator, into warpers.yaml or into
   a mod's own `@renpy.atl_warper`. Nothing here is a control in the markup —
   without a clipboard the page stays a plain reference instead of growing
   buttons that can't do anything. */
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

    // The name ships as plain text and becomes a real button, since the label
    // *is* the control here.
    document.querySelectorAll('.wp-name[data-copy]').forEach(label => {
        const value = label.dataset.copy;
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'wp-name wp-name--copy';
        button.textContent = label.textContent;
        button.dataset.copy = value;
        button.setAttribute('aria-label', `Скопировать имя: ${value}`);

        copies(button, value, `Скопировать имя: ${value}`);
        label.replaceWith(button);
    });

    // The plot and the row's formula chip both hand over the formula — the
    // machine-readable one, not the typeset `t²` the chip shows.
    document.querySelectorAll('[data-formula]').forEach(element => {
        const value = element.dataset.formula;
        if (value) copies(element, value, `Скопировать формулу: ${value}`);
    });
}

/* ── Sandbox: a real background driven by the chosen warper ── */

/* The graphs say what a curve does; this says what it feels like. Same
   warper table, applied to an actual game background instead of a plot —
   and the ATL that would do it in a mod is written out underneath, so the
   answer to "how do I get this" is on screen already. */
(function () {
    const lab = document.querySelector('.wp-lab');
    if (!lab) return;

    const image = lab.querySelector('.wp-lab-img');
    const background = lab.querySelector('#wp-lab-bg');
    const warperPick = lab.querySelector('#wp-lab-warper');
    const property = lab.querySelector('#wp-lab-prop');
    const seconds = lab.querySelector('#wp-lab-time');
    const playButton = lab.querySelector('.wp-lab-play');
    const snippet = lab.querySelector('#wp-lab-snippet');

    const formulaBox = lab.querySelector('.wp-lab-formula');
    const formulaInput = lab.querySelector('#wp-lab-expr');
    const nameInput = lab.querySelector('#wp-lab-name');
    const note = lab.querySelector('#wp-lab-note');
    const curveCanvas = lab.querySelector('.wp-lab-curve');

    const HINT = 't идёт от 0.0 до 1.0. Можно + − * / ** ( ), sin, cos, sqrt, abs, min, max, pi, ' +
        'сравнения и «a if условие else b».';

    // The last formula that both parsed and stayed finite across 0…1. A
    // half-typed one must not blank the curve you were just looking at.
    let custom = { fn: null, source: '' };

    const curve = new WarperCanvas(curveCanvas, t => t);
    track(curve);

    const isCustom = () => !!warperPick.selectedOptions[0]?.dataset.custom;

    // The stage overscans the image so a warper that overshoots (back,
    // elastic, bounce) never drags an edge into frame. PAN is how far each
    // way the pan travels, in % of the stage.
    const COVER = 1.4;
    const PAN = 12;

    // Start and end values, as ATL would write them for each property.
    const RANGE = {
        xalign: ['0.0', '1.0'],
        zoom: ['1.0', '1.4'],
        alpha: ['0.0', '1.0'],
    };

    const warper = () => {
        const option = warperPick.selectedOptions[0];

        if (!option) return Warpers.linear;
        if (option.dataset.custom) return custom.fn || (t => t);

        return option.dataset.points
            ? fromPoints(option.dataset.points.split(',').map(Number))
            : Warpers[option.value] || Warpers.linear;
    };

    // A name that Ren'Py would accept as a def; anything else falls back so
    // the generated block stays paste-able even mid-typing.
    const warperName = () => {
        const value = nameInput.value.trim();
        return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value) ? value : 'my_warper';
    };

    const duration = () => Math.min(Math.max(parseFloat(seconds.value) || 1.5, 0.2), 10);

    const apply = value => {
        if (property.value === 'alpha') {
            image.style.opacity = Math.min(Math.max(value, 0), 1);
            image.style.transform = 'scale(1.02)';
            return;
        }

        image.style.opacity = '';

        // Both keep a base scale above 1: an undershooting curve would
        // otherwise pull the image off its own edge for a frame.
        image.style.transform = property.value === 'zoom'
            ? `scale(${(1.05 + 0.4 * value).toFixed(4)})`
            : `translateX(${(PAN - 2 * PAN * value).toFixed(3)}%) scale(${COVER})`;
    };

    let frame = null;

    const run = () => {
        cancelAnimationFrame(frame);

        const curve = warper();
        const ms = duration() * 1000;
        const start = performance.now();

        apply(curve(0));

        const step = now => {
            const t = Math.min((now - start) / ms, 1);
            apply(curve(t));
            if (t < 1) frame = requestAnimationFrame(step);
            else frame = null;
        };

        frame = requestAnimationFrame(step);
    };

    // Token classes match the Ren'Py lexer's, so the generated line is
    // coloured exactly like the hand-written samples further down the page.
    const token = (cls, text) => {
        const span = document.createElement('span');
        span.className = cls;
        span.textContent = text;
        return span;
    };

    /* Colour the formula with the classes the lexer would use: numbers pink,
       functions as builtins, operators muted. Scanned rather than rebuilt
       from tokenize(), so the spacing the author typed survives into the
       generated block instead of being normalised out. */
    const FORMULA_SCAN = /(\s+)|(\*\*|\/\/|<=|>=|==|!=|[-+*/%^(),<>])|(\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)/g;

    const formulaTokens = source => {
        const parts = [];

        FORMULA_SCAN.lastIndex = 0;

        for (let match; (match = FORMULA_SCAN.exec(source)); ) {
            if (match[1]) parts.push(match[1]);
            // `^` is accepted in the field because it's what people reach for,
            // but it must never reach the generated block: in Python that's
            // xor, and the mod would break on the first frame.
            else if (match[2]) parts.push(token('o', match[2] === '^' ? '**' : match[2]));
            else if (match[3]) parts.push(token('m', match[3]));
            else parts.push(token(match[4] in FORMULA_FUNCS ? 'nb' : 'n', match[4]));
        }

        return parts;
    };

    const write = () => {
        const name = background.selectedOptions[0]?.dataset.name || '';
        const [from, to] = RANGE[property.value];

        // Indents go out as the lexer's own whitespace spans, so CSS paints
        // the same dots over them as in the hand-written samples below — and
        // what the reader copies is four real spaces per level.
        const indent = (times = 1) => token('w', '    '.repeat(times));

        snippet.textContent = '';

        // In custom mode the block that registers the warper comes first —
        // without it the show statement below wouldn't run at all.
        if (isCustom() && custom.fn) {
            snippet.append(
                token('k', 'python'), ' ', token('k', 'early'), ' ', token('k', 'hide'), ':\n\n', indent(),
                token('nd', '@renpy.atl_warper'), '\n', indent(),
                token('k', 'def'), ' ', token('nf', warperName()), '(', token('n', 't'), '):\n', indent(2),
                token('k', 'return'), ' ', ...formulaTokens(custom.source), '\n\n',
            );
        }

        snippet.append(
            token('k', 'show'), ' ', token('n', 'bg'), ' ', token('n', name), ':\n', indent(),
            token('n', property.value), ' ', token('m', from), '\n', indent(),
            token('kt', isCustom() ? warperName() : warperPick.value), ' ',
            token('m', String(duration())), ' ',
            token('n', property.value), ' ', token('m', to),
        );
    };

    const update = animate => {
        write();
        if (animate) run();
        else apply(warper()(1));
    };

    /* Re-read the formula field: redraw the curve, keep the last good one on
       a syntax error, and say what's wrong instead of going quiet. */
    const readFormula = () => {
        const source = formulaInput.value;

        try {
            const compiled = parseFormula(source);

            custom = { fn: compiled, source: source.trim() };
            curve.setWarper(compiled);

            formulaInput.removeAttribute('aria-invalid');
            note.classList.remove('is-error');
            // Say it out loud rather than let someone paste `^` into
            // warpers.yaml, where Python reads it as xor and refuses it.
            note.textContent = HINT + (/\^/.test(source) ? ' Знак ^ в коде станет **.' : '');
        } catch (error) {
            formulaInput.setAttribute('aria-invalid', 'true');
            note.classList.add('is-error');
            note.textContent = error.message;
        }

        write();
    };

    const showFormula = () => {
        const on = isCustom();

        formulaBox.hidden = !on;
        if (on && !custom.fn) readFormula();
        // The box was display:none until now, so its canvas had no box to
        // measure; do it once it actually has one.
        if (on) curve.measure();
    };

    background.addEventListener('change', () => {
        image.src = background.value;
        image.alt = background.selectedOptions[0]?.dataset.name || '';
        update(!reduceMotion.matches);
    });

    for (const control of [warperPick, property]) {
        // Auto-replay is the point of the control: you change the curve and
        // see it. Under reduced motion it settles into the end state instead,
        // and the Play button stays as the explicit way to ask for motion.
        control.addEventListener('change', () => {
            showFormula();
            update(!reduceMotion.matches);
        });
    }

    seconds.addEventListener('input', write);

    // Live: the curve follows the keystrokes. The stage doesn't — a frame
    // restarting on every character is unreadable — so Enter (or Play) is
    // what asks for the animation.
    formulaInput.addEventListener('input', readFormula);
    nameInput.addEventListener('input', write);

    for (const field of [formulaInput, nameInput]) {
        field.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            readFormula();
            run();
        });
    }

    playButton.addEventListener('click', () => {
        write();
        run();
    });

    image.src = background.value;
    image.alt = background.selectedOptions[0]?.dataset.name || '';
    note.textContent = HINT;

    lab.hidden = false;

    // Sizes are only readable once the section is out of [hidden].
    showFormula();
    update(false);

    // Hovering the generator's curve runs the marker along it, exactly like
    // the reference previews below.
    curveCanvas.addEventListener('pointerenter', () => curve.play());
    curveCanvas.addEventListener('pointerleave', () => curve.stop());
    curveCanvas.addEventListener('click', () => curve.replay());
})();
