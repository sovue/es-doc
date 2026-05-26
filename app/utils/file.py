from pathlib import Path
from fastapi import HTTPException
from fastapi.templating import Jinja2Templates

ROOT = Path(__file__).parents[2]

templates = Jinja2Templates(ROOT / 'templates')

def read_text(path):

    path = ROOT / path

    if not path.exists():
        raise Exception(f'File "{path}" does not exist.')

    return path.read_text('utf-8')
