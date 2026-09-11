import asyncio
from pathlib import Path

from watchfiles import awatch

from ..config import CONFIG
from ..file import ROOT
from ..livereload import bump
from ..logging import root_logger

from .artists_cache import parse_artists
from .docs_cache import cache_docs
from .links_cache import parse_links
from .literature_cache import parse_literature
from .news_cache import news_posts_path, parse_news_posts, parse_news_sources
from .redirects_cache import parse_redirects
from .resources_cache import parse_resources
from .sprites_cache import parse_sprites
from .warpers_cache import parse_warpers

logger = root_logger.getChild('lifespan').getChild('refresh')


def _assets_root():
    return CONFIG.docs_path.parent


def _resync_search():
    # Rebuilt resource rows must reach the merged search corpus even when no
    # doc changed; forcing the docs cache stale makes the cache_docs pass at
    # the end of the same batch re-merge everything.
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


def _refresh_docs():
    # Unconditional, unlike the plain cache_docs() call this replaced. That
    # one re-read the directory only when some `*.md` mtime had moved, which
    # silently excluded every non-markdown file in it — tree.yaml above all.
    # Editing the tree changed what /docs/ should list and nothing noticed
    # until the next restart. The watcher already knows a file under docs/
    # changed, so the mtime scan has nothing left to decide.
    CONFIG.page_last_edited = 0
    cache_docs()


def _under(directory: Path):
    """Match a path inside `directory`, at any depth."""
    directory = directory.resolve()
    return lambda path: path == directory or directory in path.parents


def _one_of(*paths: Path):
    """Match one of these exact files."""
    targets = {p.resolve() for p in paths}
    return lambda path: path in targets


def _watchers():
    """`(name, matches, refresh)` for every cache fed from disk.

    Built at worker start rather than at import, because every path here is
    read off CONFIG, which is only populated once the config file has been
    loaded.
    """
    assets = _assets_root()
    res = CONFIG.res_path

    return [
        ('sprites.rpy', _one_of(
            res / 'sprites.rpy',
            # Declares sprites too (parsed by parse_sprites), so it lives in
            # this watcher rather than the resources one — the sprite re-parse
            # already chains into a resources re-parse.
            res / 'scenario' / 'zhenya.rpy',
        ), _refresh_sprites),

        ('resources', _one_of(
            res / 'resources.rpy',
            res / 'media.rpy',
            assets / 'descriptions.yaml',
            assets / 'nsfw.yaml',
            assets / 'community' / 'resources.rpy',
            assets / 'community' / 'sprites.rpy',
        ), _refresh_resources),

        ('artists.yaml', _one_of(assets / 'artists.yaml'), parse_artists),
        ('news.yaml', _one_of(assets / 'news.yaml'), parse_news_sources),
        # The posts themselves: adding, editing or renaming one re-indexes
        # /news, including a news/ folder created after startup.
        ('news', _under(news_posts_path()), parse_news_posts),
        ('literature.yaml', _one_of(assets / 'literature.yaml'), parse_literature),
        ('links.yaml', _one_of(assets / 'links.yaml'), parse_links),
        ('redirects.yaml', _one_of(assets / 'redirects.yaml'), parse_redirects),
        ('warpers.yaml', _one_of(assets / 'warpers.yaml'), parse_warpers),

        # Everything under docs/: the articles themselves, tree.yaml, and the
        # images they embed. Docs go last in this list on purpose — see the
        # dispatch loop.
        ('docs', _under(CONFIG.docs_path), _refresh_docs),
    ]


async def worker_refresh_caches():
    """Re-parse a cache the moment the files behind it change on disk.

    This used to be a polling loop that re-stat'd a fixed list of files once a
    minute, so an edit was live somewhere between instantly and a minute later,
    and a file nobody had thought to list was never noticed at all. `awatch`
    subscribes to the OS instead (ReadDirectoryChangesW, inotify, kqueue), so
    the cost is one handle rather than a stat per file per tick, and the whole
    assets tree is covered by watching its root — including files added after
    this code was written.

    awatch's own debounce does the coalescing: a `git pull` that rewrites forty
    articles arrives as one batch, not forty refreshes. Anything that raises is
    logged and dropped, keeping the previous cache and the watch alive — a
    malformed YAML saved mid-edit must not take the watcher down with it.

    In debug mode this also watches templates/ and static/, and notifies the
    dev-server browser reload (utils/livereload.py) of every batch — those two
    directories need no cache refresh of their own (Jinja reloads templates
    per-request, and static/css/js are read fresh per-request too), only the
    reload signal.
    """
    assets = _assets_root()
    watchers = _watchers()
    extra_paths = [ROOT / 'templates', ROOT / 'static'] if CONFIG.debug else []

    logger.info(f'Cache refresh worker started; watching {assets}')

    try:
        async for batch in awatch(assets, *extra_paths, recursive=True):
            changed = {Path(path).resolve() for _change, path in batch}

            if CONFIG.debug:
                bump()

            # In declaration order, which puts docs last: a resources re-parse
            # in this same batch marks the search corpus stale (_resync_search),
            # and the docs pass is what merges it back in.
            for name, matches, refresh in watchers:
                if not any(matches(path) for path in changed):
                    continue

                logger.info(f'Change detected in {name}; refreshing its cache...')

                try:
                    await asyncio.to_thread(refresh)
                except Exception:
                    logger.exception(f'Refreshing {name} failed; keeping the previous cache.')

    except asyncio.CancelledError:
        logger.info('Cache refresh worker stopped.')
        raise

    except Exception:
        # The watch itself died — an unreadable assets root, a platform
        # backend failure. Say so loudly: from here on the site serves
        # whatever it last parsed, and only a restart will change that.
        logger.exception('File watcher stopped unexpectedly; caches are now frozen until restart.')
