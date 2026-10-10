import json
import os, time
from PIL import Image

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('tint-cache')

def tinted_path():
    return CONFIG.cache_path / 'tinted'

def tinted_file(kind, name):
    return tinted_path() / kind / f'{name}.webp'

def _signature(source, tint):
    stat = source.stat()
    return [str(source.resolve()), stat.st_mtime_ns, stat.st_size,
            list(tint), CONFIG.setting('images.tint-quality')]


def is_tinted(kind, name, source, tint):
    # Persist every input so changes are detected even across restarts.
    path = tinted_file(kind, name)
    if not path.is_file():
        return False
    try:
        saved = json.loads(path.with_suffix('.json').read_text('utf-8'))
        return saved == _signature(source, tint)
    except (OSError, ValueError):
        return False

def compose_tint(kind, name, source, tint):
    """Ren'Py's `im.MatrixColor(file, im.matrix.tint(r, g, b))`: a diagonal
    color matrix that scales the R/G/B channels independently and leaves
    alpha untouched — exactly a per-channel multiply, no channel mixing."""
    r, g, b = tint
    signature = _signature(source, tint)

    starttime = time.time()

    with Image.open(source) as base:
        img = base.convert('RGBA')

    channels = img.split()
    scaled = [
        channel.point(lambda x, factor=factor: min(255, round(x * factor)))
        # strict: the convert('RGBA') above guarantees four channels, so a
        # length mismatch here means that assumption broke — better to say so
        # than to silently drop a channel and fail later inside Image.merge.
        for channel, factor in zip(channels, (r, g, b, 1.0), strict=True)
    ]
    img = Image.merge('RGBA', scaled)

    path = tinted_file(kind, name)
    path.parent.mkdir(parents=True, exist_ok=True)

    # Write to a temp name and swap it in, so a request that arrives while a
    # compose is in flight never sees a half-written file.
    tmp = path.with_suffix('.webp.tmp')
    img.save(tmp, 'WEBP', quality=CONFIG.setting('images.tint-quality'))
    os.replace(tmp, path)
    metadata = path.with_suffix('.json')
    temporary_metadata = metadata.with_suffix('.json.tmp')
    temporary_metadata.write_text(json.dumps(signature), encoding='utf-8')
    os.replace(temporary_metadata, metadata)

    logger.info(f'Tinted image "{kind} {name}" composed in {time.time() - starttime:.4f}s')

    return path
