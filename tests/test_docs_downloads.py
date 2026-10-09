import shutil
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from httpx import ASGITransport, AsyncClient

from app.app import app
from app.utils.config import CONFIG


class DocsDownloadTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.assets = Path(__file__).resolve().parents[1] / 'temp' / f'test-docs-downloads-{uuid4().hex}'
        self.assets.mkdir(parents=True)
        self.addCleanup(shutil.rmtree, self.assets)
        for setting in (
            patch.object(CONFIG, 'docs_path', self.assets / 'docs'),
            patch.object(CONFIG, 'materials', []),
        ):
            setting.start()
            self.addCleanup(setting.stop)

    def put(self, relative, content=b'original attachment'):
        path = self.assets / 'materials' / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    async def get(self, url):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
            return await client.get(url)

    async def test_article_download_works_without_catalog_entry(self):
        self.put('articles/code_examples/example.rpy')
        response = await self.get('/docs/download/code_examples/example.rpy')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'original attachment')
        self.assertIn('attachment;', response.headers['content-disposition'])
        self.assertEqual(response.headers['x-content-type-options'], 'nosniff')
        catalog = await self.get('/materials')
        self.assertNotIn('example.rpy', catalog.text)

    async def test_cyrillic_filename_downloads(self):
        self.put('articles/example/Карта.zip')
        response = await self.get('/docs/download/example/%D0%9A%D0%B0%D1%80%D1%82%D0%B0.zip')
        self.assertEqual(response.status_code, 200)
        self.assertIn("filename*=utf-8''", response.headers['content-disposition'])

    async def test_missing_and_deleted_attachments_return_404(self):
        path = self.put('articles/example.zip')
        path.unlink()
        self.assertEqual((await self.get('/docs/download/example.zip')).status_code, 404)
        self.assertEqual((await self.get('/docs/download/missing.zip')).status_code, 404)

    async def test_download_cannot_escape_article_directory(self):
        self.put('private.pdf', b'private')
        (self.assets / 'secret.pdf').write_bytes(b'secret')
        for relative in ['%2E%2E/private.pdf', '%2E%2E/%2E%2E/secret.pdf',
                         '..%5Cprivate.pdf', 'C%3A/secret.pdf', 'file.pdf%3Astream']:
            with self.subTest(relative=relative):
                self.assertEqual((await self.get('/docs/download/' + relative)).status_code, 404)


if __name__ == '__main__':
    unittest.main()
