import os
import yaml
from pathlib import Path

from .file import ROOT, resolve
from .logging import root_logger

# Returned by the lookup below when a key is absent, so that `None` stays a
# legitimate configured value rather than a synonym for "not set".
_MISSING = object()

class _ConfigContainer():

    _DEFAULT_CONFIG = {
        'assets-path': '',
        'support': [],

        # Article status banners. Authors choose a status in Markdown; site
        # configuration owns its wording, icon and semantic colour family.
        'banners': {
            'stub': {
                'title': 'Эта статья — заготовка.',
                'text': 'Скоро здесь будет новая статья, мы уже работаем над этим.',
                'icon': 'attention',
                'tone': 'attention',
            },
            'wip': {
                'title': 'Эта статья сейчас переписывается',
                'text': 'Над этой статьёй ведётся активная работа: '
                        'содержимое может измениться в любой момент, '
                        'поэтому не стоит опираться на него как на окончательное.',
                'icon': 'wip',
                'tone': 'info',
            },
            'outdated': {
                'title': 'Эта статья устарела',
                'text': 'Она не соответствует нашим стандартам качества и требует ревизии.',
                'icon': 'outdated',
                'tone': 'warning',
            },
        },

        # Where the derived-image caches live (composed sprites, thumbnails,
        # tints, hero downscales, fetched artist images). Relative paths anchor
        # to ROOT, like assets-path. `temp/` is what .gitignore excludes, so
        # moving this off the default means excluding the new location too.
        'cache-path': 'temp',

        # The site's own theme, offered on the home page. Empty `src` removes
        # the player from the page entirely — this is one specific track by one
        # specific author, not a site feature that has to exist.
        'theme-track': {
            'src': '/resource/community/music/progress.ogg',
            'artist': '140 kilograms of sex',
            'title': 'Progress',
        },

        # Operational tunables, read through CONFIG.setting() at the point of
        # use. Everything here was a literal buried in the module that happened
        # to need it; what qualified for the move is a number or string that an
        # operator might reasonably want different on their own box. Domain
        # vocabularies (the Ren'Py lexer's keywords, the resource taxonomy, the
        # callout registry) deliberately stayed in code — they are the shape of
        # the data, not settings.
        'settings': {
            # Below this, compressing costs more than it saves.
            'gzip-min-size': 500,
            # Cache-Control for immutable assets: raw game files, composed
            # images, article illustrations. A day, in seconds.
            'static-max-age': 86400,
            # Seconds a `git log` may run before the date lookup gives up and
            # falls back to file mtimes (utils/modified.py).
            'git-timeout': 15,
            # Above this many bytes the resource browser offers a download
            # instead of highlighting the file in the page.
            'file-view-max-bytes': 512 * 1024,

            'search': {
                'default-limit': 8,
                'max-limit': 25,
            },

            # The contributors strip on the home page, fetched from GitHub's
            # unauthenticated API (60 requests/hour, hence the cache).
            'contributors': {
                'repos': ['sovue/es-doc', 'sovue/es-doc-assets'],
                'user-agent': 'es-doc/contributors-widget (+https://github.com/sovue/es-doc)',
                'ttl': 300,
                'timeout': 5.0,
                'per-page': 100,
                'max-pages': 5,
                'avatar-size': 96,
            },

            # Every derived image the site produces. Quality is WebP's 0–100.
            'images': {
                'hero': {'width': 1600, 'quality': 75, 'narrow-aspect': 0.95},
                'thumb': {'box': 320, 'quality': 80},
                'sprite-quality': 90,
                'tint-quality': 90,
                'artist': {
                    # The box each kind is shown in, doubled for high-DPI
                    # screens: a preview fills a card of ~300×200, a logo a
                    # 30px circle. An image is scaled down to *cover* its box
                    # — the smallest size that still fills it on both axes —
                    # and never up.
                    'preview-box': [600, 400],
                    'logo-box': [96, 96],
                    'quality': 85,
                    'timeout': 10.0,
                    # Some hosts (VK's userapi CDN) refuse hotlinks or serve
                    # responses the browser blocks via ORB; a Referer helps
                    # with the hotlink checks.
                    'user-agent': 'es-doc/artist-images (+https://github.com/sovue/es-doc)',
                    'referer': 'https://vk.com/',
                },
            },
        },

        'http-errors': {
            'default': 'Во время загрузки страницы произошла ошибка. Попробуйте повторить запрос позже. Если проблема сохраняется — сообщите администрации.',
            400: [
                'Плохой запрос.',
                'Сервер не смог разпознать запрос, отправленный клиентом.'
            ],
            403: [
                'Доступ запрещён.',
                'Доступ к этой странице запрещён. Если вы считаете, что это ошибка — сообщите администрации.'
            ],
            404: [
                'Страница не найдена.',
                'Проверьте адрес страницы или вернитесь на главную.'
            ],
            418: [
                'Я чайник.',
                'В данный момент сервер является чайником и отказывается варить кофе. Если проблема сохраняется — сообщите администрации.'
            ],
            500: [
                'Внутренняя ошибка сервера.',
                'На сервере произошла непредвиденная ошибка. Попробуйте повторить запрос позже. Если проблема сохраняется — сообщите администрации.'
            ],
            503: [
                'Сервис временно недоступен.',
                'Сервис перегружен или находится на техническом обслуживании. Попробуйте повторить запрос позже. Если проблема сохраняется — сообщите администрации.'
            ]
        }
    }

    def __init__(self):
        self.config: dict = {}
        self.logger = root_logger.getChild('config')

        # Set by main.py before the --reload subprocess re-imports the app,
        # since that subprocess doesn't inherit sys.argv's --debug flag.
        # Gates the dev-only live-reload watcher and route (see
        # utils/lifespan/refresh.py, utils/livereload.py, routes/dev.py).
        self.debug = os.environ.get('ES_DOC_DEBUG') == '1'

        self.page_last_edited = 0
        # Derived caches refreshed alongside page_cache (see utils/lifespan.py):
        # search_index feeds tooling, search_items is the flat search corpus the
        # ranking scores over, docs_tree is the resolved /docs/ tree.
        self.search_index = []
        self.search_items = []
        self.docs_tree = []

        # Sprite name -> list of layer image paths (relative to res_path),
        # parsed from sprites.rpy at startup (see utils/lifespan/sprites_cache.py).
        # Sprites are composed lazily on first request and cached on disk.
        self.sprite_layers = {}

        # {'original': {category: items}, 'community': {...}} parsed from the
        # game's resources.rpy at startup (see utils/lifespan/resources_cache.py).
        self.resources = {}
        # Search-corpus rows for resources; docs_cache merges them into
        # search_items after every docs refresh.
        self.resource_search_items = []

        # Commission-artist directory, parsed from artists.yaml at startup
        # (see utils/lifespan/artists_cache.py). List of dicts:
        # {name, status, preview, logo, links}.
        self.artists = []

        # The project's own news posts, indexed from <assets>/news/*.md at
        # startup (see utils/lifespan/news_cache.py), newest first. List of
        # dicts: {slug, title, lead, date, date_iso, date_label}.
        self.news = []

        # Community news/content channels for /news/sources, parsed from
        # news.yaml (same module). List of dicts: {name, url, note}.
        self.news_sources = []

        # Everything on «Ресурсы сообщества» that isn't a scanned resource:
        # archives, tool sites, packs hosted elsewhere. Parsed from links.yaml
        # at startup (see utils/lifespan/links_cache.py). Same row shape as
        # news_sources: {name, url, note}.
        self.links = []

        # Curated short links: {key: target url}, parsed from redirects.yaml
        # at startup (see utils/lifespan/redirects_cache.py). Serves
        # /redirect/<key>/ so a link printed in a readme survives its target
        # moving.
        self.redirects = {}

        # Reading list, parsed from literature.yaml at startup (see
        # utils/lifespan/literature_cache.py). List of dicts:
        # {name, items: [{title, url}]}.
        self.literature = []

        # Community-made warpers, parsed from warpers.yaml at startup (see
        # utils/lifespan/warpers_cache.py). List of dicts:
        # {name, desc, author, url, expr, points}. The engine's own warpers
        # aren't here: they're static, in utils/warpers.py.
        self.warpers = []

        self.docs_path: Path = None
        self.res_path: Path = None
        self.cache_path: Path = None

    def setting(self, path: str):
        """One tunable, by dotted path — `CONFIG.setting('images.hero.width')`.

        Looks in the loaded config first, then in `_DEFAULT_CONFIG`, so a
        config.yaml written before a setting existed keeps working: the
        operator's file overrides what it mentions and inherits the rest. That
        also means nothing here is ever required to be present, which is why
        the callers can read a setting without a guard.

        Read at the point of use, not at import: routes and caches are imported
        before `setup()` runs, so a module-level constant built from this would
        capture the defaults and silently ignore config.yaml.
        """
        for source in (self.config.get('settings'), self._DEFAULT_CONFIG['settings']):

            value = source

            for key in path.split('.'):
                if not isinstance(value, dict) or key not in value:
                    value = _MISSING
                    break
                value = value[key]

            if value is not _MISSING:
                return value

        # Only reachable by asking for a name that isn't in the defaults
        # either — a typo in a call site, not a configuration problem.
        raise KeyError(f'Unknown setting: {path}')

    @property
    def theme_track(self) -> dict:
        """The home page's theme track, or an empty mapping if `src` is unset.

        The template renders nothing at all in that case, so a fork that
        doesn't have this particular song doesn't have to carry a player
        pointing at a missing file.
        """
        # Falls back to the default like `setting()` does, so a config.yaml
        # written before this key existed still gets the player. Removing it is
        # then explicit — `theme-track: {src: ''}` — rather than something that
        # happens by omission.
        track = self.config.get('theme-track')

        if track is None:
            track = self._DEFAULT_CONFIG['theme-track']

        return track if track.get('src') else {}

    @property
    def support(self) -> list:
        """Donation platforms for /support, straight from config.yaml.

        Lives in the app config rather than the assets repo (like news or
        literature) because it's the project's own identity, not curated
        content. Absent or empty is a valid state — the page falls back to
        the non-monetary ways to help instead of showing a dead link.
        """
        return self.config.get('support') or []

    def banner(self, name: str) -> dict:
        """Return one configured banner, including defaults for old configs."""
        defaults = self._DEFAULT_CONFIG['banners'].get(name, {})
        overrides = (self.config.get('banners') or {}).get(name) or {}
        if not defaults and not overrides:
            raise KeyError(f'Unknown banner: {name}')
        return defaults | overrides

    def banner_names(self) -> tuple[str, ...]:
        """Names accepted by the Markdown banner syntax.

        Once a config contains ``banners``, it is the source of truth: adding
        a key creates a new ``:::name`` block and removing one disables it.
        A config written before banners existed still receives the defaults.
        """
        configured = self.config.get('banners')
        if configured is None:
            configured = self._DEFAULT_CONFIG['banners']
        return tuple(configured)

    def setup(self, path):

        path = ROOT / path

        if path.exists():

            self.config = yaml.load(path.read_text('utf-8'), yaml.SafeLoader)
            self.logger.info('Configuration file loaded.')

        else:

            self.logger.info('Configuration file doesn\'t exist! Creating...')
            self.config = self.__class__._DEFAULT_CONFIG
            path.write_text(yaml.dump(self.config, Dumper=yaml.SafeDumper, allow_unicode=True, width=float('inf'), indent=4, sort_keys=False), encoding='utf-8')
            self.logger.info('Configuration file created.')

        # Anchor relative paths to ROOT (not the CWD) so the existence check
        # and every later read resolve the same way regardless of where the
        # server was launched from.
        assets_path = resolve(self.config.get('assets-path') or '')

        if not self.config.get('assets-path') or not assets_path.exists():
            self.logger.error('Assets folder not found, terminating app! Did you forget to change the assets-path in the config?')
            raise FileNotFoundError('Assets folder not found in current configuration')

        self.docs_path = assets_path / 'docs'
        self.res_path = assets_path / 'game'

        # Derived-image caches. Resolved here rather than at each cache
        # module's import, which happens before this method runs.
        self.cache_path = resolve(self.config.get('cache-path') or self._DEFAULT_CONFIG['cache-path'])

CONFIG = _ConfigContainer()
