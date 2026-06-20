from fastapi.responses import FileResponse, Response

from . import main_router
from ..utils.file import ROOT, read_text

router = main_router

@router.get('/favicon.webp')
async def favicon():
    return FileResponse(str(ROOT / 'static' / 'favicon.webp'))

@router.get('/static/css/{name}')
async def css(name):
    return Response(read_text(f'static/css/{name}'), media_type='text/css; charset=utf-8')

@router.get('/static/js/{name}')
async def js(name):
    return Response(read_text(f'static/js/{name}'), media_type='application/javascript; charset=utf-8')