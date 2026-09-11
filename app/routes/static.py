from fastapi import HTTPException, Request
from fastapi.responses import FileResponse, Response

from . import main_router
from ..utils.assets import load as load_asset
from ..utils.file import ROOT

router = main_router

# Pages link CSS/JS through `asset()` (utils/assets.py), which stamps each URL
# with a digest of the bytes served. A URL carrying the current digest can
# never mean anything else, so it is cached for a year like the fonts; a
# deploy changes the digest and with it the URL, so nothing waits out a
# max-age to go live. A bare or stale URL (a page left open across a deploy,
# a link from outside) keeps the short max-age, and the ETag turns its recheck
# into a 304 with no re-download.
_TEXT_CACHE = 'public, max-age=300'
_VERSIONED_CACHE = 'public, max-age=31536000, immutable'


def _text_asset(request: Request, rel: str, media_type: str) -> Response:
    try:
        body, digest = load_asset(rel)
    except FileNotFoundError:
        raise HTTPException(404, f'Файл "{rel}" не существует.') from None
    etag = f'"{digest}"'
    versioned = request.query_params.get('v') == digest
    headers = {'ETag': etag, 'Cache-Control': _VERSIONED_CACHE if versioned else _TEXT_CACHE}
    if request.headers.get('if-none-match') == etag:
        return Response(status_code=304, headers=headers)
    return Response(body, media_type=media_type, headers=headers)


@router.get('/favicon.webp')
async def favicon():
    # Fetched on nearly every page; a week of caching with FileResponse's
    # built-in ETag/Last-Modified revalidation after that. WebP is already
    # compressed, so it opts out of GZipMiddleware like the fonts below.
    return FileResponse(
        str(ROOT / 'static' / 'img' / 'favicon.webp'),
        headers={'Cache-Control': 'public, max-age=604800', 'Content-Encoding': 'identity'},
    )

@router.get('/static/css/{name}')
async def css(name, request: Request):
    return _text_asset(request, f'static/css/{name}', 'text/css; charset=utf-8')

@router.get('/static/js/{name}')
async def js(name, request: Request):
    return _text_asset(request, f'static/js/{name}', 'application/javascript; charset=utf-8')

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