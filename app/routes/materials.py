from fastapi import HTTPException, Request
from fastapi.responses import FileResponse

from ..utils.config import CONFIG
from ..utils.file import templates
from ..utils.materials import material_file, published_material_files
from . import main_router

router = main_router

@router.get('/materials')
async def materials_page(request: Request):
    return templates.TemplateResponse(request, 'materials.html', {'categories': CONFIG.materials})


@router.get('/materials/download/{file:path}')
async def download_material(file: str):
    published = next((entry for entry in published_material_files(CONFIG.materials)
                      if entry['path'] == file), None)
    path = material_file(file) if published else None
    if not path:
        raise HTTPException(404, 'Материал не найден.')
    return FileResponse(path, filename=path.name, content_disposition_type='attachment',
                        headers={'X-Content-Type-Options': 'nosniff'})
