import unittest
from unittest.mock import patch

from httpx import ASGITransport, AsyncClient

from app.app import app
from app.utils.config import CONFIG
from app.utils.lifespan.search_cache import _section_items


class ToolsRouteTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        setting = patch.object(CONFIG, 'site_url', 'https://example.test')
        setting.start()
        self.addCleanup(setting.stop)

    async def get(self, path):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            return await client.get(path)

    async def test_tools_page_has_local_processing_and_both_pickers(self):
        response = await self.get('/tools/unpack')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Архивы RPA и декомпиляция RPYC/PYC — ES Doc', response.text)
        self.assertIn('id="tools-mode-pack"', response.text)
        self.assertIn('id="tools-pack-strip"', response.text)
        self.assertIn('/static/tools/rpa.py?v=', response.text)
        self.assertIn('webkitdirectory', response.text)
        self.assertIn('multiple', response.text)
        self.assertIn('tools-worker.js', response.text)
        self.assertIn('aria-current="page">Инструменты', response.text)
        self.assertNotIn('name="tool-mode"', response.text)
        self.assertIn('.rpa, .rpyc, .rpymc, .pyc', response.text)
        self.assertNotIn('Результат — ZIP', response.text)
        self.assertNotIn('Попытаться снять обфускацию', response.text)
        self.assertNotIn('tools-report', response.text)
        self.assertIn('tools-download-all', response.text)
        self.assertIn('id="tools-browser-search" class="tools-browser-search"', response.text)
        self.assertIn('/static/css/syntax.css', response.text)
        self.assertIn('tools-warning-host tools-result-meta', response.text)
        self.assertIn('aria-label="Причины предупреждений"', response.text)
        self.assertNotIn('Часть кода могла восстановиться неточно', response.text)
        self.assertLess(response.text.index('id="tools-browser-preview"'), response.text.index('id="tools-download-all"'))

    async def test_hub_links_to_tools_without_loading_unpacker(self):
        response = await self.get('/tools')
        self.assertEqual(response.status_code, 200)
        self.assertIn('href="/tools/unpack"', response.text)
        self.assertIn('href="/tools/colors"', response.text)
        self.assertNotIn('tools-worker.js', response.text)
        self.assertNotIn('/static/js/tools.js', response.text)

    async def test_color_page_has_its_own_controls_and_scripts(self):
        response = await self.get('/tools/colors')
        self.assertEqual(response.status_code, 200)
        self.assertIn('colors-core.js', response.text)
        self.assertIn('colors-named.js', response.text)
        self.assertIn('colors.js', response.text)
        self.assertIn('Именованные цвета', response.text)
        catalog = await self.get('/static/js/colors-named.js')
        self.assertEqual(catalog.status_code, 200)
        self.assertIn('Белоснежный', catalog.text)
        self.assertIn('href="/tools"', response.text)
        self.assertNotIn('tools-worker.js', response.text)
        self.assertNotIn('/static/js/tools.js', response.text)

    async def test_engine_and_runtime_are_served_locally(self):
        stylesheet = await self.get('/static/css/tools.css')
        self.assertEqual(stylesheet.status_code, 200)
        self.assertIn('.tools-icon-warning { --tools-icon: url("/static/icons/circle-alert.svg?v=', stylesheet.text)
        self.assertIn('color: var(--attention)', stylesheet.text)
        self.assertIn('.tools-status.is-error { color: var(--danger); }', stylesheet.text)
        self.assertIn('--tools-error-icon:', stylesheet.text)
        for path in ('engine.py', 'rpa.py', 'recovery.py', 'pyc_decompiler.py', 'bytecode.zip', 'vendor.zip', 'syntax.zip', 'renpy_lexer.py', 'pyodide/0.29.3/pyodide.mjs', 'pyodide/0.29.3/pyodide.asm.wasm'):
            response = await self.get('/static/tools/' + path)
            self.assertEqual(response.status_code, 200, path)
            self.assertIn('nosniff', response.headers['x-content-type-options'])
        response = await self.get('/static/tools/../../app/app.py')
        self.assertEqual(response.status_code, 404)

    async def test_tools_is_in_sitemap_and_global_search(self):
        response = await self.get('/sitemap.xml')
        for path in ('/tools', '/tools/unpack', '/tools/colors'):
            self.assertIn(path + '</loc>', response.text)
            self.assertIn(path, [item['url'] for item in _section_items()])
