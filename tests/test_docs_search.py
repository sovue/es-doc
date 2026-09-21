import unittest
from unittest.mock import patch

from httpx import ASGITransport, AsyncClient

from app.app import app
from app.utils.config import CONFIG
from app.utils.docs import build_items


class DocsSearchTests(unittest.IsolatedAsyncioTestCase):
    async def get_results(self, query):
        items = build_items([{
            'slug': 'первый мод', 'title': 'Первый мод',
            'headings': [{'text': 'Создание персонажа', 'slug': 'создание-персонажа', 'level': 2}],
            'code_terms': [],
        }])
        with (patch.object(CONFIG, 'docs_tree', []),
              patch.object(CONFIG, 'search_items', items)):
            async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
                return await client.get('/docs/', params={'q': query})

    async def test_form_search_renders_navigable_results_without_javascript(self):
        response = await self.get_results('персонажа')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Результаты поиска', response.text)
        self.assertIn('Создание персонажа', response.text)
        self.assertIn('/docs/%D0%BF%D0%B5%D1%80%D0%B2%D1%8B%D0%B9%20%D0%BC%D0%BE%D0%B4#', response.text)

    async def test_empty_results_explain_recovery_and_escape_query(self):
        response = await self.get_results('<missing>')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Ничего не найдено', response.text)
        self.assertIn('&lt;missing&gt;', response.text)
        self.assertNotIn('<missing>', response.text)
        self.assertIn('Все статьи', response.text)
