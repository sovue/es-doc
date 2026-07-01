/* ── Code whitespace handling ── */
let whitespace = '∙';

document.querySelectorAll('span.w').forEach(el => {
    el.textContent = whitespace.repeat(el.textContent.length);
});

document.addEventListener('copy', e => {
    const sel = window.getSelection();

    if (!sel.rangeCount) return;

    const node = sel.getRangeAt(0).commonAncestorContainer;

    const pre = node.nodeType === 1
        ? node.closest('pre')
        : node.parentElement?.closest('pre');

    if (!pre) return;

    e.preventDefault();

    const text = sel.toString().replace(new RegExp(whitespace, 'g'), ' ');

    e.clipboardData.setData('text/plain', text);
});

/* ── Adding tooltips for special comments (placeholders in code) ── */
let placeholder_delimiter_old = '|';
let placeholder_delimiter_new = '';

document.querySelectorAll("span.cs").forEach(el => {
    el.textContent = el.textContent.replaceAll(placeholder_delimiter_old, placeholder_delimiter_new);
    el.title = "Это значение необходимо заменить на своё!";
});

/* ── Scroll-spy: highlight the TOC entry for the heading you're reading ── */
(function () {
    const links = {};
    document.querySelectorAll('.sidebar nav a').forEach(a => {
        let id = a.hash.slice(1);
        try { id = decodeURIComponent(id); } catch (e) {}
        if (id) links[id] = a;
    });

    const headings = [...document.querySelectorAll('.content .heading')].filter(h => links[h.id]);
    if (headings.length < 2) return;

    let current = null;
    const setActive = a => {
        if (current === a) return;
        if (current) { current.classList.remove('active'); current.removeAttribute('aria-current'); }
        current = a;
        if (a) { a.classList.add('active'); a.setAttribute('aria-current', 'location'); }
    };

    const visible = new Set();
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id));
        // Topmost heading inside the active band wins; if none, keep the last one above.
        const top = headings.find(h => visible.has(h.id));
        if (top) setActive(links[top.id]);
    }, { rootMargin: '-76px 0px -65% 0px' });

    headings.forEach(h => io.observe(h));
})();