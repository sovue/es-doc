from pathlib import Path
from fastapi import HTTPException
from fastapi.templating import Jinja2Templates

ROOT = Path(__file__).parents[2]

templates = Jinja2Templates(ROOT / 'templates')

resolve = lambda path: path if path.is_absolute() else (ROOT / path)

def read_text(path):

    if not Path(path).is_absolute():
        path = ROOT / path

    if not path.exists():
        raise HTTPException(404, f'Файл "{path}" не существует.')

    return path.read_text('utf-8')
