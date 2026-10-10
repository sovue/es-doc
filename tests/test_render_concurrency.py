import asyncio
import importlib
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Event
import unittest
from unittest.mock import patch

from httpx import ASGITransport, AsyncClient

from app.app import app
from app.utils.config import CONFIG


class RenderConcurrencyTests(unittest.IsolatedAsyncioTestCase):
    async def assert_responsive(self, module_name, function_name, url, setting, filename, source):
        module = importlib.import_module(module_name)
        render = getattr(module, function_name)
        started, release = Event(), Event()

        def gated_render(*args):
            started.set()
            release.wait(2)
            return render(*args)

        with TemporaryDirectory() as directory:
            Path(directory, filename).write_text(source, encoding='utf-8')
            with (patch.object(CONFIG, setting, Path(directory)),
                  patch.object(module, function_name, gated_render)):
                async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
                    page = asyncio.create_task(client.get(url))
                    try:
                        self.assertTrue(await asyncio.to_thread(started.wait, 3))
                        health = await client.get('/healthz')
                        self.assertEqual(health.status_code, 200)
                        self.assertFalse(page.done(), 'Rendering blocked the event loop until it finished')
                    finally:
                        release.set()
                        response = await page
                    self.assertEqual(response.status_code, 200)
                    self.assertIn('hello', response.text)

    async def test_article_rendering_allows_other_requests(self):
        await self.assert_responsive('app.routes.docs', 'render', '/docs/demo',
                                     'docs_path', 'demo.md', '# Demo\n\nhello')

    async def test_code_preview_allows_other_requests(self):
        await self.assert_responsive('app.routes.resources', '_file_view', '/resources/browser/demo.rpy',
                                     'res_path', 'demo.rpy', 'label hello:\n    pass\n')
