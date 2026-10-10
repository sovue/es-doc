import re
import unittest
from html import unescape

from app.utils.md import render


class ContainerFenceTests(unittest.TestCase):
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
