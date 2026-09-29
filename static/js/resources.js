/* Progressive enhancement for /resources/ listings: name/location/time
   filters, sorting, the undeclared-file toggle, one-click copy and an image
   lightbox. Playback is player.js, loaded alongside this file.
   Controls ship with [hidden] in the markup and are revealed here, so a
   no-JS page stays a clean reference list. */

/* ── File-viewer line links ──
   The addressed line highlights itself from `:target` in CSS; this only
   mirrors that onto the gutter number, which no selector can reach from the
   code column. Purely cosmetic, so a no-JS page still gets the highlight.

   The gutter is also where the page's tab order used to go to die: day1.rpy
   alone put 1 418 line numbers in it, so reaching anything below the code
   meant 1 418 presses of Tab. They now share a single tab stop and move under
   the arrow keys — the roving-tabindex pattern every long list of controls
   uses — so the numbers stay reachable from the keyboard without owning the
   page. Without JS every link keeps its natural tab stop, which is the
   honest fallback: no script, no roving. */
(function () {
    const gutter = document.querySelector('.fb-gutter');
    if (!gutter) return;

    const links = [...gutter.querySelectorAll('a')];
    let current = null;
    let roving = links[0] || null;

    const rove = link => {
        if (!link) return;
        if (roving) roving.tabIndex = -1;
        roving = link;
        roving.tabIndex = 0;
    };

    links.forEach(link => { link.tabIndex = -1; });
    if (roving) roving.tabIndex = 0;

    const sync = () => {
        if (current) current.classList.remove('is-target');
        current = null;

        // The id is `L42`; anything else in the fragment isn't ours.
        const id = decodeURIComponent(location.hash.slice(1));
        if (!/^L\d+$/.test(id)) return;

        current = gutter.querySelector('a[href="#' + id + '"]');
        if (current) {
            current.classList.add('is-target');
            // Arriving at a line makes it the way back in, so the next Tab
            // into the gutter starts where the reader actually is.
            rove(current);
        }
    };

    const STEP = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 };

    gutter.addEventListener('keydown', event => {
        const from = links.indexOf(document.activeElement);
        if (from === -1) return;

        let to = null;
        if (event.key in STEP) to = from + STEP[event.key];
        else if (event.key === 'Home') to = 0;
        else if (event.key === 'End') to = links.length - 1;
        else return;

        event.preventDefault();
        const link = links[Math.min(Math.max(to, 0), links.length - 1)];
        rove(link);
        link.focus();
    });

    // A click (or a browser-driven focus) moves the entry point with it.
    gutter.addEventListener('focusin', event => {
        if (links.includes(event.target)) rove(event.target);
    });

    sync();
    window.addEventListener('hashchange', sync);
})();

/* ── Copy buttons ── */
(function () {
    if (!navigator.clipboard || !window.copyControl) return;

    const status = document.getElementById('res-copy-status');

    document.querySelectorAll('.res-copy').forEach(btn => {
        btn.hidden = false;

        // data-copy-from points at an element whose text is the payload (the
        // file viewer copies the whole script this way); everything else
        // carries the value itself. The viewer's whitespace is real spaces
        // with dots painted over them, so the text needs no fixing up.
        const value = () => btn.dataset.copyFrom
            ? (document.querySelector(btn.dataset.copyFrom)?.textContent ?? '')
            : btn.dataset.copy;

        btn.addEventListener('click', window.copyControl(btn, value, {
            status,
            message: () => btn.dataset.copyFrom
                ? 'Код файла скопирован.'
                : 'Скопировано: ' + btn.dataset.copy,
        }));
    });
})();

/* ── Shared audio player ──
   Moved to player.js: the home page's theme track wanted the same bar, and
   nothing in it was ever about resource listings. */

/* ── Sprite distance picker ─────────────────────────────── */
(function () {
    const pickers = [...document.querySelectorAll('.res-sprite-picker')];
    if (!pickers.length) return;
    const hashVariants = new Map();

    const close = picker => {
        picker.classList.remove('is-open');
        picker.querySelector('.res-sprite-trigger')?.setAttribute('aria-expanded', 'false');
    };

    pickers.forEach(picker => {
        const row = picker.closest('.res-row');
        const trigger = picker.querySelector('.res-sprite-trigger');
        const name = trigger?.querySelector('.res-name');
        const distance = trigger?.querySelector('[data-sprite-distance]');
        const options = [...picker.querySelectorAll('[data-sprite-select]')];
        const imageLink = row?.querySelector('a.res-thumb');
        const image = imageLink?.querySelector('img');
        const copy = row?.querySelector('.res-copy');
        const download = row?.querySelector('.res-dl');

        if (!row || !trigger || !name || !distance || !options.length) return;

        const select = option => {
            if (option.getAttribute('aria-selected') === 'true') return;

            const code = option.dataset.code;
            const raw = option.dataset.raw || '';
            const thumb = option.dataset.thumb || '';
            const file = option.dataset.file || '';

            name.textContent = code;
            distance.textContent = option.dataset.distance;
            trigger.setAttribute('aria-label', `Выбрать дистанцию для ${code}`);

            if (imageLink && image && raw && thumb) {
                imageLink.href = raw;
                imageLink.dataset.zoom = code;
                imageLink.dataset.file = file;
                imageLink.setAttribute('aria-label', `Открыть «${code}» в полном размере`);
                image.src = thumb;
                image.alt = '';
            }

            if (copy) {
                copy.dataset.copy = code;
                copy.setAttribute('aria-label', `Скопировать: ${code}`);
            }

            if (download && raw) {
                download.href = raw;
                download.download = file;
                download.setAttribute('aria-label', `Скачать ${file}`);
            }

            options.forEach(item => item.setAttribute(
                'aria-selected', item === option ? 'true' : 'false',
            ));
        };

        trigger.addEventListener('click', () => {
            picker.classList.remove('is-search-locked');
            const open = picker.classList.toggle('is-open');
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        picker.addEventListener('pointerenter', () => {
            if (!picker.classList.contains('is-search-locked')) {
                trigger.setAttribute('aria-expanded', 'true');
            }
        });

        picker.addEventListener('pointerleave', () => {
            if (picker.classList.contains('is-search-locked')) {
                if (!picker.contains(document.activeElement)) {
                    picker.classList.remove('is-search-locked');
                }
            }
            close(picker);
        });

        picker.addEventListener('focusout', event => {
            if (!picker.contains(event.relatedTarget)) close(picker);
        });

        trigger.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                close(picker);
                return;
            }
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            event.preventDefault();
            picker.classList.remove('is-search-locked');
            picker.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
            (event.key === 'ArrowDown' ? options[0] : options[options.length - 1]).focus();
        });

        options.forEach(option => {
            if (option.id) hashVariants.set(option.id, { option, picker, row, select });
            option.addEventListener('click', () => {
                select(option);
                // Keep the manual picker available for choosing another
                // distance, matching its previous hover-driven behavior.
                picker.classList.add('is-open');
                trigger.setAttribute('aria-expanded', 'true');
                trigger.focus();
            });

            option.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    close(picker);
                    trigger.focus();
                }
            });
        });

        row.addEventListener('res:sprite-filter', event => {
            const query = event.detail.query;
            const match = query
                ? options.find(option => option.dataset.code.toLowerCase().includes(query))
                : options[0];
            if (match) {
                select(match);
                picker.classList.add('is-search-locked');
                close(picker);
            }
        });
    });

    const selectHashTarget = () => {
        document.querySelectorAll('.res-row--sprite.is-stale-target').forEach(row => {
            row.classList.remove('is-stale-target');
        });
        const id = location.hash ? decodeURIComponent(location.hash.slice(1)) : '';
        const target = hashVariants.get(id);
        if (!target) return;
        target.select(target.option);
        target.picker.classList.add('is-search-locked');
        close(target.picker);
        if (target.picker.contains(document.activeElement)) document.activeElement.blur();
        target.row.scrollIntoView({ block: 'start', behavior: 'auto' });
    };
    selectHashTarget();
    window.addEventListener('hashchange', selectHashTarget);

    document.addEventListener('pointerover', event => {
        const hoveredRow = event.target.closest?.('.res-row--sprite');
        const targetRow = document.querySelector('.res-row--sprite:target');
        if (hoveredRow && targetRow && hoveredRow !== targetRow) {
            targetRow.classList.add('is-stale-target');
        }
    });

    document.addEventListener('click', event => {
        pickers.forEach(picker => {
            if (!picker.contains(event.target)) close(picker);
        });
    });
})();

/* ── Filters and sorting ── */
(function () {
    const box = document.querySelector('.res-filter');
    const input = document.getElementById('res-filter-input');
    if (!box || !input) return;

    const locSelect = document.getElementById('res-loc-select');
    const timeSelect = document.getElementById('res-time-select');
    const sortSelect = document.getElementById('res-sort-select');
    const undeclared = document.getElementById('res-undeclared-toggle');
    const count = box.querySelector('.res-filter-count');
    const declaredTotal = count ? +count.dataset.total : 0;
    const allTotal = count ? +count.dataset.all : 0;
    const empty = document.querySelector('.res-filter-empty');

    const rows = [...document.querySelectorAll('.res-row')].map(el => ({
        el,
        text: (el.dataset.search || el.querySelector('.res-name')?.textContent || '').toLowerCase(),
        desc: (el.querySelector('.res-desc')?.textContent || '').toLowerCase(),
    }));
    const groups = [...document.querySelectorAll('.res-group')];
    const jumps = [...document.querySelectorAll('.res-jump li')];
    let previousQuery = input.value.trim().toLowerCase();
    const hasDistanceQuery = query => /\b(?:close|far)\b/.test(query);

    box.hidden = false;

    /* ── URL state: text/location/time/sort round-trip through the query
       string, so a filtered view ("night backgrounds") is bookmarkable and
       survives a reload. The undeclared-files toggle stays in localStorage
       instead (below): it's a standing viewing preference, not something
       tied to this particular page. ── */
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.has('q')) input.value = urlParams.get('q');
    if (locSelect && [...locSelect.options].some(o => o.value === urlParams.get('loc'))) {
        locSelect.value = urlParams.get('loc');
    }
    if (timeSelect && [...timeSelect.options].some(o => o.value === urlParams.get('time'))) {
        timeSelect.value = urlParams.get('time');
    }
    if (sortSelect && [...sortSelect.options].some(o => o.value === urlParams.get('sort'))) {
        sortSelect.value = urlParams.get('sort');
    }

    function syncUrl() {
        const p = new URLSearchParams();
        if (input.value) p.set('q', input.value);
        if (locSelect?.value) p.set('loc', locSelect.value);
        if (timeSelect?.value) p.set('time', timeSelect.value);
        if (sortSelect?.value && sortSelect.value !== 'az') p.set('sort', sortSelect.value);
        const qs = p.toString();
        // The fragment has to survive this. `apply()` runs once on load, so
        // rebuilding the URL from pathname + query alone threw away the `#r-…`
        // a search result had just arrived on — and the browser, mid-jump,
        // stopped scrolling and left the reader at the top of 1 164 rows with
        // no idea which one they came for.
        history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }

    const apply = () => {
        const q = input.value.trim().toLowerCase();
        const loc = locSelect?.value || '';
        const time = timeSelect?.value || '';
        const showFiles = !!undeclared?.checked;
        let shown = 0;

        rows.forEach(row => {
            const hit = (showFiles || !row.el.hasAttribute('data-undeclared'))
                && (!q || row.text.includes(q) || row.desc.includes(q))
                && (!loc || row.el.dataset.loc === loc)
                && (!time || row.el.dataset.time === time);
            row.el.hidden = !hit;
            const selected = row.el.querySelector('.res-sprite-option[aria-selected="true"]');
            const needsDistanceReset = selected && selected.dataset.distance !== 'normal';
            if (hit && (hasDistanceQuery(q) || (hasDistanceQuery(previousQuery) && needsDistanceReset))) {
                row.el.dispatchEvent(new CustomEvent('res:sprite-filter', {
                    detail: { query: q },
                }));
            }
            if (hit) {
                shown += +row.el.dataset.variantCount || 1;
            }
        });

        // Sprite pages: collapse character groups (and their jump links)
        // that the filter emptied out.
        groups.forEach((group, i) => {
            const any = !!group.querySelector('.res-row:not([hidden])');
            group.hidden = !any;
            if (jumps[i]) jumps[i].hidden = !any;
        });

        const base = showFiles ? allTotal : declaredTotal;
        if (count) count.textContent = shown === base ? String(base) : `${shown} из ${base}`;
        if (empty) empty.hidden = shown > 0;

        previousQuery = q;
        syncUrl();
    };

    // Debounce typing/paste so a burst runs one filter pass, not one per
    // character — a sprite page can carry a few hundred rows, and the filter
    // touches every one.
    let filterTimer = null;
    const scheduleApply = () => {
        clearTimeout(filterTimer);
        filterTimer = setTimeout(apply, 80);
    };

    input.addEventListener('input', scheduleApply);
    locSelect?.addEventListener('change', apply);
    timeSelect?.addEventListener('change', apply);

    if (undeclared) {
        undeclared.checked = localStorage.getItem('es-doc-undeclared') === '1';
        undeclared.addEventListener('change', () => {
            localStorage.setItem('es-doc-undeclared', undeclared.checked ? '1' : '0');
            apply();
        });
    }

    apply();

    input.addEventListener('keydown', e => {
        if (e.key === 'Escape' && input.value) {
            input.value = '';
            apply();
            e.stopPropagation();
        }
    });

    // Sorting re-appends rows in the new order inside their own list.
    // Folders (file-browser rows with [data-dir]) always group before files,
    // like every file manager; on listing pages the term is a constant 0.
    const dirsFirst = el => el.hasAttribute('data-dir') ? 0 : 1;
    const keys = {
        az: el => [dirsFirst(el), el.dataset.name],
        za: el => [dirsFirst(el), el.dataset.name],
        decl: el => [el.hasAttribute('data-undeclared') ? 1 : 0, el.dataset.name],
        undecl: el => [el.hasAttribute('data-undeclared') ? 0 : 1, el.dataset.name],
        big: el => [dirsFirst(el), -(+el.dataset.size || 0)],
        small: el => [dirsFirst(el), +el.dataset.size || 0],
    };

    const doSort = () => {
        const mode = sortSelect.value;
        const dir = mode === 'za' ? -1 : 1;
        const key = keys[mode] || keys.az;
        document.querySelectorAll('.res-list').forEach(list => {
            [...list.children]
                .sort((a, b) => {
                    const [ga, pa] = key(a), [gb, pb] = key(b);
                    if (ga !== gb) return ga - gb;
                    if (typeof pa === 'number') {
                        return (pa - pb) || a.dataset.name.localeCompare(b.dataset.name);
                    }
                    return dir * pa.localeCompare(pb);
                })
                .forEach(li => list.appendChild(li));
        });
    };

    sortSelect?.addEventListener('change', () => { doSort(); syncUrl(); });

    // A sort mode restored from the URL needs to actually reorder the DOM;
    // setting .value alone doesn't fire 'change'.
    if (sortSelect && sortSelect.value !== 'az') doSort();
})();

