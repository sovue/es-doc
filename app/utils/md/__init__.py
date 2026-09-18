import re

from markdown_it import MarkdownIt
from markdown_it.common.utils import escapeHtml, unescapeAll
from pygments import highlight
from pygments.filter import Filter
from pygments.formatters import HtmlFormatter
from pygments.lexers import get_lexer_by_name
from pygments.lexers.special import TextLexer
from pygments.token import Comment, Whitespace

from ..renpy_lexer import RenPyLexer
from ..svg import SVG
from .banner import banner, render_banner_close, render_banner_open
from .details import (
    details,
    render_details_close,
    render_details_open,
    render_details_summary_close,
    render_details_summary_open,
)
from .hatnote import hatnote, render_hatnote_close, render_hatnote_open
from .lines import gutter, scroll_box, split_lines
from .refs import (
    ref_list,
    ref_mark,
    render_ref_item_close,
    render_ref_item_open,
    render_ref_mark,
    render_refs_close,
    render_refs_open,
)
from .slugs import heading_shift, heading_slugs, render_heading_open
from .table import table_block
from .template import template

dummy_rule = lambda s: lambda self, tokens, idx, options, env: s

# Docs convention: `<<Название лейбла>>` marks a value the reader must supply
# themselves — a channel name, a label, a file path. Not syntax in any language
# the corpus shows, which is why it lives here, in the layer that renders all
# of them, rather than in the Ren'Py lexer that used to own it.
#
# Only the inner pair survives into the page: the reader sees `<Название
# лейбла>`, the angle brackets the convention is written with. Doubling them in
# the source is what makes the marker unambiguous — a lone `<…>` is far too
# common in real code to claim, while `<<` and `>>` together only otherwise
# appear as shift operators, and those are ruled out below.
#
# Both inner edges must be non-space, which is what separates the marker from
# a genuine `a << b >> c`: a shift always has whitespace around its operands,
# this convention never does. Neither edge may be `>` either, and not only for
# symmetry — the docs wrap these in Ren'Py's own angle-bracket audio syntax
# (`"<from <<Начало>> to <<Конец>>>"`), where the marker's closing `>>` is
# followed immediately by the one that ends the `<from …>`. A trailing `\S`
# happily eats that third bracket, since `>` is not whitespace, and the label
# came out as `<Конец>>` with Ren'Py's own syntax swallowed into it.
PLACEHOLDER_RE = re.compile(r'<<([^\s>](?:[^>\n]*[^\s>])?)>>')


def _placeholder_text(match):
    """What the page shows for a marker: the label in single angle brackets."""
    return f'<{match.group(1)}>'

# Every space inside a code panel shows as a dot, the way Ren'Py's own script
# linter draws them: in a language where indentation *is* syntax, three spaces
# where four belong is worth being able to see.
#
# The dots are *painted*, not typed. This filter only tags each run of spaces
# as `Whitespace` so CSS has a `span.w` to hang a dotted background on
# (code.css); the characters inside it stay ordinary spaces. An earlier version
# swapped in a `∙` glyph instead, which meant every route off the page — the
# copy button, a hand-made selection, anything added later — had to remember to
# swap it back, and a screen reader read the bullets out loud. Painting keeps
# the DOM honest: what you copy, and what a screen reader hears, is the code.
_SPACES_RE = re.compile(r'( +)')

class TagWhitespace(Filter):
    """Re-tag every run of spaces as `Whitespace`, so CSS can mark it.

    A filter, not a pass over the highlighted HTML, because that is the only
    place the treatment can be uniform: lexers disagree wildly about whether
    whitespace is a token at all — Pygments' Python lexer leaves indentation
    untokenised entirely, the Ren'Py one tags some of its own — and a filter
    sees the token stream before any of that reaches the formatter. Whatever
    the lexer thought, spaces come out of here as spaces.

    Newlines never end up inside a tagged run: they fall on the other side of
    the split and keep their original token, so a dotted span is always one
    line tall and its background tiles cleanly.
    """

    def filter(self, lexer, stream):
        for ttype, value in stream:
            # `<Имя персонажа>` is one token the page treats as one thing:
            # code.js hangs "replace this" on it, and can only recognise it
            # while the whole marker is a single span. Splitting it around its
            # space left two half-markers with their brackets showing. The
            # label is prose to overwrite anyway — nobody counts its spaces —
            # so it keeps them.
            if ttype in Comment.Special or ' ' not in value:
                yield ttype, value
                continue

            # Only the spaces change hands; the text around them keeps its own
            # token, so a string or a comment loses nothing but its blanks.
            for part in _SPACES_RE.split(value):
                if not part:
                    continue
                if part[0] == ' ':
                    yield Whitespace, part
                else:
                    yield ttype, part

class TagPlaceholders(Filter):
    """Re-tag every `<<подставь сюда>>` as `Comment.Special`, in any language.

    A value the reader is meant to replace with their own, drawn with a dotted
    underline and a tooltip saying so (code.js). This is the only place that
    knows the convention, so a Python block, a shell one-liner and a Ren'Py
    script all get the same marker on the same terms.

    Matched against the block's whole text rather than token by token, which
    is the only way it works outside a string literal: a lexer that doesn't
    know the convention tokenises `notify(<<Ваше значение>>)` as shift, name,
    name, shift — several tokens, none of which holds the whole marker — so a
    per-token scan found only the ones that happened to sit inside a single
    string token. Joining first means the tokeniser's opinion stops mattering.

    A marker is emitted as one token even when the lexer split it across
    several, and the fragments it displaces are dropped: the page treats a
    placeholder as one thing and can only recognise it while it is one span.
    The text emitted is the reader-facing form, not the source form — see
    PLACEHOLDER_RE — so the doubled brackets never reach the page.
    """

    def filter(self, lexer, stream):
        tokens = list(stream)
        text = ''.join(value for _, value in tokens)

        if '<<' not in text:
            yield from tokens
            return

        marks = [(m.start(), m.end(), _placeholder_text(m))
                 for m in PLACEHOLDER_RE.finditer(text)]
        if not marks:
            yield from tokens
            return

        pending = iter(marks)
        mark = next(pending, None)
        pos = 0
        # Everything before this offset has already been emitted — how a marker
        # that swallowed several tokens keeps the rest of them from repeating it.
        done = 0

        for ttype, value in tokens:
            start, end = pos, pos + len(value)
            pos = end
            cursor = max(start, done)

            while mark is not None and mark[0] < end:
                if mark[0] > cursor:
                    yield ttype, text[cursor:mark[0]]
                    cursor = mark[0]
                if cursor <= mark[0]:
                    yield Comment.Special, mark[2]
                    done = mark[1]
                    cursor = max(cursor, done)
                mark = next(pending, None)

            if cursor < end:
                yield ttype, text[cursor:end]
                done = end


def highlight_code(code, lang, attrs):
    if lang == 'renpy':
        lexer = RenPyLexer()
    else:
        try:
            lexer = get_lexer_by_name(lang)
        except Exception:
            # No language on the fence, or one Pygments has never heard of.
            # A lexer that tags nothing, rather than no lexer at all: the two
            # treatments below aren't syntax highlighting and don't care what
            # language this is — a placeholder is a docs convention and a space
            # is a space. Bailing out here instead returned '' and sent the
            # block down render_fence's escapeHtml fallback, where `<<Ваше
            # значение>>` stayed doubled on the page, unmarked and uncopyable
            # as anything else, and the indentation lost its dots. An
            # unlabelled fence is the most common kind there is, so this was
            # the path most placeholders actually took.
            lexer = TextLexer()

    # A fresh lexer per call (every branch constructs one), so the filters are
    # never added twice to the same instance. Placeholders first: TagWhitespace
    # passes `Comment.Special` through whole, so a marker tagged here keeps its
    # spaces instead of being split around them.
    lexer.add_filter(TagPlaceholders())
    lexer.add_filter(TagWhitespace())

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


def _mark_placeholders(text):
    """Escape `text`, wrapping every `<<подставь сюда>>` in the `span.cs` a code
    panel gives the same marker.

    An inline span never reaches Pygments — it has no language to lex — so the
    filter above can't reach it, and `` `<<Ваше значение>>` `` in running prose
    read as ordinary code however carefully the fenced blocks around it were
    marked. The convention is about what the reader must replace, not about
    where it happens to be written, so the two now agree.
    """
    out = []
    last = 0

    for match in PLACEHOLDER_RE.finditer(text):
        out.append(escapeHtml(text[last:match.start()]))
        out.append(f'<span class="cs">{escapeHtml(_placeholder_text(match))}</span>')
        last = match.end()

    out.append(escapeHtml(text[last:]))
    return ''.join(out)


def render_code_inline(self, tokens, idx, options, env):
    content = tokens[idx].content

    # The regex above is the whole sanitiser: only `#` and hex digits ever
    # reach the style attribute.
    if COLOR_RE.match(content):
        return (
            f'<code class="code-color">'
            f'<span class="code-swatch" style="background: {content}" aria-hidden="true"></span>'
            f'{escapeHtml(content)}</code>'
        )

    return f'<code>{_mark_placeholders(content)}</code>'

# Article illustrations are screenshots of the game, several to a page and all
# of them below the fold — an article that opens with an image is rare enough
# that none of the corpus does. Deferring them costs nothing on arrival and
# saves a page like «Действия с изображениями» from fetching a dozen at once.
# The default renderer does the rest; this only adds the two attributes it has
# no opinion about.
def render_image(self, tokens, idx, options, env):
    token = tokens[idx]
    token.attrSet('loading', 'lazy')
    token.attrSet('decoding', 'async')
    return self.image(tokens, idx, options, env)

# A link that leaves the site opens in a new tab, and one that stays never
# does. Deciding it here rather than in the markup means no author has to
# remember: `[текст](https://renpy.org/doc)` and `[текст](/docs/screens)` are
# written exactly the same way and behave the way each should.
#
# Leaving is worth the new tab because these articles are reference material
# read *while* doing something else — following a link to the Ren'Py manual
# mid-example should not cost the reader the place they were holding in the
# example. Staying is worth *not* opening one, because a tab per internal
# link is how a reader ends up with eleven copies of the same site and no
# working Back button.
#
# `rel` is not optional decoration: `noopener` severs the `window.opener`
# handle the new page would otherwise get over this one, and `noreferrer`
# keeps the reader's exact page off a third party's referer log. A protocol
# -relative `//host/path` counts as leaving too — it is an absolute URL that
# merely inherits the scheme.
_EXTERNAL_RE = re.compile(r'^(?:[a-z][a-z0-9+.-]*:)?//', re.I)


def render_link_open(self, tokens, idx, options, env):
    token = tokens[idx]
    href = token.attrGet('href') or ''

    if _EXTERNAL_RE.match(href):
        token.attrSet('target', '_blank')
        token.attrSet('rel', 'noopener noreferrer')

    return self.renderToken(tokens, idx, options, env)

MD = MarkdownIt('commonmark', {'highlight': highlight_code})
MD.add_render_rule('fence', render_fence)
MD.add_render_rule('code_inline', render_code_inline)
MD.add_render_rule('image', render_image)
MD.add_render_rule('link_open', render_link_open)

MD.block.ruler.before('fence', 'table', table_block)
MD.block.ruler.before('fence', 'info', template('info'))
MD.block.ruler.before('fence', 'warning', template('warning'))
MD.block.ruler.before('fence', 'tip', template('tip'))
MD.block.ruler.before('fence', 'attention', template('attention'))
MD.block.ruler.before('fence', 'danger', template('danger'))

# Article-status banners (`:::{name}`, `:::`-fenced like the callouts above)
# are generated from config.yaml; the disambiguation hatnote (`::about …`, its
# own single-line syntax — see hatnote.py). Registration order doesn't
# matter: every opener names itself.
MD.block.ruler.before('fence', 'hatnote', hatnote)
MD.block.ruler.before('fence', 'details', details)
MD.block.ruler.before('fence', 'refs', ref_list)

MD.block.ruler.before('fence', 'banner', banner())

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

# One renderer for every configured banner — the box differs only by icon,
# heading and tone, and banner.py reads each of those off the token.
MD.add_render_rule('banner_open', render_banner_open)
MD.add_render_rule('banner_close', render_banner_close)

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

def _code_terms(tokens):
    """Every inline code span in the doc, deduped case-insensitively and
    filtered to short, identifier-like tokens — the words a modder actually
    types into search (`imagebutton`, `ATL`, `dissolve`), not a paragraph's
    worth of literal text or a whole fenced code block. Fenced blocks are
    deliberately excluded: their content is code to read, not a term to look
    up, and indexing every token inside one would bury real matches in noise.
    """
    seen = set()
    terms = []
    for token in tokens:
        if token.type != 'inline' or not token.children:
            continue
        for child in token.children:
            if child.type != 'code_inline':
                continue
            text = child.content.strip()
            if not (1 < len(text) <= 40) or '\n' in text or text.count(' ') > 3:
                continue
            key = text.lower()
            if key in seen:
                continue
            seen.add(key)
            terms.append(text)
    return terms


def outline(src):
    """Structured content for the search index: the doc title (h1), every
    h2/h3/h4 with the same slug the renderer assigns (so anchors line up), and
    every distinct inline code term the doc contains."""
    title = ''
    headings = []

    tokens = MD.parse(src)
    slugs = heading_slugs(tokens)
    # A uniform shift never changes a slug (see heading_shift's docstring),
    # so this only affects which levels count as indexable below — the same
    # promotion the renderer applies, kept in step so a heading that reads
    # as an h2 on the page is also indexed as one.
    shift = heading_shift(tokens)

    for idx, token in enumerate(tokens):
        if token.type != 'heading_open':
            continue
        inline = tokens[idx + 1]
        text = _plain_text(inline.children)
        raw_level = int(token.tag[1])
        level = raw_level if raw_level == 1 else raw_level - shift
        if level == 1:
            title = text
        elif level in (2, 3, 4):
            headings.append({
                'text': text,
                'slug': slugs[idx],
                'level': level,
            })

    return {'title': title, 'headings': headings, 'code_terms': _code_terms(tokens)}


def summary(src):
    """`(title, lead)` of a document as plain text: its h1 and its first
    top-level paragraph. For a listing that shows a piece by its opening
    rather than rendering all of it — the /news index. A paragraph inside a
    callout or a list is skipped (level > 0): it is an aside, not the lead."""
    title = ''
    lead = ''

    tokens = MD.parse(src)

    for idx, token in enumerate(tokens):
        if token.type == 'heading_open' and token.tag == 'h1' and not title:
            title = _plain_text(tokens[idx + 1].children)
        elif token.type == 'paragraph_open' and token.level == 0 and not lead:
            lead = _plain_text(tokens[idx + 1].children).strip()

        if title and lead:
            break

    return title, lead


def render(src):

    # Empty when the doc has no H1; the caller substitutes the filename so the
    # page never shows a placeholder. Most community docs open with an H2.
    title = ''

    nav = ''

    tokens = MD.parse(src)
    slugs = heading_slugs(tokens)
    # Independent of the shift MD.render(src) below applies to its own,
    # separately-parsed tokens — same source, so the same result — kept in
    # step so the sidebar TOC's indent class matches the tag actually
    # rendered on the page.
    shift = heading_shift(tokens)

    for idx, token in enumerate(tokens):
        if token.type == 'heading_open':
            inline = tokens[idx + 1]
            raw_level = int(token.tag[1])
            if raw_level == 1:
                title = _plain_text(inline.children)
            else:
                # Rendered inline HTML (not raw source), so *emphasis* and
                # `code` in a heading show up formatted in the sidebar TOC
                # exactly as they do in the heading itself, not as literal
                # markdown syntax characters.
                heading_html = MD.renderer.renderInline(inline.children, MD.options, {})
                nav += f'<li class="h{raw_level - shift}"><a href="#{slugs[idx]}">{heading_html}</a></li>'

    return title, nav, MD.render(src)
