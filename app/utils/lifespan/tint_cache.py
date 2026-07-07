import os, time
from PIL import Image

from ..file import ROOT
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('tint-cache')

TINT_PATH = ROOT / 'temp' / 'tinted'

def tinted_file(kind, name):
    return TINT_PATH / kind / f'{name}.webp'

def is_tinted(kind, name, source):
    # The disk cache survives restarts; a cached tint is only stale if the
    # source image changed after it was composed.
    path = tinted_file(kind, name)
    return path.is_file() and path.stat().st_mtime >= source.stat().st_mtime

def compose_tint(kind, name, source, tint):
    """Ren'Py's `im.MatrixColor(file, im.matrix.tint(r, g, b))`: a diagonal
    color matrix that scales the R/G/B channels independently and leaves
    alpha untouched — exactly a per-channel multiply, no channel mixing."""
    r, g, b = tint

    starttime = time.time()

    with Image.open(source) as base:
        img = base.convert('RGBA')

    channels = img.split()
    scaled = [
        channel.point(lambda x, factor=factor: min(255, round(x * factor)))
        for channel, factor in zip(channels, (r, g, b, 1.0))
    ]
    img = Image.merge('RGBA', scaled)

    path = tinted_file(kind, name)
    path.parent.mkdir(parents=True, exist_ok=True)

    # Write to a temp name and swap it in, so a request that arrives while a
    # compose is in flight never sees a half-written file.
    tmp = path.with_suffix('.webp.tmp')
    img.save(tmp, 'WEBP', quality=90)
    os.replace(tmp, path)

    logger.info(f'Tinted image "{kind} {name}" composed in {time.time() - starttime:.4f}s')

    return path
