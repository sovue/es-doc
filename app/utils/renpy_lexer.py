"""Pygments lexer for Ren'Py `.rpy` scripts.

Ren'Py has no first-class Pygments lexer that covers the parts docs actually
show — dialogue text tags, `[interpolation]`, screen/ATL keywords, block
properties, and inline Python. This one is hand-tuned against those cases. Token
choices are picked so the HTML formatter's short class names line up with the
palette already defined in static/css/doc.css (`.k` keyword, `.kt` type, `.s*`
string, `.si` interp, `.nt` tag, `.m*` number, `.o` operator, `.c*` comment,
`.err` error). Anything left as `Token.Text`/`Punctuation` falls back to the
block's base colour, so unknown punctuation stays visible rather than inheriting
the dark page ink.

Keyword and property lists are lifted from the vscode-language-renpy grammar
(github.com/renpy/vscode-language-renpy): renpy.tmLanguage, renpy.screen and
renpy.atl.
"""

from pygments.lexer import RegexLexer, words, include, bygroups, using
from pygments.lexers.python import PythonLexer
from pygments.token import (
    Comment, String, Number, Keyword, Name, Operator, Punctuation,
    Text, Whitespace, Error,
)

# Statement / control-flow keywords — the words that open or steer a Ren'Py
# line. Python control words that also appear inside `$`/`python:` blocks are
# folded in so those read correctly too.
_STATEMENTS = (
    "label", "menu", "scene", "show", "hide", "jump", "call", "return",
    "pass", "with", "pause", "play", "stop", "queue", "voice", "window",
    "nvl", "camera", "image", "layeredimage", "define", "default",
    "transform", "screen", "style", "python", "init", "translate",
    "testcase", "image_attributes", "rpy",
    # control flow (shared with Python)
    "if", "elif", "else", "while", "for", "in", "break", "continue",
    # python-block flow / statements
    "import", "from", "as", "global", "nonlocal", "del", "assert",
    "raise", "try", "except", "finally", "yield", "lambda", "with",
    # ren'py sub-keywords
    "at", "behind", "onlayer", "zorder", "expression", "from", "set",
    "early", "hide", "sustain", "clear", "monologue", "offset",
)

# Declarations get their own token so `def`/`class` read as declarations
# (still keyword-coloured) inside embedded Python.
_DECLARATIONS = ("def", "class")

# Screen-language displayables/directives and layered-image sub-statements. Kept
# as keywords because in a flat (context-free) lexer we can't tell a `text`
# displayable from the word "text" in prose — but inside a fenced Ren'Py block
# that trade-off reads well.
_SCREEN = (
    # screen displayables / directives
    "frame", "vbox", "hbox", "fixed", "grid", "side", "vpgrid",
    "viewport", "window", "textbutton", "imagebutton", "button", "text",
    "label", "bar", "vbar", "hbar", "imagemap", "hotspot", "hotbar",
    "input", "key", "timer", "mousearea", "draggroup", "drag", "add",
    "null", "use", "has", "showif", "on", "transclude", "action",
    "hovered", "unhovered", "tooltip", "nearrect", "sensitive",
    # layeredimage sub-statements (https://www.renpy.org/doc/html/layeredimage.html)
    "group", "attribute", "always", "multiple", "format_function",
    "if_all", "if_any", "if_not", "auto",
)

# ATL warpers, transitions and manipulation words — visually the "types" of the
# animation language. Coloured as Keyword.Type (`.kt`, cyan) so animation
# examples get a second accent beyond plain keyword orange. Names are distinct
# enough (easein_bounce, moveinright) that false positives on user variables
# are rare.
_ATL_TYPES = (
    # warpers
    "linear", "ease", "easein", "easeout", "ease_back", "ease_bounce",
    "ease_circ", "ease_cubic", "ease_elastic", "ease_expo", "ease_quad",
    "ease_quart", "ease_quint", "easein_back", "easein_bounce",
    "easein_circ", "easein_cubic", "easein_elastic", "easein_expo",
    "easein_quad", "easein_quart", "easein_quint", "easeout_back",
    "easeout_bounce", "easeout_circ", "easeout_cubic", "easeout_elastic",
    "easeout_expo", "easeout_quad", "easeout_quart", "easeout_quint",
    # manipulation keywords
    "warp", "circles", "clockwise", "counterclockwise", "knot",
    "repeat", "block", "parallel", "contains", "choice", "event",
    "function", "animation", "time",
    # stock transitions
    "dissolve", "fade", "pixellate", "move", "moveinright", "moveinleft",
    "moveintop", "moveinbottom", "moveoutright", "moveoutleft",
    "moveouttop", "moveoutbottom", "vpunch", "hpunch", "blinds",
    "squares", "wipeleft", "wiperight", "wipeup", "wipedown", "pushright",
    "pushleft", "irisin", "irisout",
)

# Style / screen / ATL transform property names. Only highlighted at the start
# of an indented line (see the property rule below) — i.e. as `xpos 100` inside
# a screen/style/transform/ATL block — so common words like "color" or "size"
# don't get mis-coloured out in prose or Python expressions.
_PROPERTIES = (
    "activate_sound", "adjust_spacing", "aft_bar", "aft_gutter", "alt",
    "altruby_style", "antialias", "axis", "background", "bar_invert",
    "bar_resizing", "unscrollable", "bar_vertical", "black_color", "bold",
    "bottom_margin", "bottom_padding", "box_layout", "box_reverse",
    "box_wrap", "box_wrap_spacing", "caret", "child", "clipping", "color",
    "debug", "drop_shadow", "drop_shadow_color", "emoji_font", "extra_alt",
    "first_indent", "first_spacing", "fit_first", "focus_mask", "focus_rect",
    "font", "fore_bar", "fore_gutter", "foreground", "group_alt", "hinting",
    "hover_sound", "hyperlink_functions", "italic", "instance", "justify",
    "kerning", "key_events", "keyboard_focus", "language", "layout",
    "line_leading", "left_margin", "line_overlap_split", "left_padding",
    "line_spacing", "mouse", "modal", "min_width", "mipmap", "newline_indent",
    "order_reverse", "outlines", "outline_scaling", "prefer_emoji",
    "rest_indent", "right_margin", "right_padding", "ruby_line_leading",
    "ruby_style", "shaper", "size", "size_group", "slow_abortable",
    "slow_cps", "slow_cps_multiplier", "spacing", "strikethrough",
    "subtitle_width", "subpixel", "text_y_fudge", "text_align", "thumb",
    "thumb_offset", "thumb_shadow", "time_policy", "top_margin", "top_padding",
    "underline", "vertical", "xanchor", "xfill", "xfit", "xmaximum",
    "xminimum", "xoffset", "xpos", "xspacing", "yanchor", "yfill", "yfit",
    "ymaximum", "yminimum", "yoffset", "ypos", "yspacing", "margin",
    "xmargin", "ymargin", "xalign", "yalign", "padding", "xpadding",
    "ypadding", "minwidth", "textalign", "slow_speed", "enable_hover",
    "left_gutter", "right_gutter", "top_gutter", "bottom_gutter", "left_bar",
    "right_bar", "top_bar", "bottom_bar", "base_bar", "box_spacing",
    "box_first_spacing", "pos", "anchor", "offset", "align", "maximum",
    "minimum", "xsize", "ysize", "xysize", "area", "xcenter", "ycenter",
    "xycenter", "zorder", "layer",
    # ATL transform properties
    "rotate", "rotate_pad", "transform_anchor", "zoom", "xzoom", "yzoom",
    "nearest", "alpha", "additive", "around", "alignaround", "crop",
    "crop_relative", "corner1", "corner2", "delay", "events", "zpos",
    "matrixcolor", "matrixtransform", "blur", "perspective", "point_to",
    "orientation", "xrotate", "yrotate", "zrotate", "zzoom",
)

# Longest-first so the alternation never stops at a prefix (e.g. `xpos` before
# `xpadding` can't shadow it, but this keeps it robust regardless).
_PROP_ALT = "|".join(sorted(set(_PROPERTIES), key=len, reverse=True))
# Optional style-state prefixes: selected_hover_color, idle_color, …
_PROP_PREFIX = r"(?:selected_)?(?:hover_|idle_|insensitive_|activate_)?"

# Words that must never be read as a speaking character even when a string
# follows them (`voice "a.ogg"`, `show x`, `if cond`, …).
_SAY_GUARD = "|".join(
    _STATEMENTS + _SCREEN + _ATL_TYPES + _DECLARATIONS
    + ("True", "False", "None")
)


def _string_state(quote, tok):
    """Rules for the interior of a Ren'Py say/UI string. Ren'Py strings carry
    `{text tags}`, `[interpolation]`, `\\`-escapes and old `%`-style formats on
    top of Python escapes, so they need their own state per quote char.

    Balance checking: a text tag or interpolation is only entered when a
    matching `}`/`]` exists on the same line (positive lookahead). A lone
    unmatched `{` or `[` — which Ren'Py would itself choke on — is flagged as
    Error. Strings are bounded to their line, so an unterminated quote can't
    swallow the code that follows it."""
    return [
        # Python + Ren'Py escapes: \n \" \\ and the doubled-brace literals.
        (r"\\.", String.Escape),
        (r"\{\{", String.Escape),
        (r"\[\[", String.Escape),
        (r"%%", String.Escape),
        # old-style %-interpolation: %s, %(name)s
        (r"%(\([^)]+\))?[#0\- +]*\d*(?:\.\d+)?[a-zA-Z]", String.Interpol),
        # text tag closed on this line -> parse internals; lone `{` -> unbalanced
        (r"(?=\{/?[^}\n]*\})\{", Name.Tag, "texttag"),
        (r"\{", Error),
        # interpolation closed on this line -> parse; lone `[` -> unbalanced
        (r"(?=\[[^\]\n]*\])\[", String.Interpol, "interp"),
        (r"\[", Error),
        (quote, tok, "#pop"),
        # end of line before the closing quote -> unterminated string
        (r"$", Error, "#pop"),
        (r"[^" + quote + r"\\{\[%\n]+", tok),
        (r".", tok),
    ]


class RenPyLexer(RegexLexer):
    name = "Ren'Py"
    aliases = ["renpy"]
    filenames = ["*.rpy"]

    tokens = {
        "comment": [
            # Codetags get the "special" comment token (dotted underline in the
            # docs theme) so TODO/FIXME jump out of an otherwise grey comment.
            (r"(#)([^\n]*?)(\b(?:TODO|FIXME|XXX|HACK|BUG|NOTE)\b)([^\n]*)$",
             bygroups(Comment, Comment, Comment.Special, Comment)),
            (r"#[^\n]*$", Comment),
        ],

        # Entered only when the `{…}` is known to close on this line, so the
        # `}` rule is guaranteed to fire and pop.
        "texttag": [
            (r"\}", Name.Tag, "#pop"),
            (r"/", Name.Tag),
            (r"[a-zA-Z_]\w*", Name.Tag),
            (r"=", Operator),
            (r"#[0-9a-fA-F]{3,8}\b", Number.Hex),
            (r"[+\-*]", Operator),
            (r"[^}\n]+", String),
        ],

        # Entered only when the `[…]` is known to close on this line.
        "interp": [
            (r"\]", String.Interpol, "#pop"),
            (r"[^\]\n]+", String.Interpol),
        ],

        "double_string": _string_state('"', String.Double),
        "single_string": _string_state("'", String.Single),

        "root": [
            # ── Line-anchored rules first ──────────────────────────────────
            # These carry their own `^[ \t]*` indent capture, so they must be
            # tried before the whitespace rule consumes the indent (after which
            # `^` no longer matches and the delegation would silently break).

            # `python:` / `init python:` / `python early hide in mod:` blocks.
            # Capture the whole indented body (lines more-indented than the
            # header, via the \1 indent backreference) and hand it to the Python
            # lexer, so a python block reads as real Python, dedent and all.
            (r"^([ \t]*)(init[ \t]+(?:[+-]?\d+[ \t]+)?)?(python)"
             r"((?:[ \t]+(?:early|hide|in[ \t]+[\w.]+))*)([ \t]*)(:)([^\n]*\n)"
             r"((?:(?:\1[ \t]+[^\n]*)?\n)*)",
             bygroups(Whitespace, Keyword, Keyword, Keyword, Whitespace,
                      Punctuation, using(PythonLexer), using(PythonLexer))),

            # Inline Python: `$ expr` — hand the expression to the Python lexer.
            (r"^([ \t]*)(\$)([ \t]*)(.*)$",
             bygroups(Whitespace, Keyword, Whitespace, using(PythonLexer))),

            # `define`/`default x = <python>` — keyword, then Python for the RHS.
            (r"^([ \t]*)(define|default)\b(.*)$",
             bygroups(Whitespace, Keyword, using(PythonLexer))),

            # Contextual property: a known property at the start of an indented
            # line, i.e. inside a screen/style/transform/ATL block.
            (r"^([ \t]+)(" + _PROP_PREFIX + r"(?:" + _PROP_ALT + r"))\b",
             bygroups(Whitespace, Keyword.Type)),

            # Character dialogue: `e "Hello"` — the leading identifier is the
            # speaking character. Guarded so statement keywords that take a
            # string (`voice "a.ogg"`) aren't mistaken for a character.
            (r"^([ \t]*)(?!(?:" + _SAY_GUARD + r")\b)([A-Za-z_]\w*)([ \t]+)(?=[\"'])",
             bygroups(Whitespace, Name.Class, Whitespace)),

            # ── General rules ──────────────────────────────────────────────
            (r"[ \t]+", Whitespace),
            include("comment"),

            # Triple-quoted docstrings (python blocks / multi-line text).
            (r'"""', String.Double, "tdqs"),
            (r"'''", String.Single, "tsqs"),

            (words(_DECLARATIONS, prefix=r"\b", suffix=r"\b"), Keyword.Declaration),
            (words(_STATEMENTS, prefix=r"(?<!\.)\b", suffix=r"\b"), Keyword),
            (words(_SCREEN, prefix=r"(?<!\.)\b", suffix=r"\b"), Keyword),
            (words(_ATL_TYPES, prefix=r"(?<!\.)\b", suffix=r"\b"), Keyword.Type),
            (words(("True", "False", "None"), prefix=r"\b", suffix=r"\b"),
             Keyword.Constant),

            (r'"', String.Double, "double_string"),
            (r"'", String.Single, "single_string"),

            (r"\b[0-9]+\.[0-9]+(?:[eE][+\-]?[0-9]+)?\b", Number.Float),
            (r"\b[0-9]+[eE][+\-]?[0-9]+\b", Number.Float),
            (r"\b0[xX][0-9a-fA-F]+\b", Number.Hex),
            (r"\b[0-9]+\b", Number.Integer),

            (r"\b(and|or|not|in|is)\b", Operator.Word),
            (r"(\*\*|//|<<|>>|[-+*/%&|^~<>=!]=?|~)", Operator),

            (r"\b[a-zA-Zа-яёА-ЯЁ_][a-zA-Zа-яёА-ЯЁ0-9_]*\b", Name),
            (r"[()\[\]{}:,.@]", Punctuation),
            (r".", Text),
        ],

        "tdqs": [
            (r'"""', String.Double, "#pop"),
            (r'[^"\\]+', String.Double),
            (r"\\.", String.Escape),
            (r'"', String.Double),
        ],
        "tsqs": [
            (r"'''", String.Single, "#pop"),
            (r"[^'\\]+", String.Single),
            (r"\\.", String.Escape),
            (r"'", String.Single),
        ],
    }
