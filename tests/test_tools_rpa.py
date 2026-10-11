import pickle
import pickletools
import sys
import unittest
import zlib
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'static/tools'))
sys.path.insert(0, str(ROOT / 'static/tools/vendor.zip'))
import rpa
from unrpa import UnRPA


class RpaPackingTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)

    def entries(self, resources):
        entries = []
        for number, (name, data) in enumerate(resources.items()):
            source = self.root / str(number)
            source.write_bytes(data)
            entries.append({'path': name, 'source': str(source)})
        return entries

    def test_round_trip_with_unrpa_and_legacy_renpy_records(self):
        resources = {
            'mods/my_mod/images/bg.png': bytes(range(256)) * 2100,
            'mods/my_mod/audio/тема.ogg': b'\x00\xff\x80music',
            'mods/my_mod/пустой.txt': b'',
            'mods/my_mod/script.rpy': b'label start:\n    return\n',
            'mods/my_mod/straße.txt': b'one',
            'mods/my_mod/strasse.txt': b'two',
        }
        chunks, events = [], []
        result = rpa.pack(self.entries(resources), chunks.append, events.append)
        data = b''.join(chunks)
        self.assertTrue(all(len(chunk) <= rpa.CHUNK for chunk in chunks))
        self.assertEqual(result['written'], len(resources))
        self.assertEqual(events[-1]['state'], 'done')
        # Read the header/index as Ren'Py 6 does, independently of our packer.
        offset = int(data[8:24], 16)
        key = int(data[25:33], 16)
        index_bytes = zlib.decompress(data[offset:])
        self.assertEqual(index_bytes[:2], b'\x80\x02')
        self.assertTrue(all(op.proto <= 2 for op, _, _ in pickletools.genops(index_bytes)))
        self.assertFalse(any(op.name in ('GLOBAL', 'STACK_GLOBAL')
                             for op, _, _ in pickletools.genops(index_bytes)))
        index = pickle.loads(index_bytes)
        restored = {name: b''.join(data[start ^ key:(start ^ key) + (length ^ key)]
                                  for start, length in records)
                    for name, records in index.items()}
        self.assertEqual(restored, resources)
        archive = self.root / 'my_mod.rpa'
        archive.write_bytes(data)
        (self.root / 'unpacked').mkdir()
        unpacker = UnRPA(str(archive), path=str(self.root / 'unpacked'))
        unpacker.extract_files()
        self.assertEqual({name: (self.root / 'unpacked' / name).read_bytes()
                          for name in resources}, resources)

    def test_invalid_or_ambiguous_paths_emit_no_partial_archive(self):
        for names in [[], ['../outside'], ['/absolute'], ['a//b'], ['C:\\asset'],
                      ['a.txt', 'A.txt'], ['café', 'cafe\u0301'], ['x', 'x/file']]:
            with self.subTest(names=names):
                entries = self.entries(dict.fromkeys(names, b'content'))
                chunks = []
                with self.assertRaises(ValueError):
                    rpa.pack(entries, chunks.append)
                self.assertEqual(chunks, [])

    def test_missing_input_emits_no_archive(self):
        with self.assertRaises(OSError):
            rpa.pack([{'path': 'missing', 'source': str(self.root / 'absent')}],
                     lambda data: self.fail('Invalid input emitted output'))


if __name__ == '__main__':
    unittest.main()
