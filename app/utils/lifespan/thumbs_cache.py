import os
from PIL import Image

from ..config import CONFIG
from ..file import ROOT
from ..logging import root_logger

from .sprites_cache import sprite_file
from .tint_cache import tinted_file

logger = root_logger.getChild('lifespan').getChild('thumbs-cache')

THUMBS_PATH = ROOT / 'temp' / 'thumbs'

# Fits within a 320px box: bgs/cgs land at 320×180, sprites at ~213×320.
# Displayed at half size or less, so they stay crisp on high-DPI screens
# while weighing a few KB each.
THUMB_BOX = (320, 320)

def thumb_file(kind, name):
    return THUMBS_PATH / kind / f'{name}.webp'

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

    with Image.open(source) as img:
        thumb = img.convert('RGBA') if img.mode in ('RGBA', 'P', 'LA') else img.convert('RGB')
        thumb.thumbnail(THUMB_BOX)

    # Same swap-in trick as composed sprites: never expose a half-written file.
    tmp = path.with_suffix('.webp.tmp')
    thumb.save(tmp, 'WEBP', quality=80)
    os.replace(tmp, path)

    return path
