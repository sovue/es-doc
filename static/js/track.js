/* The theme track on the home page.

   Progressive enhancement, in that order on purpose: the markup ships a real
   <audio controls>, and this file only takes over once it has a working
   styled control to put in its place. A reader with JS off keeps the browser's
   own player — ugly against the paper, but it plays.

   Nothing here starts playback. The track is 11.8 MB behind `preload="none"`,
   so until the button is pressed the browser has not fetched a byte of it. */
(function () {
    const track = document.querySelector('.hero-track');
    if (!track) return;

    const audio = track.querySelector('.hero-track-audio');
    const button = track.querySelector('.hero-track-play');
    const time = track.querySelector('.hero-track-time');
    if (!audio || !button) return;

    // The handover: native controls off, ours on. Both happen here so the two
    // can never both be visible, and neither can be missing.
    audio.removeAttribute('controls');
    button.hidden = false;
    track.classList.add('is-enhanced');

    const pad = (n) => String(Math.floor(n)).padStart(2, '0');
    const clock = (seconds) =>
        Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${pad(seconds % 60)}` : '';

    function label() {
        // The button says what pressing it will do, not what the audio is
        // doing — that is what a screen reader announces on focus.
        button.setAttribute('aria-label', audio.paused ? 'Включить тему сайта' : 'Поставить тему сайта на паузу');
    }

    function showTime() {
        if (!time) return;
        const total = clock(audio.duration);
        // Duration is unknown until metadata arrives, and metadata does not
        // arrive until the reader presses play — `preload="none"` sees to
        // that. An empty slot is correct until then, not a "0:00" placeholder
        // pretending to know the length.
        time.textContent = total ? `${clock(audio.currentTime)} / ${total}` : '';
    }

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

    label();
})();
