from html import escape
from time import monotonic

from fastapi.responses import HTMLResponse, JSONResponse
import httpx

from . import main_router
from ..utils.docs import search

router = main_router


@router.get('/api/search')
async def search_api(q: str = '', limit: int = 8):
    """Server-side type-ahead: rank the cached search corpus against `q` and
    return the top matches ([{label, doc, anchor, context}]). The matching,
    scoring and ranking that used to run in the browser now run here; the
    corpus itself is kept warm by the lifespan cache refresh."""
    limit = max(1, min(limit, 25))
    return JSONResponse(search(q, limit))

_GH_URL = 'https://api.github.com/repos/sovue/es-doc/contributors'
_UA = 'es-doc/contributors-widget (+https://github.com/sovue/es-doc)'
_TTL = 300  # GitHub allows 60 unauth requests/hour; cache for 5 minutes

_cache: dict[str, object] = {'at': 0.0, 'html': ''}


def _sized_avatar(url: str, size: int = 96) -> str:
    sep = '&' if '?' in url else '?'
    return f'{url}{sep}s={size}'


def _render(users: list[dict]) -> str:
    parts: list[str] = []
    for u in users:
        login_raw = str(u.get('login', ''))
        url_raw = str(u.get('html_url', ''))
        avatar_raw = str(u.get('avatar_url', ''))
        if not (login_raw and url_raw and avatar_raw):
            continue
        login = escape(login_raw)
        url = escape(url_raw, quote=True)
        avatar = escape(_sized_avatar(avatar_raw), quote=True)
        parts.append(
            f'<a class="gh-contributor" href="{url}" '
            f'aria-label="{login} на GitHub" title="{login}">'
            f'<img class="ghcontributor-avatar" src="{avatar}" '
            f'alt="" loading="lazy" width="44" height="44"></a>'
        )
    return ''.join(parts)


@router.get('/api/contributors')
async def contributors():
    now = monotonic()
    if _cache['html'] and (now - float(_cache['at'])) < _TTL:
        return HTMLResponse(str(_cache['html']))

    try:
        async with httpx.AsyncClient(timeout=5.0, headers={'User-Agent': _UA}) as client:
            resp = await client.get(_GH_URL)
            resp.raise_for_status()
            html = _render(resp.json())
    except Exception as e:
        print(f'[contributors] {e}')
        if _cache['html']:
            return HTMLResponse(str(_cache['html']))
        # 502: the upstream (GitHub) failed; lets the loader render its own
        # recovery copy with a working link instead of duplicating it here.
        return HTMLResponse('', status_code=502)

    _cache['html'] = html
    _cache['at'] = now
    return HTMLResponse(html)
