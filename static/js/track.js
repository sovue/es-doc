/* The theme track on the home page.

   Progressive enhancement, in that order on purpose: the markup ships a real
   <audio controls>, and this file only takes over once it has working styled
   controls to put in their place. A reader with JS off keeps the browser's own
   player — ugly against the paper, but it plays, and it seeks, and it has a
   volume knob.

   Nothing here starts playback. The track is 11.8 MB behind `preload="none"`,
   so until the button is pressed the browser has not fetched a byte of it. The
   same attribute is why the seek bar starts disabled: duration is unknown
   until metadata arrives, and metadata does not arrive until the first play. */
(function () {
    const track = document.querySelector('.hero-track');
    if (!track) return;

    const audio = track.querySelector('.hero-track-audio');
    const button = track.querySelector('.hero-track-play');
    const time = track.querySelector('.hero-track-time');
    const seek = track.querySelector('.hero-track-seek');
    const scrub = track.querySelector('.hero-track-scrub');
    const volume = track.querySelector('.hero-track-volume');
    const vol = track.querySelector('.hero-track-vol');
    const mute = track.querySelector('.hero-track-mute');
    if (!audio || !button) return;

    // The handover: native controls off, ours on. Everything the browser was
    // doing for us is replaced in one step, so the two sets can never both be
    // visible and none of ours can be left behind inert.
    audio.removeAttribute('controls');
    button.hidden = false;
    if (scrub) scrub.hidden = false;
    if (volume) volume.hidden = false;
    track.classList.add('is-enhanced');

    const VOLUME_KEY = 'es-doc:track-volume';
    const MUTED_KEY = 'es-doc:track-muted';

    // Storage is a convenience, never a dependency: a private window, blocked
    // site data or a browser that throws on access all land here, and the
    // player has to work exactly the same afterwards.
    const store = {
        get(key) {
            try { return localStorage.getItem(key); } catch (e) { return null; }
        },
        set(key, value) {
            try { localStorage.setItem(key, value); } catch (e) { /* not important enough to fail over */ }
        },
    };

    const pad = (n) => String(Math.floor(n)).padStart(2, '0');
    const clock = (seconds) =>
        Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${pad(seconds % 60)}` : '';

    /* Sliders are painted with a gradient stop at the current value, so the
       filled part of the track reads as progress. The value goes out as a
       custom property rather than a background string, so the colours stay in
       home.css where the rest of the palette lives. */
    function fill(input, ratio) {
        input.style.setProperty('--fill', `${Math.max(0, Math.min(1, ratio)) * 100}%`);
    }

    function label() {
        // The button says what pressing it will do, not what the audio is
        // doing — that is what a screen reader announces on focus.
        button.setAttribute('aria-label', audio.paused ? 'Включить тему сайта' : 'Поставить тему сайта на паузу');
    }

    // ── Position ────────────────────────────────────────────────────────
    //
    // While a drag is in progress the slider is the source of truth and the
    // audio follows it, not the other way round: letting `timeupdate` write
    // back into the input would fight the reader's thumb.
    let scrubbing = false;

    function showTime() {
        const total = clock(audio.duration);
        if (time) {
            // An empty slot is correct before the first play, not a "0:00"
            // placeholder pretending to know the length.
            time.textContent = total ? `${clock(audio.currentTime)} / ${total}` : '';
        }
        if (!seek || scrubbing) return;

        if (Number.isFinite(audio.duration) && audio.duration > 0) {
            seek.disabled = false;
            seek.max = String(audio.duration);
            seek.value = String(audio.currentTime);
            seek.setAttribute('aria-valuetext', `${clock(audio.currentTime)} из ${total}`);
            fill(seek, audio.currentTime / audio.duration);
        } else {
            seek.disabled = true;
            fill(seek, 0);
        }
    }

    if (seek) {
        // `input` for the live drag, `change` for the release and for keyboard
        // arrows; both set the time, so scrubbing sounds like scrubbing rather
        // than jumping once at the end.
        seek.addEventListener('pointerdown', () => { scrubbing = true; });
        seek.addEventListener('pointerup', () => { scrubbing = false; });
        seek.addEventListener('input', () => {
            const position = Number(seek.value);
            if (Number.isFinite(audio.duration)) audio.currentTime = position;
            fill(seek, position / audio.duration);
            if (time) time.textContent = `${clock(position)} / ${clock(audio.duration)}`;
        });
        seek.addEventListener('change', () => { scrubbing = false; });
    }

    // ── Volume ──────────────────────────────────────────────────────────

    function showVolume() {
        if (!vol) return;
        const level = audio.muted ? 0 : audio.volume;
        vol.value = String(Math.round(audio.volume * 100));
        vol.setAttribute('aria-valuetext', `${Math.round(audio.volume * 100)}%`);
        fill(vol, level);
        track.classList.toggle('is-muted', audio.muted || audio.volume === 0);
        if (mute) mute.setAttribute('aria-label', audio.muted ? 'Включить звук' : 'Выключить звук');
    }

    const saved = Number(store.get(VOLUME_KEY));
    // Default to 0.7 rather than the browser's 1.0: this starts under a hero
    // the reader did not come for music, and a full-volume surprise is the
    // fastest way to make them close the tab.
    audio.volume = Number.isFinite(saved) && store.get(VOLUME_KEY) !== null
        ? Math.max(0, Math.min(1, saved))
        : 0.7;
    audio.muted = store.get(MUTED_KEY) === '1';

    if (vol) {
        vol.addEventListener('input', () => {
            audio.volume = Number(vol.value) / 100;
            // Moving the slider at all is an unmute: the reader is asking for
            // a level, and leaving them muted would make the control look
            // broken.
            if (audio.muted && audio.volume > 0) audio.muted = false;
            store.set(VOLUME_KEY, String(audio.volume));
            store.set(MUTED_KEY, audio.muted ? '1' : '0');
        });
    }

    if (mute) {
        mute.addEventListener('click', () => {
            audio.muted = !audio.muted;
            store.set(MUTED_KEY, audio.muted ? '1' : '0');
        });
    }

    // ── Transport ───────────────────────────────────────────────────────

    button.addEventListener('click', () => {
        if (audio.paused) {
            // A rejected play() is normal, not exceptional: an autoplay policy
            // or a missing file both land here. Leave the button in its
            // paused state and let the reader try again.
            audio.play().catch(() => {});
        } else {
            audio.pause();
        }
    });

    audio.addEventListener('play', () => { track.classList.add('is-playing'); label(); });
    audio.addEventListener('pause', () => { track.classList.remove('is-playing'); label(); });
    audio.addEventListener('ended', () => { track.classList.remove('is-playing'); label(); });
    audio.addEventListener('loadedmetadata', showTime);
    audio.addEventListener('timeupdate', showTime);
    audio.addEventListener('durationchange', showTime);
    audio.addEventListener('volumechange', showVolume);

    label();
    showTime();
    showVolume();
})();
