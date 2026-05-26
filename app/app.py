from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from starlette.exceptions import HTTPException

from .routes import main_router

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(main_router)

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    return PlainTextResponse(str(exc.detail), status_code=exc.status_code)