/* Shared image lightbox for resource listings. */
(function () {
    const box = document.querySelector('.res-lightbox');
    if (!box || typeof box.showModal !== 'function') return;

    const img = box.querySelector('img');
    const name = box.querySelector('.res-lightbox-name');
    const raw = box.querySelector('.res-lightbox-raw:not(.res-lightbox-dl)');
    const dl = box.querySelector('.res-lightbox-dl');

    document.querySelectorAll('a[data-zoom]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();

            img.src = link.href;
            img.alt = link.dataset.zoom || '';
            name.textContent = link.dataset.zoom || '';
            raw.href = link.href;
            dl.href = link.href;
            dl.download = link.dataset.file || '';
            box.showModal();
        });
    });

    box.querySelector('.res-lightbox-close').addEventListener('click', () => box.close());
    box.addEventListener('click', event => {
        if (event.target === box) box.close();
    });
    box.addEventListener('close', () => { img.src = ''; });
})();
