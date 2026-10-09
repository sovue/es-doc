import copy
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from httpx import ASGITransport, AsyncClient
from PIL import Image

from app.app import app
from app.utils.animations import ANIMATIONS, available_previews, playback_duration
from app.utils.config import CONFIG
from app.utils.lifespan.animation_images import make_image, original_sepia
from app.utils.lifespan.resources_cache import _item


class AnimationAvailabilityTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        self.resources = {'original': {'anim': [], 'bg': [], 'cg': []}}
        self.patch = patch.object(CONFIG, 'resources', self.resources)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def file(self, path):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.touch()
        return target

    def test_incomplete_sequence_is_hidden_and_definitions_are_not_mutated(self):
        before = copy.deepcopy(ANIMATIONS)
        self.file('images/anim/stars_1.jpg')
        self.assertNotIn('stars', [item['name'] for item in available_previews(self.root)])
        self.file('images/anim/stars_3.jpg')
        stars = next(item for item in available_previews(self.root) if item['name'] == 'stars')
        self.assertEqual(stars['frames'][1]['src'], '/resource/raw/images/anim/stars_3.jpg')
        self.assertEqual(ANIMATIONS, before)

    def test_shake_only_offers_existing_scenes_and_tracks_source_lines(self):
        self.file('zhenya/images/blink.png')
        self.file('images/bg/square.png')
        self.resources['original']['bg'] = [_item('ext_square_night', 'bg ext_square_night', 'images/bg/square.png')]
        self.file('scenario/zhenya.rpy').write_text('init:\n    image zhenya_anim1:\n', encoding='utf-8')
        shake = next(item for item in available_previews(self.root) if item['kind'] == 'shake')
        self.assertEqual(len(shake['variants']), 1)
        self.assertEqual(shake['variants'][0]['label'], 'Площадь')
        self.assertEqual(shake['src'], '/resource/raw/images/bg/square.png')
        self.assertTrue(shake['source_url'].endswith('#L2'))
        self.assertTrue(shake['variants'][0]['source_url'].endswith('#L2'))

    def test_missing_overlay_hides_shake_even_when_a_scene_exists(self):
        self.file('images/bg/square.png')
        self.resources['original']['bg'] = [_item('ext_square_night', 'bg ext_square_night', 'images/bg/square.png')]
        self.assertNotIn('shake', [item['kind'] for item in available_previews(self.root)])

    def test_red_ending_uses_the_existing_tint_endpoint(self):
        path = 'images/cg/epilogue_un_bad.jpg'
        self.file(path)
        self.resources['original']['cg'] = [
            _item('epilogue_un_bad', 'cg epilogue_un_bad', path),
            _item('epilogue_un_bad_red', 'cg epilogue_un_bad_red', path,
                  raw='/resource/tinted/cg/epilogue_un_bad_red', tint=(1, 0.1, 0.1)),
        ]
        ending = next(item for item in available_previews(self.root) if item['name'] == 'un_ending_bad')
        self.assertEqual(ending['frames'][1]['src'], '/resource/tinted/cg/epilogue_un_bad_red')
        self.assertEqual(ending['title'], 'Плохая концовка Лены')
        self.assertTrue(ending['related'][1]['href'].startswith('/resources/original/cg#'))

    def test_frames_link_to_category_rows_and_undeclared_files_to_browser(self):
        self.file('images/anim/stars_1.jpg')
        self.file('images/anim/stars_3.jpg')
        self.resources['original']['anim'] = [_item('stars_1', 'anim stars_1', 'images/anim/stars_1.jpg')]
        stars = next(item for item in available_previews(self.root) if item['name'] == 'stars')
        self.assertEqual(stars['related'][0]['href'], '#r-stars_1')
        self.assertEqual(stars['related'][1]['href'], '/resources/browser/images/anim/stars_3.jpg')

    def test_selected_identifiers_and_examples_are_ready_for_reuse(self):
        self.file('images/anim/snow.png')
        snow = next(item for item in available_previews(self.root) if item['name'] == 'snow')
        self.assertEqual(snow['display_name'], 'snow')
        self.assertEqual(snow['variants'][1]['name'], 'heavy_snow')
        self.assertEqual(snow['variants'][1]['usage'], 'show heavy_snow')

    def test_all_catalog_timings_match_the_original_declarations(self):
        expected = [None, 6, 8, 0.3, 1.5, 1.5, 3.5, 1.2, 2.5,
                    9.4, 9.4, 6.2, 15, 5.5, 11, 8, 52, 0.4, 0.8]
        self.assertEqual([playback_duration(item) for item in ANIMATIONS], expected)


class AnimationImageTests(unittest.TestCase):
    def test_sepia_applies_game_palette_thresholds_and_tint(self):
        image = Image.new('RGB', (4, 1))
        image.putdata([(84, 84, 84), (85, 85, 85), (170, 170, 170), (171, 171, 171)])
        self.assertEqual(list(original_sepia(image).get_flattened_data()),
                         [(0, 0, 0), (128, 120, 97), (128, 120, 97), (255, 240, 194)])

    def test_posters_downscale_and_full_sepia_stays_lossless(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(CONFIG, 'cache_path', Path(folder) / 'cache'):
            source = Path(folder) / 'source.png'
            Image.new('RGBA', (1200, 600), (128, 128, 128, 90)).save(source)
            poster = make_image(source, poster=True)
            stamp = poster.stat().st_mtime_ns
            self.assertEqual(make_image(source, poster=True).stat().st_mtime_ns, stamp)
            with Image.open(poster) as result:
                self.assertEqual(result.size, (640, 320))
                self.assertEqual(result.getpixel((0, 0))[3], 90)
            with Image.open(make_image(source, sepia=True)) as result:
                self.assertEqual(result.size, (1200, 600))
                self.assertEqual(result.getpixel((0, 0)), (128, 120, 97))


class AnimationRoutesTests(unittest.IsolatedAsyncioTestCase):
    async def request(self, path):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            return await client.get(path)

    async def test_old_page_redirects_into_original_resources(self):
        response = await self.request('/resources/animations')
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response.headers['location'], '/resources/original/anim#animation-previews')

    async def test_original_category_contains_previews_and_keeps_frame_actions(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'images/anim').mkdir(parents=True)
            (root / 'images/anim/snow.png').touch()
            resources = {'original': {'anim': [_item('snow', 'anim snow', 'images/anim/snow.png',
                         raw='/resource/raw/images/anim/snow.png')]}, 'community': {'anim': []}}
            with patch.object(CONFIG, 'resources', resources), patch.object(CONFIG, 'res_path', root):
                response = await self.request('/resources/original/anim')
                community = await self.request('/resources/community/anim')
        self.assertEqual(response.status_code, 200)
        self.assertIn('data-animation-card', response.text)
        self.assertIn('id="r-snow"', response.text)
        self.assertIn('data-copy="anim snow"', response.text)
        self.assertIn('download="snow.png"', response.text)
        self.assertIn('/static/js/animations.js', response.text)
        self.assertIn('/resources/browser/globals.rpy#L190', response.text)
        self.assertNotIn('href="/resources/animations"', response.text)
        self.assertEqual(community.status_code, 200)
        self.assertNotIn('data-animation-card', community.text)
        self.assertNotIn('/static/js/animations.js', community.text)

    async def test_empty_original_category_still_exposes_the_embedded_section(self):
        with (
            tempfile.TemporaryDirectory() as folder,
            patch.object(CONFIG, 'resources', {'original': {'anim': []}}),
            patch.object(CONFIG, 'res_path', Path(folder)),
        ):
            response = await self.request('/resources/original/anim')
        self.assertEqual(response.status_code, 200)
        self.assertIn('id="animation-previews"', response.text)
        self.assertIn('Файлы анимаций не найдены.', response.text)
        self.assertNotIn('data-animation-card', response.text)

    async def test_image_routes_serve_posters_and_sepia_without_exposing_other_files(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / 'images/bg/ext_camp_entrance_day.jpg'
            source.parent.mkdir(parents=True)
            Image.new('RGB', (1200, 600), (128, 128, 128)).save(source)
            (root / 'private.txt').write_text('not an image')
            with patch.object(CONFIG, 'res_path', root), patch.object(CONFIG, 'cache_path', root / 'cache'):
                poster = await self.request('/resource/poster/images/bg/ext_camp_entrance_day.jpg')
                sepia = await self.request('/resource/animation/black-long')
                invalid = await self.request('/resource/poster/private.txt')
                traversal = await self.request('/resource/poster/%2e%2e/private.png')
            self.assertEqual(poster.status_code, 200)
            with Image.open(BytesIO(poster.content)) as result:
                self.assertEqual(result.size, (640, 320))
            self.assertEqual(sepia.status_code, 200)
            with Image.open(BytesIO(sepia.content)) as result:
                self.assertEqual(result.size, (1200, 600))
            self.assertEqual(invalid.status_code, 404)
            self.assertEqual(traversal.status_code, 404)


if __name__ == '__main__':
    unittest.main()
