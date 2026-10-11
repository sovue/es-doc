import base64
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
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'static/tools'))
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


def extended_index_archive(records=7, prefix=b''):
    key = 0x42424242
    payload = b'body'
    index_offset = 34 + len(payload)
    offset, length = 34 ^ key, len(payload) ^ key
    record = {
        4: (offset, length, prefix, b'end metadata'),
        5: (b'first metadata', offset, length, prefix, b'end metadata'),
        6: (b'first metadata', offset, length, length, prefix, b'end metadata'),
        7: (b'first metadata', offset, length, length, prefix, b'end metadata', b'end2 metadata'),
    }[records]
    index = {'test.txt': [record]}
    return f'xehsoidx{index_offset:016x} {key:08x}\n'.encode() + payload + zlib.compress(pickle.dumps(index, protocol=2))


def protocol2_fixture(value):
    from decompiler import magic
    class FixturePickler(magic.SafePickler):
        def save_global(self, obj, name=None):
            if isinstance(obj, magic.FakeClassType):
                self.write(pickle.GLOBAL + f'{obj.__module__}\n{obj.__name__}\n'.encode())
                self.memoize(obj)
            else:
                super().save_global(obj, name)

    out = io.BytesIO()
    FixturePickler(out, protocol=2).dump(value)
    return out.getvalue()


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

    def test_catalog_lists_without_decompiling_then_reads_only_clicked_script(self):
        with TemporaryDirectory(dir=ROOT / 'temp') as directory:
            source = Path(directory) / 'archive'
            source.write_bytes(archive({'scenario/a.rpyc': [(self.script(), b'')],
                                        'other.rpyc': [(b'invalid', b'')]}))
            with patch.object(self.engine, 'decompile', wraps=self.engine.decompile) as decompile:
                catalog = self.engine.Catalog([{'path': 'data.rpa', 'source': str(source)}])
                self.assertEqual(len(catalog.listing()), 2)
                self.assertEqual(decompile.call_count, 0)
                path, data, warnings = catalog.read('0:scenario/a.rpyc', {})
                self.assertEqual(path, 'scenario/a.rpy')
                self.assertIn(b'label start:', data)
                self.assertEqual(decompile.call_count, 1)
                self.assertEqual(catalog.read('0:scenario/a.rpyc', {}), (path, data, warnings))
                self.assertEqual(decompile.call_count, 1)
                catalog.read('0:scenario/a.rpyc', {'no_init_offset': True})
                self.assertEqual(decompile.call_count, 2)

    def test_lazy_preview_preserves_existing_source_and_split_segments(self):
        with TemporaryDirectory(dir=ROOT / 'temp') as directory:
            source = Path(directory) / 'archive'
            source.write_bytes(archive({'script.rpyc': [(b'invalid', b'')],
                'script.rpy': [(b'start:', b'label '), (b'\n    pass\n', b'')]}))
            catalog = self.engine.Catalog([{'path': 'data.rpa', 'source': str(source)}])
            path, data, warnings = catalog.read('0:script.rpyc', {})
            self.assertEqual((path, data), ('script.rpy', b'label start:\n    pass\n'))
            self.assertEqual(len(warnings), 1)

    def test_preview_rejects_oversized_entries_before_reading_them(self):
        with TemporaryDirectory(dir=ROOT / 'temp') as directory:
            source = Path(directory) / 'archive'
            source.write_bytes(archive({'big.bin': [(b'0123456789', b'prefix')],
                                        'small.txt': [(b'ok', b'')]}))
            catalog = self.engine.Catalog([{'path': 'data.rpa', 'source': str(source)}])
            self.assertEqual(len(catalog.listing()), 2)
            with patch.object(self.engine, 'MAX_PREVIEW_BYTES', 8, create=True):
                with patch('builtins.open', side_effect=AssertionError('Oversized entry was opened')):
                    with self.assertRaisesRegex(ValueError, 'Скачайте архив'):
                        catalog.read('0:big.bin', {})
                self.assertIsNone(catalog.cached)
                self.assertEqual(catalog.read('0:small.txt', {})[1], b'ok')

    def test_preview_limit_uses_existing_source_size_instead_of_compiled_size(self):
        with TemporaryDirectory(dir=ROOT / 'temp') as directory:
            source = Path(directory) / 'archive'
            source.write_bytes(archive({'large.rpyc': [(b'x', b'')],
                                        'large.rpy': [(b'0123456789', b'')],
                                        'small.rpyc': [(b'0123456789', b'')],
                                        'small.rpy': [(b'ok', b'')]}))
            catalog = self.engine.Catalog([{'path': 'data.rpa', 'source': str(source)}])
            with patch.object(self.engine, 'MAX_PREVIEW_BYTES', 8, create=True):
                with self.assertRaisesRegex(ValueError, 'Скачайте архив'):
                    catalog.read('0:large.rpyc', {})
                self.assertEqual(catalog.read('0:small.rpyc', {})[:2], ('small.rpy', b'ok'))

    def test_preview_limit_also_applies_to_loose_compiled_files(self):
        with TemporaryDirectory(dir=ROOT / 'temp') as directory:
            source = Path(directory) / 'script'
            source.write_bytes(b'0123456789')
            catalog = self.engine.Catalog([{'path': 'script.rpyc', 'source': str(source)}])
            with patch.object(self.engine, 'MAX_PREVIEW_BYTES', 8, create=True):
                with self.assertRaisesRegex(ValueError, 'Скачайте архив'):
                    catalog.read('0:script.rpyc', {})

    def test_catalog_reports_bad_archives_without_hiding_good_sources(self):
        with TemporaryDirectory(dir=ROOT / 'temp') as directory:
            source = Path(directory) / 'good'
            source.write_bytes(self.script())
            bad = Path(directory) / 'bad'
            bad.write_bytes(archive({'../unsafe': [(b'x', b'')]}))
            catalog = self.engine.Catalog([{'path': 'bad.rpa', 'source': str(bad)},
                {'path': 'good.rpyc', 'source': str(source)}])
            self.assertEqual(len(catalog.errors), 1)
            self.assertEqual(catalog.listing()[0]['id'], '1:good.rpyc')

    def test_local_highlighter_uses_shared_renpy_lexer_and_escapes_markup(self):
        with patch.dict(sys.modules, {'renpy_lexer': __import__('app.utils.renpy_lexer', fromlist=['RenPyLexer'])}):
            html = self.engine.preview_html('script.rpy', b'label start:\n    "<script>alert(1)</script>"\n')
        self.assertIn('class="k"', html)
        self.assertIn('class="w"', html)
        self.assertNotIn('<script>', html)
        self.assertIn('&lt;', html)

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

    def python_node(self, source):
        import decompiler.renpycompat as compat
        node = compat.CLASS_FACTORY('Python', 'renpy.ast')()
        class PyCode(compat.magic.FakeStrict):
            __module__ = 'renpy.ast'

            def __getstate__(self):
                return (1, self.source, self.location, self.mode)

        code = PyCode()
        code.__dict__.update(source='\n' + source, location=('wrapper.rpy', 1), mode='exec')
        node.__dict__.update(code=code, hide=False, store='store', linenumber=1)
        return node

    def python_script(self, source):
        import decompiler.renpycompat as compat
        node = self.python_node(source)
        payload = zlib.compress(compat.pickle_safe_dumps(({}, [node])))
        return b'RENPY RPC2' + struct.pack('<III', 1, 34, len(payload)) + b'\0' * 12 + payload

    def container_payload(self, method_reference=False):
        import decompiler.renpycompat as compat
        raw = zlib.decompress(self.script()[34:])
        _, stmts = compat.pickle_safe_loads(raw)
        initcode = []
        if method_reference:
            # Container init lists can contain pickled bound-method reducers.
            class Reference:
                def __reduce__(self):
                    return compat.CLASS_FACTORY('method_unpickle', 'renpy.python'), (stmts[0], 'execute_init')
            initcode = [(0, Reference())]
        return compat.pickle_safe_dumps((stmts, initcode)).hex()

    def test_advanced_recovers_container_ast_and_source_literals(self):
        value = self.container_payload(method_reference=True)
        source = 'label recovered_text:\n    "Текст из контейнера"\n'
        wrapper = self.python_script(f'vpps_code_0 = {value!r}\nvpps_code_1 = {(source.encode().hex() + chr(10))!r}')
        ordinary, _ = self.engine.decompile(wrapper, {})
        self.assertNotIn(b'label start:', ordinary)
        result, contents, _ = self.run_job([('wrapper.rpyc', wrapper)], 'unrpyc', {'try_harder': True})
        self.assertEqual(result['failed'], 0, result['errors'])
        text = contents['wrapper.rpy'].decode()
        self.assertIn('label start:', text)
        self.assertIn('label recovered_text:', text)
        self.assertIn('Текст из контейнера', text)
        self.assertIn(value, text)  # Keep the original wrapper and its variable references.

    def test_advanced_recovers_direct_container_loader_literal(self):
        wrapper = self.python_script(f'import vpps_lib\nvpps_lib.load_script({self.container_payload()!r})')
        text, _ = self.engine.decompile(wrapper, {'try_harder': True})
        self.assertIn(b'label start:', text)

    def test_advanced_recovers_nested_hex_base64_zlib_and_xor(self):
        raw = zlib.decompress(self.script()[34:])
        for data in (raw.hex().encode(), base64.b64encode(raw.hex().encode()),
                     zlib.compress(base64.b64encode(raw)),
                     bytes(byte ^ 0xA7 for byte in self.script())):
            with self.subTest(prefix=data[:12]):
                text, _ = self.engine.decompile(data, {'try_harder': True})
                self.assertIn('Привет, мододел!', text.decode())

    def test_advanced_handles_encoded_slot_ending_at_eof(self):
        payload = base64.b64encode(zlib.decompress(self.script()[34:]).hex().encode())
        data = b'RENPY RPC2' + struct.pack('<III', 1, 34, len(payload)) + b'\0' * 12 + payload
        text, _ = self.engine.decompile(data, {'try_harder': True})
        self.assertIn(b'label start:', text)

    def test_advanced_does_not_evaluate_nonconstant_container_expressions(self):
        source = "vpps_code_0 = __import__('os').getcwd()\n"
        with patch('os.getcwd', side_effect=AssertionError('Game code executed')):
            text, _ = self.engine.decompile(self.python_script(source), {'try_harder': True})
        self.assertIn(b'__import__', text)

    def test_advanced_preserves_bad_container_block_and_reports_it(self):
        wrapper = self.python_script("vpps_code_0 = 'broken'\n")
        text, logs = self.engine.decompile(wrapper, {'try_harder': True})
        self.assertIn(b"'broken'", text)
        self.assertTrue(any('Контейнер:' in str(log) and 'блок 0' in str(log) for log in logs))
        self.assertFalse(any('vpps' in str(log).lower() for log in logs))

    def test_advanced_recovers_custom_rpa_magic_for_export_and_preview(self):
        original = archive({'scenario/script.rpyc': [(self.script(), b'')], 'image.png': [(b'image', b'')]})
        data = b'CUSTOM!!' + original[8:]
        result, contents, _ = self.run_job([('custom.rpa', data)], 'combined', {'try_harder': True})
        self.assertEqual(result['failed'], 0, result['errors'])
        self.assertEqual(contents['image.png'], b'image')
        self.assertIn(b'label start:', contents['scenario/script.rpy'])
        with TemporaryDirectory(dir=ROOT / 'temp') as directory:
            path = Path(directory) / 'custom.rpa'
            path.write_bytes(data)
            files = [{'path': 'custom.rpa', 'source': str(path)}]
            self.assertTrue(self.engine.Catalog(files).errors)
            catalog = self.engine.Catalog(files, {'try_harder': True})
            self.assertFalse(catalog.errors)
            name, text, _ = catalog.read('0:scenario/script.rpyc', {'try_harder': True})
            self.assertEqual(name, 'scenario/script.rpy')
            self.assertIn(b'label start:', text)

    def test_advanced_container_preview_matches_export(self):
        data = self.python_script(f'vpps_code_0 = {self.container_payload()!r}')
        options = {'try_harder': True}
        _, contents, _ = self.run_job([('script.rpyc', data)], 'unrpyc', options)
        with TemporaryDirectory(dir=ROOT / 'temp') as directory:
            source = Path(directory) / 'script.rpyc'
            source.write_bytes(data)
            catalog = self.engine.Catalog([{'path': 'script.rpyc', 'source': str(source)}])
            _, text, _ = catalog.read('0:script.rpyc', options)
        self.assertEqual(text, contents['script.rpy'])

    def test_advanced_container_bytecode_is_inert_and_reported_as_partial(self):
        import decompiler.renpycompat as compat
        class VppsPyCode(compat.magic.FakeStrict):
            __module__ = 'vpps_lib.vpps_lib'

            def __getstate__(self):
                return (1, b'foreign Python marshal bytecode', ('test.rpy', 1), 'exec')

        node = compat.CLASS_FACTORY('VppsPython', 'vpps_lib.vpps_lib')()
        node.__dict__.update(code=VppsPyCode(), hide=False, store='store', linenumber=1)
        payload = zlib.compress(protocol2_fixture(({}, [node])))
        with patch('marshal.loads', side_effect=AssertionError('Bytecode loaded')):
            text, logs = self.engine.decompile(payload, {'try_harder': True})
        self.assertIn(b'python:', text)
        self.assertIn(b'    pass', text)
        self.assertTrue(any('байткод' in str(log) for log in logs))
        self.assertNotIn('vpps', text.decode().lower())
        self.assertFalse(any('vpps' in str(log).lower() for log in logs))

    def test_advanced_regular_script_has_no_recovery_warning(self):
        text, logs = self.engine.decompile(self.script(), {'try_harder': True})
        self.assertIn(b'label start:', text)
        self.assertFalse(logs)

    def test_advanced_pickles_never_execute_a_reducer(self):
        class Evil:
            def __reduce__(self):
                return eval, ("__import__('os').getcwd()",)

        malicious = pickle.dumps(({}, [Evil()]), protocol=2)
        wrapper = self.python_script(f'vpps_code_0 = {malicious.hex()!r}')
        with patch('os.getcwd', side_effect=AssertionError('Reducer executed')):
            with self.assertRaises(ValueError):
                self.engine.decompile(malicious, {'try_harder': True})
            text, logs = self.engine.decompile(wrapper, {'try_harder': True})
        self.assertIn(malicious.hex().encode(), text)
        self.assertTrue(any('не восстановлен' in str(log) for log in logs))

    def test_advanced_changed_rpyc_magic_and_escaped_layers(self):
        compiled = self.script()
        raw = zlib.decompress(compiled[34:])
        payload = compiled[34:]
        shifted_header = b'RENPY RPC2JUNK' + struct.pack('<III', 1, 38, len(payload)) + b'\0' * 12 + payload
        for data in (b'CUSTOM!!!!' + compiled[10:], shifted_header,
                     ''.join(f'\\x{byte:02x}' for byte in raw).encode()):
            text, _ = self.engine.decompile(data, {'try_harder': True})
            self.assertIn(b'label start:', text)

    def test_advanced_container_preserves_wrapper_dependencies_and_inline_statements(self):
        wrapper = self.python_script(f'vpps_code_0 = {self.container_payload()!r}; print("after")\n'
                                     'import vpps_lib\nvpps_lib.load_script(vpps_code_0)')
        text, _ = self.engine.decompile(wrapper, {'try_harder': True})
        self.assertIn(b'vpps_code_0 =', text)
        self.assertIn(b'; print("after")', text)
        self.assertIn(b'vpps_lib.load_script(vpps_code_0)', text)
        self.assertIn(b'label start:', text)

    def test_advanced_archive_fallback_still_rejects_unsafe_paths_and_bad_segments(self):
        for original in (archive({'../evil': [(b'x', b'')]}),
                         archive({'ok': [(b'x', b'')]} )[:-3]):
            result, contents, _ = self.run_job([('custom.rpa', b'CUSTOM!!' + original[8:])],
                                                 'combined', {'try_harder': True})
            self.assertEqual(result['failed'], 1)
            self.assertFalse(contents)

    def test_advanced_extended_index_layouts_and_prefix_lengths(self):
        for records in (4, 5, 6, 7):
            for prefix in (b'', b'prefix '):
                with self.subTest(records=records, prefix=prefix):
                    result, contents, _ = self.run_job([('extended.rpa', extended_index_archive(records, prefix))],
                                                     'combined', {'try_harder': True})
                    self.assertEqual(result['failed'], 0, result['errors'])
                    self.assertEqual(contents['test.txt'], prefix + b'body')

    def test_extended_custom_index_is_opt_in(self):
        result, _, _ = self.run_job([('extended.rpa', extended_index_archive())])
        self.assertEqual(result['failed'], 1)

    def test_advanced_post_user_statement_keeps_its_source_statement(self):
        import decompiler.renpycompat as compat
        parent = compat.CLASS_FACTORY('UserStatement', 'renpy.ast')()
        parent.__dict__.update(line='custom_statement "value"', block=[], linenumber=1)
        post = compat.CLASS_FACTORY('PostUserStatement', 'renpy.ast')()
        post.__dict__.update(parent=parent, linenumber=2)
        data = zlib.compress(compat.pickle_safe_dumps(({}, [parent, post])))
        text, logs = self.engine.decompile(data, {'try_harder': True})
        self.assertEqual(text.count(b'custom_statement "value"'), 1)
        self.assertFalse(any('Unknown AST node' in str(log) for log in logs))

    def test_advanced_container_sections_preserve_independent_init_priorities(self):
        import decompiler.renpycompat as compat
        nested_python = self.python_node('nested = True')
        nested_init = compat.CLASS_FACTORY('Init', 'renpy.ast')()
        nested_init.__dict__.update(priority=0, linenumber=1, block=[nested_python])
        nested_value = compat.pickle_safe_dumps(([nested_init], [])).hex()
        literal = 'init python:\n    literal_block = True\n'
        sources = [f'vpps_code_0 = {nested_value!r}\nvpps_code_1 = {(literal.encode().hex() + chr(10))!r}',
                   'main_two = True', 'main_three = True']
        main_nodes = []
        for index, source in enumerate(sources):
            python = self.python_node(source)
            init = compat.CLASS_FACTORY('Init', 'renpy.ast')()
            init.__dict__.update(priority=100, linenumber=index * 4 + 1, block=[python])
            main_nodes.append(init)
        data = zlib.compress(compat.pickle_safe_dumps(({}, main_nodes)))
        text, _ = self.engine.decompile(data, {'try_harder': True})
        # Interpret the output's init priorities in order, as Ren'Py would.
        offset = 0
        priorities = []
        for line in text.decode().splitlines():
            if line.startswith('init offset = '):
                offset = int(line.rsplit(' ', 1)[1])
            elif line.startswith('init ') and line.endswith('python:'):
                parts = line.split()
                priorities.append(offset + (int(parts[1]) if parts[1].lstrip('-').isdigit() else 0))
        self.assertEqual(priorities, [100, 100, 100, 0, 0])

    def test_advanced_bytes_reducer_accepts_only_empty_bytes(self):
        self.assertEqual(self.engine.recovery.safe_loads(pickle.dumps(b'', protocol=2)), b'')
        class Allocate:
            def __reduce__(self):
                return bytes, (42,)
        with self.assertRaises(TypeError):
            self.engine.recovery.safe_loads(pickle.dumps(Allocate(), protocol=2))

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
        self.assertIn('сохранён без замены', result['warning_details'][0])

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
