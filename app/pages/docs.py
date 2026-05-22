from ..utils.file import read_template
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(prefix='/docs')

@router.get('/')
async def page():
    return HTMLResponse(read_template('empty.html', title='бубубу', body=''))