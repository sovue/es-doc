import asyncio
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import FileResponse

from . import main_router
from ..utils.config import CONFIG
from ..utils.lifespan.artist_img_cache import cache_file as artist_img_file, fetch_and_cache as fetch_artist_img, is_cached as artist_img_cached
from ..utils.lifespan.sprites_cache import compose_sprite, is_composed, sprite_file
from ..utils.lifespan.thumbs_cache import is_thumbed, make_thumb, thumb_file
from ..utils.lifespan.tint_cache import compose_tint, is_tinted, tinted_file
from ..utils.logging import root_logger

router = APIRouter(prefix='/resource')

logger = root_logger.getChild('routes').getChild('resource')

# Composed sprites and raw game assets never change while the server runs, so
# let clients keep them for a day instead of re-requesting.
CACHE_HEADERS = {'Cache-Control': 'public, max-age=86400'}

# One compose at a time: concurrent first requests for the same sprite would
# duplicate work, and the target machine has few cores to spare anyway.
compose_lock = asyncio.Lock()

# Artist images are fetched over the network, so unlike sprite composing they
# shouldn't all serialise behind one lock. Key a lock per source URL: same
# image fetches once, different images still fetch in parallel.
_artist_img_locks: dict[str, asyncio.Lock] = {}

def _artist_img_lock(url):
    lock = _artist_img_locks.get(url)
    if lock is None:
        lock = _artist_img_locks[url] = asyncio.Lock()
    return lock

async def _ensure_composed(sprite):

    if sprite not in CONFIG.sprite_layers:
        raise HTTPException(404, f'Спрайт "{sprite}" не существует.')

    if not is_composed(sprite):
        async with compose_lock:
            # Re-check: the request holding the lock before us may have
            # composed this very sprite.
            if not is_composed(sprite):
                try:
                    await asyncio.to_thread(compose_sprite, sprite)
                except Exception:
                    logger.exception(f'Composing sprite "{sprite}" failed.')
                    raise HTTPException(500, f'Не удалось собрать спрайт "{sprite}".')

@router.get('/sprite/{sprite}')
async def sprite_page(sprite, request: Request):

    await _ensure_composed(sprite)

    return FileResponse(str(sprite_file(sprite)), media_type='image/webp', headers=CACHE_HEADERS)

def _find_tinted(kind, name):
    return next((i for collection in CONFIG.resources.values()
                 for i in collection.get(kind, [])
                 if i['name'] == name and i.get('tint')), None)

async def _ensure_tinted(kind, name):

    item = _find_tinted(kind, name)
    if not item:
        raise HTTPException(404, f'Тонированное изображение "{kind} {name}" не существует.')

    # The source file lives in the game folder or, for a community-declared
    # tint, the community drop-in folder next to it.
    source = next((root / item['file'] for root in (CONFIG.res_path, CONFIG.res_path.parent / 'community')
                    if (root / item['file']).is_file()), None)
    if not source:
        raise HTTPException(404, f'Исходный файл для "{kind} {name}" не существует.')

    if not is_tinted(kind, name, source):
        async with compose_lock:
            # Re-check: the request holding the lock before us may have
            # composed this very image.
            if not is_tinted(kind, name, source):
                try:
                    await asyncio.to_thread(compose_tint, kind, name, source, item['tint'])
                except Exception:
                    logger.exception(f'Tinting "{kind} {name}" failed.')
                    raise HTTPException(500, f'Не удалось применить тон к "{name}".')

@router.get('/tinted/{kind}/{name}')
async def tinted_page(kind, name, request: Request):

    await _ensure_tinted(kind, name)

    return FileResponse(str(tinted_file(kind, name)), media_type='image/webp', headers=CACHE_HEADERS)

@router.get('/thumb/{kind}/{name}')
async def thumb_page(kind, name, request: Request):

    if kind not in ('bg', 'cg', 'anim', 'sprite'):
        raise HTTPException(404, f'Категория "{kind}" не существует.')

    if kind == 'sprite':
        # A sprite thumb derives from the composed sprite, so compose first.
        await _ensure_composed(name)
    elif _find_tinted(kind, name):
        # A tinted image's thumb derives from the composed tint, so compose
        # that first (mirrors the sprite branch above).
        await _ensure_tinted(kind, name)
    elif not any(i['name'] == name and i['thumb']
                 for collection in CONFIG.resources.values()
                 for i in collection.get(kind, [])):
        # Covers unknown names and names whose source file is absent from the
        # decompiled assets (they parse with thumb=None).
        raise HTTPException(404, f'Ресурс "{name}" не существует.')

    if not is_thumbed(kind, name):
        async with compose_lock:
            if not is_thumbed(kind, name):
                try:
                    await asyncio.to_thread(make_thumb, kind, name)
                except Exception:
                    logger.exception(f'Thumbnailing "{kind} {name}" failed.')
                    raise HTTPException(500, f'Не удалось создать превью "{name}".')

    return FileResponse(str(thumb_file(kind, name)), media_type='image/webp', headers=CACHE_HEADERS)

def _confined_file(base, resource):
    # Resolve and confine to the base folder: {resource:path} accepts ".."
    # segments, which must not escape it.
    path = (base / resource).resolve()

    if not path.is_relative_to(base.resolve()) or not path.is_file():
        raise HTTPException(404, f'Файл "{resource}" не существует.')

    return path

@router.get('/raw/{resource:path}')
async def raw_page(resource, request: Request):

    return FileResponse(str(_confined_file(CONFIG.res_path, resource)), headers=CACHE_HEADERS)

@router.get('/community/{resource:path}')
async def community_page(resource, request: Request):

    # The community drop-in folder sits next to `game` in the assets root.
    return FileResponse(str(_confined_file(CONFIG.res_path.parent / 'community', resource)), headers=CACHE_HEADERS)

def _artist_img_url(kind, name):
    # Fetch by reference, not by arbitrary URL: only links already present in
    # artists.yaml are reachable, so this is not an open proxy.
    if kind not in ('logo', 'preview'):
        return None
    item = next((a for a in CONFIG.artists if a['name'] == name), None)
    return item.get(kind) if item else None

@router.get('/artist/{kind}/{name}')
async def artist_image(kind, name, request: Request):

    url = _artist_img_url(kind, name)
    if not url:
        raise HTTPException(404, f'Изображение "{kind}" для «{name}» не существует.')

    # Serving these through the backend (instead of hotlinking) normalises the
    # image to WebP and sidesteps the browser's cross-origin ORB block.
    if not artist_img_cached(url):
        async with _artist_img_lock(url):
            if not artist_img_cached(url):
                try:
                    await fetch_artist_img(url)
                except Exception:
                    logger.exception(f'Fetching artist image "{kind}" for "{name}" failed.')
                    raise HTTPException(502, f'Не удалось загрузить изображение для «{name}».')

    return FileResponse(str(artist_img_file(url)), media_type='image/webp', headers=CACHE_HEADERS)

main_router.include_router(router)
