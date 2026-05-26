from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pathlib import Path

from . import main_router
from ..utils.file import templates, read_text
from ..utils.md import render

router = APIRouter(prefix='/docs')

@router.get('/root')
async def root():
    return HTMLResponse('mt')

@router.get('/')
async def root():
    return RedirectResponse('/docs/root', 302)

@router.get('/{doc}')
async def page(doc, request: Request):

    try:
        text = read_text(Path('content/docs') / f'{doc}.md')
    except:
        return RedirectResponse('/docs/root', 302)

    title, nav, body = render(text)

    return templates.TemplateResponse(request, 'doc.html', {'title': title, 'body': body, 'nav': nav})

main_router.include_router(router)