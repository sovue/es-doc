import asyncio
import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from PIL import Image

from app.routes.res import _ensure_tinted
from app.utils.config import CONFIG
from app.utils.lifespan.sprites_cache import compose_sprite, is_composed, sprites_path
from app.utils.lifespan.tint_cache import compose_tint, is_tinted


class ImageCacheTests(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.game = self.root / 'game'
        self.game.mkdir()
        declarations = self.game / 'sprites.rpy'
        declarations.write_text('', encoding='utf-8')
        os.utime(declarations, (100, 100))
        for change in (patch.object(CONFIG, 'res_path', self.game),
                       patch.object(CONFIG, 'cache_path', self.root / 'cache'),
                       patch.object(CONFIG, 'sprite_layers', {'fixture': ['layer.png']}),
                       patch.object(CONFIG, 'resources', {})):
            change.start()
            self.addCleanup(change.stop)
        sprites_path().mkdir(parents=True)

    def image(self, name, color, timestamp=100):
        path = self.game / name
        Image.new('RGBA', (2, 2), color).save(path)
        os.utime(path, (timestamp, timestamp))
        return path

    def test_recomposes_sprite_after_layer_replacement(self):
        self.image('layer.png', 'red')
        output = compose_sprite('fixture')
        os.utime(output, (200, 200))
        self.assertTrue(is_composed('fixture'))
        self.image('layer.png', 'lime', timestamp=300)
        self.assertFalse(is_composed('fixture'))
        compose_sprite('fixture')
        with Image.open(output) as image:
            red, green, _ = image.convert('RGB').getpixel((0, 0))
        self.assertGreater(green, 200)
        self.assertLess(red, 20)

    def test_tint_refreshes_when_factors_change_without_source_edits(self):
        source = self.image('source.png', 'white')
        output = compose_tint('bg', 'fixture', source, (1, 0, 0))
        os.utime(output, (200, 200))
        CONFIG.resources = {'original': {'bg': [{'name': 'fixture', 'file': 'source.png', 'tint': (0, 1, 0)}]}}
        asyncio.run(_ensure_tinted('bg', 'fixture'))
        with Image.open(output) as image:
            red, green, _ = image.convert('RGB').getpixel((0, 0))
        self.assertGreater(green, 200)
        self.assertLess(red, 20)

    def test_tint_refreshes_when_source_identity_changes_to_an_older_file(self):
        first = self.image('first.png', 'red')
        self.image('second.png', 'lime', timestamp=50)
        output = compose_tint('bg', 'fixture', first, (1, 1, 1))
        os.utime(output, (200, 200))
        CONFIG.resources = {'original': {'bg': [{'name': 'fixture', 'file': 'second.png', 'tint': (1, 1, 1)}]}}
        asyncio.run(_ensure_tinted('bg', 'fixture'))
        with Image.open(output) as image:
            red, green, _ = image.convert('RGB').getpixel((0, 0))
        self.assertGreater(green, 200)
        self.assertLess(red, 20)

    def test_tint_cache_reuses_matching_inputs_and_rebuilds_legacy_metadata(self):
        source = self.image('source.png', 'white')
        tint = (1, 0, 0)
        output = compose_tint('bg', 'fixture', source, tint)
        self.assertTrue(is_tinted('bg', 'fixture', source, tint))
        output.with_suffix('.json').unlink()
        self.assertFalse(is_tinted('bg', 'fixture', source, tint))
        compose_tint('bg', 'fixture', source, tint)
        self.assertTrue(is_tinted('bg', 'fixture', source, tint))

    def test_cached_sprite_is_invalid_when_a_layer_is_removed(self):
        layer = self.image('layer.png', 'red')
        compose_sprite('fixture')
        layer.unlink()
        self.assertFalse(is_composed('fixture'))
