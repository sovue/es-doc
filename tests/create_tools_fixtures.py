"""Synthetic Ren'Py/RPA fixtures for the optional real-browser smoke test."""
from pathlib import Path

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


if __name__ == '__main__':
    main()
