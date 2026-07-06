/* Progressive enhancement for /resources/ listings: name/location/time
   filters, sorting, undeclared-file and NSFW toggles, one-click copy, a
   shared audio player with a floating now-playing bar, and an image lightbox.
   Controls ship with [hidden] in the markup and are revealed here, so a
   no-JS page stays a clean reference list. */

/* ── Copy buttons ── */
(function () {
    if (!navigator.clipboard) return;

    const status = document.getElementById('res-copy-status');

    document.querySelectorAll('.res-copy').forEach(btn => {
        btn.hidden = false;
        let timer = null;

        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.dataset.copy).then(() => {
                btn.classList.add('copied');
                if (status) status.textContent = 'Скопировано: ' + btn.dataset.copy;
                clearTimeout(timer);
                timer = setTimeout(() => btn.classList.remove('copied'), 1600);
            });
        });
    });
})();

/* ── Shared audio player: one volume, floating now-playing bar ── */
(function () {
    const buttons = document.querySelectorAll('.res-play');
    if (!buttons.length) return;

    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = parseFloat(localStorage.getItem('es-doc-volume') ?? '1');
    let current = null;

    // The single volume lives in two places: the toolbar slider and the
    // floating bar that follows you down the page while a track plays.
    const bar = document.createElement('div');
    bar.className = 'res-nowplaying';
    bar.innerHTML =
        '<button type="button" class="res-nowplaying-stop" aria-label="Остановить">' +
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">' +
        '<rect x="1.5" y="1.5" width="9" height="9" rx="1.5"/></svg></button>' +
        '<code class="res-nowplaying-name"></code>' +
        '<label class="res-volume">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
        '<path d="M2.5 6v4h2.6L8.7 13V3L5.1 6z" fill="currentColor"/>' +
        '<path d="M10.8 5.5a3.4 3.4 0 0 1 0 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
        '<path d="M12.6 3.7a6 6 0 0 1 0 8.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>' +
        '<input type="range" min="0" max="1" step="0.05" aria-label="Громкость прослушивания"></label>';
    document.body.appendChild(bar);

    const barName = bar.querySelector('.res-nowplaying-name');
    const topVolume = document.getElementById('res-volume-input');
    const barVolume = bar.querySelector('input');

    const setVolume = v => {
        audio.volume = v;
        localStorage.setItem('es-doc-volume', String(v));
        if (topVolume) topVolume.value = v;
        barVolume.value = v;
    };
    setVolume(audio.volume);

    topVolume?.addEventListener('input', () => setVolume(parseFloat(topVolume.value)));
    barVolume.addEventListener('input', () => setVolume(parseFloat(barVolume.value)));

    const stop = () => {
        audio.pause();
        bar.classList.remove('res-nowplaying--visible');
        if (current) {
            current.setAttribute('aria-pressed', 'false');
            current = null;
        }
    };

    audio.addEventListener('ended', stop);
    audio.addEventListener('error', stop);

    bar.querySelector('.res-nowplaying-stop').addEventListener('click', stop);

    buttons.forEach(btn => {
        btn.hidden = false;

        btn.addEventListener('click', () => {
            if (current === btn) {
                stop();
                return;
            }
            stop();
            current = btn;
            btn.setAttribute('aria-pressed', 'true');
            barName.textContent = btn.dataset.name || '';
            bar.classList.add('res-nowplaying--visible');
            audio.src = btn.dataset.src;
            audio.play().catch(stop);
        });
    });
})();

/* ── NSFW switch (Арты): blurred previews until revealed ── */
(function () {
    const toggle = document.getElementById('res-nsfw-toggle');
    if (!toggle) return;

    const apply = on => {
        document.body.classList.toggle('nsfw-ok', on);
        if (!on) {
            document.querySelectorAll('.res-row.res-revealed')
                .forEach(row => row.classList.remove('res-revealed'));
        }
    };

    toggle.checked = localStorage.getItem('es-doc-nsfw') === '1';
    apply(toggle.checked);

    toggle.addEventListener('change', () => {
        localStorage.setItem('es-doc-nsfw', toggle.checked ? '1' : '0');
        apply(toggle.checked);
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
        text: (el.querySelector('.res-name')?.textContent || '').toLowerCase(),
        desc: (el.querySelector('.res-desc')?.textContent || '').toLowerCase(),
    }));
    const groups = [...document.querySelectorAll('.res-group')];
    const jumps = [...document.querySelectorAll('.res-jump li')];

    box.hidden = false;

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
            if (hit) shown++;
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
    };

    input.addEventListener('input', apply);
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
    const keys = {
        az: el => [0, el.dataset.name],
        za: el => [0, el.dataset.name],
        decl: el => [el.hasAttribute('data-undeclared') ? 1 : 0, el.dataset.name],
        undecl: el => [el.hasAttribute('data-undeclared') ? 0 : 1, el.dataset.name],
    };

    sortSelect?.addEventListener('change', () => {
        const mode = sortSelect.value;
        const dir = mode === 'za' ? -1 : 1;
        const key = keys[mode] || keys.az;
        document.querySelectorAll('.res-list').forEach(list => {
            [...list.children]
                .sort((a, b) => {
                    const [ga, na] = key(a), [gb, nb] = key(b);
                    return (ga - gb) || dir * na.localeCompare(nb);
                })
                .forEach(li => list.appendChild(li));
        });
    });
})();

/* ── Lightbox (smooth zoom on thumbnail click) ── */
(function () {
    const box = document.querySelector('.res-lightbox');
    if (!box || typeof box.showModal !== 'function') return;

    const img = box.querySelector('img');
    const name = box.querySelector('.res-lightbox-name');
    const raw = box.querySelector('.res-lightbox-raw');

    document.querySelectorAll('a.res-thumb[data-zoom]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();

            // A blurred NSFW preview reveals on the first click; the zoom
            // comes on the second.
            const row = link.closest('.res-row');
            if (row?.hasAttribute('data-nsfw')
                && !document.body.classList.contains('nsfw-ok')
                && !row.classList.contains('res-revealed')) {
                row.classList.add('res-revealed');
                return;
            }

            img.src = link.href;
            name.textContent = link.dataset.zoom;
            raw.href = link.href;
            box.showModal();
        });
    });

    box.querySelector('.res-lightbox-close').addEventListener('click', () => box.close());

    // A click on the backdrop (outside the image and the bar) closes.
    box.addEventListener('click', e => {
        if (e.target === box) box.close();
    });

    // Drop the src on close so a slow-loading previous image never flashes.
    box.addEventListener('close', () => { img.src = ''; });
})();
