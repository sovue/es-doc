from ..utils.file import read_template
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()

@router.get('/')
async def page():
    return HTMLResponse(read_template('authors.html', title='Авторы'))