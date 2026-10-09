import unittest

from app.utils.md import MD, outline, render


class MarkdownTableTests(unittest.TestCase):
    def test_restored_article_syntax_uses_styled_table_and_inline_renderers(self):
        source = '''# Переходы

| Имя | Эффект |
| --- | --- |
| `dissolve` | **Плавное** смешивание; [подробнее](https://www.renpy.org/doc/html/transitions.html) |
'''
        title, nav, html = render(source)
        self.assertEqual(title, 'Переходы')
        self.assertEqual(nav, '')
        self.assertIn('<table class="table">\n<thead>', html)
        self.assertIn('<th>Имя</th>', html)
        self.assertIn('<tbody>', html)
        self.assertIn('<strong>Плавное</strong> смешивание;', html)
        self.assertIn('<code>dissolve</code>', html)
        self.assertIn('target="_blank" rel="noopener noreferrer"', html)
        self.assertEqual(html.count('<td>'), 2)

    def test_alignment_escaped_pipes_and_line_breaks_survive_site_rendering(self):
        html = render(r'''| Left | Center | Right |
| :--- | :---: | ---: |
| a\|b | `x\|y` | first<br>second; third |
''')[2]
        for align in ('left', 'center', 'right'):
            self.assertIn(f'<th style="text-align:{align}">', html)
            self.assertIn(f'<td style="text-align:{align}">', html)
        self.assertIn('a|b</td>', html)
        self.assertIn('x|y</code>', html)
        self.assertIn('first<br>second; third</td>', html)
        self.assertEqual(html.count('<td '), 3)

    def test_table_inside_nested_containers_keeps_following_content(self):
        html = render(''':::info
:::details Пример
| Имя | Эффект |
| --- | --- |
| dissolve | Плавное смешивание |
:::

После таблицы внутри блока.
:::

## Следующий раздел
''')[2]
        table_end = html.index('</table>')
        details_end = html.index('</details>')
        paragraph = html.index('<p>После таблицы внутри блока.</p>')
        heading = html.index('<h2')
        self.assertLess(table_end, details_end)
        self.assertLess(details_end, paragraph)
        self.assertLess(paragraph, heading)
        self.assertNotIn(':::', html)

    def test_code_examples_and_pipe_prose_do_not_become_tables(self):
        for source in (
            'a | b\nc | d\n',
            '| a | b |\n| --- |\n| c | d |\n',
            '```md\n| a | b |\n| --- | --- |\n| c | d |\n```\n',
            ':::table\na;b\nc;d\n:::\n',
        ):
            with self.subTest(source=source):
                self.assertNotIn('table_open', [t.type for t in MD.parse(source)])

    def test_table_code_terms_are_indexed_without_creating_headings(self):
        data = outline('''# Переходы

| Имя | Эффект |
| --- | --- |
| `dissolve` | Растворение |

## Длительность
''')
        self.assertEqual(data['title'], 'Переходы')
        self.assertEqual([h['text'] for h in data['headings']], ['Длительность'])
        self.assertIn('dissolve', data['code_terms'])


if __name__ == '__main__':
    unittest.main()
