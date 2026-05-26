from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from markdown_it import MarkdownIt
from pathlib import Path

from . import main_router
from ..utils.file import read_template, read_text
from ..utils.md import render

router = APIRouter(prefix='/docs')
main_router.include_router(router)

@router.get('/root')
async def root():
    return HTMLResponse('mt')

@router.get('/')
async def root():
    return RedirectResponse('/docs/root', 302)

@router.get('/{doc}')
async def page(doc):

    try:
        text = read_text(Path('content/docs') / f'{doc}.md')
    except:
        return RedirectResponse('/docs/root', 302)

    title, nav, body = render(text)

    return HTMLResponse(read_template('doc.html', title=title, body=body, nav=nav))