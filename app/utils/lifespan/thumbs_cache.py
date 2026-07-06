import os
from PIL import Image

from ..config import CONFIG
from ..file import ROOT
from ..logging import root_logger

from .sprites_cache import sprite_file

logger = root_logger.getChild('lifespan').getChild('thumbs-cache')

THUMBS_PATH = ROOT / 'temp' / 'thumbs'

# Fits within a 320px box: bgs/cgs land at 320×180, sprites at ~213×320.
# Displayed at half size or less, so they stay crisp on high-DPI screens
# while weighing a few KB each.
THUMB_BOX = (320, 320)

def thumb_file(kind, name):
    return THUMBS_PATH / kind / f'{name}.webp'

def _source_file(kind, name):
    # Sprite thumbs derive from the composed sprite in temp/sprites;
    # image thumbs from the original asset file.
    if kind == 'sprite':
        return sprite_file(name)
    item = next((i for i in CONFIG.resources['original'][kind] if i['name'] == name), None)
    return CONFIG.res_path / item['file'] if item and item['file'] else None

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
