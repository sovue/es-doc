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
    # An octagon, not another triangle: danger and warning necessarily share a
    # near-identical background wash (see vars.css), so the silhouette is what
    # tells them apart at a glance.
    'danger':    (_IMG / 'danger.svg').read_text('utf-8'),

    'stub':      (_IMG / 'attention.svg').read_text('utf-8'),
    'wip':       (_IMG / 'wip.svg').read_text('utf-8'),
    'outdated':  (_IMG / 'outdated.svg').read_text('utf-8'),
}
