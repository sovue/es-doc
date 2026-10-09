"""Rebuild pinned browser dependencies explicitly, never at server startup."""
import argparse
import hashlib
import io
import json
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'static/tools'
PYODIDE = '0.29.3'
SOURCES = {
    'unrpyc': ('CensoredUsername/unrpyc', '3ae8334ed71a05535927dcc559663d3aca51215b'),
    'unrpa': ('Lattyware/unrpa', '005b10abec590db374f23fd8d4b111963792a15a'),
}
RUNTIME = ('pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json')
PYGMENTS = '2.20.0'
BYTECODE_PACKAGES = {
    'uncompyle6': '3.9.3', 'xdis': '6.1.8', 'spark-parser': '1.9.0',
    'click': '8.5.0', 'six': '1.17.0',
}


def prepare_bytecode():
    """Bundle verified pure-Python wheels with their original licenses."""
    sources = {}
    files = {}
    for name, version in BYTECODE_PACKAGES.items():
        release = json.loads(fetch(f'https://pypi.org/pypi/{name}/{version}/json'))
        wheel = next(file for file in release['urls'] if file['filename'].endswith('none-any.whl'))
        data = fetch(wheel['url'])
        checksum = hashlib.sha256(data).hexdigest()
        if checksum != wheel['digests']['sha256']:
            raise ValueError(f'{name} wheel checksum mismatch')
        sources[name] = {'version': version, 'url': wheel['url'], 'sha256': checksum}
        with zipfile.ZipFile(io.BytesIO(data)) as bundled:
            for path in bundled.namelist():
                if path.endswith('/'):
                    continue
                if path in files:
                    raise ValueError(f'Duplicate wheel path: {path}')
                files[path] = bundled.read(path)
    with zipfile.ZipFile(DEST / 'bytecode.zip', 'w') as output:
        for path, data in sorted(files.items()):
            info = zipfile.ZipInfo(path, (2026, 10, 7, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            output.writestr(info, data)
    manifest_path = DEST / 'manifest.json'
    manifest = json.loads(manifest_path.read_text('utf-8'))
    manifest['sources']['bytecode'] = sources
    manifest['sha256']['bytecode.zip'] = hashlib.sha256((DEST / 'bytecode.zip').read_bytes()).hexdigest()
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def prepare_syntax():
    release = json.loads(fetch(f'https://pypi.org/pypi/Pygments/{PYGMENTS}/json'))
    wheel = next(file for file in release['urls'] if file['filename'].endswith('py3-none-any.whl'))
    data = fetch(wheel['url'])
    if hashlib.sha256(data).hexdigest() != wheel['digests']['sha256']:
        raise ValueError('Pygments wheel checksum mismatch')
    (DEST / 'syntax.zip').write_bytes(data)
    manifest_path = DEST / 'manifest.json'
    manifest = json.loads(manifest_path.read_text('utf-8'))
    manifest['sources']['pygments'] = {'version': PYGMENTS, 'repository': 'https://github.com/pygments/pygments'}
    manifest['sha256']['syntax.zip'] = hashlib.sha256(data).hexdigest()
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def fetch(url):
    with urllib.request.urlopen(url, timeout=120) as response:
        return response.read()


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = {'pyodide': PYODIDE, 'sources': {}, 'sha256': {}}
    with zipfile.ZipFile(DEST / 'vendor.zip', 'w', zipfile.ZIP_DEFLATED) as output:
        for name, (repo, revision) in SOURCES.items():
            manifest['sources'][name] = {'repository': f'https://github.com/{repo}', 'revision': revision}
            source = zipfile.ZipFile(io.BytesIO(fetch(f'https://codeload.github.com/{repo}/zip/{revision}')))
            for entry in sorted(source.namelist()):
                relative = entry.partition('/')[2]
                if not relative or entry.endswith('/'):
                    continue
                include = (relative.startswith('decompiler/') and relative.endswith('.py')
                           or relative in ('unrpyc.py', 'deobfuscate.py')) if name == 'unrpyc' else (
                    relative.startswith('unrpa/') and relative.endswith('.py'))
                if include or relative in ('LICENSE', 'COPYING', 'README.md'):
                    target = relative if include else f'licenses/{name}/{relative}'
                    info = zipfile.ZipInfo(target, (2026, 10, 6, 0, 0, 0))
                    info.compress_type = zipfile.ZIP_DEFLATED
                    output.writestr(info, source.read(entry))
    runtime = DEST / 'pyodide'
    runtime.mkdir(exist_ok=True)
    for name in RUNTIME:
        print(f'Downloading Pyodide {PYODIDE}: {name}', flush=True)
        (runtime / name).write_bytes(fetch(f'https://cdn.jsdelivr.net/pyodide/v{PYODIDE}/full/{name}'))
    (runtime / 'LICENSE').write_bytes(fetch(f'https://raw.githubusercontent.com/pyodide/pyodide/{PYODIDE}/LICENSE'))
    for file in [DEST / 'vendor.zip', *sorted(runtime.iterdir())]:
        manifest['sha256'][file.relative_to(DEST).as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--syntax-only', action='store_true')
    parser.add_argument('--bytecode-only', action='store_true')
    args = parser.parse_args()
    if args.bytecode_only:
        prepare_bytecode()
    else:
        if not args.syntax_only:
            main()
        prepare_syntax()
        prepare_bytecode()
