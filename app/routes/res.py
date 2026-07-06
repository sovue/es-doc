from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from pathlib import Path

from . import main_router
from ..utils.config import CONFIG
from ..utils.file import ROOT

router = APIRouter(prefix='/resource')

# TODO: route for index, browser and sprites
#       browser is a set of lists of bgs, cgs, sprites, special effects and animations (anim), sounds, ambiences and music, all with their variable names

@router.get('/sprite/{sprite}')
async def page(sprite, request: Request):

    path: Path = ROOT / 'temp' / 'sprites' / f'{sprite}.png'

    if not CONFIG.current_tasks['cache_sprites'].done():
        raise HTTPException(425, 'Обработка спрайтов ещё не завершена.')

    if not path.exists():
        raise HTTPException(404, f'Файл "{path}" не существует.')

    return FileResponse(str(path))

@router.get('/raw/{resource:path}')
async def page(resource, request: Request):

    path: Path = CONFIG.res_path / resource

    if not path.exists():
        raise HTTPException(404, f'Файл "{path}" не существует.')

    return FileResponse(str(path))

main_router.include_router(router)