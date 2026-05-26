from fastapi import APIRouter
import pkgutil, importlib

main_router = APIRouter()

for _, name, _ in pkgutil.iter_modules(__path__):
    importlib.import_module(f'{__name__}.{name}')
    print(f'Pages from {__name__}.{name} imported.')