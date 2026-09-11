/* The site's audio player: one <Audio>, one volume, one floating bar.

   Lived inside resources.js until the home page needed a player too. Nothing
   about it was specific to the resource listings — a page declares a play
   button and the bar does the rest — so it is its own module now, loaded by
   whatever page has something to play. resources.js keeps the listings.

   The contract is one attribute. Any button carrying `data-play-src` becomes
   a play/pause toggle for that file; `data-play-name` is what the bar shows
   while it plays. The button ships `hidden` in the markup and is revealed
   here, so a page with no JS never offers a control that does nothing.

   The bar keys off the attribute rather than a class so the button's *looks*
   stay the page's business: the resource rows use the same square row-action
   frame as copy and download, the home page uses its own round accent button,
   and neither has to inherit the other's styling to get the behaviour.

   Nothing is fetched until a button is pressed: the element is built in
   script with `preload="none"` and no `src` at all, so a page that offers an
   11 MB track costs nothing to visit. */
(function () {
    const buttons = document.querySelectorAll('[data-play-src]');
    if (!buttons.length) return;

    /* Anything the page shows only while there is no player — a bare
       <audio controls> fallback, say — goes now that there is one. */
    document.querySelectorAll('[data-player-fallback]').forEach(el => el.remove());

    // Screen-reader announcements. The resource pages already have a shared
    // status region (the copy buttons write to it too); any other page gets
    // one of its own, because the bar is a plain floating div and would
    // otherwise change silently.
    let status = document.getElementById('res-copy-status');

    if (!status) {
        status = document.createElement('p');
        status.className = 'sr-only';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        document.body.appendChild(status);
    }

    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = parseFloat(localStorage.getItem('es-doc-volume') ?? '1');
    let current = null;

    // The single volume lives in two places: the toolbar slider (resource
    // listings only) and the floating bar that follows you down the page
    // while a track plays.
    const bar = document.createElement('div');
    bar.className = 'res-nowplaying';
    // A landmark of its own: the bar is appended to <body>, outside the page's
    // <main>, so without a region its controls were loose content that a
    // screen reader's landmark list skipped straight past.
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Сейчас играет');
    bar.innerHTML =
        '<button type="button" class="res-nowplaying-pause" aria-label="Пауза">' +
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">' +
        '<rect x="2" y="1.5" width="3" height="9" rx="0.8"/>' +
        '<rect x="7" y="1.5" width="3" height="9" rx="0.8"/></svg>' +
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">' +
        '<path d="M3 1.9a.6.6 0 0 1 .9-.52l6 3.6a.6.6 0 0 1 0 1.04l-6 3.6a.6.6 0 0 1-.9-.52z"/></svg></button>' +
        '<button type="button" class="res-nowplaying-stop" aria-label="Остановить">' +
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">' +
        '<rect x="1.5" y="1.5" width="9" height="9" rx="1.5"/></svg></button>' +
        '<div class="res-nowplaying-main">' +
        '<code class="res-nowplaying-name"></code>' +
        '<div class="res-seek">' +
        '<span class="res-time" data-current>0:00</span>' +
        '<input type="range" min="0" max="0" step="0.1" value="0" aria-label="Позиция воспроизведения">' +
        '<span class="res-time" data-duration>0:00</span>' +
        '</div></div>' +
        '<label class="res-volume">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
        '<path d="M2.5 6v4h2.6L8.7 13V3L5.1 6z" fill="currentColor"/>' +
        '<path d="M10.8 5.5a3.4 3.4 0 0 1 0 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
        '<path d="M12.6 3.7a6 6 0 0 1 0 8.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>' +
        '<input type="range" min="0" max="1" step="0.05" aria-label="Громкость прослушивания"></label>';
    document.body.appendChild(bar);

    const barName = bar.querySelector('.res-nowplaying-name');
    const topVolume = document.getElementById('res-volume-input');
    const barVolume = bar.querySelector('.res-volume input');

    // The seek bar: click or drag anywhere on the track to jump there.
    const seek = bar.querySelector('.res-seek input');
    const timeNow = bar.querySelector('[data-current]');
    const timeAll = bar.querySelector('[data-duration]');

    const fmt = s => {
        // Firefox can report an Ogg stream's duration as Infinity until
        // something reads its last page (see loadedmetadata below); NaN
        // shows up in the instant before any metadata has loaded at all.
        // Neither is a number to print.
        if (!isFinite(s)) return '--:--';
        s = Math.round(s) || 0;
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };

    // The sliders are unstyled (`appearance: none` in player.css) precisely so
    // this is the only thing drawing the played/set portion — no native fill
    // left in either engine to fight or fall back to. Every place that moves
    // a slider's value calls this right after.
    const setFill = input => {
        const min = parseFloat(input.min) || 0;
        const max = parseFloat(input.max) || 0;
        const pct = max > min ? ((parseFloat(input.value) - min) / (max - min)) * 100 : 0;
        input.style.setProperty('--range-pct', pct + '%');
    };

    // A range `max` attribute has to parse as a real number — "Infinity"
    // doesn't, so an unknown duration must not reach `seek.max` at all
    // (an unparsed max silently reverts to the element's default of 100,
    // which is what actually broke the seek bar's position, not just its
    // label).
    const applyDuration = () => {
        if (!isFinite(audio.duration)) return;
        seek.max = audio.duration;
        timeAll.textContent = fmt(audio.duration);
        setFill(seek);
    };

    audio.addEventListener('loadedmetadata', () => {
        applyDuration();

        if (!isFinite(audio.duration)) {
            // Chrome reads an Ogg/Vorbis file's last page for the real
            // duration as part of loading metadata; Firefox defers that read
            // until something actually seeks there, and otherwise leaves
            // duration at Infinity for the whole file — this is that seek.
            // 'durationchange' (below) picks up the corrected value once it
            // lands, and this resumes exactly where playback already was.
            const resume = audio.currentTime;
            audio.currentTime = 1e101;
            audio.addEventListener('seeked', function restoreAfterProbe() {
                audio.removeEventListener('seeked', restoreAfterProbe);
                audio.currentTime = resume;
            }, { once: true });
        }
    });

    audio.addEventListener('durationchange', applyDuration);

    audio.addEventListener('timeupdate', () => {
        // Don't fight the hand that's dragging the thumb.
        if (!seek.matches(':active')) {
            seek.value = audio.currentTime;
            setFill(seek);
        }
        timeNow.textContent = fmt(audio.currentTime);
    });

    seek.addEventListener('input', () => {
        audio.currentTime = +seek.value;
        timeNow.textContent = fmt(+seek.value);
        setFill(seek);
    });

    const setVolume = v => {
        audio.volume = v;
        localStorage.setItem('es-doc-volume', String(v));
        if (topVolume) { topVolume.value = v; setFill(topVolume); }
        barVolume.value = v;
        setFill(barVolume);
    };
    setVolume(audio.volume);

    topVolume?.addEventListener('input', () => setVolume(parseFloat(topVolume.value)));
    barVolume.addEventListener('input', () => setVolume(parseFloat(barVolume.value)));

    const stop = () => {
        audio.pause();
        // The bar is about to leave the tab order (player.css), so a Stop
        // pressed from the keyboard — or a track ending while focus sat on the
        // seek bar — would drop focus to <body>. Hand it back to the button
        // that started the track.
        if (current && bar.contains(document.activeElement)) current.focus();
        bar.classList.remove('res-nowplaying--visible');
        if (current) {
            current.setAttribute('aria-pressed', 'false');
            current = null;
        }
    };

    audio.addEventListener('ended', stop);
    audio.addEventListener('error', stop);

    bar.querySelector('.res-nowplaying-stop').addEventListener('click', stop);

    // Pause keeps the track loaded (the bar stays up, the seek position
    // holds); stop clears everything.
    const pause = bar.querySelector('.res-nowplaying-pause');

    pause.addEventListener('click', () => {
        if (audio.paused) audio.play().catch(stop);
        else audio.pause();
    });

    audio.addEventListener('pause', () => {
        bar.classList.add('res-nowplaying--paused');
        pause.setAttribute('aria-label', 'Продолжить');
        status.textContent = 'Пауза.';
    });

    // Fires for both a fresh track (the click handler below sets audio.src
    // then calls .play()) and resuming after pause, so one announcement
    // covers both without duplicating the "now playing" text in two places.
    audio.addEventListener('play', () => {
        bar.classList.remove('res-nowplaying--paused');
        pause.setAttribute('aria-label', 'Пауза');
        status.textContent = 'Воспроизведение: ' + (barName.textContent || '') + '.';
    });

    buttons.forEach(btn => {
        btn.hidden = false;

        btn.addEventListener('click', () => {
            if (current === btn) {
                stop();
                return;
            }
            stop();
            current = btn;
            btn.setAttribute('aria-pressed', 'true');
            barName.textContent = btn.dataset.playName || '';
            seek.value = 0;
            seek.max = 0;
            setFill(seek);
            timeNow.textContent = timeAll.textContent = '0:00';
            bar.classList.add('res-nowplaying--visible');
            audio.src = btn.dataset.playSrc;
            audio.play().catch(stop);
        });
    });
})();
