import re

from markdown_it.common.utils import escapeHtml
from markdown_it.rules_block import StateBlock

from ..config import CONFIG
from ..svg import SVG

# Page-level status banners for articles that aren't finished. Unlike the
# `:::info` / `:::warning` callouts (template.py), these carry their own
# wording: the point is that every unfinished article says the same thing the
# same way, so a reader learns to recognise the banner rather than re-reading
# a slightly different sentence on each page. The author only decides *which*
# state the article is in; the note underneath is optional and replaces the
# default sentence when given.
# Syntax and presentation both come from config.yaml at render time.
BANNER_TONES = ('info', 'tip', 'attention', 'warning', 'danger')


def render_banner_open(self, tokens, idx, options, env):
    kind = tokens[idx].meta['kind']
    settings = CONFIG.banner(kind)
    title = escapeHtml(settings['title'])
    tone = settings['tone']
    if tone not in BANNER_TONES:
        raise ValueError(f'Unknown banner tone for {kind}: {tone}')
    return (
        f'<aside class="banner banner-{kind} banner-tone-{tone}" role="note">'
        f'{SVG[settings["icon"]]}'
        f'<div class="banner-content">'
        f'<p class="banner-title">{title}</p>'
        f'<div class="banner-note">'
    )

def render_banner_close(self, tokens, idx, options, env):
    return '</div></div></aside>'

def banner():
    # `:::stub`, or `:::stub <короткая приписка>` on the same line. A multi-line
    # note may follow, closed by `:::` — but only while the lines run on without
    # a blank one between them. A banner note is a sentence or two by design, and
    # the bounded scan means a lone `:::stub` can never swallow the rest of the
    # page looking for a closer that was never written.
    open_re = re.compile(r'^:::\s*([A-Za-z][\w-]*)(?:\s+(\S.*))?\s*$')

    def block(state: StateBlock, startLine: int, endLine: int, silent: bool):
        pos = state.bMarks[startLine] + state.tShift[startLine]
        maximum = state.eMarks[startLine]

        match = open_re.match(state.src[pos:maximum])
        if not match:
            return False

        name = match.group(1)
        if name not in CONFIG.banner_names():
            return False

        if silent:
            return True

        lead = (match.group(2) or '').strip()

        # Find the optional note body. bodyEnd stays at startLine + 1 for the
        # bare single-line form; nextLine is where parsing resumes afterwards.
        bodyEnd = nextLine = startLine + 1

        while nextLine < endLine:
            pos = state.bMarks[nextLine] + state.tShift[nextLine]
            line = state.src[pos:state.eMarks[nextLine]].strip()

            if line == ':::':
                bodyEnd = nextLine
                nextLine += 1
                break

            # Blank line, or the start of some other block — the banner was
            # written in its bare form and this belongs to the document.
            if not line or line.startswith(':::'):
                bodyEnd = nextLine = startLine + 1
                break

            nextLine += 1
        else:
            bodyEnd = nextLine = startLine + 1

        token = state.push('banner_open', 'aside', 1)
        token.meta = {'kind': name}
        token.map = [startLine, nextLine]

        if lead:
            state.push('paragraph_open', 'p', 1)
            inline = state.push('inline', '', 0)
            inline.content = lead
            inline.children = []
            state.push('paragraph_close', 'p', -1)

        if bodyEnd > startLine + 1:
            old_parent = state.parentType
            old_line_max = state.lineMax
            state.parentType = name
            state.lineMax = bodyEnd

            state.md.block.tokenize(state, startLine + 1, bodyEnd)

            state.parentType = old_parent
            state.lineMax = old_line_max

        # Nothing from the author — fall back to the banner's own sentence, so
        # the box is never just a bare heading.
        if not lead and bodyEnd == startLine + 1:
            state.push('paragraph_open', 'p', 1)
            inline = state.push('inline', '', 0)
            inline.content = CONFIG.banner(name)['text']
            inline.children = []
            state.push('paragraph_close', 'p', -1)

        state.push('banner_close', 'aside', -1)

        state.line = nextLine
        return True
    return block
