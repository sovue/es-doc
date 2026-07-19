/* Progressive enhancement for /resources/ listings: name/location/time
   filters, sorting, undeclared-file and NSFW toggles, one-click copy, a
   shared audio player with a floating now-playing bar, and an image lightbox.
   Controls ship with [hidden] in the markup and are revealed here, so a
   no-JS page stays a clean reference list. */

/* ── File-viewer code whitespace handling (mirrors docs.js) ── */
(function () {
    const code = document.querySelector('.fb-code');
    if (!code) return;

    const whitespace = '∙';

    code.querySelectorAll('span.w').forEach(el => {
        el.textContent = whitespace.repeat(el.textContent.length);
    });

    document.addEventListener('copy', e => {
        const sel = window.getSelection();

        if (!sel.rangeCount) return;

        const node = sel.getRangeAt(0).commonAncestorContainer;

        const pre = node.nodeType === 1
            ? node.closest('.fb-code')
            : node.parentElement?.closest('.fb-code');

        if (!pre) return;

        e.preventDefault();

        const text = sel.toString().replace(new RegExp(whitespace, 'g'), ' ');

        e.clipboardData.setData('text/plain', text);
    });
})();

/* ── Copy buttons ── */
(function () {
    if (!navigator.clipboard) return;

    const status = document.getElementById('res-copy-status');

    document.querySelectorAll('.res-copy').forEach(btn => {
        btn.hidden = false;
        let timer = null;

        btn.addEventListener('click', () => {
            // data-copy-from points at an element whose text is the payload
            // (the file viewer copies the whole script this way).
            const value = btn.dataset.copyFrom
                ? (document.querySelector(btn.dataset.copyFrom)?.textContent ?? '')
                : btn.dataset.copy;

            navigator.clipboard.writeText(value).then(() => {
                btn.classList.add('copied');
                if (status) {
                    status.textContent = btn.dataset.copyFrom
                        ? 'Код файла скопирован.'
                        : 'Скопировано: ' + value;
                }
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

    // Reuses the page's shared status live region (also used by the copy
    // buttons above) so screen-reader users hear what's playing — the bar
    // itself is a floating div with no live region of its own.
    const status = document.getElementById('res-copy-status');

    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = parseFloat(localStorage.getItem('es-doc-volume') ?? '1');
    let current = null;

    // The single volume lives in two places: the toolbar slider and the
    // floating bar that follows you down the page while a track plays.
    const bar = document.createElement('div');
    bar.className = 'res-nowplaying';
    bar.innerHTML =
        '<button type="button" class="res-nowplaying-pause" aria-label="Пауза">' +
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">' +
        '<rect x="2" y="1.5" width="3" height="9" rx="0.8"/>' +
        '<rect x="7" y="1.5" width="3" height="9" rx="0.8"/></svg>' +
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">' +
        '<path d="M3 1.9a.6.6 0 0 1 .9-.52l6 3.6a.6.6 0 0 1 0 1.04l-6 3.6a.6.6 0 0 1-.9-.52z"/></svg></button>' +
        '<button type="button" class="res-nowplaying-stop" aria-label="Остановить">' +
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">' +
        '<rect x="1.5" y="1.5" width="9" height="9" rx="1.5"/></svg></button>' +
        '<div class="res-nowplaying-main">' +
        '<code class="res-nowplaying-name"></code>' +
        '<div class="res-seek">' +
        '<span class="res-time" data-current>0:00</span>' +
        '<input type="range" min="0" max="0" step="0.1" value="0" aria-label="Позиция воспроизведения">' +
        '<span class="res-time" data-duration>0:00</span>' +
        '</div></div>' +
        '<label class="res-volume">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
        '<path d="M2.5 6v4h2.6L8.7 13V3L5.1 6z" fill="currentColor"/>' +
        '<path d="M10.8 5.5a3.4 3.4 0 0 1 0 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
        '<path d="M12.6 3.7a6 6 0 0 1 0 8.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>' +
        '<input type="range" min="0" max="1" step="0.05" aria-label="Громкость прослушивания"></label>';
    document.body.appendChild(bar);

    const barName = bar.querySelector('.res-nowplaying-name');
    const topVolume = document.getElementById('res-volume-input');
    const barVolume = bar.querySelector('.res-volume input');

    // The seek bar: click or drag anywhere on the track to jump there.
    const seek = bar.querySelector('.res-seek input');
    const timeNow = bar.querySelector('[data-current]');
    const timeAll = bar.querySelector('[data-duration]');

    const fmt = s => {
        s = Math.round(s) || 0;
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };

    audio.addEventListener('loadedmetadata', () => {
        seek.max = audio.duration;
        timeAll.textContent = fmt(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
        // Don't fight the hand that's dragging the thumb.
        if (!seek.matches(':active')) seek.value = audio.currentTime;
        timeNow.textContent = fmt(audio.currentTime);
    });

    seek.addEventListener('input', () => {
        audio.currentTime = +seek.value;
        timeNow.textContent = fmt(+seek.value);
    });

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

    // Pause keeps the track loaded (the bar stays up, the seek position
    // holds); stop clears everything.
    const pause = bar.querySelector('.res-nowplaying-pause');

    pause.addEventListener('click', () => {
        if (audio.paused) audio.play().catch(stop);
        else audio.pause();
    });

    audio.addEventListener('pause', () => {
        bar.classList.add('res-nowplaying--paused');
        pause.setAttribute('aria-label', 'Продолжить');
        if (status) status.textContent = 'Пауза.';
    });

    // Fires for both a fresh track (the click handler below sets audio.src
    // then calls .play()) and resuming after pause, so one announcement
    // covers both without duplicating the "now playing" text in two places.
    audio.addEventListener('play', () => {
        bar.classList.remove('res-nowplaying--paused');
        pause.setAttribute('aria-label', 'Пауза');
        if (status) status.textContent = 'Воспроизведение: ' + (barName.textContent || '') + '.';
    });

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
            seek.value = 0;
            seek.max = 0;
            timeNow.textContent = timeAll.textContent = '0:00';
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

    /* ── URL state: text/location/time/sort round-trip through the query
       string, so a filtered view ("night backgrounds") is bookmarkable and
       survives a reload. The undeclared/NSFW toggles stay in localStorage
       instead (below and in the NSFW block above): they're a standing
       viewing preference, not something tied to this particular page. ── */
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
        history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
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

/* ── Lightbox (smooth zoom on thumbnail click) ── */
(function () {
    const box = document.querySelector('.res-lightbox');
    if (!box || typeof box.showModal !== 'function') return;

    const img = box.querySelector('img');
    const name = box.querySelector('.res-lightbox-name');
    const raw = box.querySelector('.res-lightbox-raw:not(.res-lightbox-dl)');
    const dl = box.querySelector('.res-lightbox-dl');

    // Thumbnails on the listing pages and image-name links in the file
    // browser both zoom.
    document.querySelectorAll('a[data-zoom]').forEach(link => {
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
            img.alt = link.dataset.zoom || '';
            name.textContent = link.dataset.zoom;
            raw.href = link.href;
            dl.href = link.href;
            dl.download = link.dataset.file || '';
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
