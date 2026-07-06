import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI

from ..logging import root_logger

from .docs_cache import cache_docs, worker_cache_docs
from .resources_cache import parse_resources
from .sprites_cache import parse_sprites, SPRITES_PATH

logger = root_logger.getChild('lifespan')

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('Lifespan started, starting workers...')

    # The sprite cache is kept across restarts on purpose: composing every
    # sprite again on each launch is minutes of CPU on the target machine.
    # Stale entries are detected per-sprite against sprites.rpy's mtime.
    SPRITES_PATH.mkdir(parents=True, exist_ok=True)

    try:
        await asyncio.to_thread(parse_sprites)
    except Exception:
        logger.exception('Parsing sprites.rpy failed; sprite routes will 404 until restart.')

    # Depends on parse_sprites for the composable sprite names.
    try:
        await asyncio.to_thread(parse_resources)
    except Exception:
        logger.exception('Parsing resources failed; /resources/ pages will be empty until restart.')

    # Populate the caches before the app starts serving so the first request
    # never races an empty tree or search corpus.
    try:
        await asyncio.to_thread(cache_docs, True)
    except Exception:
        logger.exception('Initial cache build failed; caches start empty until the next refresh.')

    worker = asyncio.create_task(worker_cache_docs())

    yield

    worker.cancel()
