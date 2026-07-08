/* Progressive enhancement for /artists: a view switcher (gallery / board /
   table over one dataset), name search, status filter, and sort. Controls
   ship [hidden] and are revealed here, so a no-JS visitor still gets the
   gallery as a clean, complete list. */
(function () {
    const root = document.querySelector('[data-artists]');
    if (!root) return;

    const controls = root.querySelector('.artists-controls');
    const search = root.querySelector('#artist-search');
    const statusSel = root.querySelector('#artist-status');
    const sortSel = root.querySelector('#artist-sort');
    const countEl = root.querySelector('.artists-count');

    const views = {
        gallery: root.querySelector('#view-gallery'),
        board: root.querySelector('#view-board'),
        table: root.querySelector('#view-table'),
    };
    const viewBtns = Array.from(root.querySelectorAll('.view-btn'));
    // Every artist appears once per view; filtering toggles them all together.
    const items = Array.from(root.querySelectorAll('[data-artist]'));

    if (controls) controls.hidden = false;

    /* ── External preview images: fall back to the monogram on error ── */
    root.querySelectorAll('.artist-preview-img').forEach(img => {
        const done = () => {
            if (!img.complete || img.naturalWidth === 0) {
                img.closest('.artist-preview').classList.add('artist-preview--none');
                img.remove();
            }
        };
        img.addEventListener('error', done);
        if (img.complete) done();
    });

    /* ── View switching ── */
    function setView(v) {
        if (!views[v]) return;
        Object.keys(views).forEach(k => { if (views[k]) views[k].hidden = k !== v; });
        viewBtns.forEach(b => {
            const on = b.dataset.view === v;
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.classList.toggle('view-btn--active', on);
        });
    }
    viewBtns.forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

    /* ── Filtering (name + status), applied to all views at once ── */
    const norm = s => (s || '').toLowerCase();

    function apply() {
        const q = norm(search && search.value).trim();
        const st = statusSel ? statusSel.value : '';

        items.forEach(el => {
            const match = (!q || norm(el.dataset.name).indexOf(q) !== -1)
                && (!st || el.dataset.status === st);
            el.hidden = !match;
        });

        // Canonical count from the gallery (one row per artist there).
        const shown = views.gallery
            ? Array.from(views.gallery.querySelectorAll('[data-artist]')).filter(e => !e.hidden).length
            : 0;

        if (countEl) countEl.textContent = shown ? 'Показано: ' + shown : 'Ничего не найдено';

        // Board: hide a column with no remaining matches.
        root.querySelectorAll('.board-col').forEach(col => {
            const some = Array.from(col.querySelectorAll('[data-artist]')).some(e => !e.hidden);
            col.hidden = !some;
        });

        // Shared empty-state under all views.
        root.querySelectorAll('.artists-empty').forEach(e => { e.hidden = shown !== 0; });
    }

    if (search) search.addEventListener('input', apply);
    if (statusSel) statusSel.addEventListener('change', apply);

    /* ── Sorting: reorder items inside every view's container ── */
    const collator = new Intl.Collator('ru', { sensitivity: 'base' });
    const statusRank = { open: 0, unknown: 1, closed: 2 };

    function comparator(mode) {
        return (a, b) => {
            if (mode === 'za') return collator.compare(b.dataset.name, a.dataset.name);
            if (mode === 'open') {
                const d = (statusRank[a.dataset.status] ?? 9) - (statusRank[b.dataset.status] ?? 9);
                if (d) return d;
            }
            return collator.compare(a.dataset.name, b.dataset.name);
        };
    }

    // Sort reorders the flat views only. The board is already organised by
    // status into columns, so a status/name sort there is meaningless (and
    // "open-first" is a no-op within a single-status column) — leave its
    // columns in their stable alphabetical order.
    function sortAll(mode) {
        const cmp = comparator(mode);
        const containers = [];
        if (views.gallery) containers.push(views.gallery.querySelector('.artists-gallery'));
        if (views.table) containers.push(views.table.querySelector('tbody'));

        containers.filter(Boolean).forEach(c => {
            Array.from(c.querySelectorAll('[data-artist]'))
                .sort(cmp)
                .forEach(el => c.appendChild(el));
        });
    }

    if (sortSel) sortSel.addEventListener('change', () => sortAll(sortSel.value));

    setView('gallery');
    apply();
})();
