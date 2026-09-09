/* Code panels — the whitespace glyphs, the copy button, both routes to the
   clipboard — are code.js's job now, since they turn up on pages that never
   load this file. What stays here is what only a doc page has. */

/* ── Adding tooltips for placeholder values in code (`|Название лейбла|`) ──
   The lexer also tags TODO/FIXME-style codetags as the same Comment.Special
   token (span.cs), for its own dotted-underline treatment — filter to spans
   that actually look like a |placeholder| so a stray TODO comment doesn't
   get mislabeled as "replace this value". */
document.querySelectorAll("span.cs").forEach(el => {
    const text = el.textContent;
    if (text.length < 2 || text[0] !== '|' || text[text.length - 1] !== '|') return;
    el.textContent = text.slice(1, -1);
    el.title = "Это значение необходимо заменить на своё!";
});

/* ── Remember whether the all-articles tree is open ──
   Restoring it is the inline script's job (doc.html, right after the element,
   so an open tree never flashes shut); this half only records the choice. A
   standing viewing preference, so localStorage rather than the URL — same
   split the theme toggle uses. */
(function () {
    const all = document.getElementById('sidebar-all');
    if (!all) return;

    const KEY = 'es-doc-all-articles';

    all.addEventListener('toggle', function () {
        try { localStorage.setItem(KEY, all.open ? '1' : '0'); } catch (e) {}
    });
})();

/* ── Which end of the heading strip has more ──
   Mobile only in effect: the strip is a single row there and runs several
   times its own width. The fade is drawn by CSS (doc.css); this only tells
   it which edges are still hiding something, so a strip scrolled to its end
   stops claiming there is more. Sized in pixels rather than toggled with a
   class so the two edges stay independent. */
(function () {
    const toc = document.querySelector('.sidebar-toc');
    if (!toc) return;

    const FADE = 32;

    function update() {
        const room = toc.scrollWidth - toc.clientWidth;
        // A strip that fits has no edges to mark; `room <= 1` covers both
        // that and the sub-pixel rounding a zoomed page produces.
        const left = room > 1 && toc.scrollLeft > 1 ? FADE : 0;
        const right = room > 1 && toc.scrollLeft < room - 1 ? FADE : 0;
        toc.style.setProperty('--fade-start', left + 'px');
        toc.style.setProperty('--fade-end', right + 'px');
    }

    toc.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
})();

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