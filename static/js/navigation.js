/* Soft navigation for the site's own HTML pages.

   A normal document navigation destroys the Audio object. Firefox is strict
   about autoplay on the replacement document, so restoring a track there can
   pause it or produce a noticeable gap. Replacing only #site-content keeps
   the original document — and the player — alive while the new page arrives.

   Non-HTML targets, downloads, external links and modified clicks keep their
   native browser behaviour. */
(function () {
    const content = document.getElementById('site-content');
    if (!content || !window.fetch || !window.DOMParser) return;

    let navigationId = 0;
    let navigating = false;

    const sectionFor = pathname => {
        if (pathname === '/') return '';
        if (pathname === '/docs' || pathname.startsWith('/docs/')) return 'docs';
        if (pathname === '/resources' || pathname.startsWith('/resources/')) return 'resources';
        if (pathname === '/materials') return 'materials';
        if (pathname === '/artists') return 'artists';
        if (pathname === '/news-resources') return 'news-resources';
        return null;
    };

    const updateNavigation = url => {
        const active = sectionFor(url.pathname);
        if (active === null) return;

        document.querySelectorAll('.site-header .nav-links a, .section-bar .nav-links a')
            .forEach(link => {
                const linkSection = sectionFor(new URL(link.href, location.href).pathname);
                if (linkSection === active) link.setAttribute('aria-current', 'page');
                else link.removeAttribute('aria-current');
            });
    };

    const updateStyles = async nextDocument => {
        const hrefs = [...nextDocument.head.querySelectorAll('link[data-page-style]')]
            .map(link => link.href)
            .filter(Boolean);
        const oldLinks = [...document.head.querySelectorAll('link[data-page-style]')];
        const newLinks = hrefs.map(href => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.dataset.pageStyle = '';
            link.href = href;
            return link;
        });

        await Promise.all(newLinks.map(link => new Promise(resolve => {
            link.addEventListener('load', resolve, { once: true });
            link.addEventListener('error', resolve, { once: true });
            document.head.appendChild(link);
        })));

        oldLinks.forEach(link => link.remove());
    };

    const loadPageScripts = async nextDocument => {
        document.querySelectorAll('script[data-soft-page-script]').forEach(script => script.remove());

        const sources = [...nextDocument.head.querySelectorAll('script[data-page-script][src]')]
            .map(script => script.src);

        for (const src of sources) {
            await new Promise(resolve => {
                const script = document.createElement('script');
                script.src = src;
                script.async = false;
                script.dataset.softPageScript = '';
                script.addEventListener('load', resolve, { once: true });
                script.addEventListener('error', resolve, { once: true });
                document.head.appendChild(script);
            });
        }
    };

    const loadPage = async (href, pushHistory) => {
        const id = ++navigationId;
        const url = new URL(href, location.href);

        let response;
        try {
            response = await fetch(url.href, {
                credentials: 'same-origin',
                headers: { Accept: 'text/html' },
            });
        } catch (error) {
            location.href = url.href;
            return;
        }

        if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
            location.href = url.href;
            return;
        }

        const nextDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
        const nextContent = nextDocument.getElementById('site-content');
        if (!nextContent || id !== navigationId) {
            if (id === navigationId) location.href = url.href;
            return;
        }

        await updateStyles(nextDocument);
        if (id !== navigationId) return;

        window.__esdocWarperCleanup?.();
        content.innerHTML = nextContent.innerHTML;
        document.title = nextDocument.title;
        document.body.className = nextDocument.body.className;

        const nextDocWidth = nextDocument.documentElement.dataset.docWidth;
        if (nextDocWidth) document.documentElement.dataset.docWidth = nextDocWidth;
        else delete document.documentElement.dataset.docWidth;

        updateNavigation(url);
        if (pushHistory) history.pushState({}, '', url.href);
        if (!url.hash) window.scrollTo(0, 0);

        await loadPageScripts(nextDocument);
        if (id !== navigationId) return;

        // Soft navigation replaces the document without the browser's native
        // fragment handling. Resolve the hash after the new content and its
        // page scripts are in place, or cross-page links land at the top.
        if (url.hash) {
            let targetId = url.hash.slice(1);
            try { targetId = decodeURIComponent(targetId); } catch (error) {}
            const target = document.getElementById(targetId);
            if (target) target.scrollIntoView({ block: 'start', behavior: 'auto' });
            else window.scrollTo(0, 0);
        }

        window.dispatchEvent(new CustomEvent('esdoc:navigation', { detail: { url: url.href } }));
    };

    const shouldHandle = (event, link) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
            || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return false;

        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin) return false;
        if (url.pathname === location.pathname && url.search === location.search) return false;
        return url.protocol === 'http:' || url.protocol === 'https:';
    };

    document.addEventListener('click', event => {
        const link = event.target.closest?.('a');
        if (!link || !shouldHandle(event, link) || navigating) return;

        event.preventDefault();
        navigating = true;
        loadPage(link.href, true).finally(() => { navigating = false; });
    });

    window.addEventListener('popstate', () => {
        if (navigating) return;
        navigating = true;
        loadPage(location.href, false).finally(() => { navigating = false; });
    });
})();
