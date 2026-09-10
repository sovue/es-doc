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
        )
    else:
        from app.app import app
        uvicorn.run(app, host="0.0.0.0", port=443, log_config=None)
