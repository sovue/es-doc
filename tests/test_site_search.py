import shutil
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import quote
from uuid import uuid4

from httpx import ASGITransport, AsyncClient

from app.app import app
from app.utils.config import CONFIG
from app.utils.docs import search
from app.utils.lifespan.docs_cache import cache_docs
from app.utils.lifespan.refresh import _watchers
from app.utils.lifespan.resources_cache import parse_resources
from app.utils.lifespan.specialists_cache import parse_specialists
from app.utils.lifespan.warpers_cache import parse_warpers


class SiteSearchTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.assets = Path(__file__).resolve().parents[1] / 'temp' / f'test-search-{uuid4().hex}'
        self.assets.mkdir(parents=True)
        self.addCleanup(shutil.rmtree, self.assets)
        self.game = self.assets / 'game'
        self.docs = self.assets / 'docs'
        self.game.mkdir()
        self.docs.mkdir()
        for key, value in {
            'res_path': self.game, 'docs_path': self.docs,
            'sprite_layers': {}, 'resources': {}, 'specialists': [], 'warpers': [],
            'search_index': [], 'search_items': [], 'resource_search_items': [],
            'browser_search_items': [], 'docs_tree': [], 'page_last_edited': 0,
        }.items():
            setting = patch.object(CONFIG, key, value, create=True)
            setting.start()
            self.addCleanup(setting.stop)

    def put(self, relative, content='file'):
        path = self.assets / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding='utf-8')
        return path

    def populate(self):
        parse_resources()
        parse_specialists()
        parse_warpers()
        cache_docs(silent=True)

    def refresh(self, path):
        for _, matches, refresh in _watchers():
            if matches(path.resolve()):
                refresh()

    async def get(self, path, **params):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
            return await client.get(path, params=params)

    async def test_community_resources_search_titles_descriptions_and_paths(self):
        self.put('community/bg/camp/aurora.png')
        self.put('community/sprites/alice.png')
        self.put('community-descriptions.yaml', 'bg/camp/aurora.png:\n  title: Северное сияние\n  description: Полярный вечер\n')
        self.populate()

        item = CONFIG.resources['community']['bg'][0]
        expected = '/resources/community/bg#' + quote(item['rid'])
        for query in ('сияние', 'полярный', 'camp/aurora.png'):
            response = await self.get('/api/search', q=query)
            self.assertEqual(response.status_code, 200)
            self.assertIn(expected, [row.get('url') for row in response.json()])
        sprite = CONFIG.resources['community']['sprites'][0]
        self.assertIn('/resources/community/sprites#' + quote(sprite['rid']),
                      [row.get('url') for row in search('alice')])

        page = await self.get('/docs/', q='сияние')
        self.assertIn(expected, page.text)
        self.assertIn('Северное сияние', page.text)

    async def test_browser_search_links_to_files_and_folders_with_encoded_paths(self):
        self.put('game/scenario/Новая сцена #1.rpy', 'label start:\n    pass\n')
        self.populate()

        for query, relative in [('Новая сцена', 'scenario/Новая сцена #1.rpy'), ('scenario', 'scenario')]:
            expected = '/resources/browser/' + quote(relative)
            response = await self.get('/api/search', q=query)
            self.assertIn(expected, [row.get('url') for row in response.json()])
            viewer = await self.get(expected)
            self.assertEqual(viewer.status_code, 200)

    async def test_specialist_name_and_description_link_to_visible_profile(self):
        self.put('specialists.yaml', 'specialists:\n  - name: Луна\n    categories: [coders]\n    description: Создание интерфейсов\n')
        self.populate()
        person = CONFIG.specialists[0]
        expected = '/specialists?category=coders#specialist-' + quote(person['slug'])
        for query in ('Луна', 'интерфейсов'):
            self.assertIn(expected, [row.get('url') for row in search(query)])
        page = await self.get('/specialists', category='coders')
        self.assertIn(f'id="specialist-{person["slug"]}"', page.text)

    def test_section_landing_pages_are_searchable(self):
        self.populate()
        for query, expected in [
            ('Документация', '/docs/'), ('Ресурсы', '/resources/'),
            ('Ресурсы сообщества', '/resources/community'),
            ('Ресурсы оригинала', '/resources/original'),
            ('Браузер файлов', '/resources/browser'), ('Специалисты', '/specialists'),
            ('Кодеры', '/specialists?category=coders'),
            ('Материалы', '/materials'), ('Поддержка', '/support'),
        ]:
            with self.subTest(query=query):
                self.assertIn(expected, [row.get('url') for row in search(query, 50)])

    def test_assets_watchers_refresh_search_without_doc_edits(self):
        self.populate()
        file = self.put('game/scenario/new-script.rpy')
        self.refresh(file)
        self.assertTrue(search('new-script'))
        file.unlink()
        self.refresh(file)
        self.assertFalse(search('new-script'))

        resource = self.put('community/music/new-track.ogg')
        self.refresh(resource)
        self.assertTrue(search('new-track'))
        resource.unlink()
        self.refresh(resource)
        self.assertFalse(search('new-track'))

        specialists = self.put('specialists.yaml', 'specialists:\n  - name: New coder\n    categories: [coders]\n')
        self.refresh(specialists)
        self.assertTrue(search('New coder'))
        self.put('specialists.yaml', 'specialists: []\n')
        self.refresh(specialists)
        self.assertFalse(search('New coder'))

    def test_documentation_results_are_retained_after_resource_refresh(self):
        self.put('docs/start.md', '# Первый мод\n\n## Персонажи\n')
        self.populate()
        self.assertTrue(search('Персонажи'))
        resource = self.put('community/music/track.ogg')
        self.refresh(resource)
        self.assertTrue(any(row.get('doc') == 'start' for row in search('Персонажи')))

    def test_community_warpers_are_searchable_and_refreshed(self):
        self.populate()
        source = self.put('warpers.yaml', 'warpers:\n  - name: custom_curve\n    desc: Плавный замах\n    expr: t*t\n')
        self.refresh(source)
        expected = '/tools/warpers#custom_curve'
        for query in ('custom_curve', 'замах'):
            self.assertIn(expected, [row.get('url') for row in search(query)])
        self.put('warpers.yaml', 'warpers: []\n')
        self.refresh(source)
        self.assertFalse(search('custom_curve'))


if __name__ == '__main__':
    unittest.main()
