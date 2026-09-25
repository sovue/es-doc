"""Dev-server browser reload (see CONFIG.debug in utils/config.py).

A tiny event bus: the file watcher (utils/lifespan/refresh.py) calls bump()
whenever anything under docs/templates/static changes on disk; /dev/livereload
(routes/dev.py) streams that as a Server-Sent Event, and static/js/livereload.js
reloads the page on it. Nothing here runs unless CONFIG.debug is set.

A change is published as a counter, not as a flag to be consumed. An
`asyncio.Event` looks like the obvious fit and is the wrong shape for a
broadcast: whichever stream woke first called `clear()`, so with two tabs open
one reloaded and the other sat through the edit — and an edit that landed
between a stream's iterations was missed by everyone, because the flag had
already been cleared by the time anything looked at it. A counter can't be
consumed; each stream remembers the number it last saw and compares.
"""

import asyncio

_generation = 0

# Purely a wake-up, never the payload — set and immediately cleared, so it
# releases the streams waiting right now and latches nothing for the ones that
# aren't. `_generation` is what carries the change number.
_wakeup = asyncio.Event()

_shutdown = asyncio.Event()


def _wake():
    _wakeup.set()
    _wakeup.clear()


def bump():
    """Publish a change to every open stream."""
    global _generation
    _generation += 1
    _wake()


def shutdown():
    """End every open stream so the server can finish shutting down."""
    _shutdown.set()
    _wake()


def generation() -> int:
    """The change count a stream should start from — everything before it is
    already on the page that's asking."""
    return _generation


async def wait_for_change(seen: int, timeout: float) -> int | None:
    """Wait for a change newer than `seen`.

    Returns the new count, `seen` unchanged if `timeout` passed with nothing to
    report, or None once shutdown has been requested.
    """
    if _shutdown.is_set():
        return None

    # Something landed between this stream's iterations; no need to wait for
    # the next one.
    if _generation != seen:
        return _generation

    try:
        await asyncio.wait_for(_wakeup.wait(), timeout)
    except asyncio.TimeoutError:
        return seen

    if _shutdown.is_set():
        return None

    return _generation
