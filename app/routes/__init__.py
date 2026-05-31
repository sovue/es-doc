from fastapi import APIRouter
import pkgutil, importlib

from ..utils.logging import root_logger

main_router = APIRouter()

logger = root_logger.getChild('routes')

for _, name, _ in pkgutil.iter_modules(__path__):
    importlib.import_module(f'{__name__}.{name}')
    logger.info(f'Pages from {__name__}.{name} imported.')