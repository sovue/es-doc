import asyncio
import hashlib
import io
import os

import httpx
from PIL import Image

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('artist-img')

# `images.artist.preview-box` and `.logo-box` size the stored image to where it
# is shown: a card of ~300×200 and a 30px avatar. This used to be one 1200px cap
# for both kinds, which kept 200+ kB logos for a 30px circle, and a file dropped
# into assets/artists/ by hand skipped the pipeline entirely (a 438 kB preview,
# served as it was). Both routes now come out at the same size. The user-agent
# and referer are there because fetching server-side is what sidesteps the
# browser's ORB block, and some hosts (VK's userapi CDN) also check the referer
# before serving a hotlink.

_BOX_SETTING = {
    'preview': 'images.artist.preview-box',
    'logo': 'images.artist.logo-box',
}

def artist_img_path():
    return CONFIG.cache_path / 'artist_img'

def _headers():
    return {
        'User-Agent': CONFIG.setting('images.artist.user-agent'),
        'Referer': CONFIG.setting('images.artist.referer'),
    }

def _box(kind):
    width, height = CONFIG.setting(_BOX_SETTING[kind])
    return int(width), int(height)

def cache_file(url, kind):
    # Keyed by the URL and the box it was cut for, so editing a link in
    # artists.yaml — or a box in config.yaml — points at a fresh cache entry
    # instead of serving the stale image, and one URL used as both a preview
    # and a logo gets a file per size.
    width, height = _box(kind)
    digest = hashlib.sha1(f'{width}x{height}:{url}'.encode('utf-8')).hexdigest()
    return artist_img_path() / f'{digest}.webp'

def is_cached(url, kind):
    return cache_file(url, kind).is_file()

def _encode(data, path, box):
    # Re-encoding through Pillow also validates the bytes: an HTML error page or
    # an ORB-style block won't decode, so we fail loudly instead of caching junk.
    with Image.open(io.BytesIO(data)) as img:
        img = img.convert('RGBA') if img.mode in ('RGBA', 'P', 'LA') else img.convert('RGB')

    # Cover, not contain: both kinds are cropped to fill their frame, so what
    # has to survive is the *shorter* side. Bounding the longer one instead
    # would leave a wide cover banner too short to fill a card's height.
    scale = max(box[0] / img.width, box[1] / img.height)
    if scale < 1:
        img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))),
                         Image.Resampling.LANCZOS)

    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.webp.tmp')
    img.save(tmp, 'WEBP', quality=CONFIG.setting('images.artist.quality'))
    os.replace(tmp, path)

async def fetch_and_cache(url, kind):
    """Download an external artist image, normalise it to WebP and cache it on
    disk. Raises on network failure or undecodable content; the caller turns
    that into a 502 and the page's <img> fallback drops the image."""
    timeout = CONFIG.setting('images.artist.timeout')

    async with httpx.AsyncClient(timeout=timeout, headers=_headers(), follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.content

    await asyncio.to_thread(_encode, data, cache_file(url, kind), _box(kind))
    logger.info(f'Cached artist image from {url[:60]}…')

def local_cache_file(path, kind):
    # A hand-supplied image is keyed by its path, mtime and size as well as the
    # box, so replacing the file in assets/artists/ is picked up without a
    # restart, the way editing a URL is.
    width, height = _box(kind)
    stat = path.stat()
    key = f'{width}x{height}:{path}:{stat.st_mtime_ns}:{stat.st_size}'
    return artist_img_path() / f'{hashlib.sha1(key.encode("utf-8")).hexdigest()}.webp'

def _encode_file(path, dest, box):
    _encode(path.read_bytes(), dest, box)

async def cache_local(path, kind):
    """Cut an image from assets/artists/ to its box, exactly as a fetched one
    is. Raises if Pillow can't read it; the caller then serves the file as it
    is rather than lose the image."""
    await asyncio.to_thread(_encode_file, path, local_cache_file(path, kind), _box(kind))
    logger.info(f'Cached local artist image {path.name}.')
