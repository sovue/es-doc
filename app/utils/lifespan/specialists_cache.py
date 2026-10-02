import re
from urllib.parse import parse_qs, quote, urlsplit

import yaml

from ..config import CONFIG
from ..logging import root_logger
from ..specialists import CATEGORIES, WORK_LABELS, profile_order
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


def _source(value):
    """A web/site URL or a relative filename inside specialists/."""
    value = _text(value)
    if link := _link(value):
        return link
    try:
        parts = urlsplit(value)
    except ValueError:
        return ''
    if (not value or parts.scheme or parts.netloc or ':' in value
            or value.startswith('/') or '\\' in value or '..' in value.split('/')):
        return ''
    return value


def _source_url(source):
    return _link(source) or '/specialists/res/' + quote(source, safe='/')


def _rows(path, key):
    if not path.is_file():
        return []
    data = yaml.safe_load(path.read_text('utf-8'))
    rows = data.get(key) if isinstance(data, dict) else None
    if isinstance(rows, list):
        return rows  # Compatibility with the former combined-profile format.
    if isinstance(rows, dict):
        return [
            {**entry, 'categories': [category]}
            for category in CATEGORIES
            for entry in (rows[category] if isinstance(rows.get(category), list) else [])
            if isinstance(entry, dict)
        ]
    return []


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
        raw_works = entry.get('works')
        if not isinstance(raw_works, list):
            raw_works = []
        for category in categories:
            works = []
            tracks = 0
            for work in raw_works:
                if not isinstance(work, dict):
                    continue
                kind = work.get('type')
                if not isinstance(kind, str) or kind not in CATEGORIES[category]['types']:
                    continue
                source = _source(work.get('url')) or _source(work.get('file'))
                if not source:
                    continue
                if kind == 'track':
                    tracks += 1
                    if tracks > 2:
                        continue
                works.append({'type': kind, 'title': _text(work.get('title')) or WORK_LABELS[kind], 'source': source})
            people.append({
                'name': name, 'status': status, 'categories': [category],
                'category_label': CATEGORIES[category]['label'],
                'preview': _source(entry.get('preview')) or None,
                'description': _text(entry.get('description')) or None,
                'logo': _source(entry.get('logo')) or None,
                'links': links.copy(), 'works': works,
            })
    return sorted(people, key=lambda person: person['name'].casefold())


def parse_specialists():
    """Load all disciplines from the unified specialist directory."""
    people = _parse_rows(_rows(CONFIG.docs_path.parent / 'specialists.yaml', 'specialists'))
    for person, slug in zip(people, unique_slugs((p['name'] for p in people), fallback='specialist')):
        person['slug'] = slug
        for kind in ('logo', 'preview'):
            source = person[kind]
            person[f'{kind}_url'] = (
                source if source and source.startswith('/')
                else f'/resource/specialist/{kind}/{slug}' if source else None
            )
        person['preview_title'] = f'Превью — {person["name"]}' if person['preview'] else ''
        for index, work in enumerate(person['works']):
            work['url'] = (f'/resource/specialist/work/{slug}/{index}'
                           if work['type'] == 'art' and work['source'].startswith(('https://', 'http://'))
                           else _source_url(work['source']))
    CONFIG.specialists = sorted(people, key=profile_order)
    logger.info('Parsed %s specialist(s).', len(people))
