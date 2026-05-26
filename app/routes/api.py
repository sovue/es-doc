from fastapi.responses import HTMLResponse
import httpx

from . import main_router

router = main_router

@router.get('/api/contributors')
async def contributors():

    try:

        async with httpx.AsyncClient() as client:
            resp = await client.get('https://api.github.com/repos/sovue/es-doc/contributors')

        data = resp.json()

        rv = ''
        for user in data:
            rv += f'<a href="{user["html_url"]}" rel="noopener noreferrer"><img src="{user["avatar_url"]}" class="ghcontributor-avatar"></a>'

    except Exception as e:

        print(e)
        return HTMLResponse('<span>Не удалось получить последних контрибьюторов...</span>')

    return HTMLResponse(rv)
