import base64, re

def slugify(s, tokenmap):
    return re.sub(r"[^\wа-яёa-z]+", "-", f'{s.lower()}-{tokenmap[0]+tokenmap[1]}').strip('-')

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