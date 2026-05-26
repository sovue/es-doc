from fastapi import APIRouter
from fastapi.responses import FileResponse, PlainTextResponse

from . import main_router
from ..utils.file import ROOT, read_text

router = main_router

@router.get('/favicon.webp')
async def favicon():
    return FileResponse(str(ROOT / 'static' / 'favicon.webp'))

@router.get('/static/css/{name}')
async def css(name):
    return PlainTextResponse(read_text(f'static/css/{name}'))