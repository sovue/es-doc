"""Render the locally vendored Lucide set for templates and Markdown."""
import json
from pathlib import Path

from markupsafe import Markup, escape

_DIR = Path(__file__).resolve().parents[2] / 'static' / 'icons'
_MANIFEST = json.loads((_DIR / 'manifest.json').read_text('utf-8'))
ICON_NAMES = frozenset(_MANIFEST['icons'])
_BODIES = {
    name: (_DIR / f'{name}.svg').read_text('utf-8').split('>', 1)[1].rsplit('</svg>', 1)[0].strip()
    for name in _MANIFEST['icons']
}


def lucide_icon(name: str, size: int = 18, class_name: str = '') -> Markup:
    """Decorative icon; the containing control supplies its accessible label."""
    body = _BODIES[name]
    if type(size) is not int or not 1 <= size <= 128:
        raise ValueError('Icon size must be an integer from 1 to 128')
    classes = escape(f'lucide lucide-{name}' + (f' {class_name}' if class_name else ''))
    return Markup(
        f'<svg xmlns="http://www.w3.org/2000/svg" class="{classes}" width="{size}" height="{size}" '
        'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
        f'{body}</svg>'
    )
