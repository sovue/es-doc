import ast
import gc
import importlib.util
import io
import struct
import sys
import unittest
import weakref
import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'static/tools'))
sys.path.insert(0, str(ROOT / 'static/tools/vendor.zip'))
sys.path.insert(0, str(ROOT / 'static/tools/bytecode.zip'))


def fixture(version=(3, 6), flags=0, filename='example.py'):
    from xdis import marsh
    from xdis.codetype import Code2, Code3, Code38
    from xdis.magics import by_version

    attributes = {'co_argcount': 0, 'co_nlocals': 0, 'co_stacksize': 1, 'co_flags': 0,
                  'co_consts': (42, None), 'co_names': ('answer',), 'co_varnames': (),
                  'co_filename': filename, 'co_name': '<module>', 'co_firstlineno': 1,
                  'co_lnotab': b'', 'co_freevars': (), 'co_cellvars': ()}
    if version == (2, 7):
        attributes['co_code'] = bytes([100, 0, 0, 90, 0, 0, 100, 1, 0, 83])
        code = Code2(**attributes)
    else:
        attributes.update(co_code=bytes([100, 0, 90, 0, 100, 1, 83, 0]), co_kwonlyargcount=0)
        if version == (3, 8):
            code = Code38(**attributes, co_posonlyargcount=0)
        else:
            code = Code3(**attributes)
    header = by_version['.'.join(map(str, version))]
    header += struct.pack('<III', flags, 0, 0) if version >= (3, 7) else b'\0' * (8 if version >= (3, 3) else 4)
    chunks = []
    marsh._Marshaller(chunks.append, python_version=(*version, 0)).dump(code)
    return header + b''.join(chunk.encode('latin1') if isinstance(chunk, str) else chunk for chunk in chunks)


class PycTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('pyc_engine', ROOT / 'static/tools/engine.py')
        cls.engine = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.engine)

    def run_job(self, path, data):
        with TemporaryDirectory(dir=ROOT / 'temp') as directory:
            source = Path(directory) / 'input'
            source.write_bytes(data)
            sink = io.BytesIO()
            result = self.engine.process([{'path': path, 'source': str(source)}], 'combined', {}, sink)
            with zipfile.ZipFile(io.BytesIO(sink.getvalue())) as archive:
                return result, {name: archive.read(name) for name in archive.namelist()}

    def test_supported_bytecodes_restore_source_and_preserve_original(self):
        for version in ((2, 7), (3, 6), (3, 8)):
            with self.subTest(version=version):
                original = fixture(version)
                result, files = self.run_job('module.pyc', original)
                self.assertEqual(result['failed'], 0, result)
                self.assertEqual(files['module.pyc'], original)
                self.assertIn(b'answer = 42', files['module.py'])
                ast.parse(files['module.py'])

    def test_hash_based_pyc_and_cache_path(self):
        original = fixture((3, 8), flags=3)
        result, files = self.run_job('pkg/__pycache__/module.cpython-38.opt-1.pyc', original)
        self.assertEqual(result['failed'], 0, result)
        self.assertIn(b'answer = 42', files['pkg/module.py'])
        self.assertEqual(files['pkg/__pycache__/module.cpython-38.opt-1.pyc'], original)

    def test_modern_version_is_rejected_before_marshal_and_original_survives(self):
        original = bytes.fromhex('610d0d0a') + b'\0' * 12 + b'not marshal'
        result, files = self.run_job('module.pyc', original)
        self.assertEqual(result['failed'], 1)
        self.assertRegex(result['errors'][0], r'Python 3\.9.*не поддерживается')
        self.assertEqual(files, {'module.pyc': original})

    def test_invalid_header_and_payload_keep_original_without_fake_source(self):
        for original in (b'invalid', fixture()[:20], fixture((3, 8), flags=8)):
            with self.subTest(data=original):
                result, files = self.run_job('module.pyc', original)
                self.assertEqual(result['failed'], 1)
                self.assertEqual(files, {'module.pyc': original})

    def test_catalog_preview_matches_export(self):
        with TemporaryDirectory(dir=ROOT / 'temp') as directory:
            source = Path(directory) / 'input'
            original = fixture()
            source.write_bytes(original)
            files = [{'path': 'module.pyc', 'source': str(source)}]
            catalog = self.engine.Catalog(files)
            name, text, warnings = catalog.read('0:module.pyc', {})
            self.assertEqual(name, 'module.py')
            self.assertEqual(warnings, [])
            _, output = self.run_job('module.pyc', original)
            self.assertEqual(text, output[name])

    def test_completed_decompilations_release_foreign_code_objects(self):
        import pyc_decompiler
        import xdis.unmarshal
        original_loader = xdis.unmarshal.load_code
        references = []

        def track(*args, **kwargs):
            code = original_loader(*args, **kwargs)
            references.append(weakref.ref(code))
            return code

        with patch.object(xdis.unmarshal, 'load_code', side_effect=track):
            for _ in range(5):
                pyc_decompiler.decompile(fixture())
        gc.collect()
        self.assertTrue(all(reference() is None for reference in references))

    def test_embedded_filename_cannot_inject_source_statements(self):
        import pyc_decompiler
        for separator in ('\n', '\r', '\r\n', '\x85', '\u2028', '\u2029'):
            with self.subTest(separator=separator):
                filename = ('example.py' + separator + 'raise RuntimeError("injected")').encode('utf-8')
                # The upstream fixture writer cannot encode every Unicode name.
                # Replace this marshal Unicode field with its actual UTF-8 form.
                field = b'u' + struct.pack('<I', len(filename)) + filename
                original = fixture().replace(b'u\x0a\0\0\0example.py', field, 1)
                text, _ = pyc_decompiler.decompile(original)
                tree = ast.parse(text)
                expected = ast.parse('answer = 42')
                self.assertEqual(ast.dump(tree), ast.dump(expected))

    def test_rpa_preserves_existing_python_and_decompiles_other_pyc(self):
        from test_tools_engine import archive
        original = fixture()
        data = archive({'pkg/__pycache__/existing.cpython-36.pyc': [(original, b'')],
                        'pkg/existing.py': [(b'answer = 99\n', b'')],
                        'other.pyc': [(original, b'')]})
        result, files = self.run_job('scripts.rpa', data)
        self.assertEqual(result['failed'], 0, result)
        self.assertEqual(files['pkg/existing.py'], b'answer = 99\n')
        self.assertIn(b'answer = 42', files['other.py'])
        self.assertEqual(files['other.pyc'], original)


if __name__ == '__main__':
    unittest.main()
