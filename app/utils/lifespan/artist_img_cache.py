import asyncio
import hashlib
import io
import os

import httpx
from PIL import Image

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('artist-img')

# `images.artist.max-side` caps the stored image: artist previews and logos are
# shown small, so there's no point keeping a multi-megapixel original. The
# user-agent and referer are there because fetching server-side is what
# sidesteps the browser's ORB block, and some hosts (VK's userapi CDN) also
# check the referer before serving a hotlink.

def artist_img_path():
    return CONFIG.cache_path / 'artist_img'

def _headers():
    return {
        'User-Agent': CONFIG.setting('images.artist.user-agent'),
        'Referer': CONFIG.setting('images.artist.referer'),
    }

def cache_file(url):
    # Keyed by the URL, so editing a link in artists.yaml naturally points at a
    # fresh cache entry instead of serving the stale image.
    digest = hashlib.sha1(url.encode('utf-8')).hexdigest()
    return artist_img_path() / f'{digest}.webp'

def is_cached(url):
    return cache_file(url).is_file()

def _encode(data, path):
    # Re-encoding through Pillow also validates the bytes: an HTML error page or
    # an ORB-style block won't decode, so we fail loudly instead of caching junk.
    side = CONFIG.setting('images.artist.max-side')

    with Image.open(io.BytesIO(data)) as img:
        img = img.convert('RGBA') if img.mode in ('RGBA', 'P', 'LA') else img.convert('RGB')
        img.thumbnail((side, side))

    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.webp.tmp')
    img.save(tmp, 'WEBP', quality=CONFIG.setting('images.artist.quality'))
    os.replace(tmp, path)

async def fetch_and_cache(url):
    """Download an external artist image, normalise it to WebP and cache it on
    disk. Raises on network failure or undecodable content; the caller turns
    that into a 502 and the page's <img> fallback drops the image."""
    timeout = CONFIG.setting('images.artist.timeout')

    async with httpx.AsyncClient(timeout=timeout, headers=_headers(), follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.content

    await asyncio.to_thread(_encode, data, cache_file(url))
    logger.info(f'Cached artist image from {url[:60]}…')
