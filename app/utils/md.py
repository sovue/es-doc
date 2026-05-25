from markdown_it import MarkdownIt
from markdown_it.rules_block import StateBlock
import base64, re

MD = MarkdownIt()

def slugify(s, tokenmap):
    id = base64.b16encode(f'{tokenmap[0]}-{tokenmap[1]}'.encode())
    return re.sub(r"[^\wа-яёa-z]+", "-", f'{s.lower()}-{id.decode().lower()}').strip("-")

def render_heading_open(self, tokens, idx, options, env):
    inline = tokens[idx + 1]
    slug = slugify(inline.content, tokens[idx].map)
    tokens[idx].attrSet("id", slug)

    if int(tokens[idx].tag[1]) == 1:
        return (f'<{tokens[idx].tag}>')

    return (
        f'<{tokens[idx].tag} id="{slug}" class="heading">\n'
        f'<a href="#{slug}" title="Получить ссылку на заголовок &#34;{inline.content}&#34;..." class="anchor">#</a>'
    )

MD.add_render_rule('heading_open', render_heading_open)

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
                # TODO: ВЫПИСАТЬ ВОЛШЕБНЫЕ ЧИСЛА В ОТДЕЛЬНЫЕ СТИЛИ
                nav += f'<li style="padding-left:{(int(token.tag[1])-2)*24}px"><a href="#{slugify(tokens[idx + 1].content, tokens[idx].map)}">{tokens[idx + 1].content}</a></li>'

    return title, nav, MD.render(src)
