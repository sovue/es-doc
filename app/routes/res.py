import asyncio
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import FileResponse

from . import main_router
from ..utils.config import CONFIG
from ..utils.lifespan.sprites_cache import compose_sprite, is_composed, sprite_file
from ..utils.logging import root_logger

router = APIRouter(prefix='/resource')

logger = root_logger.getChild('routes').getChild('resource')

# Composed sprites and raw game assets never change while the server runs, so
# let clients keep them for a day instead of re-requesting.
CACHE_HEADERS = {'Cache-Control': 'public, max-age=86400'}

# One compose at a time: concurrent first requests for the same sprite would
# duplicate work, and the target machine has few cores to spare anyway.
compose_lock = asyncio.Lock()

# TODO: route for index, browser and sprites
#       browser is a set of lists of bgs, cgs, sprites, special effects and animations (anim), sounds, ambiences and music, all with their variable names

@router.get('/sprite/{sprite}')
async def sprite_page(sprite, request: Request):

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

    return FileResponse(str(sprite_file(sprite)), media_type='image/webp', headers=CACHE_HEADERS)

@router.get('/raw/{resource:path}')
async def raw_page(resource, request: Request):

    # Resolve and confine to res_path: {resource:path} accepts ".." segments,
    # which must not escape the assets folder.
    path = (CONFIG.res_path / resource).resolve()

    if not path.is_relative_to(CONFIG.res_path.resolve()) or not path.is_file():
        raise HTTPException(404, f'Файл "{resource}" не существует.')

    return FileResponse(str(path), headers=CACHE_HEADERS)

main_router.include_router(router)
