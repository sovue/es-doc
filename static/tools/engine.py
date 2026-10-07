"""Browser adapter for the unmodified, pinned unrpyc and unrpa packages.

The same adapter is exercised by CPython tests and by Pyodide in a Worker.
No user-supplied code is executed. archive indexes use a restricted unpickler.
"""
import io
import pickle
import re
import zipfile
import zlib
from pathlib import PurePosixPath

import decompiler
import deobfuscate
import pyc_decompiler
import recovery
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
            extended_index = getattr(version, 'extended_index', False)
            if extended_index and isinstance(entry, (list, tuple)) and len(entry) in (4, 5, 6, 7):
                # This extended layout ignores first/end/end2/dlen2 metadata. Its dlen
                # describes physical bytes, with the prefix added separately.
                shift = 0 if len(entry) == 4 else 1
                prefix_at = 2 if len(entry) == 4 else (3 if len(entry) == 5 else 4)
                metadata = list(entry[:shift]) + list(entry[prefix_at + 1:])
                if any(not isinstance(value, (str, bytes)) for value in metadata):
                    raise ValueError('Invalid extended archive metadata')
                if len(entry) >= 6 and type(entry[3]) is not int:
                    raise ValueError('Invalid extended archive secondary length')
                entry = (entry[shift], entry[shift + 1], entry[prefix_at])
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
            if extended_index:
                length += len(prefix)
            if start < 0 or length < len(prefix) or start + length - len(prefix) > offset:
                raise ValueError('Archive segment points outside file data')
            records.append((start, length, prefix))
        normalized[path] = records_by_id[id(entries)] = tuple(records)
    return normalized


class RenamedRPA3:
    def __init__(self, extended_index=False):
        self.extended_index = extended_index

    def find_offset_and_key(self, source):
        source.seek(0)
        header = source.read(34)
        return int(header[8:24], 16), int(header[25:33], 16)


def archive_index(tool, source, options):
    try:
        return read_index(tool, source, tool.detect_version())
    except (MemoryError, OverflowError):
        raise
    except Exception:
        if not options.get('try_harder'):
            raise
        source.seek(0)
        header = source.read(34)
        # Known ZiX formats transform assets too and require a matching loader.
        # Never silently treat their header as a renamed plain RPA-3 archive.
        if header.startswith((b'ZiX-12A', b'ZiX-12B', b'ALT-1.0')):
            raise ValueError('Эта защита RPA требует соответствующий renpy/loader.py '
                             'и отдельный декодер данных архива.') from None
        if not re.fullmatch(rb'.{8}[0-9a-fA-F]{16} [0-9a-fA-F]{8}\n', header, re.DOTALL):
            raise
        source.seek(0)
        return read_index(tool, source, RenamedRPA3(extended_index=header.startswith(b'xehsoidx')))


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


def source_name(path):
    file = PurePosixPath(path)
    if path.lower().endswith('.pyc'):
        name = re.sub(r'\.(?:cpython-\d+|pypy\d+)(?:\.opt-\d+)?\.pyc$', '.py', file.name, flags=re.IGNORECASE)
        if name != file.name and file.parent.name == '__pycache__':
            return str(file.parent.parent / name)
        return str(file.with_suffix('.py'))
    return str(file.with_suffix('.rpym' if path.lower().endswith('.rpymc') else '.rpy'))


def decompile(data, options):
    context = unrpyc.Context()
    stream = io.BytesIO(data)
    if options.get('try_harder'):
        try:
            ast = recovery.statements((None, unrpyc.read_ast_from_file(stream, context)))
        except (MemoryError, OverflowError):
            raise
        except Exception:  # noqa: BLE001 - retry unsupported input with inert recovery
            context = unrpyc.Context()
            ast = recovery.read_ast(data, context)
    else:
        ast = unrpyc.read_ast_from_file(stream, context)
    settings = decompiler.Options(log=context.log_contents,
                                   init_offset=not options.get('no_init_offset', False))

    def render(nodes):
        output = io.StringIO()
        if options.get('try_harder'):
            recovery.RecoveryDecompiler(output, settings).dump(nodes)
        else:
            decompiler.pprint(output, nodes, settings)
        return output.getvalue()

    extra = recovery.recover_containers(ast, render, context) if options.get('try_harder') else []
    return (render(ast) + ''.join(extra)).encode('utf-8'), context.log_contents


class Catalog:
    """Index sources without extracting assets or decompiling scripts."""
    def __init__(self, files, options=None):
        self.files = files
        self.entries = {}
        self.errors = []
        self.cached = None
        for number, entry in enumerate(files):
            try:
                path = safe_path(entry['path'])
                if path.lower().endswith('.rpa'):
                    tool = UnRPA(entry['source'])
                    with open(entry['source'], 'rb') as source:
                        index = archive_index(tool, source, options or {})
                    for name, segments in index.items():
                        self.entries[f'{number}:{name}'] = {
                            'path': name, 'source': number, 'segments': segments,
                            'size': sum(length for _, length, _ in segments),
                            'originals': index,
                        }
                else:
                    with open(entry['source'], 'rb') as source:
                        source.seek(0, 2)
                        length = source.tell()
                    self.entries[f'{number}:{path}'] = {
                        'path': path, 'source': number, 'size': length,
                    }
            except Exception as error:
                if isinstance(error, (MemoryError, OverflowError)):
                    raise
                self.errors.append(f'{entry["path"]}: {error}')

    def listing(self):
        return [{'id': key, 'path': entry['path'], 'size': entry['size'],
                 'source': entry['source']} for key, entry in self.entries.items()]

    def read(self, key, options):
        cache_key = (key, bool(options.get('try_harder')), bool(options.get('no_init_offset')))
        if self.cached and self.cached[0] == cache_key:
            return self.cached[1]
        entry = self.entries[key]
        path = entry['path']
        warnings = []
        # Existing source takes precedence, exactly as in a full ZIP export.
        compiled = path.lower().endswith(('.rpyc', '.rpymc', '.pyc'))
        target = source_name(path)
        segments = entry.get('segments')
        if compiled and target in entry.get('originals', {}):
            segments = entry['originals'][target]
            warnings.append(f'Исходный файл {target} уже есть в архиве, сохранён без замены.')
            path = target
            compiled = False
        with open(self.files[entry['source']]['source'], 'rb') as source:
            if segments is None:
                data = source.read()
            else:
                data = b''.join(iter(Segments(source, segments).read, b''))
        if compiled:
            data, logs = pyc_decompiler.decompile(data) if path.lower().endswith('.pyc') else decompile(data, options)
            warnings.extend(str(log) for log in logs)
            path = target
        result = (path, data, warnings)
        # Cache the current preview only, not every expanded archive asset.
        self.cached = (cache_key, result)
        return result


def preview_html(path, data):
    """Use the resource browser's lexer and token palette, entirely locally."""
    if not path.lower().endswith(('.rpy', '.rpym', '.txt', '.md', '.json', '.yaml',
                                 '.yml', '.xml', '.html', '.css', '.js', '.py',
                                 '.csv', '.ini', '.log', '.sh', '.bat')):
        return None
    if len(data) > 2 * 1024 * 1024:
        return None
    from pygments import highlight
    from pygments.filter import Filter
    from pygments.formatters import HtmlFormatter
    from pygments.lexers import get_lexer_for_filename
    from pygments.lexers.special import TextLexer
    from pygments.token import Whitespace
    from pygments.util import ClassNotFound
    from renpy_lexer import RenPyLexer

    class Spaces(Filter):
        def filter(self, lexer, stream):
            for token, value in stream:
                for part in re.split('( +)', value):
                    if part:
                        yield (Whitespace if part.startswith(' ') else token), part

    try:
        lexer = RenPyLexer() if path.lower().endswith(('.rpy', '.rpym')) else get_lexer_for_filename(path)
    except ClassNotFound:
        lexer = TextLexer()
    lexer.add_filter(Spaces())
    return highlight(data.decode('utf-8', 'replace'), lexer, HtmlFormatter(nowrap=True))


def process(files, mode, options, sink, notify=lambda event: None):
    if mode not in ('unrpa', 'unrpyc', 'combined'):
        raise ValueError('Unknown tool mode')
    if sum(entry.get('path', '').lower().endswith('.rpa') for entry in files) > 1:
        raise ValueError('Process each RPA archive separately')
    used = set()
    input_paths = set()
    result = {'succeeded': 0, 'failed': 0, 'written': 0, 'warnings': 0,
              'warning_details': [], 'errors': []}

    def warn(path, message):
        result['warnings'] += 1
        if len(result['warning_details']) < 100:
            result['warning_details'].append(f'{path}: {message}')

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
            text, logs = pyc_decompiler.decompile(data) if path.lower().endswith('.pyc') else decompile(data, options)
            target = source_name(path)
            write_bytes(target, text)
            for log in logs:
                warn(path, str(log))

        for number, entry in enumerate(files):
            path = entry.get('path', '')
            notify({'type': 'file', 'index': number, 'path': path, 'state': 'working'})
            try:
                path = safe_path(path)
                if path in input_paths:
                    raise ValueError('Duplicate input path')
                input_paths.add(path)
                with open(entry['source'], 'rb') as source:
                    if path.lower().endswith(('.rpyc', '.rpymc', '.pyc')) and mode != 'unrpa':
                        data = source.read()
                        if path.lower().endswith('.pyc'):
                            write_bytes(path, data)
                        script(path, data)
                    elif path.lower().endswith('.rpa') and mode != 'unrpyc':
                        tool = UnRPA(entry['source'])
                        index = archive_index(tool, source, options)
                        # Reserve original archive paths before generating .rpy,
                        # so an existing source script always remains untouched.
                        originals = set(index)
                        for count, (name, segments) in enumerate(index.items()):
                            target = name
                            notify({'type': 'entry', 'index': number, 'path': target,
                                    'current': count + 1, 'total': len(index)})
                            stream = Segments(source, segments)
                            compiled = io.BytesIO() if mode == 'combined' and name.lower().endswith(('.rpyc', '.rpymc', '.pyc')) else None
                            with output.open(reserve(target), 'w', force_zip64=True) as destination:
                                for chunk in iter(stream.read, b''):
                                    destination.write(chunk)
                                    if compiled is not None:
                                        compiled.write(chunk)
                            result['written'] += 1
                            if compiled is not None:
                                try:
                                    generated = source_name(target)
                                    if generated in originals:
                                        warn(target, f'Исходный файл {generated} уже есть в архиве, сохранён без замены.')
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
