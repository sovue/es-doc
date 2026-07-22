from markdown_it import MarkdownIt
from markdown_it.common.utils import escapeHtml, unescapeAll
from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter
import re

from .slugs import slugify, render_heading_open
from .table import table_block
from .template import template
from ..svg import SVG
from ..renpy_lexer import RenPyLexer

dummy_rule = lambda s: lambda self, tokens, idx, options, env: s

def highlight_code(code, lang, attrs):
    try:
        lexer = RenPyLexer() if lang == 'renpy' else get_lexer_by_name(lang)
    except Exception:
        return ''

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

    return (
        '<div class="code-block">'
        f'{CODE_COPY_BUTTON}'
        f'<pre><code{lang_class}>{highlighted}</code></pre>'
        '</div>\n'
    )

MD = MarkdownIt('commonmark', {'highlight': highlight_code})
MD.add_render_rule('fence', render_fence)

MD.block.ruler.before('fence', 'table', table_block)
MD.block.ruler.before('fence', 'info', template('info'))
MD.block.ruler.before('fence', 'warning', template('warning'))
MD.block.ruler.before('fence', 'tip', template('tip'))

MD.add_render_rule('heading_open', render_heading_open)

MD.add_render_rule('table_open', dummy_rule('<table class="table">') )
MD.add_render_rule('table_close', dummy_rule('</table>'))

MD.add_render_rule('info_open', dummy_rule(f'<div class="info">{SVG["info"]}<div class="info-content">'))
MD.add_render_rule('info_close', dummy_rule('</div></div>'))

MD.add_render_rule('warning_open', dummy_rule(f'<div class="warning">{SVG["warning"]}<div class="warning-content">'))
MD.add_render_rule('warning_close', dummy_rule('</div></div>'))

MD.add_render_rule('tip_open', dummy_rule(f'<div class="tip">{SVG["tip"]}<div class="tip-content">'))
MD.add_render_rule('tip_close', dummy_rule('</div></div>'))

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
                'slug': slugify(inline.content, tokens[idx].map),
                'level': level,
            })

    return {'title': title, 'headings': headings}


def render(src):

    # Empty when the doc has no H1; the caller substitutes the filename so the
    # page never shows a placeholder. Most community docs open with an H2.
    title = ''

    nav = ''

    tokens = MD.parse(src)

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
                slug = slugify(inline.content, tokens[idx].map)
                nav += f'<li class="{(token.tag)}"><a href="#{slug}">{heading_html}</a></li>'

    return title, nav, MD.render(src)
