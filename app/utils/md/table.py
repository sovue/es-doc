from markdown_it.rules_block import StateBlock
from markdown_it.token import Token

def table_block(state: StateBlock, startLine: int, endLine: int, silent: bool):
    pos = state.bMarks[startLine] + state.tShift[startLine]
    maximum = state.eMarks[startLine]

    line = state.src[pos:maximum]

    if line != ":::table":
        return False

    nextLine = startLine + 1

    while nextLine < endLine:
        pos = state.bMarks[nextLine] + state.tShift[nextLine]
        maximum = state.eMarks[nextLine]

        if state.src[pos:maximum] == ":::":
            break

        nextLine += 1

    if nextLine >= endLine:
        return False

    token = state.push("table_open", "table", 1)
    token.attrs = {"class": "table"}

    content = '<tbody>'
    for row in state.getLines(startLine + 1, nextLine, 0, False).split('\n'):
        content += '\n<tr>'
        for col in row.split(';'):
            content += f'\n<td>{col}</td>'
        content += '\n</tr>'
    content += '</tbody>'

    content.replace('<tr>\n', '<thead>\n<tr>\n', 1)
    content.replace('</tr>\n', '</tr>\n</thead>\n', 1)

    token = state.push("inline", "", 0)
    token.content = content
    token.children = []

    state.push('table_close', 'table', -1)

    state.line = nextLine + 1
    return True