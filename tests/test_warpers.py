import unittest
from unittest.mock import patch

from httpx import ASGITransport, AsyncClient

from app.app import app
from app.utils.config import CONFIG
from app.utils.lifespan.search_cache import _section_items


class WarperToolTests(unittest.IsolatedAsyncioTestCase):
    async def get(self, path):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            return await client.get(path)

    async def test_tool_works_without_background_assets(self):
        with patch.object(CONFIG, 'resources', {}), patch.object(CONFIG, 'warpers', []):
            response = await self.get('/tools/warpers')
        self.assertEqual(response.status_code, 200)
        self.assertIn('aria-current="page">Инструменты', response.text)
        self.assertIn('id="wp-lab-expr"', response.text)
        self.assertIn('data-demo="xalign"', response.text)
        self.assertIn('data-demo="zoom"', response.text)
        self.assertIn('data-demo="alpha"', response.text)
        self.assertLess(response.text.index('id="wp-families-label"'), response.text.index('id="wp-lab-label"'))

    async def test_legacy_urls_redirect_to_the_tool(self):
        for path in ('/warpers', '/resources/original/warpers', '/resources/community/warpers'):
            response = await self.get(path)
            self.assertEqual(response.status_code, 308, path)
            self.assertTrue(response.headers['location'].startswith('/tools/warpers'), path)

    async def test_resource_hubs_no_longer_list_warpers(self):
        with patch.object(CONFIG, 'resources', {'original': {}, 'community': {}}):
            for path in ('/resources/', '/resources/community'):
                response = await self.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertNotIn('/warpers', response.text)
            self.assertFalse(any('/resources/' in row['url'] and 'warpers' in row['url']
                                 for row in _section_items()))
        response = await self.get('/tools')
        self.assertIn('href="/tools/warpers"', response.text)

    async def test_custom_curves_join_the_same_tool(self):
        custom = {'name': 'soft_back', 'expr': 't*t', 'points': [0, 0.25, 1],
                  'desc': 'Мягкий замах', 'author': None, 'url': None}
        with patch.object(CONFIG, 'warpers', [custom]):
            response = await self.get('/tools/warpers')
        self.assertEqual(response.status_code, 200)
        self.assertIn('id="soft_back"', response.text)
        self.assertIn('data-expr="t*t"', response.text)
        self.assertIn('easein_cubic', response.text)

    async def test_backgrounds_have_location_groups_and_searchable_descriptions(self):
        def bg(name, loc, desc, **extra):
            return {'name': name, 'loc': loc, 'desc': desc, 'raw': '/images/' + name + '.jpg',
                    'declared': True, 'nsfw': False, **extra}
        resources = {'original': {'bg': [
            bg('ext_beach_day', 'Пляж', 'Пляж — снаружи, день'),
            bg('ext_beach_night', 'Пляж', 'Пляж — снаружи, ночь'),
            bg('unknown', None, None),
            bg('excluded', 'Пляж', 'Скрытый фон', nsfw=True),
        ]}}
        with patch.object(CONFIG, 'resources', resources):
            response = await self.get('/tools/warpers')
        self.assertIn('<optgroup label="Пляж">', response.text)
        self.assertIn('<optgroup label="Прочее">', response.text)
        self.assertIn('Пляж — снаружи, ночь', response.text)
        self.assertIn('id="wp-bg-search"', response.text)
        self.assertNotIn('excluded', response.text)


if __name__ == '__main__':
    unittest.main()
