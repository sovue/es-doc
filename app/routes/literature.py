from fastapi import Request

from . import main_router
from ..utils.config import CONFIG
from ..utils.file import templates

router = main_router

@router.get('/literature')
async def literature_page(request: Request):
    return templates.TemplateResponse(request, 'literature.html', {'categories': CONFIG.literature})
