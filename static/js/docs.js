/* Documentation navigation; native disclosures also work without scripts. */
(function () {
    const tree = document.getElementById('sidebar-all');
    const contents = document.getElementById('sidebar-contents');
    const desktopTree = matchMedia('(min-width: 62em)');
    const desktopContents = matchMedia('(min-width: 80em)');

    function adaptDisclosure(details, media) {
        if (!details) return;
        media.addEventListener('change', () => {
            const hadFocus = details.contains(document.activeElement);
            details.open = media.matches;
            if (hadFocus && !details.open) details.querySelector('summary').focus({preventScroll: true});
        });
        details.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || !details.open) return;
            details.open = false;
            details.querySelector('summary').focus({preventScroll: true});
        });
    }
    adaptDisclosure(tree, desktopTree);
    adaptDisclosure(contents, desktopContents);
    if (contents && window.ResizeObserver) {
        const summary = contents.querySelector('summary');
        new ResizeObserver(() => {
            document.documentElement.style.setProperty('--doc-contents-h', summary.offsetHeight + 'px');
        }).observe(summary);
    }

    // Scroll only the independent rail; preserve the document's deep link.
    const current = tree && tree.querySelector('[aria-current="page"]');
    const rail = tree && tree.closest('.sidebar');
    if (current && desktopTree.matches && rail) {
        const linkBox = current.getBoundingClientRect();
        const railBox = rail.getBoundingClientRect();
        if (linkBox.bottom > railBox.bottom) rail.scrollTop += linkBox.bottom - railBox.bottom + 24;
    }

    const widthButton = document.querySelector('.doc-width-toggle');
    if (widthButton) {
        const root = document.documentElement;
        function syncWidth() {
            const wide = root.dataset.docWidth === 'wide';
            widthButton.setAttribute('aria-pressed', String(wide));
            widthButton.querySelector('span').textContent = wide ? 'Обычная ширина' : 'Шире';
            widthButton.title = wide ? 'Вернуть обычную ширину статьи' : 'Использовать всю ширину окна';
        }
        syncWidth();
        widthButton.hidden = false;
        widthButton.addEventListener('click', () => {
            const wide = root.dataset.docWidth !== 'wide';
            root.dataset.docWidth = wide ? 'wide' : 'standard';
            try { localStorage.setItem('es-doc-width', wide ? 'wide' : 'standard'); } catch (e) {}
            syncWidth();
        });
    }

    const links = new Map();
    document.querySelectorAll('.sidebar-toc a[href^="#"]').forEach(link => {
        let id = link.hash.slice(1);
        try { id = decodeURIComponent(id); } catch (e) {}
        if (id) links.set(id, link);
    });
    const headings = [...document.querySelectorAll('.content .heading')].filter(heading => links.has(heading.id));
    if (!headings.length) return;
    let active = null;
    let frame = 0;
    function update() {
        frame = 0;
        const offset = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 64) + 24;
        let heading = headings[0];
        for (const candidate of headings) {
            if (candidate.getBoundingClientRect().top > offset) break;
            heading = candidate;
        }
        const next = links.get(heading.id);
        if (next === active) return;
        if (active) { active.classList.remove('active'); active.removeAttribute('aria-current'); }
        active = next;
        active.classList.add('active');
        active.setAttribute('aria-current', 'location');
    }
    function scheduleUpdate() {
        if (!frame) frame = requestAnimationFrame(update);
    }
    addEventListener('scroll', scheduleUpdate, {passive: true});
    addEventListener('resize', scheduleUpdate);
    addEventListener('hashchange', scheduleUpdate);
    addEventListener('load', scheduleUpdate);
    if (document.fonts) document.fonts.ready.then(scheduleUpdate);
    update();

    // Collapse first, then navigate: otherwise an in-flow TOC moves the target.
    if (contents) contents.addEventListener('click', event => {
        const link = event.target.closest('.sidebar-toc a');
        if (!link || desktopContents.matches || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        let id = link.hash.slice(1);
        try { id = decodeURIComponent(id); } catch (e) {}
        const target = document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        contents.open = false;
        requestAnimationFrame(() => {
            history.pushState(null, '', link.hash);
            target.setAttribute('tabindex', '-1');
            target.focus({preventScroll: true});
            target.scrollIntoView({block: 'start', behavior: 'instant'});
            scheduleUpdate();
        });
    });
})();
