"""Line numbers for code panels.

Pygments' `nowrap=True` output is span-balanced *per line* — a token whose
value spans several lines is emitted as one closed span per line — so the
highlighted HTML can be split on newlines into self-contained rows. Both
consumers below rely on that: the docs' fenced blocks and the resource
browser's file viewer.

The gutter is always a sibling of `<code>`, never inside it. Both copy paths
read `code.textContent` (docs.js, resources.js), and a gutter inside would
paste line numbers along with the code.

The code always sits in its own `.code-scroll` box, and that box — not the
`<pre>` — is what scrolls sideways, which puts the gutter *outside* the
scrolling area entirely. The gutter used to be a `position: sticky` column
inside it: that pinned the numbers in place, but a positioned element with an
opaque background paints over its siblings, so while the reader was scrolled
right the leftmost ~22px of every long line sat underneath the numbers and
could not be reached by scrolling at all. Two columns, one of which scrolls,
keeps the numbers permanently visible *and* the whole line readable.
"""

import html


def split_lines(code_html):
    """Highlighted (or plain-escaped) code as a list of rows.

    A fence's content ends with a newline, which would otherwise count as one
    extra, empty trailing row and leave the gutter one number too long."""
    lines = code_html.split('\n')

    if lines and not lines[-1]:
        lines.pop()

    return lines


def scroll_box(code_html, lang_class=''):
    """The code column: everything that scrolls sideways, and nothing else. The
    gutter is deliberately not in here (see the module docstring).

    `tabindex="0"` on a plain `<span>` looks unusual, but the alternative was
    worse: an `overflow-x: auto` box with nothing focusable inside it (the
    code itself isn't a control) is reachable by mouse or trackpad only —
    Tab skips straight over it, and a keyboard-only reader has no way to
    scroll to the rest of a clipped line at all. This is the same fix
    browsers ship on `<pre>` by default; it's needed here because the
    scrolling lives on `.code-scroll`, not on `<pre>` itself (see the module
    docstring for why)."""
    return f'<span class="code-scroll" tabindex="0"><code{lang_class}>{code_html}</code></span>'


def gutter(count):
    """Plain, unclickable line numbers for the docs' fenced blocks.

    `aria-hidden` because the numbers are decoration here: nothing links to
    them, and a screen reader announcing "one two three" down the side of
    every snippet is noise. `user-select: none` in CSS keeps them out of a
    hand-made selection, the way the copy button keeps them out of a copied
    one."""
    numbers = '\n'.join(str(n) for n in range(1, count + 1))
    return f'<span class="code-gutter" aria-hidden="true">{numbers}</span>'


def numbered_view(code_html):
    """The file viewer's two columns: a gutter of per-line links, and the code
    with every row wrapped so `:target` can highlight the addressed line.

    Unlike the docs gutter these numbers *are* links (`#L42`) and stay in the
    accessibility tree — being able to point someone at one line of a script
    is the whole feature. The newline between rows sits outside the row span,
    so the rows stay inline: a block row would need the newline removed, and
    removing it would strip the line breaks out of `code.textContent` and so
    out of the file's copy button."""
    lines = split_lines(code_html)

    links = '\n'.join(
        f'<a href="#L{n}" title="Ссылка на строку {n}">{n}</a>'
        for n in range(1, len(lines) + 1)
    )

    rows = '\n'.join(
        f'<span class="fb-line" id="L{n}">{line}</span>'
        for n, line in enumerate(lines, 1)
    )

    return (
        f'<span class="fb-gutter">{links}</span>',
        rows,
    )
