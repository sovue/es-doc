"""Response headers shared by the routes that serve files off disk.

Composed sprites, thumbnails, tints, hero downscales, raw game assets and
article illustrations all have the same cache story: the bytes behind a given
URL do not change while the server runs, so the client may keep them. That was
the same `max-age=86400` literal written out in two routers; it is one setting
now, read at call time because the routers are imported before the config file
is loaded.
"""

from .config import CONFIG


def cache_headers():
    return {'Cache-Control': f"public, max-age={CONFIG.setting('static-max-age')}"}
