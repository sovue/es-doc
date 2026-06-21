from markdown_it import MarkdownIt
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

MD = MarkdownIt('commonmark', {'highlight': highlight_code})

MD.block.ruler.before('fence', 'table', table_block)
MD.block.ruler.before('fence', 'warning', template('warning'))

MD.add_render_rule('heading_open', render_heading_open)

MD.add_render_rule('table_open', dummy_rule('<table class="table">') )
MD.add_render_rule('table_close', dummy_rule('</table>'))

MD.add_render_rule('warning_open', dummy_rule(f'<div class="warning">{SVG["warning"]}<div class="warning-content">'))
MD.add_render_rule('warning_close', dummy_rule('</div></div>'))

def render_thanks(src):
    html = MD.render(src)
    html = re.sub(r'<h1[^>]*>.*?</h1>\n?', '', html, flags=re.DOTALL).strip()
    if html.startswith('<ul>'):
        html = '<ul class="thanks-list">' + html[4:]
    return html

def outline(src):
    """Structured headings for the search index: the doc title (h1) plus every
    h2/h3 with the same slug the renderer assigns, so anchors line up."""
    title = ''
    headings = []

    tokens = MD.parse(src)

    for idx, token in enumerate(tokens):
        if token.type != 'heading_open':
            continue
        text = tokens[idx + 1].content
        level = int(token.tag[1])
        if level == 1:
            title = text
        elif level in (2, 3):
            headings.append({
                'text': re.sub(r'[`]', '', text),
                'slug': slugify(text, tokens[idx].map),
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
            if int(token.tag[1]) == 1:
                title = tokens[idx + 1].content
            else:
                nav += f'<li class="{(token.tag)}"><a href="#{slugify(tokens[idx + 1].content, tokens[idx].map)}">{re.sub(r'[`]', '', tokens[idx + 1].content)}</a></li>'

    return title, nav, MD.render(src)
