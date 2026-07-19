import os
from PIL import Image

from ..config import CONFIG
from ..file import ROOT
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('hero-cache')

HERO_PATH = ROOT / 'temp' / 'hero'

# Wide enough for a full-bleed hero on a desktop screen while landing around
# a tenth of the original JPG's weight; the readability overlay on top hides
# any resampling softness anyway.
HERO_WIDTH = 1600

def hero_file(name):
    return HERO_PATH / f'{name}.webp'

def _source_file(name):
    # Only plain declared-or-undeclared bg files qualify — a hero image is a
    # straight downscale, so code-built images (tints) are out of scope.
    item = next((i for i in CONFIG.resources.get('original', {}).get('bg', [])
                 if i['name'] == name and i['file'] and not i.get('tint')), None)
    if not item:
        return None
    path = CONFIG.res_path / item['file']
    return path if path.is_file() else None

def is_heroed(name):
    path = hero_file(name)
    source = _source_file(name)
    return (path.is_file() and source is not None
            and path.stat().st_mtime >= source.stat().st_mtime)

def make_hero(name):

    source = _source_file(name)
    if source is None:
        # Unknown names surface as a clean 404 in the route, not a 500.
        raise FileNotFoundError(f'No bg source for "{name}"')

    HERO_PATH.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as img:
        img = img.convert('RGB')
        if img.width > HERO_WIDTH:
            img = img.resize((HERO_WIDTH, round(img.height * HERO_WIDTH / img.width)), Image.LANCZOS)

        # Same swap-in trick as sprites/thumbs: never expose a half-written file.
        path = hero_file(name)
        tmp = path.with_suffix('.webp.tmp')
        img.save(tmp, 'WEBP', quality=75)
        os.replace(tmp, path)

    return path
