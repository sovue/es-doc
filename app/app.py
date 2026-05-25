from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from starlette.exceptions import HTTPException

from .pages.docs import router as router_docs
from .pages.resources import router as router_resources
from .pages.root import router as router_root

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(router_docs)
app.include_router(router_resources)
app.include_router(router_root)

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    return PlainTextResponse(str(exc.detail), status_code=exc.status_code)