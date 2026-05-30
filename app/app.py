from fastapi import FastAPI, Request
from starlette.exceptions import HTTPException

from .routes import main_router
from .utils.file import templates

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(main_router)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    details = {
        404: (
            'Страница не найдена.',
            'Проверьте адрес страницы или вернитесь на главную.'
        ),
    }
    detail, description = details.get(exc.status_code, (exc.detail, 'Во время загрузки страницы произошла ошибка. Попробуйте повторить действие позже. Если проблема сохраняется — сообщите администрации.'))
    return templates.TemplateResponse(request, 'error.html', {
        'errno': exc.status_code,
        'detail': detail,
        'description': description
    }, status_code=exc.status_code)