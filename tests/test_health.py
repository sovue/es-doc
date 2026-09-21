import unittest

from httpx import ASGITransport, AsyncClient

from app.app import app


class HealthEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def test_healthz_returns_plain_text_ok(self):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get("/healthz")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "ok")
        self.assertTrue(response.headers["content-type"].startswith("text/plain"))


if __name__ == "__main__":
    unittest.main()
