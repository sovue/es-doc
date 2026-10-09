"""Merge the global search corpus and cache navigable game paths."""

from urllib.parse import quote, urlencode

from ..config import CONFIG
from ..docs import build_items
from ..specialists import CATEGORIES
from .resources_cache import CATEGORY_TITLES

SECTIONS = (
    ('Главная', '/'),
    ('Документация', '/docs/'),
    ('Ресурсы', '/resources/'),
    ('Ресурсы оригинала', '/resources/original'),
    ('Ресурсы сообщества', '/resources/community'),
    ('Браузер файлов', '/resources/browser'),
    ('Специалисты', '/specialists'),
    ('Материалы', '/materials'),
    ('Инструменты', '/tools'),
    ('Архивация RPA и декомпиляция RPYC/PYC / Упаковщик и распаковщик RPA / RenPy / Python / UnRpyc / UnRPA / uncompyle6', '/tools/unpack'),
    ('Палитра цветов / Цвет / HEX / RGB / Палитры', '/tools/colors'),
    ('Варперы / Сглаживание ATL / Тестер формул', '/tools/warpers'),
    ('Площадки для публикации', '/news-resources'),
    ('Авторы', '/authors'),
    ('Поддержка', '/support'),
)


def _section_items():
    items = [
        {'label': label, 'url': url, 'kind': 'section', 'context': 'Раздел сайта'}
        for label, url in SECTIONS
    ]
    for collection in ('original', 'community'):
        for category, title in CATEGORY_TITLES.items():
            if category not in CONFIG.resources.get(collection, {}):
                continue
            items.append({
                'label': title, 'url': f'/resources/{collection}/{category}',
                'kind': 'section',
                'context': 'Ресурсы оригинала' if collection == 'original' else 'Ресурсы сообщества',
            })
    items.extend({
        'label': meta['label'], 'url': '/specialists?' + urlencode({'category': key}),
        'kind': 'section', 'context': 'Специалисты',
    } for key, meta in CATEGORIES.items())
    return items


def _specialist_items():
    return [{
        'label': person['name'], 'desc': person.get('description') or '',
        'keywords': ' '.join([person['category_label'], *[work['title'] for work in person['works']]]),
        'context': 'Специалисты / ' + person['category_label'], 'kind': 'specialist',
        'url': '/specialists?' + urlencode({'category': person['categories'][0]})
               + '#specialist-' + quote(person['slug'], safe=''),
    } for person in CONFIG.specialists]


def cache_browser():
    """Index paths once per refresh, using the browser route's game/ boundary."""
    base = CONFIG.res_path.resolve()
    items = []
    if base.is_dir():
        for path in sorted(base.rglob('*'), key=lambda path: path.as_posix().casefold()):
            if not path.resolve().is_relative_to(base) or not (path.is_file() or path.is_dir()):
                continue
            rel = path.relative_to(base).as_posix()
            items.append({
                'label': path.name, 'desc': rel,
                'context': 'Браузер файлов / ' + ('Папка' if path.is_dir() else str(path.parent.relative_to(base).as_posix())),
                'url': '/resources/browser/' + quote(rel), 'kind': 'file',
            })
    CONFIG.browser_search_items = items


def rebuild_search():
    """Swap the merged corpus after any one of its sources has refreshed."""
    warpers = [{
        'label': item['name'], 'desc': item.get('desc') or '',
        'keywords': item.get('author') or '',
        'context': 'Инструменты / Варперы', 'kind': 'section',
        'url': '/tools/warpers#' + quote(item['name'], safe=''),
    } for item in CONFIG.warpers]
    CONFIG.search_items = (
        _section_items() + build_items(CONFIG.search_index)
        + CONFIG.resource_search_items + warpers + _specialist_items() + CONFIG.browser_search_items
    )
