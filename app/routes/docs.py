from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse
import re

from . import main_router
from ..utils.config import CONFIG
from ..utils.file import templates, read_text
from ..utils.md import render

router = APIRouter(prefix='/docs')

@router.get('/')
async def index(request: Request):
    # The "Документация" nav destination: docs as a nested tree resolved from
    # tree.yaml. Only pages named in the tree are listed; the cache is kept warm
    # by the lifespan refresh (see utils/lifespan.py).
    return templates.TemplateResponse(request, 'docs_index.html', {'tree': CONFIG.docs_tree})

@router.get('/{doc}')
async def page(doc, request: Request):

    # read_text raises HTTPException(404) for a missing doc, which the app's
    # handler renders as the styled error page.
    text = read_text(CONFIG.docs_path / f'{doc}.md')

    if any(i in request.query_params for i in ['md', 'markdown']):
        return PlainTextResponse(text)

    if any(i in request.query_params for i in ['s', 'search']):
        return PlainTextResponse(re.sub(r'^(#+ )|(- )|(> )|(```\w*)|(:::\w*)|(---)$', '', text, flags=re.MULTILINE).replace('\n\n', '\n'))

    title, nav, body = render(text)

    if any(i in request.query_params for i in ['r', 'raw']):
        return PlainTextResponse(body)

    return templates.TemplateResponse(request, 'doc.html', {'title': title or doc, 'body': body, 'nav': nav})

main_router.include_router(router)