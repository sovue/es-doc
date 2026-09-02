"""Line numbers for code panels.

Pygments' `nowrap=True` output is span-balanced *per line* — a token whose
value spans several lines is emitted as one closed span per line — so the
highlighted HTML can be split on newlines into self-contained rows. Both
consumers below rely on that: the docs' fenced blocks and the resource
browser's file viewer.

The gutter is always a sibling of `<code>`, never inside it. Both copy paths
read `code.textContent` (docs.js, resources.js), and a gutter inside would
paste line numbers along with the code.
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
