import unittest
from xml.etree import ElementTree as ET

from app.utils.file import templates
from app.utils.icons import lucide_icon
from app.utils.md import CODE_COPY_BUTTON, render
from app.utils.svg import SVG
from scripts.sync_lucide_icons import ROOT, browser_source
from app.app import app
from app.utils.assets import asset_url
from app.utils.icons import ICON_NAMES
from httpx import ASGITransport, AsyncClient


class IconTests(unittest.TestCase):
    def test_generated_browser_catalog_matches_canonical_svg_files(self):
        self.assertEqual((ROOT / 'static/js/icons.js').read_text('utf-8'), browser_source())

    def test_template_helper_preserves_geometry_and_escapes_classes(self):
        icon = lucide_icon('copy', 14, 'custom" onload="alert(1)')
        root = ET.fromstring(str(icon))
        self.assertEqual(root.attrib['viewBox'], '0 0 24 24')
        self.assertEqual(root.attrib['stroke-width'], '2')
        self.assertEqual(root.attrib['width'], '14')
        self.assertEqual(root.attrib['aria-hidden'], 'true')
        self.assertEqual(root.attrib['focusable'], 'false')
        self.assertNotIn('onload', root.attrib)
        rendered = templates.env.from_string("{{ lucide_icon('copy', 14) }}").render()
        self.assertIn('<svg ', rendered)
        self.assertNotIn('&lt;svg', rendered)

    def test_unknown_icons_and_invalid_sizes_are_rejected(self):
        for name in ('../../config', 'missing', '<script>'):
            with self.assertRaises(KeyError):
                lucide_icon(name)
        for size in (0, 129, '18', 1.5, True):
            with self.assertRaises(ValueError):
                lucide_icon('copy', size)

    def test_markdown_uses_shared_icons_and_retains_state_classes(self):
        self.assertIn('lucide-copy', CODE_COPY_BUTTON)
        self.assertIn('lucide-check', CODE_COPY_BUTTON)
        self.assertEqual(CODE_COPY_BUTTON.count('<svg '), 2)
        self.assertIn('lucide-triangle-alert', SVG['warning'])
        self.assertIn('lucide-octagon-alert', SVG['danger'])
        self.assertIn(' icon"', SVG['info'])
        audio = render('::audio /resource/audio/theme.ogg | Тема')[2]
        self.assertIn('lucide-play doc-audio-icon-play', audio)
        self.assertIn('lucide-pause doc-audio-icon-pause', audio)
        self.assertIn('lucide-hash', render('## Заголовок')[2])

    def test_no_custom_ui_svg_geometry_or_encoded_masks_remain(self):
        for folder, pattern in (('templates', '*.html'), ('static/css', '*.css')):
            for path in (ROOT / folder).rglob(pattern):
                source = path.read_text('utf-8')
                if path == ROOT / 'templates/partials/footer.html':
                    self.assertEqual(source.count('<svg '), 3, 'Only the three restored platform logos are exempt')
                else:
                    self.assertNotIn('<svg ', source, str(path))
                self.assertNotIn('data:image/svg+xml', source, str(path))


class IconRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_catalog_is_served_locally_with_svg_type_and_revalidation(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            for name in ICON_NAMES:
                response = await client.get(asset_url(f'/static/icons/{name}.svg'))
                self.assertEqual(response.status_code, 200, name)
                self.assertEqual(response.headers['content-type'], 'image/svg+xml')
                self.assertIn('immutable', response.headers['cache-control'])
            response = await client.get('/static/icons/copy.svg')
            cached = await client.get('/static/icons/copy.svg', headers={
                'If-None-Match': response.headers['etag'],
            })
            self.assertEqual(cached.status_code, 304)
            for name in ('missing.svg', 'manifest.json', 'LICENSE', '../../app/app.py'):
                response = await client.get('/static/icons/' + name)
                self.assertEqual(response.status_code, 404)
