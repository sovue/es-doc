from ..config import CONFIG
from ..docs import build_index, build_items, build_tree

from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('docs-cache')

# Refresh is event-driven: refresh.py's file watcher calls this the moment
# something under docs/ changes on disk, having first cleared
# CONFIG.page_last_edited so the mtime guard below cannot veto a change the
# OS already reported.

def cache_docs(silent=False):
    path = CONFIG.docs_path

    # The directory mtime only changes on add/delete/rename, not when a file
    # is edited in place, so take the newest mtime across the files too.
    files = list(path.glob('*.md'))
    last_edited = max([path.stat().st_mtime] + [file.stat().st_mtime for file in files])

    if last_edited > CONFIG.page_last_edited:

        if not silent:
            logger.info('Changes in page files detected! Updating page file cache...')

        CONFIG.page_last_edited = last_edited

        # Build everything off to the side, then swap with single assignments:
        # this runs in a worker thread while the event loop serves from the
        # old caches, so readers never see a half-rebuilt state.
        #
        # A `page_cache` of every article stripped of its markdown used to be
        # built here as well — a regex pass over the whole corpus on every
        # refresh, kept in memory, and read by nothing. The one caller that
        # wants stripped text (`?s` on the doc route) does that strip per
        # request, on the file it has already opened.
        #
        # Rebuild the derived caches from the same refresh so /api/search and
        # /docs/ serve from memory instead of re-scanning the docs dir per
        # request. The tree reuses this scan's index rather than scanning again.
        index = build_index()

        CONFIG.search_index = index
        # Docs first, resources after: the search endpoint breaks score ties on
        # corpus order, and the dropdown splits the two kinds visually.
        CONFIG.search_items = build_items(index) + CONFIG.resource_search_items
        CONFIG.docs_tree = build_tree(index)

        logger.info('Page file cache updated.')
