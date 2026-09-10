/* Everything every code panel on the site needs, wherever one turns up: the
   docs' fenced blocks, the resource browser's file viewer, the warper page's
   samples. Loaded on every page rather than gated per-template — code panels
   appear on more pages than not, several of them from markdown the template
   never inspects, and the file costs nothing on a page with none.

   Nothing here touches what gets copied. The whitespace dots are painted by
   CSS over real spaces (md/__init__.py, syntax.css), so a selection, a copy
   button, or anything added later takes the code exactly as it stands. That
   used to be a sentinel `∙` glyph in the text, which meant every copy path had
   to remember to swap it back — and the one that forgot shipped a viewer whose
   button pasted `import∙random`. */

/* One copy control, four call sites. Every "copy this" on the site does the
   same four things — write to the clipboard, flash `.copied` on the control,
   say so in a live region, drop the flash after 1600ms — and each place had
   grown its own copy of that dance: the fence button, the inline chips, the
   resource rows and the warper names. Four timers, four hard-coded delays,
   four chances to announce something slightly different.

   The value is read at click time (a function, not a string), because the
   file viewer's payload is the DOM's text and the chips' is their own. Callers
   keep what is genuinely theirs: which element, what to announce, and — for a
   control promoted from a span — the role and key handling.

   Exposed on `window` rather than imported: these are plain classic scripts,
   loaded with `defer` in document order, and code.js comes first. Callers
   guard for its absence, so a failed load costs a page its copy buttons and
   nothing else. */
window.copyControl = (element, getValue, { message, status, reset = 1600 } = {}) => {
    let timer = null;

    return () => navigator.clipboard.writeText(getValue()).then(() => {
        element.classList.add('copied');
        if (status) status.textContent = typeof message === 'function' ? message() : message;
        clearTimeout(timer);
        timer = setTimeout(() => element.classList.remove('copied'), reset);
    }).catch(() => {});
};

/* ── Placeholder values (`<Название лейбла>`) ──
   A value the reader has to swap for their own. Written `<<so>>` in the source
   and unwrapped to a single pair on the way out (md/__init__.py), so what
   arrives here is already what the page should show — this only adds the
   sentence saying what to do with it, on top of the dotted underline
   (syntax.css) that marks it at rest.

   Nothing is rewritten. An earlier marker was delimited by pipes that had to
   be stripped in the browser, which put this in a race with the chip loop
   below: that loop reads `textContent` to know what to copy, so whichever ran
   first decided whether the clipboard got the delimiters. Unwrapping on the
   server removed the race rather than ordering it — and a page with no JS at
   all now shows the right text too.

   Codetags (TODO/FIXME) share the token and its underline, so the shape is
   checked rather than the class: a stray TODO must not be labelled
   "replace this value". */
document.querySelectorAll('span.cs').forEach(el => {
    const text = el.textContent;
    if (text.length < 3 || text[0] !== '<' || text[text.length - 1] !== '>') return;

    el.title = 'Это значение необходимо заменить на своё!';
});

(function () {
    if (!navigator.clipboard) return;

    const status = document.getElementById('code-copy-status');

    /* ── Inline chips ──
       A fence isn't the only thing worth taking off the page: a colour, a
       function name, a file path in running prose is exactly what a reader
       came for, and until now the only way to take one was to select it by
       hand. Every inline `code` in the article copies on click, the same
       gesture the character listings already use for a name colour.

       Mouse-only on purpose, and that used to be a `role="button"` +
       `tabindex="0"` + `aria-label` promotion instead. An article runs 50+ of
       these — on /docs/screens, 55 of them, three quarters of everything
       focusable on the page — so making each one a tab stop meant a keyboard
       reader pressed Tab 55 times to cross one article, and the aria-label
       replaced the token's own text with "Скопировать: <token>", so a
       screen reader announced "Скопировать modal True, Скопировать tag menu"
       for a single sentence naming two properties. The verb was announced
       for the button, not the word the sentence needed.

       The text is still just as readable and just as selectable as any other
       inline code — a keyboard or screen-reader user copies it the normal
       way, by selecting text they can already read. What's lost is only the
       one-click shortcut, and that shortcut stays for pointer users, who
       have no substitute for it. Skipped inside a link, where the click
       already means "go there". */
    document.querySelectorAll('.content code').forEach(chip => {
        if (chip.closest('pre') || chip.closest('a')) return;

        const value = chip.textContent;
        if (!value.trim()) return;

        const copy = window.copyControl(chip, () => value, {
            message: 'Скопировано: ' + value, status,
        });

        chip.classList.add('code-copyable');
        chip.title = 'Скопировать';

        chip.addEventListener('click', copy);
    });

    /* ── The copy button on fenced blocks ──
       Ships [hidden] in the markup and is revealed here, so a no-JS page
       never shows a button that can't do anything. */
    document.querySelectorAll('.code-copy').forEach(btn => {
        btn.hidden = false;

        // The gutter is a sibling of <code>, never a child, so the line
        // numbers are already out of what textContent picks up.
        const code = () => btn.closest('.code-block')?.querySelector('code')?.textContent ?? '';

        btn.addEventListener('click', window.copyControl(btn, code, {
            message: 'Код скопирован.', status,
        }));
    });
})();
