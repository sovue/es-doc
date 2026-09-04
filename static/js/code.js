/* Everything every code panel on the site needs, wherever one turns up: the
   docs' fenced blocks, the resource browser's file viewer, the warper page's
   samples. Loaded on every page rather than gated per-template — code panels
   appear on more pages than not, several of them from markdown the template
   never inspects, and the file costs nothing on a page with none.

   Nothing here touches what gets copied. The whitespace dots are painted by
   CSS over real spaces (md/__init__.py, code.css), so a selection, a copy
   button, or anything added later takes the code exactly as it stands. That
   used to be a sentinel `∙` glyph in the text, which meant every copy path had
   to remember to swap it back — and the one that forgot shipped a viewer whose
   button pasted `import∙random`. */

(function () {
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

    /* ── The copy button on fenced blocks ──
       Ships [hidden] in the markup and is revealed here, so a no-JS page
       never shows a button that can't do anything. */
    document.querySelectorAll('.code-copy').forEach(btn => {
        btn.hidden = false;
        let timer = null;

        btn.addEventListener('click', () => {
            // The gutter is a sibling of <code>, never a child, so the line
            // numbers are already out of what textContent picks up.
            const code = btn.closest('.code-block')?.querySelector('code');
            if (!code) return;

            navigator.clipboard.writeText(code.textContent).then(() => {
                btn.classList.add('copied');
                if (status) status.textContent = 'Код скопирован.';
                clearTimeout(timer);
                timer = setTimeout(() => btn.classList.remove('copied'), 1600);
            }).catch(() => {});
        });
    });
})();
