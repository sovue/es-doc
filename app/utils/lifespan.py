import asyncio, re
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI

from .config import CONFIG
from .logging import root_logger
from .file import read_text

logger = root_logger.getChild('lifespan')

async def cache_update_worker():
    logger.info('Cache update worker started.')
    await update_cache(True)
    while True:
        await asyncio.sleep(60 * CONFIG.config.get('cache-update-delay', 1))
        await update_cache()

async def update_cache(silent=False):
    path = Path(CONFIG.config['docs']['path'])
    if path.stat().st_mtime > CONFIG.page_last_edited:

        if not silent:
            logger.info('Changes in pages detected! Updating file cache...')

        CONFIG.page_last_edited = path.stat().st_mtime
        for file in path.glob('*.md'):
            CONFIG.page_cache[file.stem] = re.sub(r'^(#+ )|(- )|(> )|(```\w*)|(:::\w*)|(---)$', '', read_text(file), flags=re.MULTILINE).replace('\n\n', '\n')

        logger.info('File cache updated.')

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('Lifespan started, starting workers...')
    asyncio.create_task(cache_update_worker())
    yield

