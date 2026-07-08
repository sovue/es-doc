import asyncio
import hashlib
import io
import os

import httpx
from PIL import Image

from ..file import ROOT
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('artist-img')

ARTIST_IMG_PATH = ROOT / 'temp' / 'artist_img'

# Some hosts (VK's userapi CDN) refuse hotlinks or serve responses the browser
# blocks via ORB. Fetching server-side sidesteps ORB entirely; a Referer helps
# with the hotlink checks.
_UA = 'es-doc/artist-images (+https://github.com/sovue/es-doc)'
_HEADERS = {'User-Agent': _UA, 'Referer': 'https://vk.com/'}

# Cap the stored image; artist previews/logos are shown small, so there's no
# point keeping a multi-megapixel original.
_MAX_SIDE = (1200, 1200)

def cache_file(url):
    # Keyed by the URL, so editing a link in artists.yaml naturally points at a
    # fresh cache entry instead of serving the stale image.
    digest = hashlib.sha1(url.encode('utf-8')).hexdigest()
    return ARTIST_IMG_PATH / f'{digest}.webp'

def is_cached(url):
    return cache_file(url).is_file()

def _encode(data, path):
    # Re-encoding through Pillow also validates the bytes: an HTML error page or
    # an ORB-style block won't decode, so we fail loudly instead of caching junk.
    with Image.open(io.BytesIO(data)) as img:
        img = img.convert('RGBA') if img.mode in ('RGBA', 'P', 'LA') else img.convert('RGB')
        img.thumbnail(_MAX_SIDE)

    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.webp.tmp')
    img.save(tmp, 'WEBP', quality=85)
    os.replace(tmp, path)

async def fetch_and_cache(url):
    """Download an external artist image, normalise it to WebP and cache it on
    disk. Raises on network failure or undecodable content; the caller turns
    that into a 502 and the page's <img> fallback drops the image."""
    async with httpx.AsyncClient(timeout=10.0, headers=_HEADERS, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.content

    await asyncio.to_thread(_encode, data, cache_file(url))
    logger.info(f'Cached artist image from {url[:60]}…')
