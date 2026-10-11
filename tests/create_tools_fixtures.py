"""Synthetic Ren'Py/RPA fixtures for the optional real-browser smoke test."""
from pathlib import Path
import pickle
import zlib

from tests.test_tools_engine import EngineTests, archive


def main():
    EngineTests.setUpClass()
    root = Path(__file__).resolve().parents[1] / 'temp/tools-fixtures'
    (root / 'game/scenario').mkdir(parents=True, exist_ok=True)
    data = EngineTests().script()
    (root / 'game/scenario/script.rpyc').write_bytes(data)
    (root / 'game/data.rpa').write_bytes(archive({
        'scenario/script.rpyc': [(data, b'')],
        'images/test.txt': [(b'resource', b'')],
    }))
    (root / 'bad.rpyc').write_bytes(b'not a compiled RenPy script')
    (root / 'images.rpa').write_bytes(archive({'images/test.txt': [(b'second archive', b'')]}))

    # Seek over a large payload so fixture creation does not allocate it in RAM.
    length, key = 65 * 1024 * 1024, 0xDEADBEEF
    index_offset = 34 + length + 2
    with (root / 'large.rpa').open('wb') as output:
        output.write(f'RPA-3.0 {index_offset:016x} {key:08x}\n'.encode())
        output.seek(34 + length)
        output.write(b'ok')
        output.write(zlib.compress(pickle.dumps({
            'big.bin': [(34 ^ key, length ^ key, b'')],
            'small.txt': [((34 + length) ^ key, 2 ^ key, b'')],
        }, protocol=2)))


if __name__ == '__main__':
    main()
