import shutil
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

import yaml
from httpx import ASGITransport, AsyncClient

from app.app import app
from app.utils.config import CONFIG
from app.utils.lifespan.materials_cache import parse_materials
from app.utils.lifespan.refresh import _watchers


class MaterialsTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.assets = Path(__file__).resolve().parents[1] / 'temp' / f'test-materials-{uuid4().hex}'
        self.assets.mkdir(parents=True)
        self.addCleanup(shutil.rmtree, self.assets)
        for setting in (
            patch.object(CONFIG, 'docs_path', self.assets / 'docs'),
            patch.object(CONFIG, 'res_path', self.assets / 'game'),
            patch.object(CONFIG, 'materials', []),
        ):
            setting.start()
            self.addCleanup(setting.stop)

    def put(self, relative, content=b'book'):
        path = self.assets / 'materials' / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def catalog(self, items):
        (self.assets / 'materials.yaml').write_text(yaml.safe_dump({
            'categories': [{'name': 'Книги', 'sections': [{'name': 'Python', 'items': items}]}],
        }, allow_unicode=True), encoding='utf-8')
        parse_materials()

    async def get(self, url):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
            return await client.get(url)

    async def test_nested_links_and_multiple_download_formats(self):
        self.put('python/Книга.pdf', b'%PDF-1.4 test')
        self.put('python/book.epub')
        self.catalog([{
            'title': 'Учебник', 'url': 'https://example.org/read',
            'url_label': 'Читать онлайн', 'access': 'По подписке',
            'files': [{'path': 'python/Книга.pdf'}, {'path': 'python/book.epub', 'label': 'EPUB для читалки'}],
        }])

        response = await self.get('/materials')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Читать онлайн', response.text)
        self.assertIn('По подписке', response.text)
        self.assertIn('Скачать PDF', response.text)
        self.assertIn('Скачать EPUB для читалки', response.text)
        self.assertIn('/materials/download/python/%D0%9A%D0%BD%D0%B8%D0%B3%D0%B0.pdf', response.text)

    async def test_file_only_item_downloads_as_attachment(self):
        self.put('book.pdf', b'%PDF-1.4 example')
        self.catalog([{'title': 'Локальная книга', 'files': ['book.pdf']}])
        response = await self.get('/materials/download/book.pdf')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'%PDF-1.4 example')
        self.assertTrue(response.headers['content-disposition'].startswith('attachment;'))
        self.assertIn('book.pdf', response.headers['content-disposition'])

    async def test_cyrillic_filename_downloads_with_encoded_filename(self):
        self.put('python/Книга.pdf', b'%PDF-1.4 Cyrillic')
        self.catalog([{'title': 'Книга', 'files': ['python/Книга.pdf']}])
        response = await self.get('/materials/download/python/%D0%9A%D0%BD%D0%B8%D0%B3%D0%B0.pdf')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'%PDF-1.4 Cyrillic')
        self.assertIn("filename*=utf-8''%D0%9A%D0%BD%D0%B8%D0%B3%D0%B0.pdf", response.headers['content-disposition'])

    async def test_legacy_link_stays_in_title(self):
        self.catalog([{'title': 'Старый материал', 'url': 'https://example.org/read'}])
        response = await self.get('/materials')
        self.assertIn('<a href="https://example.org/read">Старый материал</a>', response.text)

    def test_attachment_appears_after_file_is_added_and_catalog_refreshes(self):
        self.catalog([{'title': 'Книга', 'files': ['new.pdf']}])
        self.assertEqual(CONFIG.materials[0]['sections'][0]['items'][0]['files'], [])
        self.put('new.pdf')
        refresh = next(refresh for name, _, refresh in _watchers() if name == 'materials.yaml')
        refresh()
        self.assertEqual(CONFIG.materials[0]['sections'][0]['items'][0]['files'][0]['path'], 'new.pdf')

    async def test_unlisted_and_deleted_files_are_not_downloadable(self):
        path = self.put('published.pdf')
        self.put('private.pdf')
        self.catalog([{'title': 'Книга', 'files': ['published.pdf']}])
        self.assertEqual((await self.get('/materials/download/private.pdf')).status_code, 404)
        path.unlink()
        self.assertEqual((await self.get('/materials/download/published.pdf')).status_code, 404)

    async def test_unsafe_paths_are_ignored_and_cannot_be_downloaded(self):
        (self.assets / 'secret.pdf').write_bytes(b'secret')
        self.put('safe.pdf')
        unsafe = ['../secret.pdf', '/secret.pdf', 'C:/secret.pdf', '..\\secret.pdf', 'safe.pdf:stream']
        self.catalog([{'title': 'Книга', 'files': unsafe + ['safe.pdf']}])
        files = CONFIG.materials[0]['sections'][0]['items'][0].get('files', [])
        self.assertEqual([file['path'] for file in files], ['safe.pdf'])
        for path in ['%2E%2E/secret.pdf', 'C%3A/secret.pdf', '..%5Csecret.pdf', 'safe.pdf%3Astream']:
            with self.subTest(path=path):
                self.assertEqual((await self.get('/materials/download/' + path)).status_code, 404)

    async def test_missing_files_do_not_render_dead_download_links(self):
        self.catalog([{'title': 'Без файла', 'files': ['missing.pdf']}])
        response = await self.get('/materials')
        self.assertIn('Без файла', response.text)
        self.assertNotIn('/materials/download/', response.text)

    def test_bad_optional_fields_do_not_break_other_items(self):
        self.put('safe.pdf')
        self.catalog([None, {'title': 42}, {'title': 'Учебник', 'url': 'javascript:alert(1)',
                      'files': [None, 42, {'path': 42}, 'safe.pdf'], 'description': 42},
                      {'title': 'Обычный текст'}])
        items = CONFIG.materials[0]['sections'][0]['items']
        self.assertEqual([item['title'] for item in items], ['Учебник', 'Обычный текст'])
        self.assertIsNone(items[0]['url'])
        self.assertEqual(len(items[0]['files']), 1)

    def test_file_changes_refresh_the_catalog(self):
        matcher = next(match for name, match, _ in _watchers() if name == 'materials.yaml')
        self.assertTrue(matcher((self.assets / 'materials.yaml').resolve()))
        self.assertTrue(matcher((self.assets / 'materials/python/new.pdf').resolve()))
        self.assertFalse(matcher((self.assets / 'docs/article.md').resolve()))


if __name__ == '__main__':
    unittest.main()
