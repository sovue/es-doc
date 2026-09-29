from urllib.parse import urlparse

import yaml

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('news-resources')


def _is_web_url(value):
    if not isinstance(value, str) or not value.strip():
        return False
    parsed = urlparse(value.strip())
    return parsed.scheme in ('http', 'https') and bool(parsed.netloc)


def parse_news_resources():
    """Load the curated promotion directory from news_resources.yaml."""
    path = CONFIG.docs_path.parent / 'news_resources.yaml'
    if not path.exists():
        CONFIG.news_resources = []
        logger.info('news_resources.yaml not found; the directory will be empty.')
        return

    data = yaml.load(path.read_text('utf-8'), yaml.SafeLoader) or {}
    raw = data.get('resources') or []
    resources = []

    for entry in raw:
        if not isinstance(entry, dict):
            continue

        name = entry.get('name')
        platform = entry.get('platform')
        description = entry.get('description')
        url = entry.get('url')
        if not all(isinstance(value, str) and value.strip()
                   for value in (name, platform, description)) or not _is_web_url(url):
            continue

        action = entry.get('action')
        if not isinstance(action, str) or not action.strip():
            action = 'Открыть ресурс'

        resources.append({
            'name': name.strip(),
            'platform': platform.strip(),
            'description': description.strip(),
            'url': url.strip(),
            'action': action.strip(),
        })

    CONFIG.news_resources = resources
    logger.info(f'Parsed {len(resources)} promotion resource(s) from news_resources.yaml.')
