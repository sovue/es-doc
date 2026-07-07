import html
import os
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Request, HTTPException

from . import main_router
from ..utils.config import CONFIG
from ..utils.file import templates
from ..utils.lifespan.resources_cache import BG_TIME_LABELS, CATEGORY_TITLES
from ..utils.md import highlight_code

router = APIRouter(prefix='/resources')

COLLECTIONS = {
    'original': {
        'title': 'Ресурсы оригинала',
        'lead': 'Все ресурсы «Бесконечного Лета» с именами, под которыми они объявлены в игре. Имя копируется в один клик и сразу готово к использованию в коде мода.',
    },
    'community': {
        'title': 'Ресурсы сообщества',
        'lead': 'Ресурсы, созданные сообществом для использования в модах, а также вырезанные из игры NSFW-арты оригинала. Раздел ещё наполняется.',
    },
}

# Titles live in resources_cache.CATEGORY_TITLES (shared with the search
# corpus); this table adds the page-level meta. Order here is display order.
CATEGORIES = {
    'bg': {
        'desc': 'Фоновые изображения локаций (БГ)',
        'usage': 'scene bg ext_beach_day with dissolve',
        'media': 'image',
    },
    'cg': {
        'desc': 'Полноэкранные иллюстрации сцен (CG)',
        'usage': 'scene cg d1_sl_dinner with dissolve',
        'media': 'image',
    },
    'sprites': {
        'desc': 'Позы и эмоции персонажей',
        'usage': 'show dv smile pioneer2 at left',
        'media': 'sprites',
    },
    'anim': {
        'desc': 'Кадры анимаций и спецэффектов',
        'usage': 'show anim blink_down',
        'media': 'image',
    },
    'sfx': {
        'desc': 'Одиночные звуки для канала sound',
        'usage': 'play sound sfx_dinner_horn_processed',
        'media': 'audio',
    },
    'ambience': {
        'desc': 'Фоновый шум локаций для канала ambience',
        'usage': 'play ambience ambience_camp_center_day fadein 1',
        'media': 'audio',
    },
    'music': {
        'desc': 'Треки для канала music',
        'usage': 'play music music_list["afterword"] fadein 2',
        'media': 'audio',
    },
}

for slug, meta in CATEGORIES.items():
    meta['title'] = CATEGORY_TITLES[slug]


def _count(category, items):
    # Hub and switcher counts cover declared resources only; undeclared files
    # sit behind their toggle and are not part of the headline numbers.
    if category == 'sprites':
        return sum(len(group['sprites']) for group in items)
    return sum(1 for i in items if i['declared'])


def _collection_or_404(collection):
    if collection not in COLLECTIONS or collection not in CONFIG.resources:
        raise HTTPException(404, f'Коллекция "{collection}" не существует.')
    return CONFIG.resources[collection]


def _hub(request, collection):
    data = _collection_or_404(collection)
    categories = [
        {'slug': slug, 'count': _count(slug, data[slug]), **CATEGORIES[slug]}
        for slug in CATEGORIES if slug in data
    ]
    return templates.TemplateResponse(request, 'resources_index.html', {
        'collection': collection,
        'collection_meta': COLLECTIONS[collection],
        'categories': categories,
        'total': sum(c['count'] for c in categories),
    })


@router.get('/')
async def index(request: Request):
    return _hub(request, 'original')


@router.get('/community')
async def community(request: Request):
    return _hub(request, 'community')


# ── «Браузер ресурсов»: a read-only explorer over the game folder ──────

# What a file is, by extension — drives the row icon, the type label and
# which preview affordance (lightbox / player) the row gets.
FILE_KINDS = {
    '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.webp': 'image', '.gif': 'image',
    '.ogg': 'audio', '.mp3': 'audio', '.wav': 'audio', '.opus': 'audio',
    '.webm': 'video', '.avi': 'video', '.mpg': 'video', '.mp4': 'video',
    # .rpyc is compiled (binary), deliberately not 'code'.
    '.rpy': 'code', '.py': 'code',
    '.ttf': 'font', '.otf': 'font',
    '.txt': 'text', '.md': 'text', '.json': 'text', '.yaml': 'text', '.csv': 'text',
}

KIND_LABELS = {
    'image': 'изображение', 'audio': 'звук', 'video': 'видео',
    'code': 'скрипт', 'font': 'шрифт', 'text': 'текст', 'other': 'файл',
}

# Syntax for the in-site file viewer; suffixes absent here render as plain
# text. The Ren'Py lexer is the same one the docs' code fences use.
VIEW_LANGS = {'.rpy': 'renpy', '.py': 'python', '.json': 'json', '.yaml': 'yaml', '.md': 'markdown'}

# sprites.rpy is 800+ KB — a highlighted DOM that size helps nobody on the
# target hardware. Bigger files point at raw/download instead.
VIEW_TEXT_LIMIT = 512 * 1024


def _plural(n, one, few, many):
    if n % 10 == 1 and n % 100 != 11:
        return f'{n} {one}'
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return f'{n} {few}'
    return f'{n} {many}'


def _human_size(n):
    if n < 1024:
        return f'{n} Б'
    for unit in ('КБ', 'МБ', 'ГБ'):
        n /= 1024
        if n < 1024 or unit == 'ГБ':
            break
    return f'{n:.1f}'.replace('.', ',').removesuffix(',0') + f' {unit}'


def _file_view(target):
    """What the viewer page shows for one file: highlighted code, an image,
    a player, a font specimen — or an honest «no preview»."""
    kind = FILE_KINDS.get(target.suffix.lower(), 'other')

    if kind in ('code', 'text'):
        if target.stat().st_size > VIEW_TEXT_LIMIT:
            return {'mode': 'toobig'}
        text = target.read_text('utf-8', errors='replace')
        lang = VIEW_LANGS.get(target.suffix.lower())
        code = highlight_code(text, lang, None) if lang else ''
        return {
            'mode': 'code',
            'code': code or html.escape(text),
            'lines': _plural(text.count('\n') + 1, 'строка', 'строки', 'строк'),
        }

    return {'mode': kind if kind in ('image', 'audio', 'video', 'font') else 'none'}


@router.get('/browser')
@router.get('/browser/{path:path}')
async def browser(request: Request, path=''):
    # Confine to the game folder: {path:path} accepts ".." segments, which
    # must not escape it (same discipline as /resource/raw).
    base = CONFIG.res_path.resolve()
    target = (base / path).resolve()

    if not target.is_relative_to(base) or not (target.is_dir() or target.is_file()):
        raise HTTPException(404, f'Пути "{path}" не существует.')

    rel = '' if target == base else target.relative_to(base).as_posix()

    # game › images › bg — every ancestor is one click away.
    crumbs, href = [('game', '/resources/browser')], '/resources/browser'
    for part in (rel.split('/') if rel else []):
        href += '/' + quote(part)
        crumbs.append((part, href))

    # A file path opens the viewer page.
    if target.is_file():
        size = target.stat().st_size
        kind = FILE_KINDS.get(target.suffix.lower(), 'other')
        view = _file_view(target)
        sub = [KIND_LABELS[kind], _human_size(size)]
        if view['mode'] == 'code':
            sub.append(view['lines'])
        return templates.TemplateResponse(request, 'resources_viewer.html', {
            'crumbs': crumbs,
            'name': target.name,
            'code': f'"{rel}"',
            'raw': f'/resource/raw/{quote(rel)}',
            'sub': ' · '.join(sub),
            'view': view,
        })

    dirs, files = [], []
    for entry in sorted(os.scandir(target), key=lambda e: e.name.lower()):
        erel = f'{rel}/{entry.name}' if rel else entry.name
        if entry.is_dir():
            count = len(os.listdir(entry.path))
            dirs.append({
                'name': entry.name,
                'href': f'/resources/browser/{quote(erel)}',
                'size': count,
                'sub': _plural(count, 'элемент', 'элемента', 'элементов'),
            })
        else:
            size = entry.stat().st_size
            kind = FILE_KINDS.get(Path(entry.name).suffix.lower(), 'other')
            files.append({
                'name': entry.name,
                # Ready for game code: paths in Ren'Py are quoted and
                # relative to game/.
                'code': f'"{erel}"',
                'raw': f'/resource/raw/{quote(erel)}',
                'href': f'/resources/browser/{quote(erel)}',
                'size': size,
                'sub': f'{KIND_LABELS[kind]} · {_human_size(size)}',
                'kind': kind,
            })

    stats = ' · '.join(filter(None, [
        _plural(len(dirs), 'папка', 'папки', 'папок') if dirs else '',
        _plural(len(files), 'файл', 'файла', 'файлов') if files else '',
        _human_size(sum(f['size'] for f in files)) if files else '',
    ]))

    return templates.TemplateResponse(request, 'resources_browser.html', {
        'crumbs': crumbs,
        'dirs': dirs,
        'files': files,
        'total': len(dirs) + len(files),
        'stats': stats,
        'folder': crumbs[-1][0],
    })


@router.get('/{collection}/{category}')
async def listing(collection, category, request: Request):
    data = _collection_or_404(collection)

    if category not in CATEGORIES or category not in data:
        raise HTTPException(404, f'Раздел "{category}" не существует.')

    items = data[category]
    # The other collection's tab keeps the category when it exists there,
    # falling back to that collection's hub.
    other = 'community' if collection == 'original' else 'original'
    other_href = (f'/resources/{other}/{category}' if category in CONFIG.resources.get(other, {})
                  else ('/resources/community' if other == 'community' else '/resources/'))

    # The BG page gets location/time-of-day filters built from the parsed names.
    bg_locations, bg_times = [], []
    if category == 'bg':
        bg_locations = sorted({i['loc'] for i in items if i['loc']})
        present = {i['time'] for i in items}
        bg_times = [(key, label) for key, label in BG_TIME_LABELS.items() if key in present]

    return templates.TemplateResponse(request, 'resources_list.html', {
        'collection': collection,
        'collection_meta': COLLECTIONS[collection],
        'category': category,
        'category_meta': CATEGORIES[category],
        'categories': [
            {'slug': slug, 'count': _count(slug, data[slug]), **CATEGORIES[slug]}
            for slug in CATEGORIES if slug in data
        ],
        'items': items,
        'count': _count(category, items),
        'count_all': (len(items) if category != 'sprites'
                      else sum(len(g['sprites']) for g in items)),
        'has_undeclared': (category != 'sprites'
                           and any(not i['declared'] for i in items)),
        'has_nsfw': (category != 'sprites'
                     and any(i['nsfw'] for i in items)),
        'other_href': other_href,
        'bg_locations': bg_locations,
        'bg_times': bg_times,
    })


main_router.include_router(router)
