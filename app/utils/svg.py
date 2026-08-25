from .file import ROOT

_IMG = ROOT / 'static' / 'img'

# Callout icons (`:::info`, `:::warning`, …) and the stub-banner icons, inlined
# into the rendered HTML so they inherit `currentColor` from the box they sit in
# and cost no extra request. Keys match the markdown block names in md/.
SVG = {
    'info':      (_IMG / 'info.svg').read_text('utf-8'),
    'warning':   (_IMG / 'warning.svg').read_text('utf-8'),
    'tip':       (_IMG / 'tip.svg').read_text('utf-8'),
    'attention': (_IMG / 'attention.svg').read_text('utf-8'),

    'stub':      (_IMG / 'attention.svg').read_text('utf-8'),
    'wip':       (_IMG / 'wip.svg').read_text('utf-8'),
    'outdated':  (_IMG / 'outdated.svg').read_text('utf-8'),
}
