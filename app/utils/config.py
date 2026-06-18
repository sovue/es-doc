import yaml

from .file import ROOT
from .logging import root_logger

class _ConfigContainer():

    _DEFAULT_CONFIG = {
        'docs': {
            'path': 'content/docs'
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
        self.config = {}
        self.logger = root_logger.getChild('config')

    def setup(self, path):

        path = ROOT / path

        if path.exists():

            self.config = yaml.load(path.read_text('utf-8'), yaml.SafeLoader)
            self.logger.info('Configuration file loaded.')

        else:

            self.logger.info('Configuration file doesn\'t exist! Creating...')
            self.config = self.__class__._DEFAULT_CONFIG
            path.write_text(yaml.dump(self.config, Dumper=yaml.SafeDumper, allow_unicode=True, width=float('inf'), indent=4), encoding='utf-8')
            self.logger.info('Configuration file created.')

CONFIG = _ConfigContainer()
