import shutil
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

import yaml
from httpx import ASGITransport, AsyncClient

from app.app import app
from app.utils.config import CONFIG
from app.utils.lifespan.home_notices_cache import parse_home_notices
from app.utils.lifespan.refresh import _watchers


class HomeNoticesTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.assets = Path(__file__).resolve().parents[1] / 'temp' / f'test-notices-{uuid4().hex}'
        self.assets.mkdir(parents=True)
        self.addCleanup(shutil.rmtree, self.assets)
        for setting in (
            patch.object(CONFIG, 'docs_path', self.assets / 'docs'),
            patch.object(CONFIG, 'home_notices', []),
        ):
            setting.start()
            self.addCleanup(setting.stop)

    def catalog(self, rows):
        (self.assets / 'home_notices.yaml').write_text(
            yaml.safe_dump({'notices': rows}, allow_unicode=True), encoding='utf-8',
        )
        parse_home_notices()

    async def get_home(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            return await client.get('/')

    async def test_yaml_drives_links_optional_copy_order_and_escaping(self):
        self.catalog([
            {'title': 'Своя афиша <новая>', 'url': '/authors', 'description': 'Описание & детали', 'category': 'Сообщество'},
            {'title': 'Внешний ресурс', 'url': 'https://example.org/guide?x=1&y=2'},
        ])
        response = await self.get_home()
        self.assertEqual(response.status_code, 200)
        self.assertIn('class="noticeboard"', response.text)
        self.assertIn('href="/authors" class="notice"', response.text)
        self.assertIn('Своя афиша &lt;новая&gt;', response.text)
        self.assertIn('Описание &amp; детали', response.text)
        self.assertIn('Сообщество', response.text)
        self.assertIn('href="https://example.org/guide?x=1&amp;y=2"', response.text)
        self.assertLess(response.text.index('Своя афиша'), response.text.index('Внешний ресурс'))
        self.assertNotIn('Ошибки и решения', response.text)

    def test_invalid_rows_and_unsafe_urls_are_skipped(self):
        invalid = ['javascript:alert(1)', 'data:text/html,test', '//example.org', '/\\example.org', 'https://', '/ok\nno']
        self.catalog([
            None, 'not a notice', {}, {'title': 'Missing URL'}, {'title': 42, 'url': '/authors'},
            *[{'title': 'Unsafe', 'url': url} for url in invalid],
            {'title': ' Safe ', 'url': ' /authors ', 'description': 42},
        ])
        self.assertEqual(CONFIG.home_notices, [{'title': 'Safe', 'url': '/authors', 'description': '', 'category': ''}])

    async def test_empty_or_missing_catalog_hides_board(self):
        parse_home_notices()
        self.assertNotIn('class="noticeboard"', (await self.get_home()).text)
        self.catalog([])
        self.assertNotIn('class="noticeboard"', (await self.get_home()).text)

    def test_malformed_yaml_or_wrong_structure_keeps_previous_catalog(self):
        self.catalog([{'title': 'Рабочая ссылка', 'url': '/authors'}])
        previous = list(CONFIG.home_notices)
        for source in ('notices: [', '- wrong root', 'notices: wrong list'):
            (self.assets / 'home_notices.yaml').write_text(source, encoding='utf-8')
            parse_home_notices()
            self.assertEqual(CONFIG.home_notices, previous)

    async def test_watcher_reloads_new_destination_without_restart(self):
        self.catalog([{'title': 'Начало', 'url': '/docs/first_steps'}])
        _, matches, refresh = next(row for row in _watchers() if row[0] == 'home_notices.yaml')
        path = self.assets / 'home_notices.yaml'
        self.assertTrue(matches(path.resolve()))
        self.assertFalse(matches((self.assets / 'links.yaml').resolve()))
        path.write_text('notices:\n  - title: Изменено\n    url: /authors\n', encoding='utf-8')
        refresh()
        response = await self.get_home()
        self.assertIn('href="/authors" class="notice"', response.text)
        self.assertIn('Изменено', response.text)
        self.assertNotIn('href="/docs/first_steps" class="notice"', response.text)


if __name__ == '__main__':
    unittest.main()
