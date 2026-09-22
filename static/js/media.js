/* Shared progressive image loading.

   Every image starts with a skeleton surface. The class is removed on the
   first successful or failed response, so broken images still reach the
   page's existing fallbacks. MutationObserver covers the GitHub contributor
   list, which arrives after the initial document scan.

   Add ?skeleton=1 while testing to keep each completed skeleton visible for a
   short moment. It changes no production timing unless the query is present.
*/
(function () {
    const demo = new URLSearchParams(location.search).get('skeleton') === '1';
    const demoDelay = 1200;

    const surfaceFor = image => image.closest('[data-media-surface]') || image;

    function finish(image, surface) {
        if (image.dataset.mediaFinished) return;
        image.dataset.mediaFinished = '1';

        const remove = () => {
            surface.classList.remove('media-skeleton');
            image.classList.remove('media-skeleton');
        };

        if (demo) window.setTimeout(remove, demoDelay);
        else remove();
    }

    function watch(image) {
        if (image.dataset.mediaWatched) return;
        image.dataset.mediaWatched = '1';

        const surface = surfaceFor(image);
        surface.classList.add('media-skeleton');
        image.classList.add('media-skeleton');
        if (surface !== image) image.dataset.mediaSurfaceChild = '1';

        image.addEventListener('load', () => finish(image, surface), { once: true });
        image.addEventListener('error', () => finish(image, surface), { once: true });

        // Cached images can finish before the listener is attached. An empty
        // dynamic image (the warper sandbox and lightbox) is intentionally not
        // settled here; it will settle when JS assigns its src later.
        if (image.complete && image.naturalWidth > 0) finish(image, surface);
    }

    function scan(root) {
        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
        if (root.matches && root.matches('img')) watch(root);
        root.querySelectorAll('img').forEach(watch);
    }

    scan(document);

    new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => scan(node));
        });
    }).observe(document.body, { childList: true, subtree: true });

    // CSS backgrounds cannot dispatch an image load event. The first hero
    // slide gets the same state treatment through a tiny preload probe.
    const hero = document.querySelector('.hero-bg');
    const firstSlide = hero && hero.querySelector('.hero-bg-slide');
    if (hero && firstSlide) {
        hero.classList.add('media-skeleton');
        const match = /url\(\s*["']?([^"')]+)/.exec(getComputedStyle(firstSlide).backgroundImage);
        if (!match) {
            hero.classList.remove('media-skeleton');
        } else {
            const probe = new Image();
            const done = () => {
                const remove = () => hero.classList.remove('media-skeleton');
                if (demo) window.setTimeout(remove, demoDelay);
                else remove();
            };
            probe.addEventListener('load', done, { once: true });
            probe.addEventListener('error', done, { once: true });
            probe.src = match[1];
            if (probe.complete) done();
        }
    }
})();
