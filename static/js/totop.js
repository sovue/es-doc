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

    btn.addEventListener('click', function () {
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
})();
