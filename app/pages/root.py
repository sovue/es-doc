from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from . import main_router
from ..utils.file import read_template, read_text
from ..utils.md import render_thanks

router = main_router

def _authors_core():
    return read_text('templates/partials/authors_core.html')

def _thanks_section():
    inner = render_thanks(read_text('content/main/thanks.md'))
    return (
        '<section class="contributors-section" aria-labelledby="thanks-label">\n'
        '    <h2 class="authors-list-label" id="thanks-label">Особые благодарности</h2>\n'
        f'    {inner}\n'
        '</section>'
    )

@router.get('/')
async def page():
    return HTMLResponse(read_template('home.html',
        authors_core=_authors_core(),
        gh_section='',
        thanks_section=_thanks_section()))

@router.get('/authors')
async def authors():
    return HTMLResponse(read_template('authors.html',
        authors_core=_authors_core(),
        gh_section='',
        thanks_section=_thanks_section()))
