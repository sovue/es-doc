import os, sys
from pathlib import Path

import uvicorn

if __name__ == "__main__":
    if '--debug' in sys.argv[1:]:
        # Read by CONFIG (app/utils/config.py) to gate the dev-only bits: the
        # docs/templates/static watcher that also notifies the browser, and
        # the /dev/livereload route it feeds. Set before the app is ever
        # imported, and via the environment (not sys.argv) so it survives
        # into the --reload subprocess uvicorn spawns below, which re-imports
        # the app fresh rather than inheriting this process's state.
        os.environ['ES_DOC_DEBUG'] = '1'
        uvicorn.run(
            'app.app:app', host="127.0.0.1", port=8000, log_config=None,
            reload=True, reload_dirs=[str(Path(__file__).parent / 'app')],
            # A backstop, not the mechanism: the livereload streams already
            # end themselves on Ctrl+C (utils/lifespan/__init__.py), so this
            # only catches whatever *else* might hold a connection open. Worth
            # having because of how uvicorn waits — the graceful phase has no
            # bound of its own, and on Windows the reload supervisor doesn't
            # terminate the worker, it just waits for it (supervisors/
            # basereload.py), so one stuck response hangs the whole dev server
            # with no second Ctrl+C able to reach past it.
            timeout_graceful_shutdown=5,
        )
    else:
        from app.app import app
        uvicorn.run(app, host="0.0.0.0", port=8000, log_config=None)
