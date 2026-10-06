from ..icons import lucide_icon
import re
from urllib.parse import unquote, urlparse

from markdown_it.common.utils import escapeHtml, unescapeAll
from markdown_it.rules_block import StateBlock


# One-line audio embed, following the double-colon doc tags such as ::about:
#
#   ::audio /resource/audio/theme.ogg | Тема лагеря
#
OPEN_RE = re.compile(r'^::audio[ \t]+(<[^<>\s]+>|[^\s|]+)(?:[ \t]*\|[ \t]*(.*))?$')


def audio(state: StateBlock, startLine: int, endLine: int, silent: bool):
    pos = state.bMarks[startLine] + state.tShift[startLine]
    text = state.src[pos:state.eMarks[startLine]]
    match = OPEN_RE.match(text)
    if not match:
        return False

    if silent:
        return True

    src = match.group(1)
    if src.startswith('<') and src.endswith('>'):
        src = src[1:-1]
    src = unescapeAll(src)
    try:
        parsed = urlparse(src)
    except ValueError:
        return False
    if parsed.scheme and parsed.scheme.lower() not in ('http', 'https'):
        return False
    name = (match.group(2) or '').strip()
    if not name:
        name = unquote(parsed.path.rstrip('/').rsplit('/', 1)[-1]) or 'Аудио'

    token = state.push('audio', 'div', 0)
    token.meta = {'src': src, 'name': name}
    token.map = [startLine, startLine + 1]
    state.line = startLine + 1
    return True


def render_audio(self, tokens, idx, options, env):
    src = escapeHtml(tokens[idx].meta['src'])
    name = escapeHtml(tokens[idx].meta['name'])
    label = escapeHtml('Включить аудио: ' + tokens[idx].meta['name'])
    return (
        '<div class="doc-audio">'
        f'<button type="button" class="doc-audio-play" data-play-src="{src}" '
        f'data-play-name="{name}" data-play-label="{label}" aria-label="{label}" '
        'aria-pressed="false" hidden>'
        f'{lucide_icon("play", 16, "doc-audio-icon-play")}'
        f'{lucide_icon("pause", 16, "doc-audio-icon-pause")}'
        '</button>'
        f'<span class="doc-audio-name">{name}</span>'
        f'<audio data-player-fallback src="{src}" preload="none" controls></audio>'
        '</div>\n'
    )
