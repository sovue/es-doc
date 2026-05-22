from pathlib import Path

ROOT = Path(__file__).parents[2]

def read_text(path):

    path = ROOT / path

    if not path.exists():
        raise Exception(f'File "{path}" does not exist.')

    return path.read_text('utf-8')

def read_template(path, *a, **kw):

    path = ROOT / 'templates' / path

    if not path.exists():
        raise Exception(f'File "{path}" does not exist.')

    return path.read_text('utf-8').format(*a, **kw)
