from urllib.parse import urlsplit

import yaml

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('home_notices')


def _text(value):
    return value.strip() if isinstance(value, str) else ''


def _safe_url(url):
    if not url or '\\' in url or any(ord(char) < 32 or ord(char) == 127 for char in url):
        return False
    if url.startswith('/'):
        return not url.startswith('//')
    try:
        parsed = urlsplit(url)
        return parsed.scheme in ('http', 'https') and bool(parsed.hostname)
    except ValueError:
        return False


def parse_home_notices():
    """Read the homepage board from the assets catalog, preserving YAML order."""
    path = CONFIG.docs_path.parent / 'home_notices.yaml'
    if not path.exists():
        CONFIG.home_notices = []
        logger.info('home_notices.yaml not found; the homepage board will be hidden.')
        return

    try:
        data = yaml.safe_load(path.read_text('utf-8'))
    except (OSError, yaml.YAMLError):
        logger.exception('Cannot read home_notices.yaml; keeping the previous board.')
        return

    if not isinstance(data, dict) or not isinstance(data.get('notices'), list):
        logger.error('home_notices.yaml must contain a `notices` list; keeping the previous board.')
        return

    notices = []
    for index, row in enumerate(data['notices'], start=1):
        if not isinstance(row, dict):
            logger.warning(f'home_notices.yaml: skipping notice {index}; expected a mapping.')
            continue
        title, url = _text(row.get('title')), _text(row.get('url'))
        if not title or not _safe_url(url):
            logger.warning(f'home_notices.yaml: skipping notice {index}; title and a safe URL are required.')
            continue
        notices.append({
            'title': title,
            'url': url,
            'description': _text(row.get('description')),
            'category': _text(row.get('category')),
        })

    CONFIG.home_notices = notices
    logger.info(f'Parsed {len(notices)} homepage notice(s) from home_notices.yaml.')
