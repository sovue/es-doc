"""Browser adapter for the unmodified, pinned unrpyc and unrpa packages.

The same adapter is exercised by CPython tests and by Pyodide in a Worker.
No user-supplied code is executed; archive indexes use a restricted unpickler.
"""
import io
import pickle
import zipfile
import zlib
from pathlib import PurePosixPath

import decompiler
import deobfuscate
import unrpyc
from unrpa import UnRPA

CHUNK = 256 * 1024


def safe_path(value):
    if isinstance(value, bytes):
        value = value.decode('utf-8', 'strict')
    if not isinstance(value, str):
        raise TypeError('Invalid path type')
    value = value.replace('\\', '/')
    parts = value.split('/')
    if (not value or value.startswith('/') or any(p in ('', '.', '..') for p in parts)
            or any(ord(c) < 32 for c in value) or ':' in value or len(value) > 4096):
        raise ValueError(f'Unsafe path: {value!r}')
    return value


def checked_decompress(data):
    decoder = zlib.decompressobj()
    result = decoder.decompress(data)
    if not decoder.eof:
        raise ValueError('Truncated compressed data')
    return result


class CheckedZlib:
    # Keep the upstream parser and reject truncated compressed streams.
    error = zlib.error
    decompress = staticmethod(checked_decompress)


unrpyc.zlib = CheckedZlib
deobfuscate.zlib = CheckedZlib


def legacy_bytes(value, encoding, errors='strict'):
    if encoding not in ('latin1', 'latin-1') or errors != 'strict':
        raise ValueError('Archive byte encoding is not supported')
    return value.encode('latin1')


def empty_bytes():
    return b''


class IndexUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if (module, name) == ('_codecs', 'encode'):
            return legacy_bytes
        if module in ('__builtin__', 'builtins') and name == 'bytes':
            return empty_bytes
        raise ValueError(f'Forbidden pickle global: {module}.{name}')

    def persistent_load(self, pid):
        raise ValueError('Forbidden pickle persistent reference')


def read_index(tool, source, version):
    offset, key = version.find_offset_and_key(source)
    source.seek(0, 2)
    size = source.tell()
    if not 0 <= offset < size:
        raise ValueError('Invalid archive index offset')
    source.seek(offset)
    index = IndexUnpickler(io.BytesIO(checked_decompress(source.read())),
                           encoding='bytes').load()
    if not isinstance(index, dict):
        raise TypeError('Invalid archive index')
    normalized = {}
    # Preserve shared pickle segment lists rather than multiplying their
    # allocations for every path. Each unique list is validated only once.
    records_by_id = {}
    for path, entries in index.items():
        path = safe_path(path)
        if path in normalized or not isinstance(entries, (list, tuple)) or not entries:
            raise ValueError('Duplicate path or invalid archive segments')
        if id(entries) in records_by_id:
            normalized[path] = records_by_id[id(entries)]
            continue
        records = []
        for entry in entries:
            if not isinstance(entry, (list, tuple)) or len(entry) not in (2, 3):
                raise ValueError('Invalid archive segment')
            start, length = entry[:2]
            prefix = entry[2] if len(entry) == 3 else b''
            if isinstance(prefix, str):
                prefix = prefix.encode('latin1')
            if not isinstance(prefix, bytes) or type(start) is not int or type(length) is not int:
                raise ValueError('Invalid archive segment types')
            if key is not None:
                start, length = start ^ key, length ^ key
            if start < 0 or length < len(prefix) or start + length - len(prefix) > offset:
                raise ValueError('Archive segment points outside file data')
            records.append((start, length, prefix))
        normalized[path] = records_by_id[id(entries)] = tuple(records)
    return normalized


class Segments:
    """Read split/prefixed archive entries without allocating a whole asset."""
    def __init__(self, source, entries):
        self.source = source
        self.entries = iter(entries)
        self.remaining = 0
        self.prefix = b''

    def read(self, amount=CHUNK):
        amount = CHUNK if amount < 0 else amount
        while not self.remaining and not self.prefix:
            try:
                start, length, self.prefix = next(self.entries)
            except StopIteration:
                return b''
            self.source.seek(start)
            self.remaining = length - len(self.prefix)
        if self.prefix:
            data, self.prefix = self.prefix[:amount], self.prefix[amount:]
            return data
        data = self.source.read(min(amount, self.remaining))
        if not data:
            raise ValueError('Truncated archive file data')
        self.remaining -= len(data)
        return data

    read1 = read


class ChunkSink:
    """Non-seekable ZIP destination, buffering only one transfer chunk."""
    def __init__(self, emit):
        self.emit = emit
        self.position = 0
        self.pending = bytearray()

    def write(self, data):
        length = len(data)
        self.position += length
        self.pending.extend(data)
        while len(self.pending) >= CHUNK:
            chunk = bytes(self.pending[:CHUNK])
            del self.pending[:CHUNK]
            self.emit(chunk)
        return length

    def tell(self):
        return self.position

    def flush(self):
        if self.pending:
            self.emit(bytes(self.pending))
            self.pending.clear()


def decompile(data, options):
    context = unrpyc.Context()
    stream = io.BytesIO(data)
    ast = (deobfuscate.read_ast(stream, context) if options.get('try_harder')
           else unrpyc.read_ast_from_file(stream, context))
    output = io.StringIO()
    settings = decompiler.Options(log=context.log_contents,
                                   init_offset=not options.get('no_init_offset', False))
    decompiler.pprint(output, ast, settings)
    return output.getvalue().encode('utf-8'), context.log_contents


def process(files, mode, options, sink, notify=lambda event: None):
    if mode not in ('unrpa', 'unrpyc', 'combined'):
        raise ValueError('Unknown tool mode')
    if sum(entry.get('path', '').lower().endswith('.rpa') for entry in files) > 1:
        raise ValueError('Process each RPA archive separately')
    used = set()
    input_paths = set()
    result = {'succeeded': 0, 'failed': 0, 'written': 0, 'warnings': 0, 'errors': []}

    with zipfile.ZipFile(sink, 'w', compression=zipfile.ZIP_STORED, allowZip64=True) as output:
        def reserve(path):
            path = safe_path(path)
            if path in used:
                raise ValueError(f'Output path already exists: {path}')
            used.add(path)
            return path

        def write_bytes(path, data):
            output.writestr(reserve(path), data)
            result['written'] += 1

        def script(path, data):
            text, logs = decompile(data, options)
            target = str(PurePosixPath(path).with_suffix('.rpym' if path.lower().endswith('.rpymc') else '.rpy'))
            write_bytes(target, text)
            if logs:
                result['warnings'] += len(logs)

        for number, entry in enumerate(files):
            path = entry.get('path', '')
            notify({'type': 'file', 'index': number, 'path': path, 'state': 'working'})
            try:
                path = safe_path(path)
                if path in input_paths:
                    raise ValueError('Duplicate input path')
                input_paths.add(path)
                with open(entry['source'], 'rb') as source:
                    if path.lower().endswith(('.rpyc', '.rpymc')) and mode != 'unrpa':
                        script(path, source.read())
                    elif path.lower().endswith('.rpa') and mode != 'unrpyc':
                        tool = UnRPA(entry['source'])
                        version = tool.detect_version()
                        index = read_index(tool, source, version)
                        # Reserve original archive paths before generating .rpy,
                        # so an existing source script always remains untouched.
                        originals = set(index)
                        for count, (name, segments) in enumerate(index.items()):
                            target = name
                            notify({'type': 'entry', 'index': number, 'path': target,
                                    'current': count + 1, 'total': len(index)})
                            stream = Segments(source, segments)
                            compiled = io.BytesIO() if mode == 'combined' and name.lower().endswith(('.rpyc', '.rpymc')) else None
                            with output.open(reserve(target), 'w', force_zip64=True) as destination:
                                for chunk in iter(stream.read, b''):
                                    destination.write(chunk)
                                    if compiled is not None:
                                        compiled.write(chunk)
                            result['written'] += 1
                            if compiled is not None:
                                try:
                                    generated = str(PurePosixPath(target).with_suffix('.rpym' if name.lower().endswith('.rpymc') else '.rpy'))
                                    if generated in originals:
                                        result['warnings'] += 1
                                    else:
                                        script(target, compiled.getvalue())
                                except Exception as error:
                                    if isinstance(error, (MemoryError, OverflowError)):
                                        raise
                                    result['failed'] += 1
                                    result['errors'].append(f'{target}: {error}')
                                finally:
                                    compiled.close()
                    else:
                        raise ValueError('File extension does not match the selected tool')
                result['succeeded'] += 1
                notify({'type': 'file', 'index': number, 'path': path, 'state': 'done'})
            except Exception as error:
                # Allocation failures can leave the current ZIP incomplete.
                if isinstance(error, (MemoryError, OverflowError)):
                    raise
                result['failed'] += 1
                result['errors'].append(f'{path}: {error}')
                notify({'type': 'file', 'index': number, 'path': path, 'state': 'error', 'error': str(error)})

    sink.flush()
    return result
