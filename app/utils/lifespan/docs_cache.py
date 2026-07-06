import asyncio, re
from pathlib import Path

from ..config import CONFIG
from ..docs import build_index, build_items, build_tree
from ..file import read_text, ROOT

from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('docs-cache')

async def worker_cache_docs():
    logger.info('Cache update worker started.')
    while True:
        await asyncio.sleep(60 * CONFIG.config.get('cache-update-delay', 1))
        await asyncio.to_thread(cache_docs)

def cache_docs(silent=False):
    path = Path(CONFIG.docs_path)
    if path.stat().st_mtime > CONFIG.page_last_edited:

        if not silent:
            logger.info('Changes in page files detected! Updating page file cache...')

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

        logger.info('Page file cache updated.')