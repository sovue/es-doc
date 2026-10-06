from .icons import lucide_icon

# Stable Markdown/config names mapped to our shared Lucide icon catalog.
SVG = {
    key: str(lucide_icon(name, 24, 'icon'))
    for key, name in {
        'info': 'info', 'warning': 'triangle-alert', 'tip': 'lightbulb',
        'attention': 'circle-alert', 'danger': 'octagon-alert',
        'wip': 'construction', 'outdated': 'clock',
    }.items()
}
