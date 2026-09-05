import re

def slugify(text):
    """One heading's own piece of a slug. Joined with `/` into the full
    hierarchical slug by heading_slugs() below, so this must never emit a
    slash of its own — every non-word run collapses to a hyphen."""
    return re.sub(r"[^\wа-яёa-z]+", "-", text.lower()).strip('-')

def heading_slugs(tokens):
    """Map every heading_open token's index to its hierarchical slug.

    A heading is addressed by the path of headings containing it, outermost
    first: an h2 is `{h2}`, an h3 under it `{h2}/{h3}`, an h4 under that
    `{h2}/{h3}/{h4}`. Levels that never appear are simply absent from the
    path, so an h3 written with no h2 above it still gets a slug.

    This replaces a flat `{текст}-{строка}` scheme whose uniqueness came from
    the heading's line numbers — which meant every anchor on a page changed
    the moment anyone inserted a paragraph above it. A path is stable under
    edits elsewhere in the document and says where the heading sits.

    Uniqueness is still guaranteed: two headings that produce the same path
    («Плюсы» twice under one h3, say) get `-2`, `-3` appended in document
    order. The whole outline is needed to slug any one heading, so this is
    computed once per pass and handed around rather than recomputed per
    heading."""
    slugs, path, seen = {}, {}, {}

    for idx, token in enumerate(tokens):
        if token.type != 'heading_open':
            continue

        level = int(token.tag[1])

        # h1 is the document title: it carries no anchor of its own (see
        # render_heading_open) and opens a fresh path for what follows.
        if level < 2:
            path.clear()
            continue

        # A heading closes every deeper level that came before it.
        for deeper in [lvl for lvl in path if lvl >= level]:
            del path[deeper]

        # An empty piece would leave a `//` hole in the path — only reachable
        # from a heading that is entirely punctuation, but cheap to rule out.
        path[level] = slugify(tokens[idx + 1].content) or f'h{level}'

        slug = '/'.join(path[lvl] for lvl in sorted(path))

        count = seen.get(slug, 0) + 1
        seen[slug] = count

        slugs[idx] = slug if count == 1 else f'{slug}-{count}'

    return slugs

def heading_shift(tokens):
    """How far every heading below h1 should be promoted, if the outline
    skips a level — a document whose headings open at h3 with nothing at h2,
    say. Left alone, that reaches a screen reader's heading list as a literal
    level jump (h1 straight to h3), where a sighted reader just sees "the
    first subsection". Promoting brings the shallowest real heading up to h2
    and carries everything under it the same distance, so the structure
    navigated by level matches the one a reader perceives. A document that
    already starts at h2 — most of them — shifts by zero.

    A uniform shift never changes a slug: heading_slugs() only orders
    headings by *relative* nesting (`sorted(path)`), and adding the same
    constant to every level preserves that order exactly. So this only has
    to run before a level is used for output (the tag name, the TOC's
    indent class), never before slugs are computed."""
    levels = [int(t.tag[1]) for t in tokens if t.type == 'heading_open' and t.tag != 'h1']
    return max(0, min(levels) - 2) if levels else 0


def _promote_headings(tokens):
    """Apply heading_shift() directly to the token stream, once per render
    pass: both the opening and closing tag of every non-h1 heading, so the
    default close-tag renderer (which reads token.tag fresh, independent of
    this rule) emits a matching pair."""
    shift = heading_shift(tokens)
    if shift:
        for token in tokens:
            if token.type in ('heading_open', 'heading_close') and token.tag != 'h1':
                token.tag = f'h{int(token.tag[1]) - shift}'
    return shift


def render_heading_open(self, tokens, idx, options, env):
    # Runs once per document: markdown-it hands every render rule the same
    # `env` dict for one pass, so the first heading in the doc does the
    # promotion for all of them and the rest see it already applied.
    if not env.get('headings_promoted'):
        _promote_headings(tokens)
        env['headings_promoted'] = True

    token = tokens[idx]
    inline = tokens[idx + 1]

    if int(token.tag[1]) == 1:
        return f'<{token.tag}>'

    # Cached on env, which markdown-it hands to every render rule in one
    # pass: each heading needs the whole outline to know its own path, and
    # rebuilding that per heading would be quadratic on a long page.
    slug = env.setdefault('heading_slugs', heading_slugs(tokens))[idx]

    return (
        f'<{token.tag} id="{slug}" class="heading">\n'
        # `aria-hidden` + `tabindex="-1"`: this glyph sits *inside* the
        # heading element, so without them a screen reader announces the
        # heading itself as "#Заголовок" — the anchor's own text became part
        # of the heading's name. Mouse users still see and click it exactly
        # as before; a keyboard user reaches the same permalink through the
        # heading's own id, the way "copy link to heading" works everywhere
        # else it's implemented this way (GitHub, MDN).
        f'<a href="#{slug}" title="Получить ссылку на заголовок &#34;{inline.content}&#34;..." '
        f'class="anchor" aria-hidden="true" tabindex="-1">#</a>'
    )
