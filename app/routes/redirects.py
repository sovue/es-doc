from fastapi.responses import RedirectResponse

from . import main_router

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
