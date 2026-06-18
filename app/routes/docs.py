from fastapi import APIRouter, Request, Query
from fastapi.responses import HTMLResponse, RedirectResponse, PlainTextResponse
from pathlib import Path

from . import main_router
from ..utils.config import CONFIG
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
        text = read_text(Path(CONFIG.config['docs']['path']) / f'{doc}.md')
    except:
        return RedirectResponse('/docs/root', 302)

    title, nav, body = render(text)

    if any(i in request.query_params for i in ['md', 'markdown']):
        return PlainTextResponse(text)

    if any(i in request.query_params for i in ['r', 'raw']):
        return PlainTextResponse(body)

    return templates.TemplateResponse(request, 'doc.html', {'title': title, 'body': body, 'nav': nav})

main_router.include_router(router)