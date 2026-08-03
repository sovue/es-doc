"""The Ren'Py warper set, as the «Варперы» section of «Ресурсов» renders it.

Unlike every other resource category, this one isn't scanned out of the
game folder: warpers are part of the engine (renpy/common/000atl.rpy), so
the list lives here in code. Community-made warpers are a separate, data-
driven list — see utils/lifespan/warpers_cache.py.

Names must match the table in static/js/warpers.js, which draws the curves;
an unknown name logs a console warning there and renders an empty box.
"""

from .md import MD

# The three prefixes are the whole naming scheme: every family exists in all
# three variants, so they're column headings, not per-preview text.
COLUMNS = [
    ('easeout_', 'разгон', 'медленный старт, быстрый финиш'),
    ('easein_', 'торможение', 'быстрый старт, мягкий финиш'),
    ('ease_', 'с обеих сторон', 'медленно по краям, быстро в середине'),
]

PREFIXES = ('easeout', 'easein', 'ease')

# Not easings — these three describe *when* the value changes, so each one
# carries its own line instead of leaning on a family note.
SPECIAL = [
    ('pause', 'Держит начальное значение всю длительность и переключается на конечное в последний момент.'),
    ('instant', 'Ставит конечное значение сразу, оставшаяся длительность работает как пауза после него.'),
    ('linear', 'Равномерно, без сглаживания. Хорош для механики: лифт, полоса загрузки, счётчик.'),
]

# (title, suffix, formula of the easeout_ variant, character of the curve).
# The other two variants are that curve mirrored, so one formula per row is
# enough — see the note under the column headings.
FAMILIES = [
    ('Sine', '', '1 − cos(t · π/2)',
     'Мягкое сглаживание на косинусе. Единственная тройка без суффикса и разумный выбор по умолчанию.'),
    ('Quad', '_quad', 't²',
     'Самая сдержанная из степенных: заметно живее линейного, но без драмы.'),
    ('Cubic', '_cubic', 't³',
     'Рабочая лошадка: разгон уже читается, рывка ещё нет.'),
    ('Quart', '_quart', 't⁴',
     'Больше половины пути проезжается в последней трети времени.'),
    ('Quint', '_quint', 't⁵',
     'Та же кривая, но жёстче. На длинной анимации читается уже как рывок.'),
    ('Expo', '_expo', '2^(10 · (t − 1))',
     'Самый крутой из плавных: начало движения почти не видно.'),
    ('Circ', '_circ', '1 − √(1 − t²)',
     'Дуга окружности: спокойное начало и обрыв в конце, резче, чем ожидаешь по названию.'),
    ('Back', '_back', None,
     'Замах: значение сначала уходит в обратную сторону и только потом идёт к цели.'),
    ('Elastic', '_elastic', None,
     'Пружина: цель проскакивается, и значение затухающе колеблется вокруг неё.'),
    ('Bounce', '_bounce', None,
     'Отскоки, как у мяча об пол. Хорошо ложится на падение и приземление.'),
]

# Rendered through the site's own markdown pipeline so the samples get the
# Ren'Py lexer, the code-panel styling and the copy button doc pages use.
SAMPLES = {
    'atl': """
show sl smile pioneer:
    xalign 0.0
    easeout_cubic 1.5 xalign 1.0
""",
    'warp': """
transform proezd(w="easein_quad"):
    xpos 0
    warp w 2.0 xpos 520
""",
    'transition': """
$ medlenno = Dissolve(1.0, time_warp=_warper.easein_quad)
""",
    'custom': """
python early hide:

    @renpy.atl_warper
    def rezko(t):
        return t ** 8.0
""",
}

# Every built-in name, in page order. Used for the section count and as the
# guard against a typo drifting between here and warpers.js.
NAMES = (
    [name for name, _ in SPECIAL]
    + [prefix + suffix for _, suffix, _, _ in FAMILIES for prefix in PREFIXES]
)


def families():
    return [
        {
            'title': title,
            'formula': formula,
            'note': note,
            'names': [prefix + suffix for prefix in PREFIXES],
        }
        for title, suffix, formula, note in FAMILIES
    ]


def samples():
    return {key: MD.render(f'```renpy\n{src.strip()}\n```') for key, src in SAMPLES.items()}
