from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from . import main_router
from ..utils.config import CONFIG
from ..utils.livereload import wait_for_change

# Only mounted in debug mode (`pdm run dev`, main.py --debug): nothing serves
# /dev/livereload otherwise, and static/js/livereload.js is never linked into
# a page outside it either (see templates/partials/head.html).
if CONFIG.debug:
    router = APIRouter()

    @router.get('/dev/livereload')
    async def livereload(request: Request):
        async def events():
            while not await request.is_disconnected():
                # A periodic ping keeps the connection (and any intermediary
                # proxy timeout) alive between real changes.
                if await wait_for_change(timeout=15):
                    yield 'data: reload\n\n'
                else:
                    yield ': ping\n\n'

        return StreamingResponse(events(), media_type='text/event-stream', headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            # Opts out of GZipMiddleware, same trick as the static font route
            # (routes/static.py) — a compressor would buffer these small
            # chunks instead of flushing them as they're produced.
            'Content-Encoding': 'identity',
        })

    main_router.include_router(router)
