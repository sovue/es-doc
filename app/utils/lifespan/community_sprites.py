"""Local, layered community sprites declared in the assets catalogue."""

import hashlib
import json
import re
from pathlib import PureWindowsPath
from urllib.parse import unquote, urlsplit

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('community-sprites')
DISTANCES = ('normal', 'close', 'far')
IMAGE_EXTS = {'.png', '.webp', '.jpg', '.jpeg'}


def layer_path(value):
    """Resolve a declared image within game/ or community/, never arbitrary files."""
    if not isinstance(value, str) or not value.strip():
        raise ValueError('A layer must be a non-empty local image path')
    value = value.strip()
    root = CONFIG.res_path.parent / 'community'
    for prefix, directory in (
        ('/resource/raw/', CONFIG.res_path),
        ('/resource/community/', root),
    ):
        if value.startswith(prefix):
            root, value = directory, unquote(value[len(prefix):])
            break
    if ('\\' in value or '\x00' in value or ':' in value
            or value.startswith('/') or '..' in value.split('/')
            or PureWindowsPath(value).drive):
        raise ValueError('Layer paths must stay inside game/ or community/')
    path = (root / value).resolve()
    if not path.is_relative_to(root.resolve()) or path.suffix.lower() not in IMAGE_EXTS:
        raise ValueError('Layer must be an image inside game/ or community/')
    if not path.is_file():
        raise ValueError(f'Layer does not exist: {value}')
    return path


def _text(value):
    return value.strip() if isinstance(value, str) else ''


def _layer_reference(path):
    for folder, root in (('game', CONFIG.res_path),
                         ('community', CONFIG.res_path.parent / 'community')):
        if path.is_relative_to(root.resolve()):
            return folder + '/' + path.relative_to(root.resolve()).as_posix()
    raise ValueError('Layer is outside the resource directories')


def _author(value):
    value = value if isinstance(value, dict) else {}
    link = _text(value.get('link'))
    try:
        parsed = urlsplit(link)
        safe = (parsed.scheme in ('http', 'https') and parsed.netloc
                and not any(c.isspace() or ord(c) < 32 for c in link))
    except ValueError:
        safe = False
    if not safe:
        link = ''
    return {'name': _text(value.get('name')), 'link': link}


def parse_community_sprites():
    """Return flat families plus their layer map; malformed JSON keeps the last catalogue."""
    manifest = CONFIG.res_path.parent / 'community-sprites.json'
    if not manifest.exists():
        return [], {}
    try:
        data = json.loads(manifest.read_text('utf-8-sig'))
        if not isinstance(data, dict) or not isinstance(data.get('groups'), dict):
            raise TypeError('The catalogue must contain a groups object')
    except (OSError, ValueError, TypeError):
        logger.exception('Invalid community-sprites.json; keeping the previous catalogue.')
        previous = CONFIG.resources.get('community', {}).get('sprites', [])
        return [i for i in previous if i.get('sprite_group')], CONFIG.community_sprite_layers

    families, layer_map = [], {}
    for title, group in data['groups'].items():
        if (not _text(title) or not isinstance(group, dict)
                or not isinstance(group.get('variations'), list)):
            logger.warning('Invalid sprite group %r; skipping it.', title)
            continue
        title = title.strip()
        group_meta = {
            'title': title, 'desc': _text(group.get('description')),
            'author': _author(group.get('author')),
            'rid': 'sprite-group-' + hashlib.sha256(title.encode()).hexdigest()[:20],
        }
        seen = set()
        for variation in group['variations']:
            if not isinstance(variation, dict):
                logger.warning('Invalid variation in %s; skipping it.', title)
                continue
            name = _text(variation.get('name'))
            distances = variation.get('distances')
            if not name or name in seen or not isinstance(distances, dict):
                logger.warning('Invalid or duplicate variation %r in %s; skipping it.', name, title)
                continue
            seen.add(name)
            variants = []
            layer_files = []
            for distance in DISTANCES:
                if distance not in distances:
                    continue
                try:
                    layers = distances[distance]
                    if not isinstance(layers, list) or not layers:
                        raise ValueError('A distance must contain at least one layer')
                    paths = [layer_path(layer) for layer in layers]
                except (ValueError, OSError) as exc:
                    logger.warning('Invalid sprite %s / %s / %s: %s', title, name, distance, exc)
                    continue
                # Include source versions so browser caches refresh too. Logical
                # paths keep URLs independent of the installation directory.
                versions = [(_layer_reference(p), p.stat().st_mtime_ns, p.stat().st_size)
                            for p in paths]
                identity = json.dumps([title, name, distance, versions])
                key = hashlib.sha256(identity.encode()).hexdigest()
                anchor = hashlib.sha256(json.dumps([title, name, distance]).encode()).hexdigest()
                layer_map[key] = paths
                layer_files.extend(paths)
                filename = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', f'{title} — {name} {distance}')
                variants.append({
                    'name': filename, 'code': name, 'title': name,
                    'rid': 'r-community-sprite-' + anchor,
                    'distance': distance,
                    'raw': f'/resource/community-sprite/{key}',
                    'thumb': f'/resource/thumb/community-sprite/{key}',
                })
            if not variants:
                continue
            primary = variants[0]
            search = ' '.join([group_meta['desc'], group_meta['author']['name'],
                               *(f"{title} {name} {v['distance']}" for v in variants),
                               *(_layer_reference(p) for p in layer_files)])
            families.append({
                'name': name, 'title': f'{title} — {name}', 'code': None,
                'file': '', 'declared': True, 'captions': [],
                'rid': primary['rid'], 'raw': primary['raw'], 'thumb': primary['thumb'],
                'desc': group_meta['desc'], 'sprite_group': group_meta,
                'variants': variants, 'primary': primary, 'search': search,
                'layer_files': layer_files,
            })
    return families, layer_map
