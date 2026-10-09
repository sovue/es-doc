import hashlib
import json

from fastapi import HTTPException, Request
from fastapi.responses import FileResponse

from ..utils.assets import asset_url
from ..utils.file import ROOT, templates
from . import main_router

TOOLS = ROOT / 'static/tools'
MANIFEST = json.loads((TOOLS / 'manifest.json').read_text('utf-8'))
RUNTIME_VERSION = MANIFEST['pyodide']
FILES = {
    'engine.py': 'text/plain', 'recovery.py': 'text/plain', 'vendor.zip': 'application/zip',
    'pyc_decompiler.py': 'text/plain', 'bytecode.zip': 'application/zip',
    'syntax.zip': 'application/zip', 'renpy_lexer.py': 'text/plain',
    'manifest.json': 'application/json', 'NOTICE.txt': 'text/plain',
    **{f'pyodide/{RUNTIME_VERSION}/{name}': media for name, media in {
        'pyodide.mjs': 'application/javascript', 'pyodide.asm.js': 'application/javascript',
        'pyodide.asm.wasm': 'application/wasm', 'python_stdlib.zip': 'application/zip',
        'pyodide-lock.json': 'application/json', 'LICENSE': 'text/plain',
    }.items()},
}
_digests = {}


def physical_file(name):
    if name == 'renpy_lexer.py':
        return ROOT / 'app/utils/renpy_lexer.py'
    return TOOLS / name.replace(f'pyodide/{RUNTIME_VERSION}/', 'pyodide/')


def digest(name):
    path = physical_file(name)
    stat = path.stat()
    stamp = (stat.st_mtime_ns, stat.st_size)
    if name not in _digests or _digests[name][0] != stamp:
        _digests[name] = (stamp, hashlib.sha256(path.read_bytes()).hexdigest()[:16])
    return _digests[name][1]


@main_router.get('/tools')
async def tools_page(request: Request):
    return templates.TemplateResponse(request, 'tools.html', {})


@main_router.get('/tools/colors')
async def colors_page(request: Request):
    return templates.TemplateResponse(request, 'tools_colors.html', {})


@main_router.get('/tools/unpack')
async def unpack_page(request: Request):
    return templates.TemplateResponse(request, 'tools_unpack.html', {
        'tools_config': {
            'worker': asset_url('/static/js/tools-worker.js'),
            'engine': f'/static/tools/engine.py?v={digest("engine.py")}',
            'recovery': f'/static/tools/recovery.py?v={digest("recovery.py")}',
            'pyc': f'/static/tools/pyc_decompiler.py?v={digest("pyc_decompiler.py")}',
            'bytecode': f'/static/tools/bytecode.zip?v={digest("bytecode.zip")}',
            'vendor': f'/static/tools/vendor.zip?v={digest("vendor.zip")}',
            'syntax': f'/static/tools/syntax.zip?v={digest("syntax.zip")}',
            'lexer': f'/static/tools/renpy_lexer.py?v={digest("renpy_lexer.py")}',
            'runtime': f'/static/tools/pyodide/{RUNTIME_VERSION}/',
        },
    })


@main_router.get('/static/tools/{name:path}')
async def tools_asset(name: str, request: Request):
    if name not in FILES or not physical_file(name).is_file():
        raise HTTPException(404)
    versioned = name.startswith('pyodide/') or request.query_params.get('v') == digest(name)
    return FileResponse(physical_file(name), media_type=FILES[name], headers={
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable' if versioned else 'public, max-age=300',
        **({'Content-Encoding': 'identity'} if name.endswith(('.zip', '.wasm')) else {}),
    })
