from fastapi.responses import RedirectResponse

from . import main_router

router = main_router

# The warper reference used to live at its own top-level URL before it became
# a section of «Ресурсов оригинала». Kept as a permanent redirect so links
# shared while it lived here don't rot.
@router.get('/warpers', include_in_schema=False)
async def warpers_redirect():
    return RedirectResponse('/resources/original/warpers', status_code=308)
