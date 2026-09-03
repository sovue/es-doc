import re

from markdown_it.rules_block import StateBlock
from markdown_it.rules_inline import StateInline

# Wikipedia-style manual footnotes, in two halves that authors write and
# number themselves:
#
#   Это текст с источником^1.       ← the marker, anywhere in prose
#
#   1^ Источник, «Название», 2019.  ← the list, usually under a heading
#   2^ Ещё один.
#
# Nothing is numbered, ordered or collected automatically: the number in the
# marker is the number in the list, and a marker with no matching entry stays
# a marker. That is the point — the docs are written by hand, and an author
# renumbering a list should not have to trust a renderer to agree with them.
#
# An entry runs until the next one, so all three markdown line breaks behave
# inside it exactly as they do in prose: a bare newline is a soft break, two
# trailing spaces a hard one, and a blank line opens a new paragraph within
# the entry. That last case asks for the continuation to be indented, the same
# way markdown asks a list item to mark its own continuation — an unindented
# paragraph after a blank line is indistinguishable from the article simply
# resuming, and without the rule the list would swallow the rest of the page.
#
# `^` is one of markdown-it's inline terminator characters, so the marker rule
# gets a look at every caret in the text before the plain-text rule swallows
# it. Two things stop ordinary prose from turning into citations:
#
#   * a caret after a digit is arithmetic, never a marker (`2^3`);
#   * a marker only counts if the document actually defines that source. A
#     page with no `2^` entry renders `t^2` as the exponent it is.
#
# The second rule falls out of the feature being manual anyway: markdown-it
# finishes block parsing for the whole document before it parses any inline
# content, so by the time a marker is looked at, every `N^` entry on the page
# has already been collected into `env`. It also means the page can never
# carry a `#ref-N` link that lands nowhere.
#
# What the two rules cannot separate is a one-letter variable from a word:
# `t^2` and `источником^2` are the same shape, so on a page that *does* cite
# source 2 the exponent would become a marker. A literal caret is written the
# way markdown writes every literal special character — escape it, or better
# here put the formula in `code`, which the inline parser never descends into.
# DESIGN.md already requires formulas to be code, and the corpus has no bare
# carets in prose at all.
MARK_RE = re.compile(r'\^(\d{1,3})(?![\w^])')

ITEM_RE = re.compile(r'^(\d{1,3})\^[ \t]+(\S.*)$')

# Splits an entry's collected text into paragraphs on blank lines.
PARA_SPLIT_RE = re.compile(r'\n[ \t]*\n')


def ref_mark(state: StateInline, silent: bool):
    pos = state.pos

    if state.src[pos] != '^':
        return False

    match = MARK_RE.match(state.src, pos)
    if not match:
        return False

    # `2^3` is arithmetic, not a citation.
    if pos > 0 and state.src[pos - 1].isdigit():
        return False

    # No such source on this page — leave the text alone.
    if match.group(1) not in state.env.get('ref_ids', ()):
        return False

    if not silent:
        token = state.push('ref_mark', '', 0)
        token.meta = {'num': match.group(1)}

    state.pos = match.end()
    return True


def ref_list(state: StateBlock, startLine: int, endLine: int, silent: bool):
    def raw(line):
        start = state.bMarks[line] + state.tShift[line]
        return state.src[start:state.eMarks[line]]

    def indented(line):
        # Any indent at all marks a continuation; the exact width is the
        # author's business, as it is for a markdown list item.
        return state.tShift[line] > 0

    if not ITEM_RE.match(raw(startLine)):
        return False

    if silent:
        return True

    # One `<div class="refs">` per run of entries, so a list written as
    # consecutive lines renders as one block rather than as N blocks that
    # happen to sit next to each other. Each entry collects its own lines,
    # where an empty string stands for a paragraph break.
    entries, line = [], startLine

    while line < endLine:
        text = raw(line)
        match = ITEM_RE.match(text)

        if match:
            entries.append([match.group(1), [match.group(2)]])
            line += 1
            continue

        if text.strip():
            # A plain following line continues the entry. Only the leading
            # indent goes: trailing spaces are how markdown spells a hard
            # break, so they have to reach the inline parser intact.
            entries[-1][1].append(text.lstrip())
            line += 1
            continue

        # Blank line — what follows it decides whether the list goes on.
        look = line + 1
        while look < endLine and not raw(look).strip():
            look += 1

        if look >= endLine:
            break

        if ITEM_RE.match(raw(look)):
            # Entries spaced out for readability, not a paragraph break.
            line = look
            continue

        if indented(look):
            entries[-1][1].append('')
            line = look
            continue

        # Unindented prose: the list ended back at the blank line.
        break

    # Read back by the marker rule during inline parsing, which runs after
    # every block on the page has been tokenised.
    state.env.setdefault('ref_ids', set()).update(num for num, _ in entries)

    state.push('refs_open', 'div', 1).map = [startLine, line]

    for num, lines in entries:
        token = state.push('ref_item_open', 'div', 1)
        token.meta = {'num': num}

        for para in PARA_SPLIT_RE.split('\n'.join(lines)):
            if not para.strip():
                continue
            state.push('paragraph_open', 'p', 1)
            inline = state.push('inline', '', 0)
            inline.content = para.strip('\n')
            inline.children = []
            state.push('paragraph_close', 'p', -1)

        state.push('ref_item_close', 'div', -1)

    state.push('refs_close', 'div', -1)

    state.line = line
    return True


def render_ref_mark(self, tokens, idx, options, env):
    num = tokens[idx].meta['num']

    # Only the first marker for a given number carries the id the list entry
    # links back to — the same source cited twice would otherwise put the same
    # id on the page twice, and the back-link would land on whichever the
    # browser picked. Later markers still link forward to the entry.
    seen = env.setdefault('ref_marks', set())
    anchor = '' if num in seen else f' id="ref-back-{num}"'
    seen.add(num)

    return (
        f'<sup class="ref"{anchor}>'
        f'<a href="#ref-{num}" aria-label="Источник {num}">{num}</a>'
        f'</sup>'
    )


def render_refs_open(self, tokens, idx, options, env):
    return '<div class="refs">'


def render_refs_close(self, tokens, idx, options, env):
    return '</div>\n'


def render_ref_item_open(self, tokens, idx, options, env):
    num = tokens[idx].meta['num']
    # A div, not a p: an entry can hold several paragraphs now, and a <p>
    # cannot contain them.
    return (
        f'<div class="ref-item" id="ref-{num}">'
        f'<a class="ref-back" href="#ref-back-{num}" '
        f'aria-label="Вернуться к упоминанию источника {num}">{num}^</a>'
        f'<div class="ref-text">'
    )


def render_ref_item_close(self, tokens, idx, options, env):
    return '</div></div>'
