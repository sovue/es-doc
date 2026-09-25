from fastapi import Request

from . import main_router
from ..utils.config import CONFIG
from ..utils.file import templates

router = main_router

@router.get('/materials')
async def materials_page(request: Request):
    return templates.TemplateResponse(request, 'materials.html', {'categories': CONFIG.materials})
