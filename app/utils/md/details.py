import re

from markdown_it.rules_block import StateBlock

# A collapsible section — native `<details>`/`<summary>`, no JavaScript:
#
#   :::details Реализация функции `Snow` в игре
#   …любой блочный markdown…
#   :::
#
# Shaped like the `:::name` callouts (template.py) so authors write one fence
# syntax throughout, but it is not a callout: the text on the opener is the
# summary a reader clicks, not the block's first paragraph, and the box carries
# no semantic colour. It is for material that would bury the page if it were
# always open — a long reference implementation, an aside two readers in ten
# will want.
#
# The summary goes through the inline parser rather than being escaped flat,
# because titles in these docs routinely name a function in `code`.
OPEN_RE = re.compile(r'^:::\s*details(?:\s+(\S.*))?\s*$')

# Shown when the author gives no title. A `<summary>` must never be empty —
# an empty one collapses to a bare marker with no hit area to click.
DEFAULT_SUMMARY = 'Подробнее'


def details(state: StateBlock, startLine: int, endLine: int, silent: bool):
    pos = state.bMarks[startLine] + state.tShift[startLine]
    maximum = state.eMarks[startLine]

    match = OPEN_RE.match(state.src[pos:maximum])
    if not match:
        return False

    # Same rule the callouts follow: a missing closer fails the block outright
    # rather than swallowing the rest of the document into a collapsed box —
    # where, unlike a callout, the swallowed text would be *hidden* by default
    # and the mistake that much easier to miss.
    nextLine = startLine + 1

    while nextLine < endLine:
        pos = state.bMarks[nextLine] + state.tShift[nextLine]
        if state.src[pos:state.eMarks[nextLine]].strip() == ':::':
            break
        nextLine += 1

    if nextLine >= endLine:
        return False

    if silent:
        return True

    old_parent = state.parentType
    old_line_max = state.lineMax
    state.parentType = 'details'
    state.lineMax = nextLine

    token = state.push('details_open', 'details', 1)
    token.map = [startLine, nextLine]

    state.push('details_summary_open', 'summary', 1)
    inline = state.push('inline', '', 0)
    inline.content = (match.group(1) or '').strip() or DEFAULT_SUMMARY
    inline.children = []
    state.push('details_summary_close', 'summary', -1)

    # Full block-level parse, so a disclosure can hold lists, code fences and
    # several paragraphs — which is the whole reason to collapse it.
    state.md.block.tokenize(state, startLine + 1, nextLine)

    state.push('details_close', 'details', -1)

    state.parentType = old_parent
    state.lineMax = old_line_max
    state.line = nextLine + 1
    return True


def render_details_open(self, tokens, idx, options, env):
    return '<details class="details">'


def render_details_summary_open(self, tokens, idx, options, env):
    return '<summary class="details-summary">'


def render_details_summary_close(self, tokens, idx, options, env):
    return '</summary><div class="details-body">'


def render_details_close(self, tokens, idx, options, env):
    return '</div></details>\n'
