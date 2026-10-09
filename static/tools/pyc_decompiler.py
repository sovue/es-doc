"""Read foreign Python bytecode as data and reconstruct supported source."""
import io
import struct
from contextlib import redirect_stderr, redirect_stdout


def decompile(data):
    from uncompyle6.main import decompile as render
    from xdis import iscode
    from xdis.magics import magic2int, magic_int2tuple, versions
    from xdis.unmarshal import load_code

    if len(data) < 8 or data[:4] not in versions:
        raise ValueError('PYC: неизвестный или повреждённый заголовок Python.')
    magic = magic2int(data[:4])
    version = magic_int2tuple(magic)
    label = '.'.join(map(str, version[:2]))
    if version[:2] > (3, 8) or version[:2] < (2, 0):
        raise ValueError(f'PYC: байткод Python {label} не поддерживается. Доступны версии Python 2.0–3.8.')
    header_size = 16 if version >= (3, 7) else 12 if version >= (3, 3) else 8
    if len(data) <= header_size:
        raise ValueError('PYC: обрезанный заголовок или отсутствующий байткод.')
    if version >= (3, 7) and struct.unpack_from('<I', data, 4)[0] & ~3:
        raise ValueError('PYC: недопустимые флаги заголовка Python.')
    output = io.StringIO()
    diagnostics = io.StringIO()
    try:
        with redirect_stderr(diagnostics), redirect_stdout(diagnostics):
            code = load_code(io.BytesIO(data[header_size:]), magic, code_objects={})
            if not iscode(code):
                raise ValueError('marshal payload is not a code object')
            # Upstream writes this untrusted metadata into a single-line comment.
            code.co_filename = repr(code.co_filename)[1:-1]
            render(code, version, output, is_pypy='pypy' in versions[data[:4]].lower())
    except (MemoryError, OverflowError):
        raise
    except Exception as error:
        raise ValueError(f'PYC: не удалось восстановить Python {label} ({type(error).__name__}). Файл может быть повреждён или содержать неподдерживаемые инструкции.') from error
    return output.getvalue().encode('utf-8'), []
