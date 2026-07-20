import asyncio

from ..config import CONFIG
from ..logging import root_logger

from .artists_cache import parse_artists
from .docs_cache import cache_docs
from .literature_cache import parse_literature
from .news_cache import parse_news
from .resources_cache import parse_resources
from .sprites_cache import parse_sprites

logger = root_logger.getChild('lifespan').getChild('refresh')


def _assets_root():
    return CONFIG.docs_path.parent


def _resync_search():
    # Rebuilt resource rows must reach the merged search corpus even when no
    # doc changed; forcing the docs cache stale makes the cache_docs pass at
    # the end of the same worker tick re-merge everything.
    CONFIG.page_last_edited = 0


def _refresh_sprites():
    # Resources depend on the sprite layer map (composable sprite names), so
    # a sprites.rpy change re-parses both, in startup order.
    parse_sprites()
    parse_resources()
    _resync_search()


def _refresh_resources():
    parse_resources()
    _resync_search()


# Every startup parse that used to live "until restart" gets a watcher:
# name → the source files whose mtimes betray a change → the re-parse.
# Paths are lazy so CONFIG is read at tick time, not import time.
WATCHERS = [
    ('sprites.rpy',
     lambda: [
         CONFIG.res_path / 'sprites.rpy',
         # Declares sprites too (parsed by parse_sprites), so it lives in
         # this watcher rather than the resources one — the sprite re-parse
         # already chains into a resources re-parse.
         CONFIG.res_path / 'scenario' / 'zhenya.rpy',
     ],
     _refresh_sprites),
    ('resources',
     lambda: [
         CONFIG.res_path / 'resources.rpy',
         CONFIG.res_path / 'media.rpy',
         _assets_root() / 'descriptions.yaml',
         _assets_root() / 'community' / 'resources.rpy',
         _assets_root() / 'community' / 'sprites.rpy',
     ],
     _refresh_resources),
    ('artists.yaml', lambda: [_assets_root() / 'artists.yaml'], parse_artists),
    ('news.yaml', lambda: [_assets_root() / 'news.yaml'], parse_news),
    ('literature.yaml', lambda: [_assets_root() / 'literature.yaml'], parse_literature),
]


def _stamp(paths):
    # Which files exist and when they last changed — a create or delete
    # changes the tuple just like an edit does.
    return tuple((str(p), p.stat().st_mtime) for p in paths() if p.exists())


async def worker_refresh_caches():
    """One periodic loop for every cache: re-parse a source when its files
    change on disk, then let cache_docs do its own mtime-driven refresh.
    Replaces a server restart as the way content edits reach the site."""
    logger.info('Cache refresh worker started.')

    stamps = {name: _stamp(paths) for name, paths, _ in WATCHERS}

    while True:
        await asyncio.sleep(60 * CONFIG.config.get('cache-update-delay', 1))

        for name, paths, refresh in WATCHERS:
            stamp = _stamp(paths)
            if stamp == stamps[name]:
                continue
            logger.info(f'Change detected in {name}; refreshing its cache...')
            try:
                await asyncio.to_thread(refresh)
                stamps[name] = stamp
            except Exception:
                # Keep the old cache and the old stamp: the next tick retries.
                logger.exception(f'Refreshing {name} failed; keeping the previous cache.')

        # Docs last, so a resources refresh in this same tick is merged into
        # the search corpus right away (see _resync_search).
        try:
            await asyncio.to_thread(cache_docs)
        except Exception:
            logger.exception('Docs cache refresh failed; keeping the previous cache.')
