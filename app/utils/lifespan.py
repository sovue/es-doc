import asyncio, re
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI

from .config import CONFIG
from .logging import root_logger
from .file import read_text
from .docs import build_index, build_items, build_tree

logger = root_logger.getChild('lifespan')

async def cache_update_worker():
    logger.info('Cache update worker started.')
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

        # Rebuild the derived caches from the same refresh so /api/search and
        # /docs/ serve from memory instead of re-scanning the docs dir per
        # request. The tree reuses this scan's index rather than scanning again.
        index = build_index()
        CONFIG.search_index = index
        CONFIG.search_items = build_items(index)
        CONFIG.docs_tree = build_tree(index)

        logger.info('File cache updated.')

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('Lifespan started, starting workers...')
    # Populate the caches before the app starts serving so the first request
    # never races an empty tree or search corpus.
    try:
        await update_cache(True)
    except Exception:
        logger.exception('Initial cache build failed; caches start empty until the next refresh.')
    asyncio.create_task(cache_update_worker())
    yield
