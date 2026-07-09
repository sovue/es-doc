import yaml

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('news')

def _news_path():
    # news.yaml sits at the assets root, next to artists.yaml.
    return CONFIG.docs_path.parent / 'news.yaml'

def parse_news():
    """Load the news/content channel list from news.yaml into CONFIG. Missing
    or malformed entries are skipped, not fatal: a broken row must never take
    the whole page down."""

    path = _news_path()

    if not path.exists():
        CONFIG.news = []
        logger.info('news.yaml not found; the /news page will be empty.')
        return

    data = yaml.load(path.read_text('utf-8'), yaml.SafeLoader) or {}
    raw = data.get('resources') or []

    resources = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue

        name = (entry.get('name') or '').strip()
        url = (entry.get('url') or '').strip()
        if not name or not url:
            continue

        resources.append({
            'name': name,
            'url': url,
            'note': (entry.get('note') or '').strip() or None,
        })

    CONFIG.news = resources
    logger.info(f'Parsed {len(resources)} news resource(s) from news.yaml.')
