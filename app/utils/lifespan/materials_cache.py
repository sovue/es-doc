from urllib.parse import quote, urlsplit

import yaml

from ..config import CONFIG
from ..logging import root_logger
from ..materials import material_file

logger = root_logger.getChild('lifespan').getChild('materials')

def _materials_path():
    # materials.yaml sits at the assets root, next to specialists.yaml.
    return CONFIG.docs_path.parent / 'materials.yaml'


def _text(value):
    return value.strip() if isinstance(value, str) else ''


def _list(value):
    return value if isinstance(value, list) else []


def _reading_url(value):
    value = _text(value)
    try:
        parts = urlsplit(value)
        if parts.scheme in ('http', 'https') and parts.netloc:
            return value
    except ValueError:
        pass
    return None


def _files(value):
    files = []
    seen = set()
    for entry in _list(value):
        relative = _text(entry.get('path')) if isinstance(entry, dict) else _text(entry)
        path = material_file(relative)
        if not path or relative in seen:
            continue
        seen.add(relative)
        label = _text(entry.get('label')) if isinstance(entry, dict) else ''
        files.append({
            'path': relative,
            'url': '/materials/download/' + quote(relative, safe='/'),
            'label': label or path.suffix.lstrip('.').upper() or path.name,
            'filename': path.name,
        })
    return files

def parse_materials():
    """Load the curated materials from materials.yaml into CONFIG. Missing or
    malformed entries are skipped. Sections can contain nested sections.
    Items can have a reading URL, local attachments, both, or neither."""

    path = _materials_path()

    if not path.exists():
        CONFIG.materials = []
        logger.info('materials.yaml not found; the /materials page will be empty.')
        return

    data = yaml.load(path.read_text('utf-8'), yaml.SafeLoader) or {}
    raw = _list(data.get('categories')) if isinstance(data, dict) else []

    item_count = 0

    def parse_section(entry):
        nonlocal item_count
        if not isinstance(entry, dict):
            return None

        name = _text(entry.get('name'))
        if not name:
            return None

        items = []
        for raw_item in _list(entry.get('items')):
            if not isinstance(raw_item, dict):
                continue
            title = _text(raw_item.get('title'))
            if not title:
                continue
            items.append({
                'title': title,
                'url': _reading_url(raw_item.get('url')),
                'url_label': _text(raw_item.get('url_label')) or None,
                'access': _text(raw_item.get('access')) or None,
                'description': _text(raw_item.get('description')) or None,
                'files': _files(raw_item.get('files')),
            })

        sections = []
        for raw_section in _list(entry.get('sections')):
            section = parse_section(raw_section)
            if section:
                sections.append(section)

        item_count += len(items)
        if not items and not sections:
            return None
        return {'name': name, 'items': items, 'sections': sections}

    categories = []
    for entry in raw:
        section = parse_section(entry)
        if section:
            categories.append(section)

    CONFIG.materials = categories
    logger.info(f'Parsed {len(categories)} categor(y/ies), {item_count} item(s) from materials.yaml.')
