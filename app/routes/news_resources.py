from fastapi import Request

from ..utils.config import CONFIG
from ..utils.file import templates
from . import main_router

router = main_router


@router.get('/news-resources')
async def news_resources_page(request: Request):
    return templates.TemplateResponse(request, 'news_resources.html', {
        'news_resources': CONFIG.news_resources,
    })
