from fastapi import Request

from . import main_router
from ..utils.config import CONFIG
from ..utils.file import templates

router = main_router

@router.get('/news')
async def news_page(request: Request):
    return templates.TemplateResponse(request, 'news.html', {'resources': CONFIG.news})
