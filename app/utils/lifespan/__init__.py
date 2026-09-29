import asyncio
import signal
from contextlib import asynccontextmanager

from fastapi import FastAPI

from ..config import CONFIG
from ..livereload import shutdown as shutdown_livereload
from ..logging import root_logger
from .artists_cache import parse_artists
from .docs_cache import cache_docs
from .links_cache import parse_links
from .materials_cache import parse_materials
from .news_resources_cache import parse_news_resources
from .redirects_cache import parse_redirects
from .refresh import worker_refresh_caches
from .resources_cache import parse_resources
from .sprites_cache import parse_sprites, sprites_path
from .warpers_cache import parse_warpers

logger = root_logger.getChild('lifespan')


def _release_streams_on_signal():
    """End the livereload streams the moment Ctrl+C is pressed.

    Uvicorn shuts down in that order: close the listening sockets, wait for
    open connections to finish, *then* run the lifespan's shutdown half
    (Server.shutdown → _wait_tasks_to_complete → lifespan.shutdown). A stream
    that only ends when the lifespan tears down therefore never ends at all —
    the wait is the very thing the teardown was supposed to release, and each
    half sits waiting for the other. The browser holds /dev/livereload open
    for as long as the tab is, so `pdm run dev` refused to stop until the last
    page on the site was closed.

    Breaking the tie needs a signal that arrives *before* that wait, which is
    what a handler chained in front of uvicorn's own gives us: uvicorn installs
    its handlers around `serve()`, and `serve()` is what runs this, so ours
    lands on top and still defers to the one underneath — `should_exit` and the
    force-quit on a second Ctrl+C behave exactly as they did.

    Setting the flag is handed to the loop rather than done here: a signal
    handler interrupts whatever the main thread was doing, and asyncio
    primitives are not safe to touch from inside one. `call_soon_threadsafe`
    also wakes a loop that was idle, which is precisely the case worth
    handling — nothing was happening, that's why the stream was waiting.
    """
    if not CONFIG.debug:
        return

    loop = asyncio.get_running_loop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        previous = signal.getsignal(sig)

        def handler(signum, frame, previous=previous):
            loop.call_soon_threadsafe(shutdown_livereload)
            if callable(previous):
                previous(signum, frame)

        try:
            signal.signal(sig, handler)
        except (ValueError, OSError):
            # Not the main thread, or a platform without this signal. The
            # dev server then falls back to uvicorn's own graceful-shutdown
            # timeout (main.py), which bounds the wait instead of removing it.
            logger.warning(f'Could not hook {sig.name}; Ctrl+C may take a few seconds.')


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('Lifespan started, starting workers...')

    _release_streams_on_signal()

    # The sprite cache is kept across restarts on purpose: composing every
    # sprite again on each launch is minutes of CPU on the target machine.
    # Stale entries are detected per-sprite against sprites.rpy's mtime.
    sprites_path().mkdir(parents=True, exist_ok=True)

    try:
        await asyncio.to_thread(parse_sprites)
    except Exception:
        logger.exception('Parsing sprites.rpy failed; sprite routes will 404 until restart.')

    # Depends on parse_sprites for the composable sprite names.
    try:
        await asyncio.to_thread(parse_resources)
    except Exception:
        logger.exception('Parsing resources failed; /resources/ pages will be empty until restart.')

    try:
        await asyncio.to_thread(parse_artists)
    except Exception:
        logger.exception('Parsing artists.yaml failed; /artists will be empty until restart.')

    try:
        await asyncio.to_thread(parse_news_resources)
    except Exception:
        logger.exception('Parsing news_resources.yaml failed; /news-resources will be empty until restart.')

    try:
        await asyncio.to_thread(parse_materials)
    except Exception:
        logger.exception('Parsing materials.yaml failed; /materials will be empty until restart.')

    try:
        await asyncio.to_thread(parse_links)
    except Exception:
        logger.exception('Parsing links.yaml failed; the community links section will be empty until restart.')

    try:
        await asyncio.to_thread(parse_redirects)
    except Exception:
        logger.exception('Parsing redirects.yaml failed; /redirect/<key>/ will 404 until restart.')

    try:
        await asyncio.to_thread(parse_warpers)
    except Exception:
        logger.exception('Parsing warpers.yaml failed; the community warper section will be empty until restart.')

    # Populate the caches before the app starts serving so the first request
    # never races an empty tree or search corpus.
    try:
        await asyncio.to_thread(cache_docs, True)
    except Exception:
        logger.exception('Initial cache build failed; caches start empty until the next refresh.')

    # One periodic worker refreshes every cache from here on: content edits
    # on disk (docs, yaml lists, game resources) reach the site without a
    # restart (see refresh.py).
    worker = asyncio.create_task(worker_refresh_caches())

    yield

    shutdown_livereload()
    worker.cancel()
