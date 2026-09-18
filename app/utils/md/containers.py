"""The `:::` fence family: who owns a marker, and where a block ends.

Three separate parsers open a `:::` fence — the semantic callouts
(template.py), the collapsible disclosure (details.py) and the article-status
banners (banner.py) — and every one of them closes on a bare `:::`. That
shared closer is the whole reason this module exists.

Each parser used to scan forward for the *first* bare `:::` and stop there,
which is correct exactly as long as nothing is nested. Put a `:::details`
inside a `:::info` and the inner block's closer silently ended the outer one:
the disclosure swallowed the rest of the callout, and the callout's real
closer was left over as a stray paragraph. There was no syntax for saying
"this closer is not yours".

`find_closer` counts instead of stopping. Every opener it passes on the way
down pushes the depth, every bare `:::` pops it, and the marker that pops the
depth back below zero is the one that belongs to the caller. That is the same
rule a reader applies by eye, and it means nesting needs no new syntax: the
corpus (111 openers, 111 closers, none of them nested yet) parses byte for
byte as it did before, and a nested block now works where it used to break.

Banners are a deliberate exception on the *inside* — they keep their own
bounded scan (banner.py), because a banner is one or two sentences of page
status and should never grow into a container. They are still counted here,
because from the outside a banner opens and closes with the same markers as
everything else.
"""

import re

# Registered by the modules that own them, so the registry cannot drift out of
# step with the parsers. Configured banners are resolved lazily below because
# their names do not exist until config.yaml has been loaded.
_NAMES: set[str] = set()

# `:::name`, with or without the space the corpus uses both ways, and with or
# without the lead text that follows on the same line. Only the name matters
# here — what a block does with its lead is the parser's own business.
_OPEN_RE = re.compile(r'^:::[ \t]*([A-Za-z][\w-]*)')

CLOSER = ':::'


def register(*names: str) -> None:
    """Declare `:::name` as a container opener for closer-matching purposes."""
    _NAMES.update(names)


def opener_name(line: str) -> str | None:
    """The container name a line opens, or None if it opens nothing.

    Unknown names are not openers. `:::renpy` in prose is a typo for a code
    fence, not a container, and treating it as one would make it eat a closer
    that belongs to a real block.
    """
    match = _OPEN_RE.match(line.strip())
    if not match:
        return None
    name = match.group(1)
    if name in _NAMES:
        return name

    # Banner names are loaded from config after this module is imported. Keep
    # the registry lazy so a custom configured opener is still counted while
    # an enclosing callout searches for its matching closer.
    try:
        from ..config import CONFIG
        if name in CONFIG.banner_names():
            return name
    except (ImportError, AttributeError, TypeError):
        pass

    return None


def find_closer(state, startLine: int, endLine: int) -> int | None:
    """Line index of the bare `:::` closing the block opened at `startLine`.

    Returns None when the block is never closed. Every caller treats that as
    "this is not a container after all" and falls back to plain markdown,
    rather than swallowing the rest of the document — the raw `:::tip` left
    visible in the page is the signal that a closer is missing, which is far
    easier to spot than a silently mis-scoped box.
    """
    depth = 0
    line = startLine + 1

    while line < endLine:
        # bMarks + tShift skips the indent, so a closer indented inside a list
        # item still reads as a closer — which the corpus relies on.
        text = state.src[state.bMarks[line] + state.tShift[line]:state.eMarks[line]].strip()

        if text == CLOSER:
            if depth == 0:
                return line
            depth -= 1
        elif opener_name(text):
            depth += 1

        line += 1

    return None
