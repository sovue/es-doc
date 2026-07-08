from fastapi import Request

from . import main_router
from ..utils.config import CONFIG
from ..utils.file import templates

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
}

@router.get('/artists')
async def artists_page(request: Request):

    artists = CONFIG.artists

    # Board view groups by status; only render columns that have members, in
    # the fixed open → unknown → closed order.
    groups = [
        (status, STATUS_LABELS[status], [a for a in artists if a['status'] == status])
        for status in STATUS_ORDER
    ]
    groups = [g for g in groups if g[2]]

    # Per-status counts feed the filter options; a status with no members is
    # dropped from the dropdown (there are no "closed" artists today).
    status_counts = [
        (status, STATUS_LABELS[status], sum(1 for a in artists if a['status'] == status))
        for status in STATUS_ORDER
    ]
    status_counts = [s for s in status_counts if s[2]]

    return templates.TemplateResponse(request, 'artists.html', {
        'artists': artists,
        'groups': groups,
        'status_labels': STATUS_LABELS,
        'status_counts': status_counts,
        'link_labels': LINK_LABELS,
        'total': len(artists),
    })
