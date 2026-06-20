from markdown_it.rules_block import StateBlock

def template(name: str):
    def block(state: StateBlock, startLine: int, endLine: int, silent: bool):
        pos = state.bMarks[startLine] + state.tShift[startLine]
        maximum = state.eMarks[startLine]

        line = state.src[pos:maximum]

        if line != f':::{name}':
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

        token = state.push(f'{name}_open', 'div', 1)
        token.attrs = {'class': name}

        content = state.getLines(startLine + 1, nextLine, 0, False)

        token = state.push('inline', '', 0)
        token.content = content
        token.children = []

        state.push(f'{name}_close', 'div', -1)

        state.line = nextLine + 1
        return True
    return block