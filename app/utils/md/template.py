import re

from markdown_it.rules_block import StateBlock

def template(name: str):
    # Accepts both the strict `:::name` marker and the more common
    # `::: name lead text` form (space after the fence, optional text on the
    # same line, treated as the block's opening paragraph).
    open_re = re.compile(rf'^:::\s*{re.escape(name)}(?:\s+(\S.*))?\s*$')

    def block(state: StateBlock, startLine: int, endLine: int, silent: bool):
        pos = state.bMarks[startLine] + state.tShift[startLine]
        maximum = state.eMarks[startLine]

        match = open_re.match(state.src[pos:maximum])
        if not match:
            return False

        lead = (match.group(1) or '').strip()

        # Scan for a closing `:::` on its own line. A missing closer fails
        # the block entirely (falls back to plain paragraphs/list rendering)
        # rather than silently swallowing the rest of the document into the
        # callout box — the raw `:::tip` text left visible is the signal
        # that something's wrong, easier to spot than a silently mis-scoped
        # callout.
        nextLine = startLine + 1

        while nextLine < endLine:
            pos = state.bMarks[nextLine] + state.tShift[nextLine]
            maximum = state.eMarks[nextLine]

            if state.src[pos:maximum].strip() == ':::':
                break

            nextLine += 1

        if nextLine >= endLine:
            return False

        if silent:
            return True

        old_parent = state.parentType
        old_line_max = state.lineMax
        state.parentType = name
        state.lineMax = nextLine

        token = state.push(f'{name}_open', 'div', 1)
        token.attrs = {'class': name}
        token.map = [startLine, nextLine]

        # Lead text becomes the block's first paragraph, rendered ahead of
        # whatever full block content (paragraphs, lists, etc.) follows.
        if lead:
            state.push('paragraph_open', 'p', 1)
            inline = state.push('inline', '', 0)
            inline.content = lead
            inline.children = []
            state.push('paragraph_close', 'p', -1)

        # Full block-level parse (not a single inline blob) so lists,
        # multiple paragraphs, and code fences work inside a callout.
        state.md.block.tokenize(state, startLine + 1, nextLine)

        state.push(f'{name}_close', 'div', -1)

        state.parentType = old_parent
        state.lineMax = old_line_max
        state.line = nextLine + 1
        return True
    return block
