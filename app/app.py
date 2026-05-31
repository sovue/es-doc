from fastapi import FastAPI, Request
from starlette.exceptions import HTTPException
import time

from .routes import main_router
from .utils.config import CONFIG
from .utils.file import templates
from .utils.logging import root_logger

CONFIG.setup('config.yaml')

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(main_router)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail, description = CONFIG.config['http-errors'].get(exc.status_code, (exc.detail, CONFIG.config['http-errors']['default']))
    return templates.TemplateResponse(request, 'error.html', {
        'errno': exc.status_code,
        'detail': detail,
        'description': description
    }, status_code=exc.status_code)

@app.middleware("http")
async def log_requests(request, call_next):
    start = time.perf_counter()

    response = await call_next(request)

    duration = time.perf_counter() - start

    root_logger.getChild('request').info(
        '%s from %s:%s, #A"%s"#, #Ccode %s# in %.4fs',
        request.method,
        request.client.host,
        request.client.port,
        request.url.path,
        response.status_code,
        duration,
    )

    return response
