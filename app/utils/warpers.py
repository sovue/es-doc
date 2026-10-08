"""The Ren'Py warper set, for the «Варперы» tool.

Warper definitions aren't scanned out of the game folder: they are part
of the engine (renpy/common/000atl.rpy), so
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
    ('ease_', 'разгон и торможение', 'медленно по краям, быстро в середине'),
]

PREFIXES = ('easeout', 'easein', 'ease')

# Not easings — these three describe *when* the value changes, so each one
# carries its own line instead of leaning on a family note.
SPECIAL = [
    ('pause', 'Сохраняет начальное значение до конца интервала, затем устанавливает конечное.',
     '0.0 if t < 1.0 else 1.0'),
    ('instant', 'Сразу устанавливает конечное значение и ждёт до конца указанного времени.',
     '1.0'),
    ('linear', 'Меняет значение с постоянной скоростью.',
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
    ('Стандартные', '', '1 − cos(t * π/2)',
     'Стандартные варперы Ren\'Py с синусоидальным изменением скорости. Имена этих варперов не имеют суффикса _sine.',
     'easeout', '1 - cos({t} * pi / 2)'),
    ('Quad', '_quad', 't²',
     'Постоянное ускорение при разгоне и постоянное замедление при торможении.',
     'easeout', '{t} ** 2'),
    ('Cubic', '_cubic', 't³',
     'При разгоне ускорение постепенно растёт. Начало движения медленнее, чем у Quad.',
     'easeout', '{t} ** 3'),
    ('Quart', '_quart', 't⁴',
     'Разгон по четвёртой степени. К середине интервала easeout_quart достигает значения 1/16.',
     'easeout', '{t} ** 4'),
    ('Quint', '_quint', 't⁵',
     'Разгон по пятой степени. К середине интервала easeout_quint достигает значения 1/32.',
     'easeout', '{t} ** 5'),
    ('Expo', '_expo', '2^(10 * (t − 1))',
     'Экспоненциальный разгон или торможение. Основное изменение значения происходит у одного края интервала.',
     'easeout', '2 ** (10 * ({t} - 1))'),
    ('Circ', '_circ', '1 − √(1 − t²)',
     'Кривая на основе окружности. У easeout_circ скорость резко возрастает в конце интервала.',
     'easeout', '1 - sqrt(1 - {t} * {t})'),
    ('Back', '_back', 't² * (2.7015 * t − 1.7015)',
     'Выход за диапазон 0–1: ниже 0 при разгоне, выше 1 при торможении или оба эффекта в варианте ease.',
     'easeout', '{t} * {t} * (2.7015 * {t} - 1.7015)'),
    # Elastic and bounce are the two families the engine writes as easein_ and
    # derives easeout_ from — see the note in warpers.js.
    ('Elastic', '_elastic', None,
     'Затухающие колебания у начала, конца или обоих краёв интервала. Значение выходит за диапазон 0–1.',
     'easein', '1 + 2 ** (-10 * {t}) * sin(({t} - 0.075) * (2 * pi) / 0.3)'),
    ('Bounce', '_bounce', None,
     'Несколько отскоков у начала, конца или обоих краёв интервала. Значение остаётся в диапазоне 0–1.',
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
transform proezd(w=_warper.easein_quad):
    xpos 0
    warp w 2.0 xpos 520
""",
    'transition': """
$ medlenno = Dissolve(1.0, time_warp=_warper.easein_quad)
""",
    'catalog': '''
warpers:
  - name: soft_back
    desc: Отклонение ниже 0 перед разгоном
    expr: t * t * (2.4 * t - 1.4)
''',
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


def _description(suffix, prefix):
    if suffix in ('_back', '_elastic', '_bounce'):
        return {
            '_back': {
                'easeout': 'В начале значение становится меньше 0, затем растёт до 1. При перемещении объект сначала отклоняется назад.',
                'easein': 'Перед завершением анимации значение превышает 1, затем возвращается к 1. При перемещении объект проходит конечную точку и возвращается к ней.',
                'ease': 'В начале значение становится меньше 0, в конце превышает 1. При перемещении объект отклоняется назад, проходит конечную точку и возвращается к ней.',
            },
            '_elastic': {
                'easeout': 'Колебания около начального значения, затем движение к конечному. Значение может становиться меньше 0.',
                'easein': 'Колебания около конечного значения с уменьшением амплитуды. Значение несколько раз превышает 1 и возвращается к нему.',
                'ease': 'Колебания в начале и конце интервала. Значение выходит ниже 0 и выше 1.',
            },
            '_bounce': {
                'easeout': 'Отскоки в начале, затем движение к конечному значению. Значение остаётся в диапазоне 0–1.',
                'easein': 'В конце анимации — несколько отскоков от конечного значения. Значение остаётся в диапазоне 0–1.',
                'ease': 'Отскоки в начале и конце анимации. Значение остаётся в диапазоне 0–1.',
            },
        }[suffix][prefix]

    kind = {
        '': 'Стандартная синусоидальная кривая', '_quad': 'Квадратичная кривая',
        '_cubic': 'Кубическая кривая', '_quart': 'Кривая четвёртой степени',
        '_quint': 'Кривая пятой степени', '_expo': 'Экспоненциальная кривая',
        '_circ': 'Кривая на основе окружности',
    }[suffix]
    direction = {
        'easeout': 'значение сначала меняется медленно, затем быстрее',
        'easein': 'значение сначала меняется быстро, затем медленнее',
        'ease': 'в начале изменение ускоряется, в конце замедляется',
    }[prefix]
    return f'{kind}: {direction}.'


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
                {'name': prefix + suffix, 'source': variants[prefix],
                 'description': _description(suffix, prefix)}
                for prefix in PREFIXES
            ],
        })

    return result


def samples():
    return {key: MD.render(f'```{"yaml" if key == "catalog" else "renpy"}\n{src.strip()}\n```') for key, src in SAMPLES.items()}
