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
    ('pause', 'Держит начальное значение всю длительность и переключается на конечное в последний момент.',
     '0.0 if t < 1.0 else 1.0'),
    ('instant', 'Ставит конечное значение сразу, оставшаяся длительность работает как пауза после него.',
     '1.0'),
    ('linear', 'Равномерно, без сглаживания. Хорош для механики: лифт, полоса загрузки, счётчик.',
     't'),
]

# (title, suffix, formula of the easeout_ variant, character of the curve).
# The other two variants are that curve mirrored, so one formula per row is
# enough — see the note under the column headings.
#
# The last two fields are the machine-readable side of the same thing: which
# prefix the engine writes the formula for, and that formula as an expression
# in `t` (a `{t}` placeholder, so the derived variants can substitute into
# it). It's what the previews and the formula chip copy — the display formula
# above is typeset for reading, this one pastes into the generator, into
# warpers.yaml and into a mod.
FAMILIES = [
    ('Sine', '', '1 − cos(t · π/2)',
     'Мягкое сглаживание на косинусе. Единственная тройка без суффикса и разумный выбор по умолчанию.',
     'easeout', '1 - cos({t} * pi / 2)'),
    ('Quad', '_quad', 't²',
     'Самая сдержанная из степенных: заметно живее линейного, но без драмы.',
     'easeout', '{t} ** 2'),
    ('Cubic', '_cubic', 't³',
     'Рабочая лошадка: разгон уже читается, рывка ещё нет.',
     'easeout', '{t} ** 3'),
    ('Quart', '_quart', 't⁴',
     'Больше половины пути проезжается в последней трети времени.',
     'easeout', '{t} ** 4'),
    ('Quint', '_quint', 't⁵',
     'Та же кривая, но жёстче. На длинной анимации читается уже как рывок.',
     'easeout', '{t} ** 5'),
    ('Expo', '_expo', '2^(10 · (t − 1))',
     'Самый крутой из плавных: начало движения почти не видно.',
     'easeout', '2 ** (10 * ({t} - 1))'),
    ('Circ', '_circ', '1 − √(1 − t²)',
     'Дуга окружности: спокойное начало и обрыв в конце, резче, чем ожидаешь по названию.',
     'easeout', '1 - sqrt(1 - {t} * {t})'),
    ('Back', '_back', 't² · (2.7015 · t − 1.7015)',
     'Замах: значение сначала уходит в обратную сторону и только потом идёт к цели.',
     'easeout', '{t} * {t} * (2.7015 * {t} - 1.7015)'),
    # Elastic and bounce are the two families the engine writes as easein_ and
    # derives easeout_ from — see the note in warpers.js.
    ('Elastic', '_elastic', None,
     'Пружина: цель проскакивается, и значение затухающе колеблется вокруг неё.',
     'easein', '1 + 2 ** (-10 * {t}) * sin(({t} - 0.075) * (2 * pi) / 0.3)'),
    ('Bounce', '_bounce', None,
     'Отскоки, как у мяча об пол. Хорошо ложится на падение и приземление.',
     'easein',
     '7.5625 * {t} ** 2 if {t} < 1 / 2.75'
     ' else 1 + 7.5625 * (({t} - 1.5 / 2.75) ** 2 - (0.5 / 2.75) ** 2) if {t} < 2 / 2.75'
     ' else 1 + 7.5625 * (({t} - 2.25 / 2.75) ** 2 - (0.25 / 2.75) ** 2) if {t} < 2.5 / 2.75'
     ' else 1 + 7.5625 * (({t} - 2.625 / 2.75) ** 2 - (0.125 / 2.75) ** 2)'),
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
    [name for name, _, _ in SPECIAL]
    + [prefix + suffix for _, suffix, _, _, _, _ in FAMILIES for prefix in PREFIXES]
)


def _variants(template, base):
    """The three variants' formulas, derived the way 000atl.rpy derives the
    functions themselves: one is written out, the second is it mirrored, and
    ease_ is easeout_ run at double speed into each half. Substituting into
    the template beats writing thirty formulas by hand and having them drift
    from the curves the page actually plots."""

    def at(argument):
        return '(' + template.format(t=argument) + ')'

    if base == 'easeout':
        easeout, easein = template.format(t='t'), f'1 - {at("(1 - t)")}'
        def out(argument):
            return at(argument)
    else:
        easein, easeout = template.format(t='t'), f'1 - {at("(1 - t)")}'
        def out(argument):
            return f'(1 - {at(f"(1 - {argument})")})'

    ease = (f'{out("(2 * t)")} / 2 if t < 0.5'
            f' else 1 - {out("(2 * (1 - t))")} / 2')

    return {'easeout': easeout, 'easein': easein, 'ease': ease}


def families():
    result = []

    for title, suffix, formula, note, base, template in FAMILIES:
        variants = _variants(template, base)
        result.append({
            'title': title,
            'formula': formula,
            # What the row's formula chip copies: the variant the engine
            # actually writes out, which is the one the chip displays.
            'source': variants[base],
            'note': note,
            'cells': [
                {'name': prefix + suffix, 'source': variants[prefix]}
                for prefix in PREFIXES
            ],
        })

    return result


def samples():
    return {key: MD.render(f'```renpy\n{src.strip()}\n```') for key, src in SAMPLES.items()}
