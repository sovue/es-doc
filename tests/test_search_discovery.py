import unittest
from unittest.mock import patch
from xml.etree import ElementTree

from httpx import ASGITransport, AsyncClient

from app.app import app
from app.utils.config import CONFIG


class SearchDiscoveryTests(unittest.IsolatedAsyncioTestCase):
    async def test_robots_points_to_sitemap_on_configured_origin(self):
        with patch.object(CONFIG, 'site_url', 'https://docs.example'):
            async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
                response = await client.get('/robots.txt')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.headers['content-type'].startswith('text/plain'))
        self.assertIn('User-agent: *\n', response.text)
        self.assertIn('Sitemap: https://docs.example/sitemap.xml\n', response.text)

    async def test_sitemap_lists_public_pages_from_live_indexes(self):
        docs = [{'slug': 'Начало & старт'}, {'slug': 'unlisted_article'}]
        news = [{'slug': '2026-09-21-update'}]
        resources = {'original': {'bg': []}, 'community': {'music': []}}

        with (patch.object(CONFIG, 'site_url', 'https://docs.example'),
              patch.object(CONFIG, 'search_index', docs),
              patch.object(CONFIG, 'news', news),
              patch.object(CONFIG, 'resources', resources)):
            async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
                response = await client.get('/sitemap.xml')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.headers['content-type'].startswith('application/xml'))
        namespace = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = [node.text for node in ElementTree.fromstring(response.content).findall('s:url/s:loc', namespace)]
        self.assertEqual(len(urls), len(set(urls)))
        self.assertIn('https://docs.example/', urls)
        self.assertIn('https://docs.example/docs/', urls)
        self.assertIn('https://docs.example/docs/%D0%9D%D0%B0%D1%87%D0%B0%D0%BB%D0%BE%20%26%20%D1%81%D1%82%D0%B0%D1%80%D1%82', urls)
        self.assertIn('https://docs.example/docs/unlisted_article', urls)
        self.assertIn('https://docs.example/news/2026-09-21-update', urls)
        self.assertIn('https://docs.example/resources/original/bg', urls)
        self.assertIn('https://docs.example/resources/community/music', urls)
        self.assertIn('https://docs.example/resources/original/warpers', urls)
        self.assertNotIn('https://docs.example/api/search', urls)
        self.assertNotIn('https://docs.example/resources/browser', urls)
        self.assertNotIn('http://localhost/', urls)


if __name__ == '__main__':
    unittest.main()
