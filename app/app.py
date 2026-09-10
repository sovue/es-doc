from fastapi import FastAPI, Request
from starlette.exceptions import HTTPException
from starlette.middleware.gzip import GZipMiddleware
import time

from .routes import main_router
from .utils.config import CONFIG
from .utils.file import templates
from .utils.logging import root_logger
from .utils.lifespan import lifespan

CONFIG.setup('config.yaml')
templates.env.globals['DEBUG'] = CONFIG.debug

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
# Compress text responses (HTML/CSS/JS). Skips already-compressed woff2 and
# payloads under `gzip-min-size`, below which the header costs more than the
# compression saves; GZipMiddleware leaves the binary font route untouched.
app.add_middleware(GZipMiddleware, minimum_size=CONFIG.setting('gzip-min-size'))
app.include_router(main_router)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail, description = CONFIG.config['http-errors'].get(exc.status_code, (exc.detail, CONFIG.config['http-errors']['default']))
    return templates.TemplateResponse(request, 'error.html', {
        'errno': exc.status_code,
        'detail': detail,
        'description': description
    }, status_code=exc.status_code)

class LogRequests:
    """Pure ASGI middleware, not `@app.middleware("http")` (BaseHTTPMiddleware):
    that wrapper buffers the whole response through a second task and breaks
    on a client disconnecting mid-stream — which /dev/livereload's SSE
    connection does on every reconnect, throwing 'RuntimeError: No response
    returned' instead of the request it was in the middle of."""

    def __init__(self, app):
        self.app = app

    # The dev-server reload stream stays open for as long as the tab is, so the
    # line below — written when the response *ends*, and timing it — described
    # it as a request that took eleven minutes and only said so once the
    # browser had already gone. Every restart reconnects every open tab, so
    # what the log actually showed was a pile of multi-minute 200s arriving in
    # a burst, timestamped nowhere near the thing that caused them. It's
    # announced on arrival instead, where the duration would have meant
    # nothing and the fact of connecting means everything.
    #
    # Gated on debug as well as on the path, because outside it nothing serves
    # this route (routes/dev.py) — matching on the path alone would let anyone
    # probing that URL in production log an opened stream that never existed,
    # and swallow the 404 that actually happened.
    STREAM_PATH = '/dev/livereload' if CONFIG.debug else None

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        log = root_logger.getChild('request')
        client = request.client

        if request.url.path == self.STREAM_PATH:
            log.info('Live-reload stream opened by %s:%s', client.host, client.port)
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        status = {}

        async def send_wrapper(message):
            if message['type'] == 'http.response.start':
                status['code'] = message['status']
            await send(message)

        await self.app(scope, receive, send_wrapper)

        duration = time.perf_counter() - start

        log.info(
            '%s from %s:%s, #A"%s"#, #Ccode %s# in %.4fs',
            request.method,
            client.host,
            client.port,
            request.url.path,
            status.get('code', 0),
            duration,
        )

app.add_middleware(LogRequests)
