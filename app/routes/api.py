from asyncio import gather
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

# Контрибьюторы собираются из всех репозиториев проекта и показываются одним
# общим списком: сайт и ассеты игры делают одни и те же люди.
_GH_REPOS = ('sovue/es-doc', 'sovue/es-doc-assets')
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


def _merge(responses: list[list[dict]]) -> list[dict]:
    """Склеить списки контрибьюторов нескольких репозиториев в один: один и тот
    же человек показывается одной аватаркой, а его вклады суммируются, чтобы
    порядок оставался «по объёму работы», как в исходном ответе GitHub."""
    merged: dict[str, dict] = {}
    for users in responses:
        for u in users:
            login = str(u.get('login', ''))
            if not login:
                continue
            key = login.lower()
            seen = merged.get(key)
            if seen is None:
                merged[key] = dict(u)
                continue
            try:
                seen['contributions'] = int(seen.get('contributions', 0) or 0) + int(
                    u.get('contributions', 0) or 0
                )
            except (TypeError, ValueError):
                pass
    return sorted(
        merged.values(),
        key=lambda u: (-int(u.get('contributions', 0) or 0), str(u.get('login', '')).lower()),
    )


_PER_PAGE = 100
_MAX_PAGES = 5  # 500 человек: страховка от бесконечного цикла, а не реальный предел


async def _fetch(client: httpx.AsyncClient, repo: str) -> list[dict]:
    """Все контрибьюторы репозитория. GitHub отдаёт их по 30 на страницу, так
    что берём по 100 и идём до конца — иначе длинный список молча обрежется."""
    users: list[dict] = []
    for page in range(1, _MAX_PAGES + 1):
        resp = await client.get(
            f'https://api.github.com/repos/{repo}/contributors',
            params={'per_page': _PER_PAGE, 'page': page},
        )
        resp.raise_for_status()
        data = resp.json()
        if not isinstance(data, list) or not data:
            break
        users.extend(u for u in data if isinstance(u, dict))
        if len(data) < _PER_PAGE:
            break
    return users


@router.get('/api/contributors')
async def contributors():
    now = monotonic()
    if _cache['html'] and (now - float(_cache['at'])) < _TTL:
        return HTMLResponse(str(_cache['html']))

    async with httpx.AsyncClient(timeout=5.0, headers={'User-Agent': _UA}) as client:
        results = await gather(
            *(_fetch(client, repo) for repo in _GH_REPOS), return_exceptions=True
        )

    users: list[list[dict]] = []
    for repo, result in zip(_GH_REPOS, results):
        if isinstance(result, BaseException):
            print(f'[contributors] {repo}: {result}')
        else:
            users.append(result)

    # Один упавший репозиторий не должен прятать людей из остальных — рисуем
    # то, что удалось получить, и только полный отказ уводит в кэш/502.
    if not users:
        if _cache['html']:
            return HTMLResponse(str(_cache['html']))
        # 502: the upstream (GitHub) failed; lets the loader render its own
        # recovery copy with a working link instead of duplicating it here.
        return HTMLResponse('', status_code=502)

    html = _render(_merge(users))

    _cache['html'] = html
    _cache['at'] = now
    return HTMLResponse(html)
