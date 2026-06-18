from markdown_it import MarkdownIt
import base64, re

from .slugs import slugify, render_heading_open
from .table import table_block

dummy_rule = lambda s: lambda self, tokens, idx, options, env: s

MD = MarkdownIt()

MD.block.ruler.before(
    "fence",
    "table",
    table_block
)

MD.add_render_rule('heading_open', render_heading_open)
MD.add_render_rule('table_open', dummy_rule('<table class="table">') )
MD.add_render_rule('table_close', dummy_rule('</table>'))

def render_thanks(src):
    html = MD.render(src)
    html = re.sub(r'<h1[^>]*>.*?</h1>\n?', '', html, flags=re.DOTALL).strip()
    if html.startswith('<ul>'):
        html = '<ul class="thanks-list">' + html[4:]
    return html

def render(src):

    title = 'err'

    nav = ''

    tokens = MD.parse(src)

    for idx, token in enumerate(tokens):
        if token.type == 'heading_open':
            if int(token.tag[1]) == 1:
                title = tokens[idx + 1].content
            else:
                nav += f'<li class="{(token.tag)}"><a href="#{slugify(tokens[idx + 1].content, tokens[idx].map)}">{re.sub(r'[`]', '', tokens[idx + 1].content)}</a></li>'

    return title, nav, MD.render(src)
