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

/* ── Preview canvas ──────────────────────────────────────── */

const TAU = Math.PI * 2;

// Plot geometry, in CSS pixels.
const PAD_X = 14;
const PAD_TOP = 12;
const TRACK_GAP = 16;
const TRACK_H = 12;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const palette = { line: '#000', curve: '#000', mark: '#000' };

const readPalette = () => {
    const style = getComputedStyle(document.documentElement);
    palette.line = style.getPropertyValue('--border').trim();
    palette.curve = style.getPropertyValue('--text-soft').trim();
    palette.mark = style.getPropertyValue('--accent').trim();
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
        const right = w - PAD_X;
        const top = PAD_TOP;
        const base = h - TRACK_H - TRACK_GAP;
        const trackY = h - TRACK_H / 2;
        const span = this.hi - this.lo;

        const px = t => left + t * (right - left);
        const py = v => base - (v - this.lo) / span * (base - top);
        const tx = v => left + (v - this.lo) / span * (right - left);

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

        /* The track under the plot is the same motion as the curve, but as
           actual travel: ticks mark the start and the target. */
        ctx.strokeStyle = palette.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, snap(trackY));
        ctx.lineTo(right, snap(trackY));

        for (const v of [0, 1]) {
            ctx.moveTo(snap(tx(v)), trackY - 4);
            ctx.lineTo(snap(tx(v)), trackY + 4);
        }

        ctx.stroke();

        if (!this.active) {
            // At rest the preview stays ink-quiet: pioneer red shows up only
            // on the one curve you're pointing at (DESIGN.md, Galstuk Rule).
            ctx.beginPath();
            ctx.arc(tx(0), trackY, 3, 0, TAU);
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

        ctx.beginPath();
        ctx.arc(px(t), py(value), 3.5, 0, TAU);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(tx(value), trackY, 4, 0, TAU);
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

if (window.ResizeObserver) {
    // measure() is a no-op while the box is unchanged, so the observer's
    // own first callback doesn't redraw what's already on screen.
    const observer = new ResizeObserver(entries => {
        for (const entry of entries) entry.target._preview.measure();
    });

    previews.forEach(preview => observer.observe(preview.canvas));
} else {
    window.addEventListener('resize', () => previews.forEach(preview => preview.measure()));
}

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

/* ── Copy the name ───────────────────────────────────────── */

/* The name ships as plain text and is upgraded to a button only when there's
   a clipboard to copy into — same progressive-enhancement contract as the
   [hidden] copy buttons elsewhere, except here the label *is* the control. */
if (navigator.clipboard) {
    const status = document.getElementById('code-copy-status');

    document.querySelectorAll('.wp-name[data-copy]').forEach(label => {
        const value = label.dataset.copy;
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'wp-name wp-name--copy';
        button.textContent = label.textContent;
        button.dataset.copy = value;
        button.setAttribute('aria-label', `Скопировать: ${value}`);

        let timer = null;

        button.addEventListener('click', () => {
            navigator.clipboard.writeText(value).then(() => {
                button.classList.add('copied');
                if (status) status.textContent = `Скопировано: ${value}`;
                clearTimeout(timer);
                timer = setTimeout(() => button.classList.remove('copied'), 1600);
            });
        });

        label.replaceWith(button);
    });
}
