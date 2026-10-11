import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from app.utils.config import CONFIG
from app.utils.lifespan.refresh import _watchers
from app.utils.lifespan.resources_cache import parse_resources


class OriginalResourceRefreshTests(unittest.TestCase):
    def test_original_file_changes_reparse_resource_listing(self):
        with TemporaryDirectory() as directory:
            assets = Path(directory)
            game = assets / 'game'
            image = game / 'images' / 'bg' / 'new.jpg'
            image.parent.mkdir(parents=True)
            (game / 'resources.rpy').write_text('', encoding='utf-8')
            with (patch.object(CONFIG, 'docs_path', assets / 'docs'),
                  patch.object(CONFIG, 'res_path', game),
                  patch.object(CONFIG, 'sprite_layers', {}),
                  patch.object(CONFIG, 'resources', {})):
                parse_resources()
                image.write_bytes(b'image')
                for name, matches, refresh in _watchers():
                    if name == 'resources' and matches(image.resolve()):
                        refresh()
                files = [item['file'] for item in CONFIG.resources['original']['bg']]
                self.assertIn('images/bg/new.jpg', files)
                image.unlink()
                for name, matches, refresh in _watchers():
                    if name == 'resources' and matches(image.resolve()):
                        refresh()
                self.assertNotIn('images/bg/new.jpg', [item['file'] for item in CONFIG.resources['original']['bg']])

    def test_audio_and_translation_changes_invalidate_resource_metadata(self):
        assets = Path(__file__).resolve().parents[1] / 'temp' / 'refresh-fixture'
        game = assets / 'game'
        with patch.object(CONFIG, 'docs_path', assets / 'docs'), patch.object(CONFIG, 'res_path', game):
            matches = next(predicate for name, predicate, _ in _watchers() if name == 'resources')
            for relative in ('audio/music/new.ogg', 'tl/None/translation.rpy', 'zhenya/images/bg/new.jpg'):
                with self.subTest(relative=relative):
                    self.assertTrue(matches(game / relative))
