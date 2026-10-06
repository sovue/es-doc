import importlib.util
import io
import pickle
import struct
import sys
import unittest
import zipfile
import zlib
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'static/tools/vendor.zip'))
spec = importlib.util.spec_from_file_location('tools_engine', ROOT / 'static/tools/engine.py')


def archive(entries, version=3, key=0xDEADBEEF):
    header_size = 34 if version == 3 else 25
    body = bytearray(b' ' * header_size)
    index = {}
    for name, parts in entries.items():
        records = []
        for content, prefix in parts:
            offset = len(body)
            body.extend(content)
            length = len(content) + len(prefix)
            records.append((offset ^ key, length ^ key, prefix) if version == 3
                           else (offset, length, prefix))
        index[name] = records
    offset = len(body)
    body.extend(zlib.compress(pickle.dumps(index, protocol=2)))
    header = (f'RPA-3.0 {offset:016x} {key:08x}\n' if version == 3
              else f'RPA-2.0 {offset:016x}\n').encode()
    body[:len(header)] = header
    return bytes(body)


class EngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.engine)

    def run_job(self, entries, mode='unrpa', options=None):
        with TemporaryDirectory(dir=ROOT / 'temp') as directory:
            files = []
            for i, (name, data) in enumerate(entries):
                physical = Path(directory) / f'input-{i}'
                physical.write_bytes(data)
                files.append({'path': name, 'source': str(physical)})
            sink = io.BytesIO()
            events = []
            result = self.engine.process(files, mode, options or {}, sink, events.append)
            with zipfile.ZipFile(io.BytesIO(sink.getvalue())) as output:
                contents = {name: output.read(name) for name in output.namelist()}
            return result, contents, events

    def test_rpa3_xor_prefix_split_and_unicode_paths(self):
        data = archive({'сцены/intro.rpy': [(b'world', b'hello '), (b'!', b'')],
                        'images/empty.png': [(b'', b'')]})
        result, contents, events = self.run_job([('game/data.rpa', data)])
        self.assertEqual(contents['сцены/intro.rpy'], b'hello world!')
        self.assertEqual(contents['images/empty.png'], b'')
        self.assertNotIn('esdoc-report.txt', contents)
        self.assertEqual(result['succeeded'], 1)
        self.assertTrue(events)

    def test_rpa2_archives_are_processed_as_separate_outputs(self):
        data = archive({'script.rpy': [(b'label start:\n    pass\n', b'')]}, version=2)
        for name in ('a.rpa', 'nested/b.rpa'):
            result, contents, _ = self.run_job([(name, data)])
            self.assertEqual(list(contents), ['script.rpy'])
            self.assertEqual(result['succeeded'], 1)

    def test_multiple_archives_cannot_be_merged_into_one_zip(self):
        data = archive({'script.rpy': [(b'source', b'')]})
        with self.assertRaisesRegex(ValueError, 'separately'):
            self.run_job([('a.rpa', data), ('b.rpa', data)])

    def test_hostile_archive_paths_are_rejected(self):
        for path in ('../outside', '/absolute', 'C:\\escape', 'safe/../../escape', 'bad\x00name'):
            with self.subTest(path=path):
                result, contents, _ = self.run_job([('evil.rpa', archive({path: [(b'x', b'')]}))])
                self.assertEqual(result['failed'], 1)
                self.assertEqual(contents, {})

    def test_pickle_globals_cannot_execute(self):
        class Evil:
            def __reduce__(self):
                return eval, ('40 + 2',)
        payload = zlib.compress(pickle.dumps(Evil(), protocol=2))
        data = b'RPA-2.0 0000000000000019\n' + payload
        result, contents, _ = self.run_job([('evil.rpa', data)])
        self.assertEqual(result['failed'], 1)
        self.assertEqual(contents, {})
        self.assertIn('global', result['errors'][0].lower())

    def test_bad_file_does_not_prevent_other_outputs(self):
        result, contents, _ = self.run_job([
            ('bad.rpyc', b'invalid'), ('ok.rpyc', self.script())], 'unrpyc')
        self.assertEqual((result['succeeded'], result['failed']), (1, 1))
        self.assertIn('label start:', contents['ok.rpy'].decode())

    def test_truncated_archive_is_reported(self):
        data = archive({'x': [(b'abc', b'')]})
        result, _, _ = self.run_job([('broken.rpa', data[:-5])])
        self.assertEqual(result['failed'], 1)

    def script(self):
        import decompiler.renpycompat as compat
        label = compat.CLASS_FACTORY('Label', 'renpy.ast')()
        say = compat.CLASS_FACTORY('Say', 'renpy.ast')()
        label.__dict__.update(name='start', linenumber=1, parameters=None, hide=False,
                              block=[say])
        say.__dict__.update(who=None, what='Привет, мододел!', linenumber=2,
                            interact=True, attributes=None, arguments=None,
                            temporary_attributes=None, identifier=None, explicit_identifier=None)
        payload = zlib.compress(compat.pickle_safe_dumps(({}, [label])))
        return b'RENPY RPC2' + struct.pack('<III', 1, 34, len(payload)) + b'\0' * 12 + payload

    def test_decompile_real_ast_and_preserve_folder(self):
        result, contents, _ = self.run_job([('game/script.rpyc', self.script())], 'unrpyc')
        self.assertEqual(result['succeeded'], 1)
        self.assertIn('label start:', contents['game/script.rpy'].decode())
        self.assertIn('Привет, мододел!', contents['game/script.rpy'].decode())

    def test_extract_and_decompile_keeps_compiled_original(self):
        data = archive({'scenario/script.rpyc': [(self.script(), b'')], 'a.png': [(b'image', b'')]})
        result, contents, _ = self.run_job([('game/data.rpa', data)], 'combined')
        self.assertEqual(set(contents), {'scenario/script.rpy', 'scenario/script.rpyc', 'a.png'})
        self.assertEqual(contents['a.png'], b'image')
        self.assertEqual(result['failed'], 0)

    def test_duplicate_input_paths_are_not_overwritten(self):
        result, contents, _ = self.run_job([('script.rpyc', self.script()), ('script.rpyc', self.script())], 'unrpyc')
        self.assertEqual((result['succeeded'], result['failed']), (1, 1))
        self.assertEqual(list(contents).count('script.rpy'), 1)

    def test_compiled_scripts_have_no_configured_size_cap(self):
        result, contents, _ = self.run_job([('script.rpyc', self.script())], 'unrpyc', {'script_limit': 20})
        self.assertEqual(result['failed'], 0)
        self.assertIn('script.rpy', contents)

    def test_streaming_zip_sink_is_readable(self):
        chunks = []
        sink = self.engine.ChunkSink(chunks.append)
        with zipfile.ZipFile(sink, 'w') as output:
            output.writestr('a.txt', b'hello')
        sink.flush()
        with zipfile.ZipFile(io.BytesIO(b''.join(chunks))) as output:
            self.assertEqual(output.read('a.txt'), b'hello')

    def test_zip_stream_has_no_768_mib_cap(self):
        sink = self.engine.ChunkSink(lambda data: None)
        sink.position = 800 * 1024 * 1024
        sink.write(b'x')
        self.assertEqual(sink.tell(), 800 * 1024 * 1024 + 1)

    def test_combined_preserves_existing_source(self):
        data = archive({'script.rpyc': [(self.script(), b'')], 'script.rpy': [(b'original source', b'')]})
        result, contents, _ = self.run_job([('data.rpa', data)], 'combined')
        self.assertEqual(contents['script.rpy'], b'original source')
        self.assertEqual(result['warnings'], 1)

    def test_shared_pickle_segments_are_normalized_once(self):
        # Memoized lists make many paths share one list in a tiny pickle.
        # Expanding each reference separately must not multiply allocations.
        key = 0xDEADBEEF
        segments = [(34 ^ key, key, b'')] * 3
        index = {'a': segments, 'b': segments, 'c': segments}
        data = b'RPA-3.0 0000000000000022 deadbeef\n' + zlib.compress(pickle.dumps(index, protocol=2))
        with TemporaryDirectory(dir=ROOT / 'temp') as directory:
            physical = Path(directory) / 'data.rpa'
            physical.write_bytes(data)
            tool = self.engine.UnRPA(str(physical))
            with physical.open('rb') as source:
                normalized = self.engine.read_index(tool, source, tool.detect_version())
            self.assertIs(normalized['a'], normalized['b'])
            self.assertIs(normalized['a'], normalized['c'])


if __name__ == '__main__':
    unittest.main()
