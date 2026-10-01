import re
from urllib.parse import parse_qs, urlsplit

import yaml

from ..config import CONFIG
from ..logging import root_logger
from ..specialists import CATEGORIES, WORK_LABELS
from ..translit import unique_slugs

logger = root_logger.getChild('lifespan').getChild('specialists')

VALID_STATUS = ('open', 'closed', 'unknown')

def _text(value):
    return value.strip() if isinstance(value, str) else ''


def _link(value):
    value = _text(value)
    try:
        parts = urlsplit(value)
    except ValueError:
        return ''
    if parts.scheme in ('http', 'https') and parts.netloc:
        return value
    if value.startswith('/') and not value.startswith('//') and '\\' not in value:
        return value
    return ''


def _contact_link(key, value):
    link = _link(value)
    if link or str(key).casefold() not in ('tg', 'telegram'):
        return link
    value = _text(value)
    username = value.removeprefix('@') if value.startswith('@') else ''
    if not username:
        try:
            parts = urlsplit(value)
        except ValueError:
            return ''
        if parts.scheme != 'tg' or parts.netloc not in ('user', 'resolve') or parts.path not in ('', '/'):
            return ''
        params = parse_qs(parts.query)
        target = params.get('id' if parts.netloc == 'user' else 'domain', [])
        if len(target) != 1:
            return ''
        username = target[0].removeprefix('@')
        if parts.netloc == 'user' and re.fullmatch(r'[1-9][0-9]*', username):
            return value
        if parts.netloc == 'resolve' and re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,31}', username):
            return value
    if re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,31}', username):
        return f'https://t.me/{username}'
    return ''


def _rows(path, key):
    if not path.is_file():
        return []
    data = yaml.safe_load(path.read_text('utf-8'))
    rows = data.get(key) if isinstance(data, dict) else None
    return rows if isinstance(rows, list) else []


def _parse_rows(rows):
    people = []
    for entry in rows:
        if not isinstance(entry, dict):
            continue
        name = _text(entry.get('name'))
        if not name:
            continue
        categories = entry.get('categories', [])
        if isinstance(categories, str):
            categories = [categories]
        if not isinstance(categories, list):
            continue
        categories = [key for key in CATEGORIES if key in categories]
        if not categories:
            continue
        status = entry.get('status') or 'unknown'
        if status not in VALID_STATUS:
            status = 'unknown'
        raw_links = entry.get('links') or {}
        if not isinstance(raw_links, dict):
            raw_links = {}
        links = {
            str(k): link
            for k, v in raw_links.items()
            if (link := _contact_link(k, v))
        }
        preview = _text(entry.get('preview')) or None
        works = []
        raw_works = entry.get('works')
        if not isinstance(raw_works, list):
            raw_works = []
        allowed = {kind for key in categories for kind in CATEGORIES[key]['types']}
        tracks = 0
        for work in raw_works:
            if not isinstance(work, dict):
                continue
            kind = work.get('type')
            if not isinstance(kind, str) or kind not in allowed:
                continue
            source = _link(work.get('url')) or _text(work.get('file'))
            if not source or (kind not in ('art', 'track') and not _link(source)):
                continue
            if kind == 'track':
                tracks += 1
                if tracks > 2:
                    continue
            works.append({'type': kind, 'title': _text(work.get('title')) or WORK_LABELS[kind], 'source': source})
        # Existing previews are already supplied examples of artwork.
        if preview and 'art' in allowed and not any(w['type'] == 'art' for w in works):
            works.insert(0, {'type': 'art', 'title': 'Пример арта', 'source': preview})
        people.append({
            'name': name, 'status': status, 'categories': categories,
            'preview': preview, 'logo': _text(entry.get('logo')) or None,
            'links': links, 'works': works,
        })
    return sorted(people, key=lambda person: person['name'].casefold())


def parse_specialists():
    """Load all disciplines from the unified specialist directory."""
    people = _parse_rows(_rows(CONFIG.docs_path.parent / 'specialists.yaml', 'specialists'))
    for person, slug in zip(people, unique_slugs((p['name'] for p in people), fallback='specialist')):
        person['slug'] = slug
        person['logo_url'] = f'/resource/specialist/logo/{slug}' if person['logo'] else None
        for index, work in enumerate(person['works']):
            work['url'] = (f'/resource/specialist/work/{slug}/{index}'
                           if work['type'] == 'art' or (work['type'] == 'track' and not _link(work['source']))
                           else work['source'])
        art = next((w for w in person['works'] if w['type'] == 'art'), None)
        person['preview_url'] = art['url'] if art else None
        person['preview_title'] = art['title'] if art else ''
    CONFIG.specialists = people
    logger.info('Parsed %s specialist(s).', len(people))
