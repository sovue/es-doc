/* The shared page-width preference; the head applies it before first paint. */
(function () {
    var button = document.querySelector('.site-width-toggle');
    if (!button) return;

    var root = document.documentElement;

    function sync() {
        var wide = root.dataset.docWidth === 'wide';
        button.setAttribute('aria-pressed', String(wide));
        button.setAttribute('aria-label', wide ? 'Вернуть обычную ширину страницы' : 'Расширить страницу');
        button.title = wide ? 'Вернуть обычную ширину страницы' : 'Использовать всю ширину окна';
    }

    button.hidden = false;
    sync();
    button.addEventListener('click', function () {
        var wide = root.dataset.docWidth !== 'wide';
        root.dataset.docWidth = wide ? 'wide' : 'standard';
        try { localStorage.setItem('es-doc-width', wide ? 'wide' : 'standard'); } catch (e) {}
        sync();
    });
})();
