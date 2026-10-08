/* User-triggered previews. One cancellable session owns loading and painting. */
(function () {
    window.__esdocAnimationsCleanup?.();
    const cards = [...document.querySelectorAll('[data-animation-card]')];
    if (!cards.length) return;
    const images = new Map();
    let active = null;
    let disposed = false;
    const stageFor = card => card.querySelector('[data-stage]');
    const definitionFor = card => JSON.parse(card.querySelector('.animation-definition').textContent);
    const current = (card, state) => !disposed && card._animationState === state;
    const setButton = (card, label, pressed) => {
        const button = card.querySelector('[data-play]');
        button.textContent = label;
        button.setAttribute('aria-pressed', String(pressed));
    };
    const stop = (card, label = 'Показать') => {
        const state = card._animationState;
        if (state?.raf != null) cancelAnimationFrame(state.raf);
        if (state?.flakes) card._snowStill = {image: state.image, flakes: state.flakes};
        card._animationState = null;
        stageFor(card).classList.remove('is-playing');
        setButton(card, label, false);
        if (active === card) active = null;
        // Preserve the painted frame, including the end of a one-shot effect.
    };
    const loadImage = src => {
        if (!images.has(src)) {
            const promise = new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = async () => {
                    try {
                        if (image.decode) await image.decode();
                        resolve(image);
                    } catch (error) { reject(error); }
                };
                image.onerror = () => reject(new Error('Image unavailable'));
                image.src = src;
            });
            images.set(src, promise);
            promise.catch(() => { if (images.get(src) === promise) images.delete(src); });
        }
        return images.get(src);
    };
    const selected = (card, definition) => {
        const index = Number(card.querySelector('[data-variant]')?.value || 0);
        return definition.variants?.[index] || {};
    };
    const sources = (definition, variant) => [...new Set([
        definition.src, definition.second_src, definition.overlay_src, definition.background_src,
        variant.src, ...(definition.frames || []).map(frame => frame.src),
    ].filter(Boolean))];
    const paintImage = (layer, frame, opacity = 1) => {
        if (layer.getAttribute('src') !== frame.src) layer.src = frame.src;
        layer.style.filter = frame.filter || '';
        layer.style.opacity = String(opacity);
    };
    const ease = value => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, value)))) / 2;
    const paintSequence = (stage, definition, elapsed) => {
        const frames = definition.frames;
        const total = frames.reduce((sum, frame) => sum + frame.hold + frame.fade, 0);
        const complete = !definition.loop && elapsed >= total;
        let time = definition.loop && total > 0 ? elapsed % total : elapsed;
        let index = 0;
        if (complete) index = frames.length - 1;
        else {
            while (index < frames.length - 1 && time >= frames[index].hold + frames[index].fade) {
                time -= frames[index].hold + frames[index].fade;
                index += 1;
            }
        }
        const frame = frames[index];
        const previous = frames[index ? index - 1 : (elapsed >= total ? frames.length - 1 : 0)];
        const [back, front] = stage.querySelectorAll('.animation-frame');
        const overlay = stage.querySelector('.animation-effect-overlay');
        const progress = complete || !frame.fade ? 1 : Math.min(1, time / frame.fade);
        overlay.style.opacity = '0';
        if (frame.transition === 'fade' && progress < 1) {
            paintImage(back, progress < 0.5 ? previous : frame);
            front.style.opacity = '0';
            overlay.style.opacity = String(progress < 0.5 ? progress * 2 : (1 - progress) * 2);
        } else {
            // The back layer stays opaque, so a dissolve never exposes an empty stage.
            paintImage(back, progress < 1 ? previous : frame);
            paintImage(front, frame, progress < 1 ? progress : 0);
        }
        return complete;
    };
    const paintLids = (stage, definition, elapsed) => {
        const duration = definition.duration;
        const blink = definition.motion === 'blink';
        const total = blink ? duration * 2 + definition.hold : duration;
        let closed = ease(elapsed / duration);
        if (definition.motion === 'open') closed = 1 - closed;
        else if (blink && elapsed > duration + definition.hold) {
            closed = 1 - ease((elapsed - duration - definition.hold) / duration);
        }
        stage.querySelector('.animation-lid--upper').style.transform = `translateY(${(closed - 1) * 100}%)`;
        stage.querySelector('.animation-lid--lower').style.transform = `translateY(${(1 - closed) * 100}%)`;
        return elapsed >= total;
    };
    const paintFlash = (stage, definition, elapsed) => {
        const duration = definition.duration;
        const peak = definition.peak_hold || 0;
        const time = elapsed % (duration * 2 + peak + definition.hold);
        const opacity = time < duration ? time / duration
            : time < duration + peak ? 1
            : time < duration * 2 + peak ? 1 - (time - duration - peak) / duration : 0;
        stage.querySelector('.animation-effect-overlay').style.opacity = String(opacity);
        return false;
    };
    const paintShake = (stage, elapsed) => {
        const time = (elapsed % 0.8) / 0.2;
        const points = [[-50, 50], [0, 0], [50, 50], [0, 0], [-50, 50]];
        const step = Math.floor(time);
        const progress = ease(time - step);
        const from = points[step];
        const to = points[step + 1];
        // The very first ease starts at the unshifted scene.
        const initial = elapsed < 0.2;
        const x = initial ? 0 : from[0] + (to[0] - from[0]) * progress;
        const y = initial ? 0 : from[1] + (to[1] - from[1]) * progress;
        stage.querySelector('.animation-shake-echo').style.transform = `translate(${x / 1920 * 100}%, ${y / 1080 * 100}%)`;
        return false;
    };
    const makeSnow = (definition, variant) => Array.from({length: variant.particles || definition.particles}, () => {
        const depth = 1 + Math.floor(Math.random() * 10);
        const scale = Math.min(1, 1.1 - (depth - 1) / 10);
        const speed = 1.5 - depth / 10;
        return {x: Math.random() * 1920, y: Math.random() * 1080,
            size: scale, alpha: scale, wind: (Math.random() * 200 - 100) * speed, speed: 150 * speed};
    });
    const paintSnow = (canvas, image, flakes, delta = 0) => {
        const bounds = canvas.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(bounds.width * ratio));
        const height = Math.max(1, Math.round(bounds.height * ratio));
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, width, height);
        for (const flake of flakes) {
            flake.x += flake.wind * delta;
            flake.y += flake.speed * delta;
            if (flake.y > 1080 || flake.x < -16 || flake.x > 1936) {
                flake.x = Math.random() * 1920;
                flake.y = -image.naturalHeight;
            }
            context.globalAlpha = flake.alpha;
            context.drawImage(image, flake.x / 1920 * width, flake.y / 1080 * height,
                Math.max(1, image.naturalWidth * flake.size / 1920 * width),
                Math.max(1, image.naturalHeight * flake.size / 1080 * height));
        }
        context.globalAlpha = 1;
    };
    const prepare = (card, definition, variant) => {
        const stage = stageFor(card);
        const overlay = stage.querySelector('.animation-effect-overlay');
        if (overlay) overlay.style.opacity = '0';
        if (definition.kind === 'shake') {
            stage.querySelectorAll('.animation-shake-base, .animation-shake-echo').forEach(layer => {
                layer.src = variant.src;
                layer.style.transform = '';
            });
        }
        if (definition.kind === 'lids') paintLids(stage, definition, 0);
        if (definition.kind === 'sequence') paintSequence(stage, definition, 0);
        if (definition.kind === 'blackout') stage.querySelector('.animation-frame').style.filter = definition.filter || '';
    };
    const start = async card => {
        if (active) stop(active);
        const definition = definitionFor(card);
        const variant = selected(card, definition);
        const stage = stageFor(card);
        const state = {raf: null, started: null, last: null};
        card._animationState = state;
        active = card;
        card.querySelector('[data-error]').hidden = true;
        setButton(card, 'Загрузка…', true);
        try {
            const loaded = await Promise.all(sources(definition, variant).map(loadImage));
            if (!current(card, state)) return;
            prepare(card, definition, variant);
            stage.classList.add('is-playing');
            setButton(card, 'Остановить', true);
            if (definition.kind === 'snow') {
                state.image = loaded[0];
                state.flakes = makeSnow(definition, variant);
            }
            const tick = time => {
                if (!current(card, state)) return;
                if (state.started === null) state.started = time;
                const elapsed = (time - state.started) / 1000;
                const delta = state.last === null ? 0 : Math.min(0.05, (time - state.last) / 1000);
                state.last = time;
                let complete = false;
                if (definition.kind === 'sequence') complete = paintSequence(stage, definition, elapsed);
                else if (definition.kind === 'lids') complete = paintLids(stage, definition, elapsed);
                else if (definition.kind === 'flash') paintFlash(stage, definition, elapsed);
                else if (definition.kind === 'shake') paintShake(stage, elapsed);
                else if (definition.kind === 'blackout') {
                    stage.querySelector('.animation-effect-overlay').style.opacity = String(Math.min(1, elapsed / definition.duration));
                    complete = elapsed >= definition.duration;
                } else if (definition.kind === 'snow') {
                    paintSnow(stage.querySelector('canvas'), state.image, state.flakes, delta);
                }
                if (complete) stop(card, 'Повторить');
                else state.raf = requestAnimationFrame(tick);
            };
            state.raf = requestAnimationFrame(tick);
        } catch (error) {
            if (!current(card, state)) return;
            stop(card, 'Повторить');
            const message = card.querySelector('[data-error]');
            message.textContent = 'Не удалось загрузить кадры. Попробуйте ещё раз.';
            message.hidden = false;
        }
    };
    const showSnow = async card => {
        const definition = definitionFor(card);
        const variant = selected(card, definition);
        const token = {};
        card._snowPoster = token;
        try {
            const image = await loadImage(definition.src);
            if (disposed || card._snowPoster !== token || card._animationState) return;
            const flakes = makeSnow(definition, variant);
            card._snowStill = {image, flakes};
            paintSnow(stageFor(card).querySelector('canvas'), image, flakes);
        } catch { /* Playback exposes a retryable error on demand. */ }
    };
    cards.forEach(card => {
        const button = card.querySelector('[data-play]');
        button.hidden = false;
        button.addEventListener('click', () => active === card ? stop(card) : start(card));
        card.querySelector('[data-variant]')?.addEventListener('change', () => {
            const wasPlaying = active === card;
            if (wasPlaying) stop(card);
            const definition = definitionFor(card);
            const variant = selected(card, definition);
            prepare(card, definition, variant);
            card.querySelector('[data-source]').href = variant.source_url || definition.source_url;
            setButton(card, 'Показать', false);
            if (wasPlaying) start(card);
            else if (definition.kind === 'snow') showSnow(card);
        });
        if (card.dataset.kind === 'lids') prepare(card, definitionFor(card), {});
        if (card.dataset.kind === 'snow') showSnow(card);
    });
    const resize = () => cards.forEach(card => {
        if (card._snowStill && !card._animationState) {
            paintSnow(stageFor(card).querySelector('canvas'), card._snowStill.image, card._snowStill.flakes);
        }
    });
    const hide = () => { if (active) stop(active); };
    const visibility = () => { if (document.hidden) hide(); };
    window.addEventListener('resize', resize);
    window.addEventListener('pagehide', hide);
    document.addEventListener('visibilitychange', visibility);
    window.__esdocAnimationsCleanup = () => {
        hide();
        disposed = true;
        images.clear();
        window.removeEventListener('resize', resize);
        window.removeEventListener('pagehide', hide);
        document.removeEventListener('visibilitychange', visibility);
    };
})();
