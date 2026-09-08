from fastapi import HTTPException
from fastapi.responses import RedirectResponse

from . import main_router
from ..utils.config import CONFIG

router = main_router

# Near-miss URLs — the singular of a plural section, an obvious abbreviation,
# the word a reader might type from memory. Each one lands on the page it was
# reaching for instead of the 404.
#
# FastAPI already redirects a missing/extra trailing slash on a real route, so
# `/docs` -> `/docs/` needs nothing here. These are only the aliases that are
# not routes at all. Both slash forms are registered for each so an alias
# resolves in one hop rather than bouncing through the slash redirect first.
#
# `/resource` is deliberately the bare path only: `/resource/...` is the live
# prefix that serves raw game assets, sprites and thumbnails (res.py), and
# must keep 404-ing on a bad sub-path rather than quietly redirecting.
ALIASES = {
    '/res':           '/resources/',
    '/resource':      '/resources/',
    '/resourses':     '/resources/',

    '/doc':           '/docs/',
    '/documentation': '/docs/',
    '/wiki':          '/docs/',
    '/guide':         '/docs/',

    '/artist':        '/artists',
    '/author':        '/authors',
    '/contributors':  '/authors',

    '/lit':           '/literature',
    '/books':         '/literature',
}


def _redirect_to(target):
    async def handler():
        # 308: permanent, and keeps the method — a plain 301 is allowed to
        # rewrite POST to GET, which would quietly change what a link does.
        return RedirectResponse(target, status_code=308)
    return handler


for _alias, _target in ALIASES.items():
    for _path in (_alias, _alias + '/'):
        router.add_api_route(
            _path,
            _redirect_to(_target),
            methods=['GET'],
            include_in_schema=False,
        )


# ── Curated short links: /redirect/<key>/ ────────────────────────────────
#
# The aliases above are hard-coded because they are facts about this site's
# own URL shape. These are the opposite: a table of outbound links kept in
# the assets repo (redirects.yaml), edited by whoever maintains the content
# and reloaded without a restart, like every other list the site reads.
#
# What it buys is a stable address for a moving target. A key printed in a
# mod's readme or pasted into a chat — `es-doc.ru/redirect/estool/` — keeps
# working when the tool moves to a new host, because the fix is one line in
# a YAML file instead of an edit to every place the old URL was written.
@router.get('/redirect/{key}', include_in_schema=False)
@router.get('/redirect/{key}/', include_in_schema=False)
async def short_link(key: str):
    target = CONFIG.redirects.get(key.strip().lower())

    if not target:
        # A styled 404 through the app's own handler, not a bare error: an
        # unknown key usually means a typo or a link that was retired, and
        # the error page offers the three ways back that a reader needs.
        raise HTTPException(404, f'Короткой ссылки "{key}" не существует.')

    # 307, not 308: these targets are expected to move — that is the whole
    # point of the indirection — so nothing downstream should cache the
    # current destination as permanent.
    return RedirectResponse(target, status_code=307)
