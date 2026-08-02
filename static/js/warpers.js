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

    // Elastic
    easeout_elactic: t => {
        const period = 0.3;
        return 1.0 + Math.pow(2.0, -10.0 * t) * Math.sin((t - period / 4.0) * (2.0 * Math.PI) / period);
    },
    easein_elactic: t => 1.0 - Warpers.easeout_elactic(1.0 - t),
    ease_elactic: t => t < 0.5 ? Warpers.easeout_elactic(t * 2.0) / 2.0 : 1.0 - Warpers.easeout_elactic((1.0 - t) * 2.0) / 2.0,

    // Bounce
    easeout_bounce: t => {
        const period = 2.75;
        const overshoot = Math.pow(period, 2.0);
        if (t < (1.0 / period)) return overshoot * t * t;
        if (t < (2.0 / period)) return 1.0 + overshoot * (Math.pow(t - 1.5 / period, 2.0) - Math.pow(-0.5 / period, 2.0));
        if (t < (2.5 / period)) return 2.25 + overshoot * (Math.pow(t - 1.5 / period, 2.0) - Math.pow(-0.25 / period, 2.0));
        return 1.0 + overshoot * (Math.pow(t - 2.625 / period, 2.0) - Math.pow(-0.125 / period, 2.0));
    },
    easein_bounce: t => 1.0 - Warpers.easeout_bounce(1.0 - t),
    ease_bounce: t => t < 0.5 ? Warpers.easeout_bounce(t * 2.0) / 2.0 : 1.0 - Warpers.easeout_bounce((1.0 - t) * 2.0) / 2.0,
};

class WarperCanvas {
    constructor(canvas, warper) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.warper = warper;

        this.padding = 12;
        this.duration = 2500;

        this.animating = false;

        this.draw(0);

        this.frame = null;

        canvas.addEventListener("mouseenter", () => this.play());
        canvas.addEventListener("mouseleave", () => this.stop());
    }

    play() {
        this.stop();

        this.animating = true;
        const start = performance.now();

        const frame = now => {
            let t = (now - start) / this.duration;
            t = Math.min(t, 1);

            this.draw(t);

            if (t < 1)
                this.frame = requestAnimationFrame(frame);
            else {
                this.animating = false;
                this.frame = null;
            }
        };

        this.frame = requestAnimationFrame(frame);
    }

    stop() {
        if (this.frame !== null) {
            cancelAnimationFrame(this.frame);
            this.frame = null;
        }

        this.animating = false;

        this.draw(0);
    }

    draw(progress) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const p = this.padding;

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = "#bbb";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(p, h - p);
        ctx.lineTo(w - p, h - p);
        ctx.moveTo(p, h - p);
        ctx.lineTo(p, p);
        ctx.stroke();

        ctx.strokeStyle = "#4da3ff";
        ctx.lineWidth = 2;

        ctx.beginPath();

        for (let i = 0; i <= 100; i++) {
            const x = i / 100;
            const y = this.warper(x);

            const px = p + x * (w - p * 2);
            const py = h - p - y * (h - p * 2);

            if (i === 0)
                ctx.moveTo(px, py);
            else
                ctx.lineTo(px, py);
        }

        ctx.stroke();

        const y = this.warper(progress);

        const px = p + progress * (w - p * 2);
        const py = h - p - y * (h - p * 2);

        ctx.fillStyle = "#ff5050";

        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

document.querySelectorAll("canvas.warper").forEach(canvas => {
    const warper = Warpers[canvas.id];

    if (!warper) {
        console.warn(`Unknown warper: ${canvas.id}`);
        return;
    }

    new WarperCanvas(canvas, warper);
});