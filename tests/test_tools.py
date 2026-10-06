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
        response = await self.get('/tools')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Инструменты — ES Doc', response.text)
        self.assertIn('webkitdirectory', response.text)
        self.assertIn('multiple', response.text)
        self.assertIn('tools-worker.js', response.text)
        self.assertIn('aria-current="page">Инструменты', response.text)
        self.assertEqual(response.text.count('name="tool-mode"'), 2)
        self.assertIn('.rpyc/.rpymc код', response.text)
        self.assertIn('.rpa архив', response.text)
        self.assertNotIn('Результат — ZIP', response.text)
        self.assertNotIn('Попытаться снять обфускацию', response.text)
        self.assertNotIn('tools-report', response.text)
        self.assertIn('tools-download-all', response.text)

    async def test_engine_and_runtime_are_served_locally(self):
        for path in ('engine.py', 'vendor.zip', 'pyodide/0.29.3/pyodide.mjs', 'pyodide/0.29.3/pyodide.asm.wasm'):
            response = await self.get('/static/tools/' + path)
            self.assertEqual(response.status_code, 200, path)
            self.assertIn('nosniff', response.headers['x-content-type-options'])
        response = await self.get('/static/tools/../../app/app.py')
        self.assertEqual(response.status_code, 404)

    async def test_tools_is_in_sitemap_and_global_search(self):
        response = await self.get('/sitemap.xml')
        self.assertIn('/tools</loc>', response.text)
        self.assertIn('/tools', [item['url'] for item in _section_items()])
