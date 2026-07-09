from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse
import re
from urllib.parse import quote

from . import main_router
from ..utils.config import CONFIG
from ..utils.docs import flatten_tree
from ..utils.file import templates, read_text
from ..utils.md import render

router = APIRouter(prefix='/docs')

@router.get('/')
async def index(request: Request):
    # The "Документация" nav destination: docs as a nested tree resolved from
    # tree.yaml. Only pages named in the tree are listed; the cache is kept warm
    # by the lifespan refresh (see utils/lifespan.py).
    return templates.TemplateResponse(request, 'docs_index.html', {'tree': CONFIG.docs_tree})

def _next_doc(doc):
    # Reading order is the tree flattened pre-order (see flatten_tree): the
    # doc right after this one is "next". A doc absent from tree.yaml (or
    # the last one in it) simply has no next.
    flat = flatten_tree(CONFIG.docs_tree)
    for i, node in enumerate(flat):
        if node['slug'] == doc and i + 1 < len(flat):
            return flat[i + 1]
    return None

@router.get('/{doc}')
async def page(doc, request: Request):

    # read_text raises HTTPException(404) for a missing doc, which the app's
    # handler renders as the styled error page.
    text = read_text(CONFIG.docs_path / f'{doc}.md')

    if any(i in request.query_params for i in ['md', 'markdown']):
        # ?md renders the source in the browser; ?md&dl downloads it. The
        # attachment path is the reliable way to land «<doc>.md» on disk —
        # browsers name «Save page as…» of a rendered text page themselves.
        # Only the RFC 5987 form: slugs are Cyrillic, and a plain-filename
        # fallback would degrade to a garbage name anyway.
        attachment = any(i in request.query_params for i in ['dl', 'download'])
        return PlainTextResponse(text, headers={
            'Content-Disposition': f"{'attachment' if attachment else 'inline'};"
                                   f" filename*=UTF-8''{quote(doc)}.md",
        })

    if any(i in request.query_params for i in ['s', 'search']):
        return PlainTextResponse(re.sub(r'^(#+ )|(- )|(> )|(```\w*)|(:::\w*)|(---)$', '', text, flags=re.MULTILINE).replace('\n\n', '\n'))

    title, nav, body = render(text)

    if any(i in request.query_params for i in ['r', 'raw']):
        return PlainTextResponse(body)

    return templates.TemplateResponse(request, 'doc.html', {
        'title': title or doc, 'body': body, 'nav': nav, 'doc': doc, 'next_doc': _next_doc(doc),
    })

main_router.include_router(router)