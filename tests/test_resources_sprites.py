import unittest

from app.utils.lifespan.resources_cache import _build_search_items, _sprite_families


class SpriteFamilyTests(unittest.TestCase):
    def test_groups_distance_variants_under_one_base_name(self):
        items = [
            {'name': 'dv angry pioneer far', 'code': 'dv angry pioneer far'},
            {'name': 'dv angry pioneer', 'code': 'dv angry pioneer'},
            {'name': 'dv angry pioneer close', 'code': 'dv angry pioneer close'},
            {'name': 'dv smile pioneer', 'code': 'dv smile pioneer'},
        ]

        families = _sprite_families(items)

        self.assertEqual([family['name'] for family in families], [
            'dv angry pioneer', 'dv smile pioneer',
        ])
        self.assertEqual(
            [variant['distance'] for variant in families[0]['variants']],
            ['normal', 'close', 'far'],
        )
        self.assertEqual(families[0]['primary']['code'], 'dv angry pioneer')

    def test_search_links_to_family_row_with_exact_variant_query(self):
        variants = [
            {
                'name': name,
                'code': name,
                'rid': 'r-' + name.replace(' ', '-'),
                'declared': True,
                'desc': None,
            }
            for name in ('dv grin pioneer', 'dv grin pioneer far')
        ]
        collection = {'sprites': [{
            'title': 'Алиса',
            'sprites': variants,
            'sprite_families': _sprite_families(variants),
        }]}

        links = {item['label']: item['url'] for item in _build_search_items(collection)}
        self.assertEqual(
            links['dv grin pioneer far'],
            '/resources/original/sprites?q=dv%20grin%20pioneer%20far#r-dv-grin-pioneer',
        )


if __name__ == '__main__':
    unittest.main()
