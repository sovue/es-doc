import asyncio, shutil
from contextlib import asynccontextmanager
from fastapi import FastAPI

from ..config import CONFIG
from ..file import ROOT
from ..logging import root_logger

from .docs_cache import cache_docs, worker_cache_docs
from .sprites_cache import cache_sprites

logger = root_logger.getChild('lifespan')

temp_path = ROOT / 'temp'

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('Lifespan started, starting workers...')

    temp_path.mkdir(exist_ok=True)
    logger.info('Temp folder created')

    CONFIG.current_tasks['cache_sprites'] = asyncio.create_task(asyncio.to_thread(cache_sprites))

    # Populate the caches before the app starts serving so the first request
    # never races an empty tree or search corpus.
    try:
        CONFIG.current_tasks['cache_docs'] = asyncio.create_task(asyncio.to_thread(cache_docs, True))
    except Exception:
        logger.exception('Initial cache build failed; caches start empty until the next refresh.')
    CONFIG.current_tasks['worker_cache_sprites'] = asyncio.create_task(worker_cache_docs())

    yield

    shutil.rmtree(temp_path)
    logger.info('Temp folder deleted')
