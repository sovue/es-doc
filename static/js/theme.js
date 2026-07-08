/* Light ⇄ dark theme toggle. The button ships [hidden] in header.html and
   never renders without JS; an inline script in head.html has already applied
   any saved choice before first paint. Storing a choice pins the theme; with
   no choice the site follows the OS (prefers-color-scheme). */
(function () {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;

    var KEY = 'es-theme';
    var root = document.documentElement;
    var mq = window.matchMedia('(prefers-color-scheme: dark)');

    btn.hidden = false;

    var stored = function () {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    };

    var resolved = function () {
        var s = stored();
        if (s === 'dark' || s === 'light') return s;
        return mq.matches ? 'dark' : 'light';
    };

    // The label announces the action, not the state — the icon shows the state.
    var relabel = function () {
        var next = resolved() === 'dark' ? 'светлую' : 'тёмную';
        btn.setAttribute('aria-label', 'Включить ' + next + ' тему');
    };
    relabel();

    // Briefly cross-fade colours across the switch (see .theme-animating in
    // components.css). Only around the toggle, never on load.
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var animTimer = null;
    var animate = function () {
        if (reduce.matches) return;
        root.classList.add('theme-animating');
        clearTimeout(animTimer);
        animTimer = setTimeout(function () { root.classList.remove('theme-animating'); }, 360);
    };

    btn.addEventListener('click', function () {
        var next = resolved() === 'dark' ? 'light' : 'dark';
        animate();
        root.setAttribute('data-theme', next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
        relabel();
    });

    // While following the OS (no pinned choice), keep the label honest if the
    // system flips light/dark underneath us.
    mq.addEventListener('change', function () {
        if (!stored()) relabel();
    });
})();
