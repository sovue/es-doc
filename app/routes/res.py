import asyncio

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from ..utils.config import CONFIG
from ..utils.http import cache_headers, is_precompressed
from ..utils.lifespan.animation_images import make_image
from ..utils.lifespan.artist_img_cache import (
    cache_file as artist_img_file,
)
from ..utils.lifespan.artist_img_cache import (
    cache_local as cache_artist_local,
)
from ..utils.lifespan.artist_img_cache import (
    fetch_and_cache as fetch_artist_img,
)
from ..utils.lifespan.artist_img_cache import (
    is_cached as artist_img_cached,
)
from ..utils.lifespan.artist_img_cache import (
    local_cache_file as artist_local_file,
)
from ..utils.lifespan.hero_cache import hero_file, is_heroed, make_hero
from ..utils.lifespan.sprites_cache import compose_sprite, is_composed, sprite_file
from ..utils.lifespan.thumbs_cache import is_thumbed, make_thumb, thumb_file
from ..utils.lifespan.tint_cache import compose_tint, is_tinted, tinted_file
from ..utils.logging import root_logger
from . import main_router

router = APIRouter(prefix='/resource')

logger = root_logger.getChild('routes').getChild('resource')

# One compose at a time: concurrent first requests for the same sprite would
# duplicate work, and the target machine has few cores to spare anyway.
compose_lock = asyncio.Lock()

# Artist images are fetched over the network, so unlike sprite composing they
# shouldn't all serialise behind one lock. Key a lock per source URL and kind
# (each kind is cut to its own size): the same file fetches once, different
# ones still fetch in parallel.
_artist_img_locks: dict[tuple[str, str], asyncio.Lock] = {}

def _artist_img_lock(url, kind):
    lock = _artist_img_locks.get((url, kind))
    if lock is None:
        lock = _artist_img_locks[(url, kind)] = asyncio.Lock()
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
                    raise HTTPException(500, f'Не удалось собрать спрайт "{sprite}".') from None

@router.get('/sprite/{sprite}')
async def sprite_page(sprite, request: Request):

    await _ensure_composed(sprite)

    return FileResponse(str(sprite_file(sprite)), media_type='image/webp', headers=cache_headers(precompressed=True))

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

    if not is_tinted(kind, name, source, item['tint']):
        async with compose_lock:
            # Re-check: the request holding the lock before us may have
            # composed this very image.
            if not is_tinted(kind, name, source, item['tint']):
                try:
                    await asyncio.to_thread(compose_tint, kind, name, source, item['tint'])
                except Exception:
                    logger.exception(f'Tinting "{kind} {name}" failed.')
                    raise HTTPException(500, f'Не удалось применить тон к "{name}".') from None

@router.get('/tinted/{kind}/{name}')
async def tinted_page(kind, name, request: Request):

    await _ensure_tinted(kind, name)

    return FileResponse(str(tinted_file(kind, name)), media_type='image/webp', headers=cache_headers(precompressed=True))

@router.get('/thumb/{kind}/{name:path}')
async def thumb_page(kind, name, request: Request):

    if kind not in ('bg', 'cg', 'anim', 'sprite', 'community'):
        raise HTTPException(404, f'Категория "{kind}" не существует.')

    if kind == 'sprite':
        # A sprite thumb derives from the composed sprite, so compose first.
        await _ensure_composed(name)
    elif kind == 'community':
        if not any(i['file'] == name and i['thumb']
                   for items in CONFIG.resources.get('community', {}).values()
                   for i in items):
            raise HTTPException(404, f'Ресурс "{name}" не существует.')
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
                    raise HTTPException(500, f'Не удалось создать превью "{name}".') from None

    return FileResponse(str(thumb_file(kind, name)), media_type='image/webp', headers=cache_headers(precompressed=True))

@router.get('/hero/{name}')
async def hero_page(name, request: Request, crop: str | None = None):
    """Hero-sized bg downscales for the homepage slideshow — same lazy
    compose-once-then-serve pipeline as thumbs, only wider. `?crop=narrow` is
    the phone variant (hero_cache.py)."""

    if crop not in (None, 'narrow'):
        raise HTTPException(404, f'Вариант "{crop}" не существует.')

    if not is_heroed(name, crop):
        async with compose_lock:
            if not is_heroed(name, crop):
                try:
                    await asyncio.to_thread(make_hero, name, crop)
                except FileNotFoundError:
                    raise HTTPException(404, f'Фон "{name}" не существует.') from None
                except Exception:
                    logger.exception(f'Hero-scaling bg "{name}" failed.')
                    raise HTTPException(500, f'Не удалось подготовить фон "{name}".') from None

    return FileResponse(str(hero_file(name, crop)), media_type='image/webp', headers=cache_headers(precompressed=True))


def _confined_file(base, resource):
    # Resolve and confine to the base folder: {resource:path} accepts ".."
    # segments, which must not escape it.
    path = (base / resource).resolve()

    if not path.is_relative_to(base.resolve()) or not path.is_file():
        raise HTTPException(404, f'Файл "{resource}" не существует.')

    return path


@router.get('/poster/{resource:path}')
async def animation_poster(resource: str):
    source = _confined_file(CONFIG.res_path, resource)
    if source.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
        raise HTTPException(404, 'Превью изображения не найдено.')
    async with compose_lock:
        target = await asyncio.to_thread(make_image, source, poster=True)
    return FileResponse(str(target), media_type='image/webp', headers=cache_headers(precompressed=True))


@router.get('/animation/black-long')
async def black_long_image(poster: bool = False):
    source = _confined_file(CONFIG.res_path, 'images/bg/ext_camp_entrance_day.jpg')
    async with compose_lock:
        target = await asyncio.to_thread(make_image, source, poster=poster, sepia=True)
    return FileResponse(str(target), media_type='image/webp', headers=cache_headers(precompressed=True))

@router.get('/raw/{resource:path}')
async def raw_page(resource, request: Request):

    path = _confined_file(CONFIG.res_path, resource)
    return FileResponse(str(path), headers=cache_headers(precompressed=is_precompressed(path)))

@router.get('/community/{resource:path}')
async def community_page(resource, request: Request):

    # The community drop-in folder sits next to `game` in the assets root.
    path = _confined_file(CONFIG.res_path.parent / 'community', resource)
    return FileResponse(str(path), headers=cache_headers(precompressed=is_precompressed(path)))

def _is_remote(value):
    return value.startswith(('http://', 'https://'))

async def _serve_directory_image(value, kind, slug, local_dir):

    # A local file (relative path under assets/specialists/) is confined against
    # path traversal like /raw and /community, then cut to its box and cached
    # like a fetched one: dropped in by hand, it can be any size at all. A
    # remote URL is fetched, re-encoded to WebP and cached, which also
    # normalises the format and sidesteps the browser's ORB block.
    if not _is_remote(value):
        path = _confined_file(local_dir, value)
        target = artist_local_file(path, kind)

        if not target.is_file():
            async with _artist_img_lock(str(path), kind):
                if not target.is_file():
                    try:
                        await cache_artist_local(path, kind)
                    except Exception:
                        # Still the author's own image: serve it as it is
                        # rather than lose it over a format Pillow can't read.
                        logger.exception(f'Resizing local artist image "{kind}" for "{slug}" failed.')
                        return FileResponse(str(path), headers=cache_headers(precompressed=is_precompressed(path)))

        return FileResponse(str(target), media_type='image/webp', headers=cache_headers(precompressed=True))

    if not artist_img_cached(value, kind):
        async with _artist_img_lock(value, kind):
            if not artist_img_cached(value, kind):
                try:
                    await fetch_artist_img(value, kind)
                except Exception:
                    logger.exception(f'Fetching artist image "{kind}" for "{slug}" failed.')
                    raise HTTPException(502, f'Не удалось загрузить изображение для «{slug}».') from None

    return FileResponse(str(artist_img_file(value, kind)), media_type='image/webp', headers=cache_headers(precompressed=True))


def _specialist(slug):
    item = next((person for person in CONFIG.specialists if person['slug'] == slug), None)
    if not item:
        raise HTTPException(404, 'Специалист не найден.')
    return item


@main_router.get('/specialists/res/{resource:path}')
async def specialist_resource(resource: str):
    path = _confined_file(CONFIG.docs_path.parent / 'specialists', resource)
    return FileResponse(str(path), headers=cache_headers(precompressed=is_precompressed(path)))


@router.get('/specialist/{kind}/{slug}')
async def specialist_image(kind, slug):
    item = _specialist(slug)
    if kind not in ('logo', 'preview') or not item.get(kind):
        raise HTTPException(404, 'Изображение не найдено.')
    return await _serve_directory_image(item[kind], kind, slug, CONFIG.docs_path.parent / 'specialists')


@router.get('/specialist/work/{slug}/{index}')
async def specialist_work(slug: str, index: int):
    item = _specialist(slug)
    if index < 0 or index >= len(item['works']):
        raise HTTPException(404, 'Пример работы не найден.')
    work = item['works'][index]
    root = CONFIG.docs_path.parent / 'specialists'
    if work['type'] == 'art':
        return await _serve_directory_image(work['source'], 'preview', slug, root)
    if work['type'] == 'track' and not _is_remote(work['source']):
        path = _confined_file(root, work['source'])
        return FileResponse(str(path), headers=cache_headers(precompressed=is_precompressed(path)))
    raise HTTPException(404, 'Медиафайл не найден.')

main_router.include_router(router)
