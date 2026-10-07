/* User-triggered previews for Ren'Py image and ATL animations. */
(function () {
    const cards = [...document.querySelectorAll('[data-animation-card]')];
    if (!cards.length) return;

    let active = null;

    const setButton = (card, label, pressed) => {
        const button = card.querySelector('[data-play]');
        button.textContent = label;
        button.setAttribute('aria-pressed', String(pressed));
    };

    const stop = (card, label = 'Показать') => {
        const state = card._animationState;
        if (state?.timer) clearTimeout(state.timer);
        if (state?.raf) cancelAnimationFrame(state.raf);
        if (state?.snowFrame) cancelAnimationFrame(state.snowFrame);
        if (state) state.running = false;
        card._animationState = null;
        const stage = stageFor(card);
        stage?.classList.remove('is-playing');
        const overlay = stage?.querySelector('.animation-effect-overlay');
        if (overlay) {
            overlay.style.transition = 'none';
            overlay.style.opacity = '0';
        }
        setButton(card, label, false);
        if (active === card) active = null;
    };

    const stageFor = card => card.querySelector('[data-stage]');

    const playSequence = (card, definition, state) => {
        const stage = stageFor(card);
        const layers = [...stage.querySelectorAll('.animation-frame')];
        let visible = layers.findIndex(layer => layer.classList.contains('is-visible'));
        if (visible < 0) visible = 0;
        let index = 0;

        const preload = Promise.all(definition.frames.map(frame => new Promise(resolve => {
            const image = new Image();
            image.onload = () => resolve(true);
            image.onerror = () => resolve(false);
            image.src = frame.src;
        })));
        setButton(card, 'Загрузка…', true);

        const advance = () => {
            if (!card._animationState?.running) return;
            const frame = definition.frames[index];
            if (frame) {
                const next = layers[1 - visible] || layers[visible];
                const reveal = async () => {
                    if (!card._animationState?.running) return;
                    // `load` can fire before an asynchronously decoded PNG is
                    // ready to paint. Keep the old layer visible until decode
                    // finishes so large frames never fade to the empty stage.
                    if (typeof next.decode === 'function') {
                        try { await next.decode(); } catch { return; }
                    }
                    if (!card._animationState?.running) return;
                    next.style.filter = frame.filter === 'red-tint'
                        ? 'sepia(1) saturate(5) hue-rotate(315deg)'
                        : (definition.filter || '');

                    if (frame.fade && layers.length > 1) {
                        next.style.transition = `opacity ${frame.fade}s ease`;
                        requestAnimationFrame(() => {
                            next.classList.add('is-visible');
                            layers[visible].classList.remove('is-visible');
                        });
                    } else {
                        next.style.transition = 'none';
                        layers.forEach(layer => layer.classList.remove('is-visible'));
                        next.classList.add('is-visible');
                    }
                    visible = layers.indexOf(next);

                    state.timer = setTimeout(() => {
                        index += 1;
                        if (index >= definition.frames.length) {
                            if (definition.loop) index = 0;
                            else {
                                stop(card, 'Повторить');
                                return;
                            }
                        }
                        advance();
                    }, (frame.hold + frame.fade) * 1000);
                };

                if (next.getAttribute('src') === frame.src && next.complete && next.naturalWidth) {
                    reveal();
                } else {
                    next.addEventListener('load', reveal, {once: true});
                    next.addEventListener('error', () => {
                        if (card._animationState?.running) {
                            state.timer = setTimeout(advance, (frame.hold + frame.fade) * 1000);
                        }
                    }, {once: true});
                    next.src = frame.src;
                }
            }
        };

        preload.then(() => {
            if (card._animationState?.running) {
                setButton(card, 'Остановить', true);
                advance();
            }
        });
    };

    const playLids = (card, definition, state) => {
        const stage = stageFor(card);
        const closing = definition.motion !== 'open';
        const move = closed => stage.dataset.lids = closed ? 'closed' : 'open';
        move(!closing);
        requestAnimationFrame(() => move(closing));

        const duration = (definition.duration || 1.5) * 1000;
        if (definition.motion === 'blink') {
            state.timer = setTimeout(() => {
                if (!card._animationState?.running) return;
                move(false);
                state.timer = setTimeout(() => stop(card, 'Повторить'), duration);
            }, duration + (definition.hold || 2) * 1000);
        } else {
            state.timer = setTimeout(() => stop(card, 'Повторить'), duration);
        }
    };

    const drawSnow = (canvas, image, flakes, width, height, scale) => {
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, width, height);
        for (const flake of flakes) {
            const size = Math.max(1, flake.size * scale);
            context.globalAlpha = flake.alpha;
            context.drawImage(image, flake.x, flake.y, size, size * 0.94);
        }
        context.globalAlpha = 1;
    };

    const playSnow = (card, definition, state) => {
        const canvas = stageFor(card).querySelector('canvas');
        const image = new Image();
        image.src = canvas.dataset.snowSrc;
        image.onload = () => {
            if (!card._animationState?.running) return;
            const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
            const bounds = canvas.getBoundingClientRect();
            const width = Math.max(1, Math.round(bounds.width * ratio));
            const height = Math.max(1, Math.round(bounds.height * ratio));
            canvas.width = width;
            canvas.height = height;
            const count = Number(card.dataset.particles) || definition.particles;
            const scale = bounds.width / 1920 * ratio;
            const flakes = Array.from({length: count}, () => {
                const depth = 1 + Math.floor(Math.random() * 10);
                const depthScale = Math.min(1, 1.1 - depth / 10);
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: (6 + depth * 0.55) * depthScale,
                    speed: 150 * depthScale * scale,
                    wind: (Math.random() * 200 - 100) * depthScale * scale,
                    alpha: depthScale,
                };
            });
            let last = 0;
            const tick = time => {
                if (!card._animationState?.running) return;
                const delta = last ? Math.min((time - last) / 1000, 0.05) : 0;
                last = time;
                for (const flake of flakes) {
                    flake.x += flake.wind * delta;
                    flake.y += flake.speed * delta;
                    if (flake.y > height) {
                        flake.y = -flake.size;
                        flake.x = Math.random() * width;
                    }
                    if (flake.x < -flake.size) flake.x = width;
                    if (flake.x > width) flake.x = -flake.size;
                }
                drawSnow(canvas, image, flakes, width, height, 1);
                state.snowFrame = requestAnimationFrame(tick);
            };
            state.snowFrame = requestAnimationFrame(tick);
        };
    };

    const playFlash = (card, definition, state, blackout = false) => {
        const overlay = stageFor(card).querySelector('.animation-effect-overlay');
        if (blackout) {
            const image = stageFor(card).querySelector('.animation-frame');
            image.style.filter = definition.filter || '';
            overlay.style.transition = `opacity ${definition.duration}s linear`;
            requestAnimationFrame(() => { overlay.style.opacity = '1'; });
            state.timer = setTimeout(() => stop(card, 'Повторить'), definition.duration * 1000);
            return;
        }

        const pulse = () => {
            if (!card._animationState?.running) return;
            overlay.style.transition = `opacity ${definition.duration}s linear`;
            overlay.style.opacity = '1';
            state.timer = setTimeout(() => {
                overlay.style.opacity = '0';
                state.timer = setTimeout(pulse, (definition.duration + definition.hold) * 1000);
            }, definition.duration * 1000);
        };
        pulse();
    };

    const playShake = (card, state) => {
        const stage = stageFor(card);
        stage.classList.add('is-playing');
        state.timer = setTimeout(() => {
            if (!card._animationState?.running) return;
            state.timer = setTimeout(() => stop(card, 'Повторить'), 760);
        }, 800);
    };

    const start = card => {
        if (active && active !== card) stop(active);
        const state = {running: true, timer: null, raf: null, snowFrame: null};
        card._animationState = state;
        active = card;
        stageFor(card).classList.add('is-playing');
        setButton(card, 'Остановить', true);

        const definition = JSON.parse(card.querySelector('.animation-definition').textContent);
        if (definition.kind === 'sequence') playSequence(card, definition, state);
        else if (definition.kind === 'lids') playLids(card, definition, state);
        else if (definition.kind === 'snow') playSnow(card, definition, state);
        else if (definition.kind === 'flash') playFlash(card, definition, state);
        else if (definition.kind === 'blackout') playFlash(card, definition, state, true);
        else if (definition.kind === 'shake') playShake(card, state);
    };

    cards.forEach(card => {
        const button = card.querySelector('[data-play]');
        button.addEventListener('click', () => {
            if (active === card) {
                stop(card);
                return;
            }
            start(card);
        });

        card.querySelector('[data-variant]')?.addEventListener('change', event => {
            if (active === card) stop(card);
            const option = event.target.selectedOptions[0];
            const definition = JSON.parse(card.querySelector('.animation-definition').textContent);
            if (definition.kind === 'snow') {
                card.dataset.particles = option.dataset.particles;
            } else {
                card.querySelector('.animation-shake-base').src = option.dataset.src;
                card.querySelector('.animation-shake-echo').src = option.dataset.src;
            }
        });

        const canvas = card.querySelector('.animation-snow');
        if (canvas) {
            const image = new Image();
            image.src = canvas.dataset.snowSrc;
            image.onload = () => {
                const bounds = canvas.getBoundingClientRect();
                const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
                canvas.width = Math.max(1, Math.round(bounds.width * ratio));
                canvas.height = Math.max(1, Math.round(bounds.height * ratio));
                const flakes = Array.from({length: 50}, () => ({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 2 + Math.random() * 4,
                    alpha: 0.45 + Math.random() * 0.5,
                }));
                drawSnow(canvas, image, flakes, canvas.width, canvas.height, 1);
            };
        }
    });
})();
