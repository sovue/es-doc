from fastapi import APIRouter
from fastapi.responses import FileResponse, PlainTextResponse

from ..utils.file import ROOT, read_text

router = APIRouter()

@router.get('/favicon.webp')
async def favicon():
    return FileResponse(str(ROOT / 'static' / 'favicon.webp'))

@router.get('/resources/css/{name}')
async def css(name):
    return PlainTextResponse(read_text(f'static/css/{name}'))