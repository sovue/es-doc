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
from app.utils.lifespan.thumbs_cache import _source_file


class CommunityResourcesTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.assets = Path(__file__).resolve().parents[1] / 'temp' / f'test-community-{uuid4().hex}'
        self.assets.mkdir()
        self.addCleanup(shutil.rmtree, self.assets)
        self.game = self.assets / 'game'
        self.game.mkdir()
        self.patches = [
            patch.object(CONFIG, 'res_path', self.game),
            patch.object(CONFIG, 'sprite_layers', {}),
            patch.object(CONFIG, 'resources', {}),
        ]
        for setting in self.patches:
            setting.start()
            self.addCleanup(setting.stop)

    def put(self, relative, content=b'file'):
        path = self.assets / 'community' / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    def test_files_are_listed_without_renpy_declarations(self):
        self.put('bg/camp/day.png')
        self.put('sprites/alice.png')
        self.put('music/progress.ogg')
        self.put('sound/ambience/cave.ogg')
        self.put('music/ignored.txt')

        parse_resources()

        community = CONFIG.resources['community']
        self.assertEqual([i['file'] for i in community['bg']], ['bg/camp/day.png'])
        self.assertEqual(community['bg'][0]['thumb'], '/resource/thumb/community/bg/camp/day.png')
        self.assertEqual([i['file'] for i in community['sprites']], ['sprites/alice.png'])
        self.assertEqual([i['file'] for i in community['music']], ['music/progress.ogg'])
        self.assertEqual([i['file'] for i in community['ambience']], ['sound/ambience/cave.ogg'])
        self.assertTrue(all(i['declared'] for i in community['music']))
        self.assertEqual(community['music'][0]['raw'], '/resource/community/music/progress.ogg')

    def test_metadata_uses_paths_and_supports_optional_captions(self):
        self.put('bg/camp/day.png')
        (self.assets / 'community-descriptions.yaml').write_text(
            'bg/camp/day.png:\n'
            '  title: Лагерь днём\n'
            '  description: Авторский фон.\n'
            '  captions:\n'
            '    - Автор: Мария\n'
            '    - Версия: 2\n', encoding='utf-8')

        parse_resources()

        item = CONFIG.resources['community']['bg'][0]
        self.assertEqual(item['title'], 'Лагерь днём')
        self.assertEqual(item['desc'], 'Авторский фон.')
        self.assertEqual(item['captions'], ['Автор: Мария', 'Версия: 2'])
        self.assertIsNone(item['code'])

    def test_music_title_falls_back_to_site_path(self):
        self.put('music/untitled.ogg')
        self.put('music/titled.ogg')
        self.put('sound/ambience/cave.ogg')
        (self.assets / 'community-descriptions.yaml').write_text(
            'music/titled.ogg:\n  title: Пещера\n', encoding='utf-8')

        parse_resources()

        by_file = {i['file']: i for i in CONFIG.resources['community']['music']}
        self.assertEqual(by_file['music/titled.ogg']['play_name'], 'Пещера')
        self.assertEqual(by_file['music/untitled.ogg']['play_name'], '/resource/community/music/untitled.ogg')
        self.assertEqual(
            CONFIG.resources['community']['ambience'][0]['play_name'],
            '/resource/community/sound/ambience/cave.ogg',
        )

    def test_original_music_uses_description_then_site_path(self):
        (self.game / 'sound' / 'music').mkdir(parents=True)
        (self.game / 'sound' / 'ambiences').mkdir(parents=True)
        (self.game / 'sound' / 'music' / 'known.ogg').write_bytes(b'file')
        (self.game / 'sound' / 'music' / 'unknown.ogg').write_bytes(b'file')
        (self.game / 'sound' / 'ambiences' / 'known.ogg').write_bytes(b'file')
        (self.game / 'sound' / 'ambiences' / 'unknown.ogg').write_bytes(b'file')
        (self.game / 'resources.rpy').write_text(
            '$ music_list["known"] = "sound/music/known.ogg"\n'
            '$ music_list["unknown"] = "sound/music/unknown.ogg"\n'
            '$ ambience_known = "sound/ambiences/known.ogg"\n'
            '$ ambience_unknown = "sound/ambiences/unknown.ogg"\n', encoding='utf-8')
        (self.assets / 'descriptions.yaml').write_text(
            'music:\n  known: Пещера\n'
            'ambience:\n  ambience_known: Пещерный ветер\n', encoding='utf-8')

        parse_resources()

        by_name = {i['name']: i for i in CONFIG.resources['original']['music']}
        self.assertEqual(by_name['known']['play_name'], 'Пещера')
        self.assertEqual(by_name['unknown']['play_name'], '/resource/raw/sound/music/unknown.ogg')
        ambience = {i['name']: i for i in CONFIG.resources['original']['ambience']}
        self.assertEqual(ambience['ambience_known']['play_name'], 'Пещерный ветер')
        self.assertEqual(ambience['ambience_unknown']['play_name'], '/resource/raw/sound/ambiences/unknown.ogg')

    def test_community_thumbnail_source_uses_its_own_file(self):
        self.put('bg/camp/day.png')
        parse_resources()

        self.assertEqual(
            _source_file('community', 'bg/camp/day.png'),
            self.assets / 'community' / 'bg' / 'camp' / 'day.png',
        )
        self.assertIsNone(_source_file('community', '../game/resources.rpy'))

    async def test_listing_has_metadata_without_variable_controls(self):
        self.put('sound/ambience/cave.ogg')
        (self.assets / 'community-descriptions.yaml').write_text(
            'sound/ambience/cave.ogg:\n'
            '  title: Пещера\n'
            '  captions: ["Автор: Мария"]\n', encoding='utf-8')
        parse_resources()

        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
            response = await client.get('/resources/community/ambience')

        self.assertEqual(response.status_code, 200)
        self.assertIn('Пещера', response.text)
        self.assertIn('Автор: Мария', response.text)
        self.assertIn('data-play-name="Пещера"', response.text)
        self.assertNotIn('class="res-copy res-icon', response.text)
        self.assertNotIn('Пример использования:', response.text)

    async def test_nested_community_image_gets_small_webp_thumbnail(self):
        image = self.assets / 'community' / 'images' / 'bg' / 'camp' / 'day.png'
        image.parent.mkdir(parents=True)
        Image.new('RGB', (24, 16), '#335522').save(image)
        with patch.object(CONFIG, 'cache_path', self.assets / 'cache'):
            parse_resources()
            async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
                response = await client.get('/resource/thumb/community/images/bg/camp/day.png')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['content-type'], 'image/webp')
        self.assertGreater(len(response.content), 0)

    async def test_community_sprites_are_plain_image_rows(self):
        self.put('images/sprites/alice.png')
        parse_resources()

        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
            response = await client.get('/resources/community/sprites')

        self.assertEqual(response.status_code, 200)
        self.assertIn('alice.png', response.text)
        self.assertNotIn('res-sprite-picker', response.text)
        self.assertNotIn('class="res-copy res-icon', response.text)

    def test_watcher_refreshes_when_community_files_or_metadata_change(self):
        with patch.object(CONFIG, 'docs_path', self.assets / 'docs'):
            resource_matcher = next(match for name, match, _ in _watchers() if name == 'resources')

        self.assertTrue(resource_matcher(self.assets / 'community' / 'sound' / 'music' / 'new.ogg'))
        self.assertTrue(resource_matcher(self.assets / 'community-descriptions.yaml'))


if __name__ == '__main__':
    unittest.main()
