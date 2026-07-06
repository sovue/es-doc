import asyncio
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import FileResponse

from . import main_router
from ..utils.config import CONFIG
from ..utils.lifespan.sprites_cache import compose_sprite, is_composed, sprite_file
from ..utils.lifespan.thumbs_cache import is_thumbed, make_thumb, thumb_file
from ..utils.logging import root_logger

router = APIRouter(prefix='/resource')

logger = root_logger.getChild('routes').getChild('resource')

# Composed sprites and raw game assets never change while the server runs, so
# let clients keep them for a day instead of re-requesting.
CACHE_HEADERS = {'Cache-Control': 'public, max-age=86400'}

# One compose at a time: concurrent first requests for the same sprite would
# duplicate work, and the target machine has few cores to spare anyway.
compose_lock = asyncio.Lock()

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

@router.get('/thumb/{kind}/{name}')
async def thumb_page(kind, name, request: Request):

    if kind not in ('bg', 'cg', 'anim', 'sprite'):
        raise HTTPException(404, f'Категория "{kind}" не существует.')

    if kind == 'sprite':
        # A sprite thumb derives from the composed sprite, so compose first.
        await _ensure_composed(name)
    elif not any(i['name'] == name and i['thumb'] for i in CONFIG.resources.get('original', {}).get(kind, [])):
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

@router.get('/raw/{resource:path}')
async def raw_page(resource, request: Request):

    # Resolve and confine to res_path: {resource:path} accepts ".." segments,
    # which must not escape the assets folder.
    path = (CONFIG.res_path / resource).resolve()

    if not path.is_relative_to(CONFIG.res_path.resolve()) or not path.is_file():
        raise HTTPException(404, f'Файл "{resource}" не существует.')

    return FileResponse(str(path), headers=CACHE_HEADERS)

main_router.include_router(router)
