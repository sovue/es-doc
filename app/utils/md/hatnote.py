import re
from urllib.parse import quote, unquote

from markdown_it.rules_block import StateBlock

# Wikipedia-style disambiguation hatnote: the italic line above the first
# heading that says what *this* page is about and points at the page a reader
# who wanted the other meaning is actually after.
#
#   ::about создании мода | портировании мода на Android | Портирование мода на Android с помощью ESTool
#
#   → Эта статья о создании мода; о портировании мода на Android см. …
#
# Double colon, not triple: unlike `:::info` / `:::stub` / … this is a single
# physical line with no body and no closer, and `::about` looks that way on
# sight instead of inviting an author to hunt for a `:::` to close it.
#
# Exactly three fields, `|`-separated: this article's subject, the other
# subject, and where the other subject lives. Both subjects are written in the
# prepositional case (о чём?) — the sentence supplies the same «о» for both, so
# an author only has to get one case right. Anything else fails the block (the
# raw `::about` line stays visible in the page) rather than rendering a
# half-filled sentence — the same "a broken block should look broken" rule
# template.py follows for a missing closer.
OPEN_RE = re.compile(r'^::about(?:\s+(\S.*))?\s*$')

# `[text](href)` anywhere in the field — the author wrote the link themselves
# and gets to keep their own link text.
MD_LINK_RE = re.compile(r'\[[^\]]*\]\([^)]*\)')

def _link(target: str) -> str:
    """Field 3 as markdown. Authors write a bare doc name most of the time
    (`Создание мода`), a path or URL when pointing outside /docs, and a full
    markdown link when the link text should differ from the title."""
    if MD_LINK_RE.search(target):
        return target

    if target.startswith(('/', 'http://', 'https://')):
        # Last path segment as the label: doc URLs are `/docs/<название>`, so
        # this recovers the article's own title without a second field.
        label = unquote(target.rstrip('/').rsplit('/', 1)[-1]) or target
        return f'[{label}]({target})'

    return f'[{target}](/docs/{quote(target)})'

def render_hatnote_open(self, tokens, idx, options, env):
    return '<p class="hatnote" role="note">'

def render_hatnote_close(self, tokens, idx, options, env):
    return '</p>'

def hatnote(state: StateBlock, startLine: int, endLine: int, silent: bool):
    pos = state.bMarks[startLine] + state.tShift[startLine]
    maximum = state.eMarks[startLine]

    match = OPEN_RE.match(state.src[pos:maximum])
    if not match:
        return False

    fields = [field.strip() for field in (match.group(1) or '').split('|')]

    if len(fields) != 3 or not all(fields):
        return False

    if silent:
        return True

    about, other, target = fields

    # Trailing punctuation is the sentence's job, not the author's — the
    # template already supplies the semicolon and the closing full stop.
    about = about.rstrip('.,;')
    other = other.rstrip('.,;')

    nextLine = startLine + 1

    token = state.push('hatnote_open', 'p', 1)
    token.map = [startLine, nextLine]

    inline = state.push('inline', '', 0)
    # Fields go through the inline parser, so `**жирный**` and `` `код` ``
    # inside them work exactly as they do in prose.
    inline.content = f'Эта статья о {about}; о {other} см. {_link(target)}.'
    inline.children = []

    state.push('hatnote_close', 'p', -1)

    state.line = nextLine
    return True
