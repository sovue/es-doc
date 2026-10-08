"""Curated, playable previews of the original game's Ren'Py animations."""

import re
from pathlib import Path
from urllib.parse import quote

from .config import CONFIG


def _sequence(title, name, source, frames, *, description='', loop=True, fit='cover'):
    return {
        'title': title,
        'name': name,
        'source': source,
        'kind': 'sequence',
        'frames': frames,
        'description': description,
        'loop': loop,
        'fit': fit,
    }


def _frame(path, hold, fade=0, filter=None, transition="dissolve"):
    return {'path': path, 'hold': hold, 'fade': fade, 'filter': filter,
            'transition': transition}


ANIMATIONS = [
    {
        'title': 'Снег', 'name': 'snow', 'source': ('globals.rpy', 190),
        'kind': 'snow', 'path': 'images/anim/snow.png', 'particles': 50,
        'description': 'Частицы падают с ветром. Можно переключить плотность.',
        'variants': [
            {'label': 'Обычный', 'particles': 50, 'source_name': 'snow'},
            {'label': 'Сильный', 'particles': 500, 'source_name': 'heavy_snow'},
        ],
    },
    _sequence(
        'Звёздное небо', 'stars', ('media.rpy', 93),
        [_frame('images/anim/stars_1.jpg', 1.5, 1.5),
         _frame('images/anim/stars_3.jpg', 1.5, 1.5)],
        description='Два ночных кадра плавно сменяют друг друга.',
    ),
    _sequence(
        'Свеча', 'candle', ('media.rpy', 100),
        [_frame('images/anim/candle_1.png', 2, 2),
         _frame('images/anim/candle_2.png', 2, 2)],
        description='Медленное мерцание на двух кадрах.',
    ),
    _sequence(
        'Шум', 'prologue_dream', ('media.rpy', 107),
        [_frame(f'images/anim/prologue_{i}.png', hold)
         for i, hold in [(1, 0.1), (2, 0.1), (3, 0.1), (2, 0)]],
        description='Быстрый цикл кадров шума.',
    ),
    {
        'title': 'Закрыть глаза', 'name': 'blink', 'source': ('media.rpy', 127),
        'kind': 'lids', 'path': 'images/anim/blink_up.png',
        'second_path': 'images/anim/blink_down.png', 'background': '@bg:ext_square_night',
        'motion': 'close',
        'duration': 1.5, 'description': 'Анимация закрытия глаз.',
    },
    {
        'title': 'Открыть глаза', 'name': 'unblink', 'source': ('media.rpy', 117),
        'kind': 'lids', 'path': 'images/anim/blink_up.png',
        'second_path': 'images/anim/blink_down.png', 'background': '@bg:ext_square_night',
        'motion': 'open',
        'duration': 1.5, 'description': 'Анимация открытия глаз.',
    },
    {
        'title': 'Моргание', 'name': 'blinking', 'source': ('media.rpy', 138),
        'kind': 'lids', 'path': 'images/anim/blink_up.png',
        'second_path': 'images/anim/blink_down.png', 'background': '@bg:ext_square_night',
        'motion': 'blink',
        'duration': 1.5, 'hold': 0.5,
        'description': 'Глаза закрываются, пауза, затем открываются.',
    },
    _sequence(
        'Индикатор реплики (ctc)', 'ctc_animation', ('media.rpy', 77),
        [_frame(f'images/misc/ctc{i:02d}.png', 0.15) for i in range(1, 9)],
        description='click-to-continue анимация для обозначения окончания реплики.',
        fit='indicator',
    ),
    _sequence(
        'Ушки Юли', 'op_uv', ('media.rpy', 81),
        [_frame(f'images/misc/op/uv{i}.png', 0.5) for i in (1, 2, 3, 2, 1)],
        description='Юля двигает ушами, из заставки в автобусе.',
        fit='contain', loop=False,
    ),
    _sequence(
        'Клавиатура', 'anim 1_prologue', ('media.rpy', 157),
        [_frame(f'images/anim/prologue_keyboard_{i}.jpg', hold)
         for i, hold in [(1, 6), (2, 0.1), (3, 0.1), (4, 3), (3, 0.1), (2, 0.1), (1, 0)]],
        description='Долгие остановки на спокойных кадрах, быстрые смены при печати.',
        loop=False,
    ),
    _sequence(
        'Клавиатура и монитор', 'anim 2_prologue', ('media.rpy', 172),
        [_frame(f'images/anim/prologue_keyboard_monitor_{i}.jpg', hold)
         for i, hold in [(1, 6), (2, 0.1), (3, 0.1), (4, 3), (3, 0.1), (2, 0.1), (1, 0)]],
        description='Та же ритмика, но в кадре также монитор.',
        loop=False,
    ),
    _sequence(
        'Монитор', 'anim 3_prologue', ('media.rpy', 187),
        [_frame(f'images/anim/prologue_monitor_{i}.jpg', hold)
         for i, hold in [(1, 6), (2, 0.1), (3, 0.1), (4, 0)]],
        loop=False,
    ),
    _sequence(
        'Кадры пролога', 'anim 4_prologue', ('media.rpy', 196),
        [_frame('images/anim/prolog_15.jpg', 6),
         _frame('images/anim/prolog_3.jpg', 3, 3, transition='fade'),
         _frame('images/anim/prolog_4.jpg', 0, 3, transition='fade')],
        description='',
        loop=False,
    ),
    _sequence(
        'Сова', 'owl', ('media.rpy', 203),
        [_frame('images/anim/owl_1.png', 5), _frame('images/anim/owl_2.png', 0.5)],
        description='Светящиеся глаза спустя долгую паузу.',
    ),
    {
        'title': 'Вспышка на площади', 'name': 'bg ext_square_night_flash',
        'source': ('media.rpy', 210), 'kind': 'flash',
        'path': '@bg:ext_square_night', 'duration': 1, 'peak_hold': 0.5, 'hold': 3,
        'description': 'Белая вспышка повторяется с паузой.',
    },
    _sequence(
        'Плохая концовка Лены', 'un_ending_bad', ('media.rpy', 217),
        [_frame('@cg:epilogue_un_bad', 2, 2),
         _frame('@cg:epilogue_un_bad_red', 2, 2)],
        description='Исходная иллюстрация сменяется красным оттенком.',
    ),
    {
        'title': 'Затемнение сцены', 'name': 'black_long', 'source': ('media.rpy', 239),
        'kind': 'blackout', 'path': '@bg:ext_camp_entrance_day',
        'description': 'Сепия переходит в чёрный экран. Длинный переход в превью ускорен.',
        'filter': 'sepia(1)', 'duration': 5,
    },
    _sequence(
        'Заставка с монитором', 'backdrop_new', ('script.rpy', 119),
        [_frame(f'images/anim/backdrop/{i}.png', 0.1) for i in (1, 2, 3, 2)],
        description='Используется как заставка для отображения текущего дня (и рута) между днями.',
        fit='contain',
    ) | {'background': 'images/anim/backdrop/back.jpg'},
    {
        'title': 'Дрожание сцены', 'name': 'zhenya_anim0–6',
        'source': ('scenario/zhenya.rpy', 79), 'kind': 'shake',
        'overlay': 'zhenya/images/blink.png',
        'description': '',
        'variants': [
            {'label': label, 'path': f'@bg:{name}', 'source_name': f'zhenya_anim{index}'}
            for index, (label, name) in enumerate([
                ('Медпункт', 'ext_aidpost_night'), ('Площадь', 'ext_square_night'),
                ('Клубы', 'ext_clubs_night'), ('Вход в лагерь', 'ext_camp_entrance_night'),
                ('Тропа', 'ext_path_night'), ('Лесная тропа', 'ext_path2_night'),
                ('Поляна', 'ext_polyana_night'),
            ])
        ],
    },
]


def _image_file(name, resources):
    if name.startswith('@bg:'):
        category, key = 'bg', name[4:]
    elif name.startswith('@cg:'):
        category, key = 'cg', name[4:]
    else:
        return name

    return next((item.get('file') for item in resources.get('original', {}).get(category, [])
                 if item['name'] == key and item.get('file')), None)


def _public_path(path):
    return '/resource/raw/' + quote(path, safe='/')


def _source_url(root, filename, name, fallback, source_lines):
    source = root / filename
    line = fallback
    if filename not in source_lines:
        source_lines[filename] = source.read_text('utf-8', errors='replace').splitlines() if source.is_file() else []
    for number, text in enumerate(source_lines[filename], 1):
        if re.match(r'\s*image\s+' + re.escape(name) + r'\s*[:=]', text):
            line = number
            break
    return f'/resources/browser/{quote(filename, safe="/")}#L{line}'


def available_previews(root: Path):
    ready = []
    resources = CONFIG.resources
    source_lines = {}

    for definition in ANIMATIONS:
        item = {**definition}
        paths = [item.get('path'), item.get('second_path'), item.get('overlay'), item.get('background')]
        paths += [frame['path'] for frame in item.get('frames', [])]
        paths += [variant.get('path') for variant in item.get('variants', [])]
        resolved = {}
        for path in filter(None, paths):
            filename = _image_file(path, resources)
            if filename is None and path.startswith('@'):
                continue
            filename = filename or path
            if (root / filename).is_file():
                resolved[path] = _public_path(filename)
                if path.startswith(('@bg:', '@cg:')):
                    category, key = path[1:].split(':', 1)
                    resource = next((entry for entry in resources.get('original', {}).get(category, [])
                                     if entry['name'] == key), {})
                    if resource.get('tint') and resource.get('raw'):
                        resolved[path] = resource['raw']

        required = [item.get('path'), item.get('second_path'), item.get('overlay'), item.get('background')]
        required += [frame['path'] for frame in item.get('frames', [])]
        if any(path and path not in resolved for path in required):
            continue

        if item.get('variants') and item['kind'] == 'shake':
            item['variants'] = [
                {**variant, 'src': resolved[variant['path']]}
                for variant in item['variants'] if variant['path'] in resolved
            ]
            if not item['variants']:
                continue
            item['path'] = item['variants'][0]['path']

        if item.get('path'):
            item['src'] = resolved.get(item['path'])
        if item.get('second_path'):
            item['second_src'] = resolved[item['second_path']]
        if item.get('overlay'):
            item['overlay_src'] = resolved[item['overlay']]
        if item.get('background'):
            item['background_src'] = resolved[item['background']]
        if item.get('frames'):
            item['frames'] = [
                {**frame, 'src': resolved[frame['path']]}
                for frame in item['frames']
            ]
        source_path, line = item['source']
        source_name = item.get('variants', [{}])[0].get('source_name', item['name'])
        item['source_url'] = _source_url(root, source_path, source_name, line, source_lines)
        item['variants'] = [
            {**variant, 'source_url': _source_url(root, source_path, variant.get('source_name', item['name']), line, source_lines)}
            for variant in item.get('variants', [])
        ]
        # Link to declared resources in their category, or to the source file
        # when it has no declaration (e.g. the dialogue indicator frames).
        item['related'] = []
        for path in dict.fromkeys(filter(None, paths)):
            if path not in resolved:
                continue
            filename = _image_file(path, resources)
            category = path[1:3] if path.startswith(('@bg:', '@cg:')) else 'anim'
            resource = next((entry for entry in resources.get('original', {}).get(category, [])
                             if entry.get('declared') and entry.get('file') == filename
                             and (not path.startswith('@') or entry['name'] == path[4:])), None)
            href = (('#' if category == 'anim' else f'/resources/original/{category}#') + resource['rid']
                    if resource else '/resources/browser/' + quote(filename, safe='/'))
            item['related'].append({'name': resource['code'] if resource else filename, 'href': href})
        ready.append(item)

    return ready
