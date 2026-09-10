"""Dev-server browser reload (see CONFIG.debug in utils/config.py).

A tiny event bus: the file watcher (utils/lifespan/refresh.py) calls bump()
whenever anything under docs/templates/static changes on disk; /dev/livereload
(routes/dev.py) streams that as a Server-Sent Event, and static/js/livereload.js
reloads the page on it. Nothing here runs unless CONFIG.debug is set.
"""

import asyncio

_event = asyncio.Event()
_shutdown = asyncio.Event()


def bump():
    _event.set()


def shutdown():
    """Break every SSE loop so the server can exit."""
    _shutdown.set()
    _event.set()


async def wait_for_change(timeout: float) -> bool | None:
    """Block until bump() fires, shutdown is requested, or `timeout` passes.

    Returns True on change, False on timeout, None on shutdown.
    """
    if _shutdown.is_set():
        return None
    try:
        await asyncio.wait_for(_event.wait(), timeout)
    except asyncio.TimeoutError:
        return False
    if _shutdown.is_set():
        return None
    _event.clear()
    return True
