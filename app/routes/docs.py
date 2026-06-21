from fastapi import APIRouter, Request, Query
from fastapi.responses import PlainTextResponse
from pathlib import Path

from . import main_router
from ..utils.config import CONFIG
from ..utils.file import templates, read_text
from ..utils.md import render
from ..utils.docs import build_index

router = APIRouter(prefix='/docs')

@router.get('/')
async def index(request: Request):
    # The "Документация" nav destination: every doc as a browsable list,
    # sharing the search corpus so the two never drift.
    docs = [{'slug': d['slug'], 'title': d['title']} for d in build_index()]
    return templates.TemplateResponse(request, 'docs_index.html', {'docs': docs})

@router.get('/{doc}')
async def page(doc, request: Request):

    # read_text raises HTTPException(404) for a missing doc, which the app's
    # handler renders as the styled error page.
    text = read_text(Path(CONFIG.config['docs']['path']) / f'{doc}.md')

    title, nav, body = render(text)
    # Most docs open with an H2, so fall back to the filename for the page
    # title rather than leaking the empty-H1 placeholder.
    title = title or doc

    if any(i in request.query_params for i in ['md', 'markdown']):
        return PlainTextResponse(text)

    if any(i in request.query_params for i in ['r', 'raw']):
        return PlainTextResponse(body)

    return templates.TemplateResponse(request, 'doc.html', {'title': title, 'body': body, 'nav': nav})

main_router.include_router(router)