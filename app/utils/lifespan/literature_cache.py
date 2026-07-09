import yaml

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('literature')

def _literature_path():
    # literature.yaml sits at the assets root, next to artists.yaml.
    return CONFIG.docs_path.parent / 'literature.yaml'

def parse_literature():
    """Load the reading list from literature.yaml into CONFIG. Missing or
    malformed entries are skipped, not fatal: a broken row must never take the
    whole page down. An item's `url` is optional — without one it renders as
    plain text."""

    path = _literature_path()

    if not path.exists():
        CONFIG.literature = []
        logger.info('literature.yaml not found; the /literature page will be empty.')
        return

    data = yaml.load(path.read_text('utf-8'), yaml.SafeLoader) or {}
    raw = data.get('categories') or []

    categories = []
    item_count = 0
    for entry in raw:
        if not isinstance(entry, dict):
            continue

        name = (entry.get('name') or '').strip()
        if not name:
            continue

        items = []
        for raw_item in entry.get('items') or []:
            if not isinstance(raw_item, dict):
                continue
            title = (raw_item.get('title') or '').strip()
            if not title:
                continue
            items.append({
                'title': title,
                'url': (raw_item.get('url') or '').strip() or None,
            })

        if not items:
            continue

        item_count += len(items)
        categories.append({'name': name, 'items': items})

    CONFIG.literature = categories
    logger.info(f'Parsed {len(categories)} categor(y/ies), {item_count} item(s) from literature.yaml.')
