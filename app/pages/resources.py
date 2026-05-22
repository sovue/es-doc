from ..utils.file import read_text
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix='/resources')

@router.get('/css/{name}')
async def page(name):
    return PlainTextResponse(read_text(f'static/css/{name}'))