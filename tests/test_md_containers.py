import re
import unittest
from html import unescape
from unittest.mock import patch

from app.utils.config import CONFIG
from app.utils.md import render


class ContainerFenceTests(unittest.TestCase):
    def test_standalone_banner_does_not_steal_the_outer_closer(self):
        with patch.object(CONFIG, 'config', {}):
            for marker in (':::stub', ':::stub A short note'):
                with self.subTest(marker=marker):
                    html = render(f':::details Example\n{marker}\n\nINSIDE\n:::\n\nOUTSIDE\n')[2]
                    self.assertIn('<details ', html)
                    self.assertIn('banner-stub', html)
                    self.assertLess(html.index('INSIDE'), html.index('</details>'))
                    self.assertGreater(html.index('OUTSIDE'), html.index('</details>'))

    def test_paired_banner_keeps_its_own_closer(self):
        with patch.object(CONFIG, 'config', {}):
            html = render(':::details Example\n:::stub\nA note\n:::\n\nINSIDE\n:::\n\nOUTSIDE\n')[2]
        self.assertIn('<details ', html)
        self.assertLess(html.index('A note'), html.index('</aside>'))
        self.assertLess(html.index('</aside>'), html.index('INSIDE'))
        self.assertLess(html.index('INSIDE'), html.index('</details>'))

    def test_fenced_marker_examples_do_not_close_or_open_containers(self):
        for fence in ('```', '~~~~'):
            for marker in (':::', ':::info', ':::details Literal'):
                with self.subTest(fence=fence, marker=marker):
                    source = f':::details Example\n{fence}text\n{marker}\n{fence}\n\nINSIDE\n:::\n\nOUTSIDE\n'
                    html = render(source)[2]
                    self.assertIn('<details ', html)
                    self.assertIn(marker + '\n', unescape(re.sub('<[^>]*>', '', html)))
                    self.assertLess(html.index('INSIDE'), html.index('</details>'))
                    self.assertGreater(html.index('OUTSIDE'), html.index('</details>'))

    def test_short_fence_does_not_end_long_fenced_example(self):
        html = render(':::info\n````text\n```\n:::\n````\n\nINSIDE\n:::\n')[2]
        self.assertLess(html.index('INSIDE'), html.index('</div>', html.index('INSIDE')))
        self.assertIn('```\n:::\n</code>', html)
