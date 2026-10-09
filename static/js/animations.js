/* User-triggered previews. One cancellable session owns loading and painting. */
(function () {
    window.__esdocAnimationsCleanup?.();
    const cards = [...document.querySelectorAll('[data-animation-card]')];
    if (!cards.length) return;
    const images = new Map();
    let active = null;
    let disposed = false;
    const tools = document.querySelector('[data-animation-tools]');
    const stageFor = card => card.querySelector('[data-stage]');
    const definitionFor = card => JSON.parse(card.querySelector('.animation-definition').textContent);
    const durationFor = definition => definition.total_duration ?? (
        definition.kind === 'sequence' ? (definition.delay || 0) + definition.frames.reduce((sum, frame) => sum + frame.hold + frame.fade, 0)
        : definition.kind === 'lids' ? definition.duration * (definition.motion === 'blink' ? 2 : 1) + (definition.motion === 'blink' ? definition.hold : 0)
        : definition.kind === 'blackout' ? (definition.intro || 0) + definition.duration
        : definition.kind === 'flash' ? (definition.duration * 2 + (definition.peak_hold || 0) + definition.hold) * (definition.cycles || 1)
        : definition.kind === 'shake' ? 0.8 : 30);
    const seconds = value => `${value.toFixed(1).replace('.', ',')} с`;
    const progress = (card, definition, elapsed) => {
        card._position = elapsed;
        const total = durationFor(definition);
        const position = definition.loop && definition.kind !== 'snow' ? elapsed % total : Math.min(total, elapsed);
        const slider = card.querySelector('[data-position]');
        if (slider) {
            slider.value = String(position);
            slider.setAttribute('aria-valuetext', `${seconds(position)} из ${seconds(total)}`);
        }
        const output = card.querySelector('[data-time]');
        const text = definition.kind === 'snow' ? seconds(elapsed) : `${seconds(position)} / ${seconds(total)}`;
        if (output && output.textContent !== text) output.textContent = text;
    };
    const current = (card, state) => !disposed && card._animationState === state;
    const setButton = (card, label, pressed) => {
        const button = card.querySelector('[data-play]');
        button.setAttribute('aria-pressed', String(pressed));
        const title = definitionFor(card).title || definitionFor(card).name || 'анимация';
        const action = label === 'Загрузка…' ? 'Отменить загрузку' : label;
        button.setAttribute('aria-label', `${action}: ${title}`);
        button.setAttribute('title', `${action}: ${title}`);
        button.setAttribute('aria-busy', String(label === 'Загрузка…'));
        const playIcon = button.querySelector('[data-play-icon]');
        const stopIcon = button.querySelector('[data-stop-icon]');
        if (playIcon) playIcon.hidden = pressed;
        if (stopIcon) stopIcon.hidden = !pressed;
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
        const delay = definition.delay || 0;
        const total = delay + frames.reduce((sum, frame) => sum + frame.hold + frame.fade, 0);
        const complete = !definition.loop && elapsed >= total;
        let time = definition.loop && total > 0 ? elapsed % total : elapsed;
        if (time < delay && !complete) {
            const [back, front] = stage.querySelectorAll('.animation-frame');
            if (elapsed < total) back.style.opacity = '0';
            else paintImage(back, frames[frames.length - 1]);
            front.style.opacity = '0';
            return false;
        }
        time -= delay;
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
    const makeSnow = (definition, variant) => Array.from({length: variant.particles || definition.particles}, (_, index) => {
        const depth = 1 + Math.floor(Math.random() * 10);
        const scale = Math.min(1, 1.1 - (depth - 1) / 10);
        const speed = 1.5 - depth / 10;
        const border = Math.random() * 100;
        const x = Math.random() * (1920 + border * 2) - border;
        const y = -(50 + Math.random() * 350);
        return {x, y, born: index / 60,
            size: scale, alpha: scale, wind: (Math.random() * 200 - 100) * speed, speed: 150 * speed};
    });
    const paintSnow = (canvas, image, flakes, elapsed = 0, poster = false) => {
        const bounds = canvas.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(bounds.width * ratio));
        const height = Math.max(1, Math.round(bounds.height * ratio));
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, width, height);
        for (const flake of flakes) {
            if (!poster && elapsed < flake.born) continue;
            const verticalLife = (1080 - flake.y) / flake.speed;
            const horizontalLife = flake.wind < 0 ? Math.max(0, flake.x / -flake.wind)
                : flake.wind > 0 ? Math.max(0, (1920 - flake.x) / flake.wind) : Infinity;
            const age = poster ? 0 : (elapsed - flake.born) % Math.max(0.1, Math.min(verticalLife, horizontalLife));
            const x = flake.x + flake.wind * age;
            const y = poster ? (flake.born * 617) % 1080 : flake.y + flake.speed * age;
            context.globalAlpha = flake.alpha;
            context.drawImage(image, x / 1920 * width, y / 1080 * height,
                Math.max(1, image.naturalWidth * flake.size / 1920 * width),
                Math.max(1, image.naturalHeight * flake.size / 1080 * height));
        }
        context.globalAlpha = 1;
    };
    const prepare = (card, definition, variant, originals = true) => {
        const stage = stageFor(card);
        const overlay = stage.querySelector('.animation-effect-overlay');
        if (overlay) overlay.style.opacity = '0';
        if (definition.kind === 'shake') {
            stage.querySelectorAll('.animation-shake-base, .animation-shake-echo').forEach(layer => {
                layer.src = originals ? variant.src : variant.poster || variant.src;
                layer.style.transform = '';
            });
        }
        if (originals) {
            const scene = stage.querySelector('.animation-scene');
            if (scene) scene.src = definition.background_src;
            if (definition.kind === 'lids') {
                stage.querySelector('.animation-lid--upper').src = definition.src;
                stage.querySelector('.animation-lid--lower').src = definition.second_src;
            }
            if (definition.kind === 'shake') stage.querySelector('.animation-shake-overlay')?.setAttribute('src', definition.overlay_src);
            if (definition.kind === 'blackout' || definition.kind === 'flash') stage.querySelector('.animation-frame').src = definition.src;
        }
        if (definition.kind === 'lids') paintLids(stage, definition, 0);
        if (definition.kind === 'sequence' && originals) paintSequence(stage, definition, 0);
        if (definition.kind === 'blackout') stage.querySelector('.animation-frame').style.filter = definition.filter || '';
    };
    const paint = (card, definition, state, elapsed) => {
        const stage = stageFor(card);
        let complete = false;
        if (definition.kind === 'sequence') complete = paintSequence(stage, definition, elapsed);
        else if (definition.kind === 'lids') complete = paintLids(stage, definition, elapsed);
        else if (definition.kind === 'flash') paintFlash(stage, definition, elapsed);
        else if (definition.kind === 'shake') paintShake(stage, elapsed);
        else if (definition.kind === 'blackout') {
            const intro = definition.intro || 0;
            const opacity = intro && elapsed < intro ? 1 - elapsed / intro : Math.min(1, (elapsed - intro) / definition.duration);
            stage.querySelector('.animation-effect-overlay').style.opacity = String(opacity);
            complete = elapsed >= intro + definition.duration;
        } else if (definition.kind === 'snow') paintSnow(stage.querySelector('canvas'), state.image, state.flakes, elapsed);
        progress(card, definition, elapsed);
        return complete;
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
                state.last = time;
                const complete = paint(card, definition, state, elapsed);
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
            paintSnow(stageFor(card).querySelector('canvas'), image, flakes, 0, true);
        } catch { /* Playback exposes a retryable error on demand. */ }
    };
    const inspect = async (card, elapsed) => {
        if (active) stop(active);
        const definition = definitionFor(card);
        const variant = selected(card, definition);
        const state = {raf: null};
        card._animationState = state;
        active = card;
        card.querySelector('[data-error]').hidden = true;
        try {
            const loaded = await Promise.all(sources(definition, variant).map(loadImage));
            if (!current(card, state)) return;
            prepare(card, definition, variant);
            if (definition.kind === 'snow') {
                state.image = loaded[0];
                state.flakes = card._snowStill?.flakes || makeSnow(definition, variant);
            }
            paint(card, definition, state, elapsed);
            stop(card);
            setButton(card, 'Показать с начала', false);
        } catch {
            if (!current(card, state)) return;
            stop(card, 'Повторить');
            const message = card.querySelector('[data-error]');
            message.textContent = 'Не удалось загрузить кадры. Попробуйте ещё раз.';
            message.hidden = false;
        }
    };
    const posters = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                showSnow(entry.target);
                posters.unobserve(entry.target);
            }
        });
    }) : null;
    cards.forEach(card => {
        const definition = definitionFor(card);
        const button = card.querySelector('[data-play]');
        button.hidden = false;
        button.addEventListener('click', () => active === card ? stop(card) : start(card));
        card.querySelector('[data-timeline]')?.removeAttribute('hidden');
        card.querySelector('[data-position]')?.addEventListener('input', event => inspect(card, Number(event.target.value)));
        progress(card, definition, 0);
        card.querySelector('[data-variant]')?.addEventListener('change', () => {
            const wasPlaying = active === card;
            if (wasPlaying) stop(card);
            const definition = definitionFor(card);
            const variant = selected(card, definition);
            prepare(card, definition, variant, false);
            card.querySelector('[data-source]').href = variant.source_url || definition.source_url;
            const name = variant.name || variant.source_name || definition.display_name || definition.name;
            const nameLabel = card.querySelector('[data-animation-name]');
            if (nameLabel) nameLabel.textContent = name;
            const copy = card.querySelector('.animation-card-actions .res-copy');
            if (copy) {
                copy.dataset.copy = name;
                copy.setAttribute('aria-label', `Скопировать: ${name}`);
            }
            const usage = card.querySelector('[data-usage]');
            if (usage) usage.textContent = variant.usage || definition.usage;
            const usageCopy = card.querySelector('.animation-usage .res-copy');
            if (usageCopy) usageCopy.dataset.copy = variant.usage || definition.usage;
            progress(card, definition, 0);
            setButton(card, 'Показать', false);
            if (wasPlaying) start(card);
            else if (definition.kind === 'snow') showSnow(card);
        });
        if (card.dataset.kind === 'lids') prepare(card, definition, {}, false);
        if (card.dataset.kind === 'snow') {
            if (posters) posters.observe(card);
            else showSnow(card);
        }
    });
    if (tools) tools.hidden = false;
    const search = document.querySelector('[data-animation-search]');
    const normalize = value => value.toLowerCase().replaceAll('ё', 'е');
    search?.addEventListener('input', () => {
        const query = normalize(search.value.trim());
        let visible = 0;
        cards.forEach(card => {
            const definition = definitionFor(card);
            const text = [definition.title, definition.name, definition.description,
                ...(definition.variants || []).flatMap(variant => [variant.name, variant.label])].join(' ');
            card.hidden = !normalize(text).includes(query);
            if (card.hidden && active === card) stop(card);
            if (!card.hidden) visible++;
        });
        const count = document.querySelector('[data-animation-count]');
        if (count) count.textContent = `${visible} из ${cards.length}`;
        const empty = document.querySelector('[data-animation-empty]');
        if (empty) empty.hidden = visible > 0;
    });
    const resize = () => cards.forEach(card => {
        if (card._snowStill && !card._animationState) {
            paintSnow(stageFor(card).querySelector('canvas'), card._snowStill.image, card._snowStill.flakes, card._position || 0, card._position == null || card._position === 0);
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
        posters?.disconnect();
        window.removeEventListener('resize', resize);
        window.removeEventListener('pagehide', hide);
        document.removeEventListener('visibilitychange', visibility);
    };
})();
