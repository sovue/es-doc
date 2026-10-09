"""Stream RPA-3.0 resources with a Python 2 compatible index.

Format reference: renpy/renpy launcher/game/archiver.rpy and renpy/loader.py.
Files are copied unchanged; only the index is compressed.
"""
import os
import pickle
import unicodedata
import zlib

CHUNK = 256 * 1024
KEY = 0x42424242
HEADER_SIZE = 34


def safe_path(value):
    if not isinstance(value, str):
        raise ValueError('Путь файла должен быть строкой.')
    value = value.replace('\\', '/')
    if (not value or value.startswith('/') or ':' in value
            or any(ord(c) < 32 for c in value)
            or any(part in ('', '.', '..') for part in value.split('/'))
            or len(value) > 4096):
        raise ValueError(f'Недопустимый путь: {value!r}.')
    return value


def pack(files, emit, notify=lambda event: None):
    """Validate all paths/sizes before emitting a forward-only archive stream."""
    if not files:
        raise ValueError('Добавьте файлы для упаковки.')
    entries = []
    names = set()
    for entry in files:
        path = safe_path(entry['path'])
        canonical = unicodedata.normalize('NFC', path).lower()
        if canonical in names:
            raise ValueError(f'Повторный путь в архиве: {path}. Измените пути или уберите файл.')
        names.add(canonical)
        entries.append((path, entry['source'], os.path.getsize(entry['source'])))
    for path, _, _ in entries:
        parts = unicodedata.normalize('NFC', path).lower().split('/')
        if any('/'.join(parts[:i]) in names for i in range(1, len(parts))):
            raise ValueError(f'Папка совпадает с именем файла: {path}. Измените пути.')
    entries.sort(key=lambda entry: entry[0])
    offset = HEADER_SIZE
    index = {}
    for path, _, length in entries:
        # Two-element records need no byte-string pickle globals on Python 2.
        index[path] = [(offset ^ KEY, length ^ KEY)]
        offset += length
    compressed_index = zlib.compress(pickle.dumps(index, protocol=2))
    emit(f'RPA-3.0 {offset:016x} {KEY:08x}\n'.encode('ascii'))
    total_bytes = offset - HEADER_SIZE
    copied = 0
    for path, source, length in entries:
        notify({'type': 'file', 'path': path, 'state': 'working'})
        remaining = length
        with open(source, 'rb') as resource:
            while remaining:
                data = resource.read(min(CHUNK, remaining))
                if not data:
                    raise ValueError(f'Не удалось дочитать файл: {path}. Добавьте его заново.')
                emit(data)
                copied += len(data)
                remaining -= len(data)
                notify({'type': 'pack-progress', 'path': path, 'current': copied, 'total': total_bytes})
            if resource.read(1):
                raise ValueError(f'Размер файла изменился: {path}. Добавьте его заново.')
        notify({'type': 'file', 'path': path, 'state': 'done'})
    for start in range(0, len(compressed_index), CHUNK):
        emit(compressed_index[start:start + CHUNK])
    return {'succeeded': len(entries), 'written': len(entries), 'failed': 0,
            'warnings': 0, 'warning_details': [], 'errors': []}
