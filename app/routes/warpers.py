from urllib.parse import quote

from fastapi import Request
from fastapi.responses import RedirectResponse

from ..utils.config import CONFIG
from ..utils.file import templates
from ..utils.md import CODE_COPY_BUTTON
from ..utils import warpers as warpers_util

from . import main_router

router = main_router

# Keep old shared links (including their fragments) working after the move.
@router.get('/warpers', include_in_schema=False)
@router.get('/resources/original/warpers', include_in_schema=False)
@router.get('/resources/community/warpers', include_in_schema=False)
async def warpers_redirect():
    return RedirectResponse('/tools/warpers', status_code=308)


@router.get('/tools/warpers')
async def warpers_page(request: Request):
    backgrounds = [
        {'name': item['name'],
         'location': item.get('loc') or 'Прочее',
         'description': item.get('desc') or item['name'],
         'preview': item['raw'] if item.get('tint') else f"/resource/hero/{quote(item['name'])}"}
        for item in CONFIG.resources.get('original', {}).get('bg', [])
        if item['declared'] and item['raw'] and not item['nsfw']
    ]
    return templates.TemplateResponse(request, 'tools_warpers.html', {
        'columns': warpers_util.COLUMNS,
        'special': warpers_util.SPECIAL,
        'families': warpers_util.families(),
        'samples': warpers_util.samples(),
        'community': CONFIG.warpers,
        'backgrounds': backgrounds,
        'code_copy_button': CODE_COPY_BUTTON,
    })
