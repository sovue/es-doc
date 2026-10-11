import unittest

from httpx import ASGITransport, AsyncClient

from app.app import app


class StaticRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_rejects_windows_traversal_and_absolute_paths(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            for folder in ('css', 'js', 'fonts'):
                for name in ('..%5C..%5CREADME.md', 'D:%5CGITHUB%5Ces-doc%5CREADME.md', '%00'):
                    with self.subTest(folder=folder, name=name):
                        response = await client.get(f'/static/{folder}/{name}')
                        self.assertEqual(response.status_code, 404)

    async def test_serves_normal_assets_and_returns_404_for_missing_fonts(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            for path in ('css/main.css', 'js/navigation.js', 'fonts/inter-variable-latin.woff2'):
                response = await client.get('/static/' + path)
                self.assertEqual(response.status_code, 200, path)
            response = await client.get('/static/fonts/missing.woff2')
            self.assertEqual(response.status_code, 404)
