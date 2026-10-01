from urllib.parse import urlencode

from fastapi import Request
from fastapi.responses import RedirectResponse

from ..utils.config import CONFIG
from ..utils.file import templates
from ..utils.specialists import CATEGORIES, WORK_LABELS
from . import main_router

router = main_router

# Status metadata drives the pill label and the board-column order.
STATUS_ORDER = ('open', 'unknown', 'closed')
STATUS_LABELS = {
    'open': 'Заказы открыты',
    'unknown': 'Не уточнялось',
    'closed': 'Заказы закрыты',
}

# Known link platforms get a proper label; anything else falls back to the
# raw key (capitalised in the template).
LINK_LABELS = {
    'vk': 'VK',
    'tg': 'Telegram',
    'telegram': 'Telegram',
    'boosty': 'Boosty',
    'discord': 'Discord',
    'twitter': 'Twitter',
    'x': 'X',
    'instagram': 'Instagram',
    'artstation': 'ArtStation',
    'behance': 'Behance',
    'youtube': 'YouTube',
    'site': 'Сайт',
    'deviantart': 'DeviantArt',
    'tumblr': 'Tumblr',
    'twitch': 'Twitch',
    'furaffinity': 'FurAffinity',
    'pixiv': 'Pixiv',
    'patreon': 'Patreon',
    'tiktok': 'TikTok',
    'bluesky': 'Bluesky',
    'github': 'GitHub',
    'soundcloud': 'SoundCloud',
    'bandcamp': 'Bandcamp',
    'steam': 'Steam',
    'itch': 'itch.io',
    'ficbook': 'Фикбук',
}

@router.get('/artists')
async def artists_redirect(request: Request):
    params = dict(request.query_params)
    params['category'] = params.get('category') or 'artists'
    query = urlencode({'category': params.pop('category'), **params})
    return RedirectResponse(f'/specialists?{query}', status_code=308)


@router.get('/specialists')
async def specialists_page(request: Request):
    category = request.query_params.get('category', '')
    if category not in CATEGORIES:
        category = ''
    specialists = [p for p in CONFIG.specialists if not category or category in p['categories']]

    def category_url(key):
        params = {k: v for k, v in request.query_params.items() if k in ('view', 'q', 'status', 'sort')}
        if key:
            params['category'] = key
        return '/specialists' + ('?' + urlencode(params) if params else '')

    categories = [
        {'key': key, **meta, 'count': sum(key in p['categories'] for p in CONFIG.specialists), 'url': category_url(key)}
        for key, meta in CATEGORIES.items()
    ]

    # Board view groups by status; only render columns that have members, in
    # the fixed open → unknown → closed order.
    groups = [
        (status, STATUS_LABELS[status], [a for a in specialists if a['status'] == status])
        for status in STATUS_ORDER
    ]
    groups = [g for g in groups if g[2]]

    # Per-status counts feed the filter options; a status with no members is
    # dropped from the dropdown (there are no "closed" artists today).
    status_counts = [
        (status, STATUS_LABELS[status], sum(1 for a in specialists if a['status'] == status))
        for status in STATUS_ORDER
    ]
    status_counts = [s for s in status_counts if s[2]]

    return templates.TemplateResponse(request, 'specialists.html', {
        'specialists': specialists,
        'groups': groups,
        'status_labels': STATUS_LABELS,
        'status_counts': status_counts,
        'link_labels': LINK_LABELS,
        'total': len(specialists),
        'directory_total': len(CONFIG.specialists),
        'category': category,
        'category_info': CATEGORIES.get(category),
        'categories': categories,
        'all_url': category_url(''),
        'work_labels': WORK_LABELS,
    })
