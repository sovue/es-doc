import yaml
from pathlib import Path

from .file import ROOT, resolve
from .logging import root_logger

class _ConfigContainer():

    _DEFAULT_CONFIG = {
        'cache-update-delay': 5,
        'assets-path': '',
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

        self.page_cache = {}
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

        self.docs_path: Path = None
        self.res_path: Path = None

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

CONFIG = _ConfigContainer()
