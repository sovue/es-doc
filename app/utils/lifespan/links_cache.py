import yaml

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('links')

def _links_path():
    # links.yaml sits at the assets root, next to news.yaml.
    return CONFIG.docs_path.parent / 'links.yaml'

def parse_links():
    """Load the community-resources link list from links.yaml into CONFIG.
    Same row shape as news.yaml (name / url / note), because it's the same
    kind of list and an author should only have to learn it once. Missing or
    malformed entries are skipped, not fatal: a broken row must never take the
    whole page down."""

    path = _links_path()

    if not path.exists():
        CONFIG.links = []
        logger.info('links.yaml not found; the community links section will be hidden.')
        return

    data = yaml.load(path.read_text('utf-8'), yaml.SafeLoader) or {}
    raw = data.get('links') or []

    links = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue

        name = (entry.get('name') or '').strip()
        url = (entry.get('url') or '').strip()
        if not name or not url:
            continue

        links.append({
            'name': name,
            'url': url,
            'note': (entry.get('note') or '').strip() or None,
        })

    CONFIG.links = links
    logger.info(f'Parsed {len(links)} community link(s) from links.yaml.')
