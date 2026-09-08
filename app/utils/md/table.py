from markdown_it.rules_block import StateBlock

from . import containers

# Registered so an enclosing callout counts this fence and doesn't mistake the
# table's closer for its own. The table's own scan below stays first-match:
# its body is read as raw `;`-separated rows, never block-tokenized, so no
# container can open inside it.
containers.register('table')


def table_block(state: StateBlock, startLine: int, endLine: int, silent: bool):
    pos = state.bMarks[startLine] + state.tShift[startLine]
    maximum = state.eMarks[startLine]

    line = state.src[pos:maximum]

    if line != ':::table':
        return False

    nextLine = startLine + 1

    while nextLine < endLine:
        pos = state.bMarks[nextLine] + state.tShift[nextLine]
        maximum = state.eMarks[nextLine]

        if state.src[pos:maximum] == ':::':
            break

        nextLine += 1

    if nextLine >= endLine:
        return False

    token = state.push('table_open', 'table', 1)
    token.attrs = {'class': 'table'}

    # First row is the header. It always was meant to be — `th` has had its own
    # background in doc.css from the start — but the promotion was written as
    # two bare `content.replace(...)` calls whose results were dropped on the
    # floor, so every table shipped as an unbroken slab of `<td>` and the `th`
    # styling had nothing to style. Building the two sections directly is both
    # the fix and one less thing to keep in sync.
    rows = [row for row in state.getLines(startLine + 1, nextLine, 0, False).split('\n') if row.strip()]

    def cells(row, tag):
        # Cell text stays unescaped on purpose: it is parsed as inline markdown
        # below, the same as any other prose in the document, so `code` and
        # **bold** work in a cell.
        return ''.join(f'\n<{tag}>{col}</{tag}>' for col in row.split(';'))

    content = ''

    if rows:
        content += f'<thead>\n<tr>{cells(rows[0], "th")}\n</tr>\n</thead>'

    if len(rows) > 1:
        content += '\n<tbody>'
        for row in rows[1:]:
            content += f'\n<tr>{cells(row, "td")}\n</tr>'
        content += '\n</tbody>'

    token = state.push('inline', '', 0)
    token.content = content
    token.children = []

    state.push('table_close', 'table', -1)

    state.line = nextLine + 1
    return True