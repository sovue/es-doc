import os, re, time
from pathlib import Path
from PIL import Image

from ..config import CONFIG
from ..file import ROOT
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('sprites-cache')

SPRITES_PATH = ROOT / 'temp' / 'sprites'

def parse_sprites():
    # Only the cheap part runs at startup: mapping sprite names to their layer
    # files. Actual compositing happens lazily in compose_sprite(), so startup
    # is instant and only sprites that are actually viewed cost CPU.
    sprites = {}

    for sprite in re.findall(r'image ([\w ]+)\b[\s\S]+?im.Composite\(\n?\(\d+,\d+\),\s?(.+)\),?\n', (CONFIG.res_path / 'sprites.rpy').read_text(), re.M | re.U):
        sprites[sprite[0]] = re.findall(r'\"([\w\\/.]+)\"', sprite[1], re.M | re.U)

    CONFIG.sprite_layers = sprites
    logger.info(f'{len(sprites)} sprite combinations found.')

def sprite_file(name):
    return SPRITES_PATH / f'{name}.webp'

def is_composed(name):
    # The disk cache survives restarts; a cached sprite is only stale if
    # sprites.rpy changed after it was composed.
    path = sprite_file(name)
    return path.is_file() and path.stat().st_mtime >= (CONFIG.res_path / 'sprites.rpy').stat().st_mtime

def compose_sprite(name):

    layers = CONFIG.sprite_layers[name]

    starttime = time.time()

    with Image.open(CONFIG.res_path / layers[0]) as base:
        img = base.convert('RGBA')

    for layer in layers[1:]:
        with Image.open(CONFIG.res_path / layer) as overlay:
            img.alpha_composite(overlay.convert('RGBA'))

    # Write to a temp name and swap it in, so a request that arrives while a
    # compose is in flight never sees a half-written file.
    path = sprite_file(name)
    tmp = path.with_suffix('.webp.tmp')
    img.save(tmp, 'WEBP', quality=90)
    os.replace(tmp, path)

    logger.info(f'Sprite "{name}" composed in {time.time() - starttime:.4f}s')

    return path
