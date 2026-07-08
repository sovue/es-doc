import yaml

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('artists')

VALID_STATUS = ('open', 'closed', 'unknown')

def _artists_path():
    # artists.yaml sits at the assets root, next to descriptions.yaml
    # (docs_path is <assets>/docs).
    return CONFIG.docs_path.parent / 'artists.yaml'

def parse_artists():
    """Load the commission-artist directory from artists.yaml into CONFIG.
    Missing or malformed entries are skipped, not fatal: a broken row must
    never take the whole page down."""

    path = _artists_path()

    if not path.exists():
        CONFIG.artists = []
        logger.info('artists.yaml not found; the artist directory will be empty.')
        return

    data = yaml.load(path.read_text('utf-8'), yaml.SafeLoader) or {}
    raw = data.get('artists') or []

    artists = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue

        name = (entry.get('name') or '').strip()
        if not name:
            continue

        status = entry.get('status') or 'unknown'
        if status not in VALID_STATUS:
            status = 'unknown'

        # Keep only non-empty string links; a stray null/number is dropped
        # rather than rendered as a broken href.
        raw_links = entry.get('links') or {}
        links = {
            str(k): v.strip()
            for k, v in raw_links.items()
            if isinstance(v, str) and v.strip()
        }

        artists.append({
            'name': name,
            'status': status,
            'preview': (entry.get('preview') or '').strip() or None,
            'logo': (entry.get('logo') or '').strip() or None,
            'links': links,
        })

    # Alphabetical by default; the page's sort control reorders client-side.
    artists.sort(key=lambda a: a['name'].casefold())

    CONFIG.artists = artists
    logger.info(f'Parsed {len(artists)} artist(s) from artists.yaml.')
