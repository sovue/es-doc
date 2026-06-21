from fastapi.responses import FileResponse, Response

from . import main_router
from ..utils.file import ROOT, read_text

router = main_router

@router.get('/favicon.webp')
async def favicon():
    return FileResponse(str(ROOT / 'static' / 'img' / 'favicon.webp'))

@router.get('/static/css/{name}')
async def css(name):
    return Response(read_text(f'static/css/{name}'), media_type='text/css; charset=utf-8')

@router.get('/static/js/{name}')
async def js(name):
    return Response(read_text(f'static/js/{name}'), media_type='application/javascript; charset=utf-8')

@router.get('/static/fonts/{name}')
async def font(name):
    # Binary asset: FileResponse, not read_text (which decodes as UTF-8).
    # Immutable, content-hashed by weight/subset, so cache hard.
    return FileResponse(
        str(ROOT / 'static' / 'fonts' / name),
        media_type='font/woff2',
        headers={
            'Cache-Control': 'public, max-age=31536000, immutable',
            # woff2 is already compressed — 'identity' opts the route out of
            # GZipMiddleware so we don't waste CPU re-compressing for ~0 gain.
            'Content-Encoding': 'identity',
        },
    )