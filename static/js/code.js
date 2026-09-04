/* Everything every code panel on the site needs, wherever one turns up: the
   docs' fenced blocks, the resource browser's file viewer, the warper page's
   samples. Loaded on every page rather than gated per-template — code panels
   appear on more pages than not, several of them from markdown the template
   never inspects, and the file costs nothing on a page with none.

   Rendered code carries a sentinel glyph in place of every space (see
   md/__init__.py), so indentation is visible. That makes putting the spaces
   back the price of admission for anything that takes code off the page:
   without it a pasted script is full of ∙ and won't run. Both routes off the
   page — a hand-made selection and the copy button — go through unglyph()
   here, and pages with a copy path of their own (resources.js) reuse it
   through window.unglyphCode rather than keeping a second copy of the glyph. */

(function () {
    const WHITESPACE_GLYPH = '∙';
    const unglyph = text => text.replace(new RegExp(WHITESPACE_GLYPH, 'g'), ' ');

    // The one export: resources.js copies the file viewer's whole script from
    // a button of its own, and must strip the same glyph.
    window.unglyphCode = unglyph;

    /* ── Selecting code by hand ──
       Every code panel is a <pre> — the docs' fences and the viewer's
       .fb-code alike — so one listener covers the site. */
    document.addEventListener('copy', e => {
        const sel = window.getSelection();

        if (!sel.rangeCount) return;

        const node = sel.getRangeAt(0).commonAncestorContainer;

        const pre = node.nodeType === 1
            ? node.closest('pre')
            : node.parentElement?.closest('pre');

        if (!pre) return;

        e.preventDefault();
        e.clipboardData.setData('text/plain', unglyph(sel.toString()));
    });

    /* ── The copy button on fenced blocks ──
       Ships [hidden] in the markup and is revealed here, so a no-JS page
       never shows a button that can't do anything. */
    if (!navigator.clipboard) return;

    const status = document.getElementById('code-copy-status');

    /* ── Inline chips ──
       A fence isn't the only thing worth taking off the page: a colour, a
       function name, a file path in running prose is exactly what a reader
       came for, and until now the only way to take one was to select it by
       hand. Every inline `code` in the article copies on click, the same
       gesture the character listings already use for a name colour.

       Promoted in place rather than wrapped in a <button>: the chip sits
       inside a sentence, and a real button there brings its own font,
       baseline and box to argue with. That means spelling out what a button
       would have given for free — role, tab stop, keyboard activation — the
       way warpers.js does for its own promoted controls. Skipped inside a
       link, where the click already means "go there". */
    document.querySelectorAll('.content code').forEach(chip => {
        if (chip.closest('pre') || chip.closest('a')) return;

        const value = chip.textContent;
        if (!value.trim()) return;

        let timer = null;
        const copy = () => navigator.clipboard.writeText(value).then(() => {
            chip.classList.add('copied');
            if (status) status.textContent = 'Скопировано: ' + value;
            clearTimeout(timer);
            timer = setTimeout(() => chip.classList.remove('copied'), 1600);
        }).catch(() => {});

        chip.classList.add('code-copyable');
        chip.setAttribute('role', 'button');
        chip.setAttribute('tabindex', '0');
        chip.setAttribute('aria-label', 'Скопировать: ' + value);
        chip.title = 'Скопировать';

        chip.addEventListener('click', copy);
        chip.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            copy();
        });
    });

    document.querySelectorAll('.code-copy').forEach(btn => {
        btn.hidden = false;
        let timer = null;

        btn.addEventListener('click', () => {
            // The gutter is a sibling of <code>, never a child, so the line
            // numbers are already out of what textContent picks up.
            const code = btn.closest('.code-block')?.querySelector('code');
            if (!code) return;

            navigator.clipboard.writeText(unglyph(code.textContent)).then(() => {
                btn.classList.add('copied');
                if (status) status.textContent = 'Код скопирован.';
                clearTimeout(timer);
                timer = setTimeout(() => btn.classList.remove('copied'), 1600);
            }).catch(() => {});
        });
    });
})();
