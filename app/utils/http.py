"""Response headers shared by the routes that serve files off disk.

Composed sprites, thumbnails, tints, hero downscales, raw game assets and
article illustrations all have the same cache story: the bytes behind a given
URL do not change while the server runs, so the client may keep them. That was
the same `max-age=86400` literal written out in two routers; it is one setting
now, read at call time because the routers are imported before the config file
is loaded.

Most of those bytes are also already compressed. GZipMiddleware (app.py)
compresses anything over `gzip-min-size` whatever its type, so every WebP the
site composes went through gzip on every request for a byte or two back.
`precompressed=True` opts a response out the way the font and SSE routes
already do: GZipMiddleware leaves a response alone once it carries a
`Content-Encoding` of its own.
"""

from pathlib import Path

from .config import CONFIG

# Formats that arrive compressed: images, audio, video, fonts, archives.
# Everything else — scripts, text, JSON, uncompressed images like BMP — still
# goes through gzip, where it pays.
PRECOMPRESSED_SUFFIXES = frozenset({
    '.webp', '.png', '.jpg', '.jpeg', '.gif', '.avif',
    '.ogg', '.opus', '.mp3', '.m4a',
    '.webm', '.mp4', '.mkv',
    '.woff2', '.woff',
    '.zip', '.7z', '.gz',
})


def is_precompressed(path):
    return Path(path).suffix.lower() in PRECOMPRESSED_SUFFIXES


def cache_headers(precompressed=False):
    headers = {'Cache-Control': f"public, max-age={CONFIG.setting('static-max-age')}"}
    if precompressed:
        headers['Content-Encoding'] = 'identity'
    return headers
