import os
from PIL import Image

from ..config import CONFIG
from ..logging import root_logger

from .sprites_cache import sprite_file
from .tint_cache import tinted_file

logger = root_logger.getChild('lifespan').getChild('thumbs-cache')

# `images.thumb.box` is the square a thumbnail is fitted into: at the default
# 320 a bg/cg lands at 320×180 and a sprite at ~213×320. They are displayed at
# half that or less, so they stay crisp on high-DPI screens while weighing a
# few KB each.

def thumbs_path():
    return CONFIG.cache_path / 'thumbs'

def thumb_file(kind, name):
    return thumbs_path() / kind / f'{name}.webp'

def _source_file(kind, name):
    # Sprite thumbs derive from the composed sprite in temp/sprites; tinted
    # variants from their own composed file in temp/tinted (res.py's
    # /tinted/ route composes it before a thumb is ever requested); plain
    # image thumbs from the asset file, wherever it lives — the game folder
    # or the community drop-in folder next to it (cut NSFW arts resolve there).
    if kind == 'sprite':
        return sprite_file(name)
    item = next((i for collection in CONFIG.resources.values()
                 for i in collection.get(kind, []) if i['name'] == name), None)
    if not item or not item['file']:
        return None
    if item.get('tint'):
        return tinted_file(kind, name)
    for root in (CONFIG.res_path, CONFIG.res_path.parent / 'community'):
        if (root / item['file']).is_file():
            return root / item['file']
    return None

def is_thumbed(kind, name):
    path = thumb_file(kind, name)
    source = _source_file(kind, name)
    return (path.is_file() and source and source.is_file()
            and path.stat().st_mtime >= source.stat().st_mtime)

def make_thumb(kind, name):

    source = _source_file(kind, name)

    path = thumb_file(kind, name)
    path.parent.mkdir(parents=True, exist_ok=True)

    box = CONFIG.setting('images.thumb.box')

    with Image.open(source) as img:
        thumb = img.convert('RGBA') if img.mode in ('RGBA', 'P', 'LA') else img.convert('RGB')
        thumb.thumbnail((box, box))

    # Same swap-in trick as composed sprites: never expose a half-written file.
    tmp = path.with_suffix('.webp.tmp')
    thumb.save(tmp, 'WEBP', quality=CONFIG.setting('images.thumb.quality'))
    os.replace(tmp, path)

    return path
