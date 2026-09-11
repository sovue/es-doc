/* Back-to-top: appears after a screen of scrolling, smooth-scrolls up.
   The button ships [hidden] in base.html and never renders without JS. */
(function () {
    var btn = document.querySelector('.to-top');
    if (!btn) return;

    btn.hidden = false;

    var visible = false;
    var update = function () {
        var show = window.scrollY > window.innerHeight;
        if (show === visible) return;
        visible = show;
        btn.classList.toggle('to-top--visible', show);
    };

    window.addEventListener('scroll', update, { passive: true });
    update();

    btn.addEventListener('click', function (event) {
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // From the keyboard, focus goes up with the page. The button hides
        // itself once the page is back at the top (components.css), and a
        // hidden button can't hold focus — the next Tab would start from
        // nowhere. The skip link is the first stop on every page. A click
        // made with Enter or Space carries `detail` 0, a pointer's carries
        // the click count; a mouse click leaves focus alone, since nobody
        // tabs from there.
        if (event.detail === 0) {
            var first = document.querySelector('.skip-link');
            if (first) first.focus({ preventScroll: true });
        }
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
})();
