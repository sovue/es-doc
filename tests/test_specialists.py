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
from app.utils.lifespan.specialists_cache import parse_specialists


class SpecialistsTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.assets = Path(__file__).resolve().parents[1] / 'temp' / f'test-specialists-{uuid4().hex}'
        self.assets.mkdir(parents=True)
        self.addCleanup(shutil.rmtree, self.assets)
        for setting in (
            patch.object(CONFIG, 'docs_path', self.assets / 'docs'),
            patch.object(CONFIG, 'res_path', self.assets / 'game'),
            patch.object(CONFIG, 'cache_path', self.assets / 'cache'),
            patch.object(CONFIG, 'specialists', [], create=True),
        ):
            setting.start()
            self.addCleanup(setting.stop)

    def write(self, filename, content):
        (self.assets / filename).write_text(content, encoding='utf-8')

    async def get(self, path):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
            return await client.get(path)

    def test_artists_use_specialists_data_with_contacts_status_and_art_examples(self):
        self.write('specialists.yaml', 'specialists:\n  - name: Artist\n    categories: [artists]\n    status: open\n    works: [{type: art, file: sample.webp}]\n    links: {vk: "https://vk.com/artist"}\n')
        parse_specialists()
        self.assertEqual(CONFIG.specialists[0]['categories'], ['artists'])
        self.assertEqual(CONFIG.specialists[0]['slug'], 'artist')
        self.assertEqual(CONFIG.specialists[0]['links']['vk'], 'https://vk.com/artist')
        self.assertEqual(CONFIG.specialists[0]['status'], 'open')
        self.assertEqual(CONFIG.specialists[0]['works'][0]['type'], 'art')
        self.assertEqual(CONFIG.specialists[0]['works'][0]['source'], 'sample.webp')

    def test_old_artists_file_is_not_loaded(self):
        self.write('artists.yaml', 'artists:\n  - {name: Old artist, status: open}\n')
        self.write('specialists.yaml', 'specialists:\n  - {name: poi, categories: [coders]}\n')
        parse_specialists()
        self.assertEqual([person['name'] for person in CONFIG.specialists], ['poi'])

    async def test_telegram_usernames_and_username_in_user_link_are_rendered(self):
        self.write('specialists.yaml', '''specialists:
  - name: Handle
    categories: [coders]
    links: {tg: "@PerpetuaPetua"}
  - name: User link
    categories: [coders]
    links: {telegram: "tg://user?id=PerpetuaPetua"}
  - name: Web link
    categories: [coders]
    links: {tg: "https://t.me/PerpetuaPetua"}
''')
        parse_specialists()
        for person in CONFIG.specialists:
            self.assertEqual(list(person['links'].values()), ['https://t.me/PerpetuaPetua'])
        page = await self.get('/specialists?category=coders')
        self.assertEqual(page.text.count('href="https://t.me/PerpetuaPetua"'), 9)

    async def test_telegram_numeric_ids_and_resolve_links_are_preserved(self):
        self.write('specialists.yaml', '''specialists:
  - name: Telegram contacts
    categories: [coders]
    links:
      tg: "tg://user?id=123456789"
      telegram: "tg://resolve?domain=PerpetuaPetua&profile"
''')
        parse_specialists()
        self.assertEqual(CONFIG.specialists[0]['links'], {
            'tg': 'tg://user?id=123456789',
            'telegram': 'tg://resolve?domain=PerpetuaPetua&profile',
        })
        page = await self.get('/specialists')
        self.assertIn('href="tg://user?id=123456789"', page.text)
        self.assertIn('href="tg://resolve?domain=PerpetuaPetua&amp;profile"', page.text)

    def test_telegram_formats_are_only_allowed_for_valid_telegram_contacts(self):
        self.write('specialists.yaml', '''specialists:
  - name: Invalid contacts
    categories: [coders]
    links:
      tg: "javascript:alert(1)"
      telegram: "tg://user?id=invalid%20name"
      site: "tg://resolve?domain=PerpetuaPetua"
      github: "@PerpetuaPetua"
    works: [{type: project, url: "tg://user?id=123456789"}]
''')
        parse_specialists()
        self.assertEqual(CONFIG.specialists[0]['links'], {})
        self.assertEqual(CONFIG.specialists[0]['works'], [])

    def test_categories_multiple_roles_typed_works_and_two_track_limit(self):
        self.write('specialists.yaml', '''specialists:
  - name: Musician
    categories: [composers]
    works:
      - {type: track, title: First, file: first.ogg}
      - {type: track, title: Second, url: "https://example.com/second.mp3"}
      - {type: track, title: Third, file: third.ogg}
  - name: Author
    categories: [coders, writers]
    works:
      - {type: mod, title: Mod, url: "https://example.com/mod"}
      - {type: project, title: Project, url: "https://example.com/project"}
      - {type: fanfic, title: Story, url: "https://example.com/story"}
  - name: AI artist
    categories: [ai-artists]
    works: [{type: art, title: Art, file: art.webp}]
''')
        parse_specialists()
        people = {p['name']: p for p in CONFIG.specialists}
        self.assertEqual(len(people['Musician']['works']), 2)
        self.assertEqual(people['Author']['categories'], ['coders', 'writers'])
        self.assertEqual([w['type'] for w in people['Author']['works']], ['mod', 'project', 'fanfic'])
        self.assertEqual(people['AI artist']['works'][0]['type'], 'art')

    def test_malformed_rows_and_unsafe_links_do_not_break_directory(self):
        self.write('specialists.yaml', '''specialists:
  - 123
  - {name: 42}
  - {name: Invalid, categories: [missing]}
  - name: Valid
    categories: [coders]
    status: invalid
    logo: 123
    links: {bad: "javascript:alert(1)", site: "https://example.com"}
    works:
      - {type: project, title: Bad, url: "javascript:alert(1)"}
      - {type: art, title: Wrong discipline, file: art.webp}
      - {type: project, title: Good, url: "https://example.com/project"}
''')
        parse_specialists()
        self.assertEqual(len(CONFIG.specialists), 1)
        item = CONFIG.specialists[0]
        self.assertEqual(item['status'], 'unknown')
        self.assertEqual(item['links'], {'site': 'https://example.com'})
        self.assertEqual([w['title'] for w in item['works']], ['Good'])

    async def test_page_has_five_categories_and_server_rendered_empty_state(self):
        self.write('specialists.yaml', 'specialists:\n  - {name: Existing, categories: [artists], status: open}\n')
        parse_specialists()
        response = await self.get('/specialists?category=composers')
        self.assertEqual(response.status_code, 200)
        labels = ('Художники', 'Нейрохудожники', 'Кодеры', 'Композиторы', 'Сценаристы')
        for label in labels:
            self.assertIn(label, response.text)
        positions = [response.text.index(label) for label in labels]
        self.assertEqual(positions, sorted(positions))
        self.assertNotIn('Режиссёры', response.text)
        self.assertNotIn('category=directors', response.text)
        self.assertIn('В этой категории пока нет специалистов', response.text)
        self.assertNotIn('data-name="Existing"', response.text)
        self.assertIn('aria-current="page"', response.text)

    async def test_artist_redirect_preserves_filter_state(self):
        response = await self.get('/artists?view=table&status=open')
        self.assertEqual(response.status_code, 308)
        self.assertEqual(response.headers['location'], '/specialists?category=artists&view=table&status=open')

    async def test_empty_category_links_keep_view_and_status(self):
        response = await self.get('/specialists?category=composers&view=table&status=open')
        self.assertIn('view=table&amp;status=open&amp;category=artists', response.text)

    def test_specialists_with_colliding_names_have_unique_slugs(self):
        self.write('specialists.yaml', 'specialists:\n  - {name: Same name, categories: [artists]}\n  - {name: Same name, categories: [coders]}\n')
        parse_specialists()
        self.assertEqual({p['slug'] for p in CONFIG.specialists}, {'same-name', 'same-name-2'})

    async def test_work_media_is_listed_confined_and_playable(self):
        media = self.assets / 'specialists'
        media.mkdir()
        Image.new('RGB', (40, 30), '#335522').save(media / 'art.png')
        (media / 'track.ogg').write_bytes(b'test-audio')
        self.write('specialists.yaml', '''specialists:
  - name: Creator
    categories: [ai-artists, composers]
    works:
      - {type: art, title: Artwork, file: art.png}
      - {type: track, title: Theme, file: track.ogg}
      - {type: track, title: Escape, file: ../private.ogg}
''')
        (self.assets / 'private.ogg').write_bytes(b'private')
        parse_specialists()
        slug = CONFIG.specialists[0]['slug']
        page = await self.get('/specialists')
        self.assertIn(f'data-play-src="/resource/specialist/work/{slug}/1"', page.text)
        self.assertIn('data-zoom="Artwork"', page.text)
        art = await self.get(f'/resource/specialist/work/{slug}/0')
        self.assertEqual(art.status_code, 200)
        self.assertEqual(art.headers['content-type'], 'image/webp')
        track = await self.get(f'/resource/specialist/work/{slug}/1')
        self.assertEqual(track.content, b'test-audio')
        escape = await self.get(f'/resource/specialist/work/{slug}/2')
        self.assertEqual(escape.status_code, 404)
        unknown = await self.get(f'/resource/specialist/work/{slug}/99')
        self.assertEqual(unknown.status_code, 404)

    def test_only_specialists_data_is_refreshed_without_restart(self):
        matcher = next(match for name, match, _ in _watchers() if name == 'specialists.yaml')
        self.assertTrue(matcher((self.assets / 'specialists.yaml').resolve()))
        self.assertFalse(matcher((self.assets / 'artists.yaml').resolve()))


if __name__ == '__main__':
    unittest.main()
