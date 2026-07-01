/* Global documentation search — a thin type-ahead over the server-side search
   endpoint (/api/search?q=…). The backend does the matching, scoring and
   ranking; this only debounces input, renders the ranked results, highlights
   the query, and wires keyboard/ARIA behaviour. Progressive enhancement: the
   surrounding <form> stays a navigable fallback if this never runs.
   Implements the WAI-ARIA combobox + listbox pattern. */
(function () {
    var form = document.getElementById('site-search');
    var input = document.getElementById('site-search-input');
    var list = document.getElementById('site-search-results');
    var status = form && form.querySelector('.nav-search-status');
    var toggle = document.querySelector('.nav-search-toggle');
    if (!form || !input || !list) return;

    var LIMIT = 8;
    var matches = [];        // latest ranked results from the server
    var active = -1;         // index into `matches` of the highlighted option
    var seq = 0;             // request counter — drop out-of-order responses

    // ── Rendering ────────────────────────────────────────────
    function esc(s) {
        return s.replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }
    function mark(label, q) {
        var l = label.toLowerCase(), i = l.indexOf(q);
        if (i === -1) return esc(label);
        return esc(label.slice(0, i)) +
            '<span class="match">' + esc(label.slice(i, i + q.length)) + '</span>' +
            esc(label.slice(i + q.length));
    }

    function open() { list.hidden = false; input.setAttribute('aria-expanded', 'true'); }
    function close() {
        list.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        active = -1;
    }

    function announce(msg) { if (status) status.textContent = msg; }

    function render(query) {
        var q = query.toLowerCase();   // lowercased for substring highlighting
        if (!matches.length) {
            list.innerHTML = '<li class="nav-search-empty" aria-disabled="true">' +
                'Ничего не найдено по запросу «' + esc(query) + '». ' +
                '<a class="nav-search-empty-link" href="/docs/">Открыть все разделы</a></li>';
            open();
            announce('Ничего не найдено');
            return;
        }
        var html = '';
        for (var i = 0; i < matches.length; i++) {
            var m = matches[i];
            var ctx = m.context
                ? '<span class="nav-search-ctx">' + esc(m.context) + ' › </span>'
                : '';
            html += '<li class="nav-search-option" role="option" id="ss-opt-' + i + '"' +
                ' aria-selected="false">' + ctx + mark(m.label, q) + '</li>';
        }
        list.innerHTML = html;
        open();
        announce(matches.length + (matches.length === 1 ? ' результат' : ' результата(ов)'));
    }

    // ── Query ────────────────────────────────────────────────
    function update() {
        var q = input.value.trim();
        if (!q) { close(); list.innerHTML = ''; matches = []; announce(''); return; }

        var mine = ++seq;   // tag this request; a newer one supersedes it
        fetch('/api/search?q=' + encodeURIComponent(q) + '&limit=' + LIMIT)
            .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
            .then(function (results) {
                if (mine !== seq) return;   // a later keystroke already fired
                matches = results;
                active = -1;
                render(q);   // original case; render() lowercases for highlighting
            })
            .catch(function () {
                if (mine !== seq) return;
                matches = [];
                list.innerHTML = '<li class="nav-search-empty" aria-disabled="true">' +
                    'Не удалось загрузить результаты. Попробуйте ещё раз.</li>';
                open();
                announce('Ошибка поиска');
            });
    }

    function highlight(next) {
        if (!matches.length) return;
        var opts = list.querySelectorAll('.nav-search-option');
        if (active >= 0 && opts[active]) opts[active].setAttribute('aria-selected', 'false');
        active = (next + matches.length) % matches.length;
        var el = opts[active];
        el.setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
    }

    function go(m) {
        if (!m) return;
        window.location.href = '/docs/' + encodeURIComponent(m.doc) +
            (m.anchor ? '#' + m.anchor : '');
    }

    // ── Events ───────────────────────────────────────────────
    var timer;
    input.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(update, 120);
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) update(); else highlight(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
        else if (e.key === 'Enter') {
            if (!list.hidden && active >= 0) { e.preventDefault(); go(matches[active]); }
            else if (!list.hidden && matches.length) { e.preventDefault(); go(matches[0]); }
            // else: let the form submit to its fallback action
        } else if (e.key === 'Escape') {
            if (!list.hidden) { e.preventDefault(); close(); }
            else { input.value = ''; announce(''); closeSheet(); }
        }
    });

    list.addEventListener('mousedown', function (e) {
        // mousedown (not click) so input blur doesn't close the list first
        var li = e.target.closest('.nav-search-option');
        if (!li) return;
        e.preventDefault();
        go(matches[+li.id.replace('ss-opt-', '')]);
    });

    document.addEventListener('click', function (e) {
        if (!form.contains(e.target) && e.target !== toggle) close();
    });

    // ── Mobile sheet toggle ──────────────────────────────────
    function openSheet() {
        document.body.classList.add('search-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
        input.focus();
    }
    function closeSheet() {
        document.body.classList.remove('search-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
    if (toggle) {
        toggle.addEventListener('click', function () {
            if (document.body.classList.contains('search-open')) closeSheet();
            else openSheet();
        });
    }

    // ── "/" focuses search (delight: power-user shortcut) ────
    // Match the physical Slash key (e.code) so it works on any layout — on the
    // Russian ЙЦУКЕН layout that key types "." — and also any key that emits a
    // literal "/" on layouts where slash sits elsewhere.
    document.addEventListener('keydown', function (e) {
        if ((e.code !== 'Slash' && e.key !== '/') || e.ctrlKey || e.metaKey || e.altKey) return;
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        openSheet();   // no-op class on desktop; focuses input in both layouts
    });
})();
