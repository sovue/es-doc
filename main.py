import fastapi, uvicorn, sys

from app.pages.docs import router as router_docs
from app.pages.resources import router as router_resources
from app.pages.root import router as router_root

app = fastapi.FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(router_docs)
app.include_router(router_resources)
app.include_router(router_root)

if __name__ == "__main__":
    if '--debug' in sys.argv[1:]:
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=8000
        )
    else:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=443
        )
