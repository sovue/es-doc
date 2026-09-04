from markdown_it import MarkdownIt
from markdown_it.common.utils import escapeHtml, unescapeAll
from pygments import highlight
from pygments.filter import Filter
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter
from pygments.token import Comment, Whitespace
import re

from .slugs import heading_slugs, render_heading_open
from .table import table_block
from .template import template
from .banner import BANNERS, banner, render_banner_open, render_banner_close
from .details import (
    details, render_details_close, render_details_open,
    render_details_summary_close, render_details_summary_open,
)
from .hatnote import hatnote, render_hatnote_open, render_hatnote_close
from .lines import gutter, scroll_box, split_lines
from .refs import (
    ref_list, ref_mark, render_ref_item_close, render_ref_item_open,
    render_ref_mark, render_refs_close, render_refs_open,
)
from ..svg import SVG
from ..renpy_lexer import RenPyLexer

dummy_rule = lambda s: lambda self, tokens, idx, options, env: s

# Every space inside a code panel is drawn as a dot, the way Ren'Py's own
# script linter draws them: in a language where indentation *is* syntax, three
# spaces where four belong is worth being able to see. The glyph goes out as a
# `Whitespace` token, so it picks up that token's muted colour
# (--code-whitespace) and reads as texture under the code rather than as
# content. code.js swaps the glyphs back to spaces on the way to the clipboard,
# so what a reader pastes is still a script that runs.
WHITESPACE_GLYPH = '∙'

_SPACES_RE = re.compile(r'( +)')

class DotWhitespace(Filter):
    """Re-tag every run of spaces as `Whitespace` carrying the glyph.

    A filter, not a pass over the highlighted HTML, because that is the only
    place the treatment can be uniform: lexers disagree wildly about whether
    whitespace is a token at all — Pygments' Python lexer leaves indentation
    untokenised entirely, the Ren'Py one tags some of its own — and a filter
    sees the token stream before any of that reaches the formatter. Whatever
    the lexer thought, spaces come out of here as spaces.
    """

    def filter(self, lexer, stream):
        for ttype, value in stream:
            # `|Имя персонажа|` is one token the page treats as one thing:
            # docs.js strips its pipes and hangs "replace this" on what's left,
            # and it can only recognise it while the whole marker is a single
            # span. Splitting it around its space left two half-markers with
            # their pipes showing. The label is prose to overwrite anyway —
            # nobody counts its spaces — so it keeps them.
            if ttype in Comment.Special or ' ' not in value:
                yield ttype, value
                continue

            # Only the spaces change hands; the text around them keeps its own
            # token, so a string or a comment loses nothing but its blanks.
            for part in _SPACES_RE.split(value):
                if not part:
                    continue
                if part[0] == ' ':
                    yield Whitespace, WHITESPACE_GLYPH * len(part)
                else:
                    yield ttype, part

def highlight_code(code, lang, attrs):
    try:
        lexer = RenPyLexer() if lang == 'renpy' else get_lexer_by_name(lang)
    except Exception:
        return ''

    # A fresh lexer per call (both branches construct one), so the filter is
    # never added twice to the same instance.
    lexer.add_filter(DotWhitespace())

    return highlight(code, lexer, HtmlFormatter(nowrap=True))

# Copy button markup, ships [hidden] and revealed by docs.js — mirrors the
# progressive-enhancement pattern the resource listings use for their own
# copy buttons (res_macros.html).
CODE_COPY_BUTTON = (
    '<button type="button" class="code-copy" aria-label="Скопировать код" hidden>'
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">'
    '<rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/>'
    '<path d="M9.5 3V2.5A1.5 1.5 0 0 0 8 1H2.5A1.5 1.5 0 0 0 1 2.5V8a1.5 1.5 0 0 0 1.5 1.5H3" stroke="currentColor" stroke-width="1.3"/>'
    '</svg>'
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">'
    '<path d="M2 7.5L5.5 11L12 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
    '</svg>'
    '</button>'
)

def render_fence(self, tokens, idx, options, env):
    # Same shape as markdown-it-py's default fence renderer, wrapped in a
    # positioned container so a copy button can sit in the corner regardless
    # of the pre's own horizontal scroll.
    token = tokens[idx]
    info = unescapeAll(token.info).strip() if token.info else ''
    lang_name = info.split(maxsplit=1)[0] if info else ''

    highlighted = options.highlight(token.content, lang_name, '') if options.highlight else ''
    highlighted = highlighted or escapeHtml(token.content)

    lang_class = f' class="{options.langPrefix}{lang_name}"' if lang_name else ''

    # The button is parked over the panel's top-right corner, which on a
    # one-line fence is the same row the code itself occupies: it covered the
    # end of the line, and there was nothing to reveal by scrolling past it.
    # A single line is also what a reader selects by hand in one gesture, so
    # the button earns its corner only from two lines up.
    multiline = token.content.strip('\n').count('\n') > 0

    # Line numbers ride along with the copy button, on the same reasoning:
    # a one-line fence has nothing to count, and a lone "1" beside it is
    # furniture. The gutter sits outside <code> so it stays out of what the
    # copy button and a hand-made selection pick up (see lines.py).
    numbers = gutter(len(split_lines(highlighted))) if multiline else ''

    return (
        f'<div class="code-block{" code-block--numbered" if multiline else ""}">'
        f'{CODE_COPY_BUTTON if multiline else ""}'
        f'<pre>{numbers}{scroll_box(highlighted, lang_class)}</pre>'
        '</div>\n'
    )

# A hex colour written as inline code gets a dot of that colour in front of it,
# the way the character listings show a name colour (resources_list.html). The
# docs were doing it by hand — a raw `<b style="color: …">■ #A0C6D1 ■</b>` per
# value — which no theme could follow and no reader could copy. Server-side, so
# the swatch survives a page with no JS; the value beside it is what code.js
# then makes copyable, like any other inline chip.
COLOR_RE = re.compile(r'^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$')

def render_code_inline(self, tokens, idx, options, env):
    content = tokens[idx].content
    code = escapeHtml(content)

    # The regex above is the whole sanitiser: only `#` and hex digits ever
    # reach the style attribute.
    if COLOR_RE.match(content):
        return (
            f'<code class="code-color">'
            f'<span class="code-swatch" style="background: {content}" aria-hidden="true"></span>'
            f'{code}</code>'
        )

    return f'<code>{code}</code>'

MD = MarkdownIt('commonmark', {'highlight': highlight_code})
MD.add_render_rule('fence', render_fence)
MD.add_render_rule('code_inline', render_code_inline)

MD.block.ruler.before('fence', 'table', table_block)
MD.block.ruler.before('fence', 'info', template('info'))
MD.block.ruler.before('fence', 'warning', template('warning'))
MD.block.ruler.before('fence', 'tip', template('tip'))
MD.block.ruler.before('fence', 'attention', template('attention'))
MD.block.ruler.before('fence', 'danger', template('danger'))

# Article-status banners (`:::stub` / `:::wip` / `:::outdated`, `:::`-fenced
# like the callouts above) and the disambiguation hatnote (`::about …`, its
# own single-line syntax — see hatnote.py). Registration order doesn't
# matter: every opener names itself.
MD.block.ruler.before('fence', 'hatnote', hatnote)
MD.block.ruler.before('fence', 'details', details)
MD.block.ruler.before('fence', 'refs', ref_list)

for _banner in BANNERS:
    MD.block.ruler.before('fence', _banner, banner(_banner))

MD.add_render_rule('heading_open', render_heading_open)

MD.add_render_rule('table_open', dummy_rule('<table class="table">') )
MD.add_render_rule('table_close', dummy_rule('</table>'))

MD.add_render_rule('info_open', dummy_rule(f'<div class="info">{SVG["info"]}<div class="info-content">'))
MD.add_render_rule('info_close', dummy_rule('</div></div>'))

MD.add_render_rule('warning_open', dummy_rule(f'<div class="warning">{SVG["warning"]}<div class="warning-content">'))
MD.add_render_rule('warning_close', dummy_rule('</div></div>'))

MD.add_render_rule('tip_open', dummy_rule(f'<div class="tip">{SVG["tip"]}<div class="tip-content">'))
MD.add_render_rule('tip_close', dummy_rule('</div></div>'))

MD.add_render_rule('attention_open', dummy_rule(f'<div class="attention">{SVG["attention"]}<div class="attention-content">'))
MD.add_render_rule('attention_close', dummy_rule('</div></div>'))

MD.add_render_rule('danger_open', dummy_rule(f'<div class="danger">{SVG["danger"]}<div class="danger-content">'))
MD.add_render_rule('danger_close', dummy_rule('</div></div>'))

# One renderer for all three banners — the box differs only by icon, heading
# and tone, and banner.py reads each of those off the token.
for _banner in BANNERS:
    MD.add_render_rule(f'{_banner}_open', render_banner_open)
    MD.add_render_rule(f'{_banner}_close', render_banner_close)

MD.add_render_rule('hatnote_open', render_hatnote_open)
MD.add_render_rule('hatnote_close', render_hatnote_close)

# Collapsible section — not a callout: its opener line is a summary, not
# a first paragraph, so it needs render rules of its own.
MD.add_render_rule('details_open', render_details_open)
MD.add_render_rule('details_summary_open', render_details_summary_open)
MD.add_render_rule('details_summary_close', render_details_summary_close)
MD.add_render_rule('details_close', render_details_close)

# Manual footnotes: `текст^1` in prose, `1^: Источник` in the list.
MD.inline.ruler.before('text', 'ref_mark', ref_mark)
MD.add_render_rule('ref_mark', render_ref_mark)
MD.add_render_rule('refs_open', render_refs_open)
MD.add_render_rule('refs_close', render_refs_close)
MD.add_render_rule('ref_item_open', render_ref_item_open)
MD.add_render_rule('ref_item_close', render_ref_item_close)

def render_thanks(src):
    html = MD.render(src)
    html = re.sub(r'<h1[^>]*>.*?</h1>\n?', '', html, flags=re.DOTALL).strip()
    if html.startswith('<ul>'):
        html = '<ul class="thanks-list">' + html[4:]
    return html

def _plain_text(children):
    """Flatten a heading's inline children into plain text, dropping the
    markdown formatting markers themselves (bold/italic/code-span syntax)
    instead of leaving their `*`/`` ` `` characters in place. Used anywhere
    a heading is shown as plain text: <title>, the search index, tree/
    breadcrumb titles — none of which render HTML."""
    out = []
    for t in children or []:
        if t.type in ('text', 'code_inline'):
            out.append(t.content)
        elif t.type in ('softbreak', 'hardbreak'):
            out.append(' ')
        elif t.children:
            out.append(_plain_text(t.children))
    return ''.join(out)

def outline(src):
    """Structured headings for the search index: the doc title (h1) plus every
    h2/h3 with the same slug the renderer assigns, so anchors line up."""
    title = ''
    headings = []

    tokens = MD.parse(src)
    slugs = heading_slugs(tokens)

    for idx, token in enumerate(tokens):
        if token.type != 'heading_open':
            continue
        inline = tokens[idx + 1]
        text = _plain_text(inline.children)
        level = int(token.tag[1])
        if level == 1:
            title = text
        elif level in (2, 3):
            headings.append({
                'text': text,
                'slug': slugs[idx],
                'level': level,
            })

    return {'title': title, 'headings': headings}


def render(src):

    # Empty when the doc has no H1; the caller substitutes the filename so the
    # page never shows a placeholder. Most community docs open with an H2.
    title = ''

    nav = ''

    tokens = MD.parse(src)
    slugs = heading_slugs(tokens)

    for idx, token in enumerate(tokens):
        if token.type == 'heading_open':
            inline = tokens[idx + 1]
            if int(token.tag[1]) == 1:
                title = _plain_text(inline.children)
            else:
                # Rendered inline HTML (not raw source), so *emphasis* and
                # `code` in a heading show up formatted in the sidebar TOC
                # exactly as they do in the heading itself, not as literal
                # markdown syntax characters.
                heading_html = MD.renderer.renderInline(inline.children, MD.options, {})
                nav += f'<li class="{(token.tag)}"><a href="#{slugs[idx]}">{heading_html}</a></li>'

    return title, nav, MD.render(src)
