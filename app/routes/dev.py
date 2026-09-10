from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from . import main_router
from ..utils.config import CONFIG
from ..utils.livereload import generation, wait_for_change

# Only mounted in debug mode (`pdm run dev`, main.py --debug): nothing serves
# /dev/livereload otherwise, and static/js/livereload.js is never linked into
# a page outside it either (see templates/partials/head.html).
if CONFIG.debug:
    router = APIRouter()

    @router.get('/dev/livereload')
    async def livereload(request: Request):
        async def events():
            # Start from the count as it stands: this page was just served, so
            # every change up to now is already in what the browser is holding.
            seen = generation()

            # Opens the stream immediately instead of at the first ping.
            # Nothing reaches the browser until a body chunk does: Starlette's
            # GZipMiddleware holds `http.response.start` back until one arrives
            # (IdentityResponder.send_with_compression) even on the branch that
            # opts out of compressing, so with nothing sent up front the
            # headers sat in the middleware and EventSource stayed unopened for
            # the whole ping interval — fifteen seconds after every restart in
            # which the page was up, the watcher was running, and an edit
            # reached nobody. It also gives livereload.js's reconnect an
            # `onopen` to fire on promptly, which is what reloads the tab once
            # a Python edit has restarted the process.
            yield ': connected\n\n'

            while not await request.is_disconnected():
                latest = await wait_for_change(seen, timeout=15)

                # Shutting down — end the stream rather than make the server
                # wait for a browser that has no reason to hang up.
                if latest is None:
                    return

                if latest != seen:
                    seen = latest
                    yield 'data: reload\n\n'
                else:
                    # A periodic ping keeps the connection (and any intermediary
                    # proxy timeout) alive between real changes.
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
