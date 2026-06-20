from pygments.lexer import RegexLexer, words
from pygments.token import *

class RenPyLexer(RegexLexer):
    name = "Ren'Py"
    aliases = ["renpy"]
    filenames = ["*.rpy"]

    tokens = {
        "root": [
            (r"#.*$", Comment),

            (words((
                "label",
                "menu",
                "scene",
                "show",
                "hide",
                "jump",
                "call",
                "return",
                "if",
                "elif",
                "else",
                "while",
                "python",
                "init",
                "transform",
                "screen",
                "default",
                "define",
                "image",
                "style",
                "play",
                "stop",
                "queue",
                "voice",
                "window",
                "with",
                "pause",
            ), suffix=r"\b"), Keyword),

            (r'"([^"\\]|\\.)*"', String.Double),
            (r"'([^'\\]|\\.)*'", String.Single),

            (r"\$.*$", Name.Builtin),
            (r"\b[a-zA-Zа-яёА-ЯЁ_][a-zA-Zа-яёА-ЯЁ0-9_]*\b", Name),

            (r"[0-9]+\.[0-9]+", Number.Float),
            (r"[0-9]+", Number.Integer),
            (r"\s+", Whitespace),
            (r".", Text),
        ]
    }