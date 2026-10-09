"""Offline recovery of script containers and common Ren'Py encoding layers.

Only literals and inert pickle records are read. Never import a game's loader
library, call a pickled bound method, or execute Python/marshal bytecode.
"""
import ast
import base64
import binascii
import io
import pickle
import re
import struct
import textwrap
import zlib

import deobfuscate
from decompiler import Decompiler, magic, renpycompat


class method_unpickle(magic.FakeStrict):
    __module__ = 'renpy.python'

    def __new__(cls, node, name):
        if not isinstance(name, str):
            raise TypeError('Invalid container method reference')
        obj = object.__new__(cls)
        obj.node, obj.name = node, name
        return obj


class VppsPyCode(magic.FakeStrict):
    __module__ = 'vpps_lib.vpps_lib'

    def __setstate__(self, state):
        if not isinstance(state, tuple) or len(state) != 4:
            raise ValueError('Invalid Python bytecode record')
        _, self.bytecode, self.location, self.mode = state
        # The source is absent. A valid placeholder plus a warning is preferable
        # to passing foreign-version marshal bytes to the Python decompiler.
        self.source = '\n# Исходный Python-код отсутствует. Сохранён только байткод.\npass'


COMPAT_CLASSES = [VppsPyCode, method_unpickle]
COMPAT_CLASSES.append(type('VppsPyCode', (VppsPyCode,), {'__module__': 'vpps_lib'}))
FACTORY = magic.FakeClassFactory([*renpycompat.SPECIAL_CLASSES, *COMPAT_CLASSES], magic.FakeStrict)


class RecoveryUnpickler(magic.SafeUnpickler):
    def find_class(self, module, name):
        # Protocol 2 represents bytes through this one reducer. Do not trust
        # the whole codecs module or accept other encodings/error handlers.
        if (module, name) == ('_codecs', 'encode'):
            return latin1_bytes
        if module in ('__builtin__', 'builtins') and name == 'bytes':
            return empty_bytes
        return super().find_class(module, name)


def latin1_bytes(value, encoding, errors='strict'):
    if not isinstance(value, str) or encoding not in ('latin1', 'latin-1') or errors != 'strict':
        raise ValueError('Invalid container byte encoding')
    return value.encode('latin1')


def empty_bytes():
    return b''


def safe_loads(data):
    return RecoveryUnpickler(io.BytesIO(data), FACTORY, {'collections'},
                             encoding='ASCII', errors='strict').load()


def statements(record, vpps=False):
    if not isinstance(record, (list, tuple)) or len(record) != 2:
        raise ValueError('Invalid script record')
    nodes = record[0 if vpps else 1]
    if not isinstance(nodes, (list, tuple)) or any(
            not type(node).__module__.startswith(('renpy.ast', 'vpps_lib')) for node in nodes):
        raise ValueError('Invalid script AST')
    return nodes


def unwrap(data):
    """Yield a deterministic chain, at most ten strictly changing layers."""
    yield data
    for _ in range(10):
        decoded = None
        if len(data) >= 2 and data[0] == 0x78 and int.from_bytes(data[:2], 'big') % 31 == 0:
            decoder = zlib.decompressobj()
            decoded = decoder.decompress(data)
            if not decoder.eof:
                raise ValueError('Truncated compressed data')
        else:
            compact = b''.join(data.split())
            if compact and len(compact) % 2 == 0 and re.fullmatch(rb'[0-9a-fA-F]+', compact):
                decoded = bytes.fromhex(compact.decode('ascii'))
            elif compact and len(compact) % 4 == 0 and re.fullmatch(rb'[A-Za-z0-9+/]*={0,2}', compact):
                try:
                    decoded = base64.b64decode(compact, validate=True)
                except binascii.Error:
                    pass
            elif b'\\x' in data and all(32 <= byte < 127 for byte in data):
                try:
                    decoded = data.decode('unicode-escape').encode('latin1')
                except (UnicodeError, ValueError):
                    pass
            else:
                # Recognize a constant-byte XOR of RPC2 by its entire signature.
                # Do not allocate 255 full copies or guess cryptographic keys.
                key = data[0] ^ ord('R') if data else 0
                if key and bytes(byte ^ key for byte in data[:10]) == b'RENPY RPC2':
                    decoded = bytes(byte ^ key for byte in data)
        if decoded is None or decoded == data:
            return
        data = decoded
        yield data


def read_ast(data, context):
    """Read wrapped slots. retain upstream altered-header/zlib-scan strategies."""
    for candidate in unwrap(data):
        sections = [candidate]
        if candidate.startswith(b'RENPY RPC2'):
            position = 10
            while position + 12 <= len(candidate):
                slot, start, length = struct.unpack_from('<III', candidate, position)
                position += 12
                if slot == 0:
                    break
                if start < position or start + length > len(candidate):
                    continue
                if slot == 1:
                    sections.insert(0, candidate[start:start + length])
                    break
        # A correct magic can still precede a modified slot table. Keep salvage
        # strategies available in that case too, as in upstream --try-harder.
        for extractor in (deobfuscate.extract_slot_headerscan, deobfuscate.extract_slot_zlibscan):
            try:
                sections.append(extractor(io.BytesIO(candidate), 1))
            except (ValueError, zlib.error, struct.error):
                pass
        for section in sections:
            try:
                for raw in unwrap(section):
                    try:
                        nodes = statements(safe_loads(raw))
                    except (MemoryError, OverflowError):
                        raise
                    except (pickle.UnpicklingError, ValueError, TypeError, AttributeError,
                            IndexError, KeyError, EOFError):
                        continue
                    if candidate != data or raw != section:
                        context.log('Расширенная декомпиляция: сняты обёртки сценария.')
                    return nodes
            except (ValueError, zlib.error):
                continue
    raise ValueError('Не удалось восстановить сценарий: неизвестная защита или повреждённые данные. '
                     'Для анализа нужны исходный .rpyc и renpy/loader.py этой версии игры.')


def walk_objects(root):
    pending, visited = [root], set()
    while pending:
        value = pending.pop()
        if id(value) in visited or isinstance(value, (str, bytes, int, float, bool, type(None))):
            continue
        visited.add(id(value))
        yield value
        if isinstance(value, dict):
            pending.extend(reversed(list(value.values())))
        elif isinstance(value, (list, tuple)):
            pending.extend(reversed(value))
        elif hasattr(value, '__dict__'):
            pending.extend(reversed(list(value.__dict__.values())))


def python_literals(source):
    """Return literal container assignments/calls and their source ranges."""
    source = textwrap.dedent(source)
    try:
        tree = ast.parse(source)
    except (SyntaxError, IndentationError):
        # Ren'Py 8.4 keeps block indentation. Triple-quoted payloads can have
        # column-zero closing quotes, so dedent alone does not always suffice.
        source = 'if True:\n' + source
        try:
            tree = ast.parse(source)
        except (SyntaxError, IndentationError):
            return source, []
    candidates = []
    loaders = {'vpps_lib.load_script', 'vpps_lib.vpps_lib.load_script'}
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module in ('vpps_lib', 'vpps_lib.vpps_lib'):
            loaders.update(alias.asname or alias.name for alias in node.names if alias.name == 'load_script')
        elif isinstance(node, ast.Import):
            loaders.update(f'{alias.asname}.load_script' for alias in node.names
                           if alias.name in ('vpps_lib', 'vpps_lib.vpps_lib') and alias.asname)
    for node in ast.walk(tree):
        if (isinstance(node, ast.Assign) and len(node.targets) == 1
                and isinstance(node.targets[0], ast.Name)
                and re.fullmatch(r'vpps_code_\d+', node.targets[0].id)
                and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str)):
            candidates.append((node.targets[0].id, node.value.value, node))
        elif (isinstance(node, ast.Expr) and isinstance(node.value, ast.Call)
              and ast.unparse(node.value.func) in loaders and len(node.value.args) == 1
              and not node.value.keywords and isinstance(node.value.args[0], ast.Constant)
              and isinstance(node.value.args[0].value, str)):
            candidates.append(('load_script', node.value.args[0].value, node))
    return source, sorted(candidates, key=lambda item: (item[2].lineno, item[2].col_offset))


def recover_containers(nodes, render, context, depth=0):
    """Recover literal containers as named source sections. preserve failed ones."""
    recovered = []
    for node in walk_objects(nodes):
        if type(node).__name__ == 'VppsPython' and type(node).__module__.startswith('vpps_lib'):
            node.__class__ = renpycompat.CLASS_FACTORY('Python', 'renpy.ast')
            context.log('Контейнер: Python-блок содержит только байткод. Исходник не восстановлен, '
                        'в .rpy оставлены комментарий и pass.')
        if type(node).__name__ not in ('Python', 'EarlyPython'):
            continue
        code = getattr(node, 'code', None)
        original = getattr(code, 'source', None)
        if not isinstance(original, str) or ('vpps_code_' not in original and 'load_script' not in original):
            continue
        _, candidates = python_literals(original)
        for name, value, _ in candidates:
            identifier = name.rsplit('_', 1)[-1]
            label = f'блок {identifier}' if identifier.isdigit() else 'вызов загрузчика'
            try:
                if depth >= 10:
                    raise ValueError('слишком много вложенных контейнеров сценария')
                raw = bytes.fromhex(value)
                if value.endswith('\n'):
                    text = raw.decode('utf-8')
                else:
                    nested = statements(safe_loads(raw), vpps=True)
                    extra = recover_containers(nested, render, context, depth + 1)
                    text = render(nested) + ''.join(extra)
                # Each container payload was compiled/parsed independently. A preceding
                # section's init offset must not change this section's priorities.
                recovered.append(f'\n# Восстановленный контейнер: {label}\ninit offset = 0\n{text}\n')
            except (MemoryError, OverflowError):
                raise
            except Exception as error:  # noqa: BLE001 - preserve any unsupported game block
                context.log(f'Контейнер: {label} не восстановлен ({type(error).__name__}). '
                            'исходный контейнер оставлен в .rpy.')
    if recovered:
        context.log(f'Контейнер: восстановлено блоков: {len(recovered)}. '
                    'Они добавлены ниже основного скрипта для чтения и адаптации. '
                    'Исходные контейнеры сохранены. Загрузчик игры автоматически не переписывается.')
    return recovered


class RecoveryDecompiler(Decompiler):
    """Handle compiler-generated helpers without changing upstream dispatch."""
    def print_node(self, node):
        if type(node).__module__ == 'renpy.ast' and type(node).__name__ == 'PostUserStatement':
            # This is an implicit post_execute hook for the preceding
            # UserStatement, which already retains its original source line.
            return
        super().print_node(node)
