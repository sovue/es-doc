import re
from datetime import date

import yaml

from ..config import CONFIG
from ..logging import root_logger
from ..md import summary
from ..modified import format_ru_date, modified_map

logger = root_logger.getChild('lifespan').getChild('news')

# Taken by a route of its own under /news/ (routes/news.py), so a post with
# this file name could never be reached. Skipped, and said so, rather than
# listed with a link that opens something else.
RESERVED_SLUGS = ('sources',)

# `2026-09-11-anything.md`: the file name carries the publication date, so it
# survives a fresh clone (where every mtime is today) and sorts on disk the
# way the page lists it.
_DATED_RE = re.compile(r'^(\d{4})-(\d{2})-(\d{2})(?:-|$)')

def news_sources_path():
    # news.yaml sits at the assets root, next to artists.yaml. The name is
    # older than the split: it used to feed /news itself.
    return CONFIG.docs_path.parent / 'news.yaml'

def news_posts_path():
    # One markdown file per post, in <assets>/news/, beside docs/.
    return CONFIG.docs_path.parent / 'news'

def parse_news_sources():
    """Load the news/content channel list from news.yaml into CONFIG. Missing
    or malformed entries are skipped, not fatal: a broken row must never take
    the whole page down."""

    path = news_sources_path()

    if not path.exists():
        CONFIG.news_sources = []
        logger.info('news.yaml not found; the /news/sources page will be empty.')
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

    CONFIG.news_sources = resources
    logger.info(f'Parsed {len(resources)} news resource(s) from news.yaml.')

def _date_from_name(stem):
    match = _DATED_RE.match(stem)
    if not match:
        return None
    try:
        return date(*(int(part) for part in match.groups()))
    except ValueError:
        # 2026-13-45: shaped like a date, isn't one.
        return None

def parse_news_posts():
    """Index the project's own news posts (<assets>/news/*.md) into CONFIG,
    newest first: {slug, title, lead, date, date_iso, date_label}.

    Title is the post's h1 and the lead its first paragraph, both plain text —
    all the /news listing shows; the post itself is rendered per request, like
    a doc. The date comes from a `YYYY-MM-DD-` prefix on the file name, and
    failing that from git or the mtime (modified.py), so an undated post still
    lands somewhere sensible instead of nowhere. A file that can't be read is
    skipped: one broken post must not empty the page."""

    directory = news_posts_path()

    if not directory.is_dir():
        CONFIG.news = []
        logger.info('news/ not found; the /news page will be empty.')
        return

    # Only asked for if some post has no date in its name — it shells out to
    # git (see modified.py).
    modified = None

    posts = []
    for path in directory.glob('*.md'):
        if path.stem in RESERVED_SLUGS:
            logger.warning(f'news/{path.name} is shadowed by the /news/{path.stem} route; rename it.')
            continue

        try:
            title, lead = summary(path.read_text('utf-8'))
        except (OSError, UnicodeDecodeError):
            logger.exception(f'Reading news/{path.name} failed; skipping it.')
            continue

        published = _date_from_name(path.stem)

        if published is None:
            if modified is None:
                modified = modified_map(directory)
            moment = modified.get(path.name)
            published = moment.date() if moment else None

        posts.append({
            'slug': path.stem,
            'title': title or path.stem,
            'lead': lead or None,
            'date': published,
            'date_iso': published.isoformat() if published else None,
            'date_label': format_ru_date(published) if published else None,
        })

    # Newest first; the slug breaks ties between two posts on one day, and an
    # undated post (date.min) sinks to the bottom.
    posts.sort(key=lambda p: (p['date'] or date.min, p['slug']), reverse=True)

    CONFIG.news = posts
    logger.info(f'Parsed {len(posts)} news post(s) from news/.')
