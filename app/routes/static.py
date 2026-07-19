import hashlib

from fastapi import Request
from fastapi.responses import FileResponse, Response

from . import main_router
from ..utils.file import ROOT, read_text

router = main_router

# CSS/JS aren't content-hashed in their URLs, so they can't be cached
# "immutable" like the fonts. A short max-age lets a returning visitor reuse
# them within a session; the content ETag turns the post-expiry recheck (and
# any cross-session hit) into a 304 with no re-download, so a deploy still
# goes live within the window. Previously these were served with no caching
# headers at all — a full re-download of every stylesheet and script on every
# navigation.
_TEXT_CACHE = 'public, max-age=300'


def _text_asset(request: Request, rel: str, media_type: str) -> Response:
    body = read_text(rel)
    etag = '"' + hashlib.md5(body.encode('utf-8')).hexdigest() + '"'
    headers = {'ETag': etag, 'Cache-Control': _TEXT_CACHE}
    if request.headers.get('if-none-match') == etag:
        return Response(status_code=304, headers=headers)
    return Response(body, media_type=media_type, headers=headers)


@router.get('/favicon.webp')
async def favicon():
    # Fetched on nearly every page; a week of caching with FileResponse's
    # built-in ETag/Last-Modified revalidation after that.
    return FileResponse(
        str(ROOT / 'static' / 'img' / 'favicon.webp'),
        headers={'Cache-Control': 'public, max-age=604800'},
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