"""Dev-server browser reload (see CONFIG.debug in utils/config.py).

A tiny event bus: the file watcher (utils/lifespan/refresh.py) calls bump()
whenever anything under docs/templates/static changes on disk; /dev/livereload
(routes/dev.py) streams that as a Server-Sent Event, and static/js/livereload.js
reloads the page on it. Nothing here runs unless CONFIG.debug is set.
"""

import asyncio

_event = asyncio.Event()


def bump():
    _event.set()


async def wait_for_change(timeout: float) -> bool:
    """Block until bump() fires or `timeout` seconds pass; True means it fired."""
    try:
        await asyncio.wait_for(_event.wait(), timeout)
    except asyncio.TimeoutError:
        return False
    _event.clear()
    return True
