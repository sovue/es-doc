import uvicorn, sys

from app.app import app

if __name__ == "__main__":
    if '--debug' in sys.argv[1:]:
        uvicorn.run(app, host="127.0.0.1", port=8000, log_config=None)
    else:
        uvicorn.run(app, host="0.0.0.0", port=443, log_config=None)
