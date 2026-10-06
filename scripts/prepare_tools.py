"""Rebuild pinned browser dependencies. Run explicitly; never at server startup."""
import hashlib
import io
import json
import urllib.request
import zipfile
import argparse
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
    args = parser.parse_args()
    if not args.syntax_only:
        main()
    prepare_syntax()
