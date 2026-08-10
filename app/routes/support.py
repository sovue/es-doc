from fastapi import Request

from . import main_router
from ..utils.config import CONFIG
from ..utils.file import templates

router = main_router

@router.get('/support')
async def support_page(request: Request):
    return templates.TemplateResponse(request, 'support.html', {'platforms': CONFIG.support})
