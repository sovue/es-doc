from fastapi import APIRouter, Request, HTTPException

from . import main_router
from ..utils.config import CONFIG
from ..utils.file import templates
from ..utils.lifespan.resources_cache import BG_TIME_LABELS, CATEGORY_TITLES

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
