import io
import json
import os
import shutil
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from httpx import ASGITransport, AsyncClient
from PIL import Image

from app.app import app
from app.utils.config import CONFIG
from app.utils.lifespan.refresh import _watchers
from app.utils.lifespan.resources_cache import parse_resources


class CommunitySpriteTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.assets = Path(__file__).resolve().parents[1] / 'temp' / f'test-sprites-{uuid4().hex}'
        self.game = self.assets / 'game'
        self.game.mkdir(parents=True)
        self.addCleanup(shutil.rmtree, self.assets)
        for field, value in (
            ('res_path', self.game), ('docs_path', self.assets / 'docs'),
            ('cache_path', self.assets / 'cache'), ('sprite_layers', {}),
            ('resources', {}), ('resource_search_items', []),
        ):
            setting = patch.object(CONFIG, field, value)
            setting.start()
            self.addCleanup(setting.stop)
        if hasattr(CONFIG, 'community_sprite_layers'):
            setting = patch.object(CONFIG, 'community_sprite_layers', {})
            setting.start()
            self.addCleanup(setting.stop)

    def image(self, relative, color, size=(20, 30)):
        path = self.assets / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        Image.new('RGBA', size, color).save(path)
        return path

    def catalog(self, distances=None, author=None):
        self.image('game/images/body.png', (255, 0, 0, 255))
        self.image('community/sprites/clothes.png', (0, 255, 0, 128))
        self.image('community/sprites/smile.png', (0, 0, 255, 128))
        data = {'groups': {'Лена в полицейской форме': {
            'author': author or {'name': 'Художник', 'link': 'https://example.com/artist'},
            'description': 'Спрайт из модификации «Главный Атрибут Пионера»',
            'variations': [{'name': 'Улыбается', 'distances': distances or {
                'far': ['sprites/smile.png'],
                'normal': ['/resource/raw/images/body.png',
                           '/resource/community/sprites/clothes.png',
                           'sprites/smile.png'],
                'close': ['sprites/clothes.png'],
            }}],
        }}}
        (self.assets / 'community-sprites.json').write_text(
            json.dumps(data, ensure_ascii=False), encoding='utf-8')

    async def get(self, url):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
            return await client.get(url)

    def test_catalog_loads_ordered_distances_and_searchable_metadata(self):
        self.catalog()
        parse_resources()
        items = CONFIG.resources['community']['sprites']
        self.assertEqual(len(items), 1, 'Referenced sprite layers must not be listed separately')
        self.assertEqual([v['distance'] for v in items[0]['variants']], ['normal', 'close', 'far'])
        self.assertEqual(items[0]['primary']['distance'], 'normal')
        self.assertIn('Улыбается close', items[0]['search'])
        search = next(r for r in CONFIG.resource_search_items if 'Улыбается' in r['label'])
        self.assertIn('Лена в полицейской форме', search['label'])
        self.assertIn('Художник', search['keywords'])
        self.assertIn('Главный Атрибут Пионера', search['desc'])

    async def test_listing_renders_group_author_and_distance_controls(self):
        self.catalog()
        parse_resources()
        response = await self.get('/resources/community/sprites')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Лена в полицейской форме', response.text)
        self.assertIn('href="https://example.com/artist"', response.text)
        self.assertIn('data-distance="close"', response.text)
        self.assertIn('data-total="3"', response.text)
        self.assertNotIn('class="res-copy res-icon', response.text)

    async def test_composes_layers_in_order_and_serves_thumbnail(self):
        self.catalog()
        parse_resources()
        item = CONFIG.resources['community']['sprites'][0]
        response = await self.get(item['raw'])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['content-type'], 'image/webp')
        with Image.open(io.BytesIO(response.content)) as image:
            self.assertEqual(image.size, (20, 30))
            red, green, blue, alpha = image.convert('RGBA').getpixel((0, 0))
            self.assertLess(abs(red - 63), 8)
            self.assertLess(abs(green - 64), 8)
            self.assertLess(abs(blue - 128), 8)
            self.assertEqual(alpha, 255)
        thumb = await self.get(item['thumb'])
        self.assertEqual(thumb.status_code, 200)
        self.assertEqual(thumb.headers['content-type'], 'image/webp')

    async def test_changed_layer_invalidates_composition_and_thumbnail(self):
        self.catalog({'normal': ['sprites/smile.png']})
        parse_resources()
        item = CONFIG.resources['community']['sprites'][0]
        old = await self.get(item['thumb'])
        source = self.image('community/sprites/smile.png', (255, 0, 0, 255))
        newer = source.stat().st_mtime_ns + 2_000_000_000
        os.utime(source, ns=(newer, newer))
        new = await self.get(item['thumb'])
        self.assertEqual(new.status_code, 200)
        self.assertNotEqual(old.content, new.content)

    def test_rejects_unsafe_missing_and_empty_distances_but_keeps_valid(self):
        self.catalog({'normal': ['../game/images/body.png'],
                      'close': ['sprites/clothes.png'], 'far': []})
        parse_resources()
        custom = [i for i in CONFIG.resources['community']['sprites'] if i.get('variants')]
        self.assertEqual(len(custom), 1)
        self.assertEqual([v['distance'] for v in custom[0]['variants']], ['close'])
        for path in ('/resource/raw/../secret.png', 'C:/secret.png',
                     '//example.com/image.png', 'https://example.com/image.png',
                     '/resource/community/%2e%2e/game/images/body.png', 'sprites/missing.png'):
            with self.subTest(path=path):
                self.catalog({'normal': [path]})
                parse_resources()
                self.assertFalse(any(i.get('variants') for i in CONFIG.resources['community']['sprites']))

    async def test_unsafe_author_link_is_not_rendered(self):
        self.catalog(author={'name': '<Художник>', 'link': 'javascript:alert(1)'})
        parse_resources()
        response = await self.get('/resources/community/sprites')
        self.assertIn('&lt;Художник&gt;', response.text)
        self.assertNotIn('javascript:', response.text)

    async def test_malformed_author_url_does_not_break_the_catalog(self):
        self.catalog(author={'name': 'Художник', 'link': 'https://[broken'})
        parse_resources()
        response = await self.get('/resources/community/sprites')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Улыбается', response.text)
        self.assertNotIn('https://[broken', response.text)

    async def test_changed_layer_order_changes_url_and_retires_old_route(self):
        self.catalog({'normal': ['sprites/clothes.png', 'sprites/smile.png']})
        parse_resources()
        previous = CONFIG.resources['community']['sprites'][0]['raw']
        self.catalog({'normal': ['sprites/smile.png', 'sprites/clothes.png']})
        parse_resources()
        current = CONFIG.resources['community']['sprites'][0]['raw']
        self.assertNotEqual(previous, current)
        self.assertEqual((await self.get(previous)).status_code, 404)
        self.assertEqual((await self.get(current)).status_code, 200)

    def test_layer_edits_change_public_urls_after_refresh(self):
        self.catalog({'normal': ['sprites/smile.png']})
        parse_resources()
        previous = CONFIG.resources['community']['sprites'][0]['raw']
        previous_id = CONFIG.resources['community']['sprites'][0]['rid']
        source = self.image('community/sprites/smile.png', (255, 0, 0, 255))
        newer = source.stat().st_mtime_ns + 2_000_000_000
        os.utime(source, ns=(newer, newer))
        parse_resources()
        self.assertNotEqual(CONFIG.resources['community']['sprites'][0]['raw'], previous)
        self.assertEqual(CONFIG.resources['community']['sprites'][0]['rid'], previous_id)

    def test_sprite_urls_do_not_depend_on_installation_directory(self):
        self.catalog()
        parse_resources()
        previous = CONFIG.resources['community']['sprites'][0]['raw']
        other = self.assets / 'other-installation'
        for directory in ('game', 'community'):
            shutil.copytree(self.assets / directory, other / directory)
        shutil.copy2(self.assets / 'community-sprites.json', other / 'community-sprites.json')
        with patch.object(CONFIG, 'res_path', other / 'game'):
            parse_resources()
        self.assertEqual(CONFIG.resources['community']['sprites'][0]['raw'], previous)

    async def test_different_layer_sizes_fail_without_caching_a_partial_image(self):
        self.catalog({'normal': ['sprites/clothes.png', 'sprites/smile.png']})
        self.image('community/sprites/smile.png', (0, 0, 255, 128), size=(10, 15))
        parse_resources()
        response = await self.get(CONFIG.resources['community']['sprites'][0]['raw'])
        self.assertEqual(response.status_code, 500)
        self.assertFalse(list((self.assets / 'cache').rglob('*.webp')))

    def test_invalid_json_keeps_previous_catalog_and_deletion_clears_it(self):
        self.catalog()
        parse_resources()
        previous = CONFIG.resources['community']['sprites']
        manifest = self.assets / 'community-sprites.json'
        manifest.write_text('{broken', encoding='utf-8')
        parse_resources()
        self.assertEqual(CONFIG.resources['community']['sprites'], previous)
        manifest.unlink()
        parse_resources()
        self.assertFalse(any(i.get('variants') for i in CONFIG.resources['community']['sprites']))

    def test_resource_watcher_matches_manifest(self):
        matcher = next(match for name, match, _ in _watchers() if name == 'resources')
        self.assertTrue(matcher((self.assets / 'community-sprites.json').resolve()))

    async def test_unknown_custom_sprite_and_traversal_return_404(self):
        self.catalog()
        parse_resources()
        for url in ('/resource/community-sprite/unknown',
                    '/resource/thumb/community-sprite/unknown',
                    '/resource/thumb/community-sprite/..%2Fsecret'):
            self.assertEqual((await self.get(url)).status_code, 404)
