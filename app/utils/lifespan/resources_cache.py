import ast
import re
import yaml
from urllib.parse import quote

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('resources-cache')

# Category display titles, owned here so the search corpus and the routes
# never drift apart (routes/resources.py builds its page meta from these).
CATEGORY_TITLES = {
    'bg': 'Фоны',
    'cg': 'Арты',
    'sprites': 'Спрайты',
    'characters': 'Персонажи',
    'anim': 'Эффекты и анимации',
    'sfx': 'Звуки',
    'ambience': 'Эмбиенты',
    'music': 'Музыка',
}

# Character codes as they appear in sprites.rpy, in the order the game's
# cast is usually listed. Colors are the day name colors from media.rpy
# (store.colors[code]['day']) so the browser matches the game's own coding.
SPRITE_CHARS = {
    'dv': {'title': 'Алиса', 'color': '#FFAA00'},
    'un': {'title': 'Лена', 'color': '#B956FF'},
    'sl': {'title': 'Славя', 'color': '#FFD200'},
    'us': {'title': 'Ульяна', 'color': '#FF3200'},
    'mi': {'title': 'Мику', 'color': '#00DEFF'},
    'mt': {'title': 'Ольга Дмитриевна', 'color': '#00EA32'},
    'mz': {'title': 'Женя', 'color': '#4A86FF'},
    'cs': {'title': 'Виола', 'color': '#A5A5FF'},
    'uv': {'title': 'Юля', 'color': '#4EFF00'},
    'el': {'title': 'Электроник', 'color': '#FFFF00'},
    'sh': {'title': 'Шурик', 'color': '#FFF226'},
    'pi': {'title': 'Пионер', 'color': '#E60101'},
    # Declared in scenario/zhenya.rpy (store.colors['pi2']['day']), where the
    # Женя scenario's extra sprites come from.
    'pi2': {'title': 'Пионер', 'color': '#B7B7B7'},
}

# Wardrobe blocks, in display order; sprites sort by outfit → emotion →
# distance so each outfit reads as one coherent block ("body" goes last).
SPRITE_OUTFITS = ['pioneer', 'pioneer2', 'sport', 'dress', 'swim', 'body']
SPRITE_DISTANCES = {'': 0, 'close': 1, 'far': 2}

# ── BG name grammar: (ext|int)_<location>_<time>[_modifier…] ──────────

BG_LOCATIONS = {
    'aidpost': 'Медпункт',
    'bathhouse': 'Баня',
    'beach': 'Пляж',
    'boathouse': 'Лодочная станция',
    'bus': 'Автобус и остановка',
    'no_bus': 'Автобус и остановка',
    'bus_stop': 'Автобус и остановка',
    'liaz': 'Автобус и остановка',
    'camp_entrance': 'Вход в лагерь',
    'catacombs': 'Катакомбы',
    'clubs': 'Кружки',
    'dining_hall': 'Столовая',
    'house_of_dv': 'Домик Алисы',
    'house_of_mt': 'Домик Ольги Дмитриевны',
    'house_of_sl': 'Домик Слави',
    'house_of_un': 'Домик Лены',
    'houses': 'Домики',
    'island': 'Остров',
    'library': 'Библиотека',
    'mine': 'Шахта',
    'musclub': 'Музыкальный клуб',
    'old_building': 'Старый корпус',
    'path': 'Тропинка',
    'playground': 'Спортплощадка',
    'polyana': 'Поляна',
    'road': 'Дорога',
    'semen_room': 'Комната Семёна',
    'square': 'Площадь',
    'stage': 'Сцена',
    'washstand': 'Умывальники',
    'intro': 'Вступление',
}

BG_TIMES = {'day': 'день', 'night': 'ночь', 'sunset': 'закат'}
BG_TIME_LABELS = {'day': 'День', 'night': 'Ночь', 'sunset': 'Закат', 'other': 'Прочее'}

BG_MODIFIERS = {
    'ending': 'финал',
    'city': 'город',
    'party': 'дискотека',
    'party2': 'дискотека 2',
    'moonlight': 'лунный свет',
    'apple': 'яблоко',
    'nolight': 'без света',
    'without': None, 'light': None,  # "without_light" pairs into one label below
    'noitem': 'без предмета',
    'people': 'с людьми',
    'black': 'темнота',
    'red': 'красный фильтр',
    'away': 'издалека',
    'near': 'вблизи',
    'male': 'мужской',
    'male2': 'мужской 2',
    'big': 'большая',
    'normal': 'обычная',
    'entrance': 'вход',
    'door': 'дверь',
    'exit': 'выход',
    'room': 'комната',
    'living': 'жилая часть',
    'hole': 'пролом',
    'crossroad': 'развилка',
    'coalface': 'забой',
    'halt': 'привал',
    'window': 'окно',
    'xx': None,
    '2': 'вариант 2', '3': 'вариант 3',
}

BG_PLACES = {'ext': 'снаружи', 'int': 'внутри'}


def _parse_bg_name(name):
    """Derive (location RU, time key, auto description) from a bg name."""
    tokens = name.split('_')

    place = tokens[0] if tokens[0] in BG_PLACES else None
    rest = tokens[1:] if place else tokens

    time = next((t for t in rest if t in BG_TIMES), None)
    if time is not None:
        i = rest.index(time)
        loc_tokens, mod_tokens = rest[:i], rest[i + 1:]
    else:
        loc_tokens, mod_tokens = list(rest), []
        # Full-name locations win over modifier stripping ("semen_room" is a
        # location even though "room" alone is a mine modifier).
        while (loc_tokens and '_'.join(loc_tokens) not in BG_LOCATIONS
               and loc_tokens[-1] in BG_MODIFIERS):
            mod_tokens.insert(0, loc_tokens.pop())

    # "night2" and friends: a trailing digit on the time token's neighbour
    # never names a location; also pull recognised modifiers out of the tail
    # ("dining_hall_away", "clubs_male", "mine_room" …) with a longest-prefix
    # match against the location map.
    loc_key = '_'.join(loc_tokens)
    extra = []
    while loc_tokens and loc_key not in BG_LOCATIONS:
        if loc_key.rstrip('23') in BG_LOCATIONS:
            loc_key = loc_key.rstrip('23')
            break
        extra.insert(0, loc_tokens.pop())
        loc_key = '_'.join(loc_tokens)
    mod_tokens = extra + mod_tokens

    loc = BG_LOCATIONS.get(loc_key)

    mods = []
    if 'without' in mod_tokens and 'light' in mod_tokens:
        mods.append('без света')
    for t in mod_tokens:
        label = BG_MODIFIERS.get(t, t)
        if label:
            mods.append(label)

    desc = None
    if loc:
        details = [BG_PLACES[place]] if place else []
        details += mods
        if time:
            details.append(BG_TIMES[time])
        desc = f'{loc} — {", ".join(details)}' if details else loc

    return loc, (time or 'other'), desc


def _music_title(name):
    """'a_promise_from_distant_days_v2' → 'A Promise From Distant Days (v2)'."""
    words = name.split('_')
    version = ''
    if re.fullmatch(r'v\d+', words[-1]):
        version = f' ({words.pop()})'
    return ' '.join(w.capitalize() if w.isalpha() else w for w in words) + version


def _fmt_num(x):
    """1.0 -> '1', 0.35 -> '0.35' — matches how these numbers are written
    in the .rpy source, for the reconstructed-expression file line."""
    return f'{x:g}'


# image bg ext_beach_day = "images/bg/ext_beach_day.jpg"
RE_IMAGE = re.compile(r'^\s*image (bg|cg|anim) ([\w ]+?)\s*=\s*"([^"]+)"', re.M)
# image bg int_catacombs_entrance_red = im.MatrixColor("images/bg/int_catacombs_entrance.jpg", im.matrix.tint(1, 0.35, 0.35))
# A recolored variant of a plain file — composed on demand (tint_cache.py)
# instead of falling through to the "no preview" complex-declaration case.
RE_IMAGE_TINT = re.compile(
    r'^\s*image (bg|cg|anim) ([\w ]+?)\s*=\s*im\.MatrixColor\(\s*"([^"]+)"\s*,'
    r'\s*im\.matrix\.tint\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)\s*\)', re.M)
# Declarations with a computed right side (ConditionSwitch etc.) — the name is
# valid in game code, but there is no single source file to preview.
RE_IMAGE_COMPLEX = re.compile(r'^\s*image (bg|cg|anim) ([\w ]+?)\s*=\s*(?!")\S', re.M)
# $ music_list["afterword"] = "sound/music/afterword.ogg"
RE_MUSIC = re.compile(r'^\s*\$ music_list\["(\w+)"\]\s*=\s*"([^"]+)"', re.M)
# $ ambience_camp_center_day = "sound/ambiences/camp_center_day.ogg"
# $ sfx_bed_squeak1 = "sound/sfx/bed_squeak1.ogg"
RE_AMBIENCE = re.compile(r'^\s*\$ (ambience_\w+)\s*=\s*"([^"]+)"', re.M)
RE_SFX = re.compile(r'^\s*\$ (sfx_\w+)\s*=\s*"([^"]+)"', re.M)
# Same declaration shape sprites_cache.py composes from.
RE_SPRITE = re.compile(r'image ([\w ]+)\b[\s\S]+?im.Composite\(', re.M | re.U)
# image blood = "zhenya/images/blood.png" — file-backed declarations without
# a category prefix. Only the extra sources are scanned with this (the main
# resources.rpy keeps its curated bg/cg/anim split); the game shows these
# full-screen, so they land in the effects category under their bare name.
RE_IMAGE_PLAIN = re.compile(r'^\s*image ([\w ]+?)\s*=\s*"([^"]+\.(?:png|jpe?g|webp))"', re.M | re.I)

# Declaration files parsed into the collection besides resources.rpy — the
# Женя scenario ships inside the game with its own init block of resources.
EXTRA_RPY = ('scenario/zhenya.rpy',)

# Shown when neither descriptions.yaml nor the auto-describer has an answer.
PLACEHOLDER_DESC = 'Описание уточняется.'
UNDECLARED_DESC = 'Не объявлен в игре — используется по пути к файлу.'

# The base game's adult CGs, by declared-name prefix. Their files were cut
# from the game (only the declarations remain in its code), so these items
# live in the community collection — where the files can reappear — behind
# the NSFW switch on the Арты page.
NSFW_DESC = 'Вырезан из файлов игры — объявление в коде осталось.'
NSFW_CG_PREFIXES = (
    'd2_mt_undressed', 'd3_sl_bathhouse', 'd5_dv_us_wash', 'd6_dv_hentai',
    'd2_sl_swim', 'd6_sl_swim', 'd6_sl_hentai', 'd7_sl_morning',
    'd7_un_hentai', 'miku_h', 'uvao_h',
)

# Where each file-backed category's assets live, for the undeclared-file
# scan. The Женя scenario keeps its files in zhenya/: its leftover overlays
# scan as effects, its by-path-played sounds as sfx.
CATEGORY_DIRS = {
    'bg': (('images/bg',), {'.jpg', '.png', '.webp'}),
    'cg': (('images/cg',), {'.jpg', '.png', '.webp'}),
    'anim': (('images/anim', 'zhenya/images'), {'.jpg', '.png', '.webp'}),
    'music': (('sound/music',), {'.ogg', '.mp3', '.wav'}),
    'ambience': (('sound/ambiences',), {'.ogg', '.mp3', '.wav'}),
    'sfx': (('sound/sfx', 'zhenya/sounds'), {'.ogg', '.mp3', '.wav'}),
}


def _item(name, code, file=None, raw=None, thumb=None, desc=None, loc=None, time=None,
          declared=True, nsfw=False, tint=None, source=None):
    # Key is 'code', not 'copy': Jinja resolves dotted access against dict
    # methods first, so item.copy would return dict.copy instead of the string.
    return {
        'name': name, 'code': code, 'file': file, 'raw': raw, 'thumb': thumb,
        'desc': desc, 'loc': loc, 'time': time,
        'declared': declared, 'nsfw': nsfw, 'tint': tint,
        # What the file line shows. Plain items show `file` itself (a real
        # path); a tinted item has no file of its own — it's built from one
        # at request time — so it shows the actual code expression instead
        # (`source`, when set) rather than implying `file` IS its path.
        'source': source,
        'rid': 'r-' + name.replace(' ', '-'),
    }


def _load_descriptions():
    """descriptions.yaml in the assets root (next to `game`):
    {category: {name: text}}. The one hand-edited source for resource
    descriptions — undeclared files included, keyed by their file stem.
    Entries win over the automatic bg/music descriptions and the undeclared
    fallback; empty values fall back to them."""
    path = CONFIG.res_path.parent / 'descriptions.yaml'
    if not path.exists():
        return {}
    try:
        data = yaml.safe_load(path.read_text('utf-8')) or {}
        # str() guards names YAML would otherwise type (the track "410").
        return {k: {str(n): t for n, t in v.items()}
                for k, v in data.items() if isinstance(v, dict)}
    except Exception:
        logger.exception('descriptions.yaml is not valid YAML; ignoring it.')
        return {}


def _parse_rpy(root, raw_base, described):
    """Parse one collection root (a folder holding resources.rpy) into
    {category: items}. `raw_base` is the URL prefix of the route that serves
    this root's files (None → files are not served: no raw/thumb links)."""
    collection = {'bg': [], 'cg': [], 'anim': [], 'music': [], 'ambience': [], 'sfx': []}

    # resources.rpy plus the extra in-game declaration files (see EXTRA_RPY);
    # a root without resources.rpy still keeps its empty-state behaviour.
    if not (root / 'resources.rpy').exists():
        return collection
    sources = [root / 'resources.rpy'] + [root / extra for extra in EXTRA_RPY]
    texts = [(p.read_text('utf-8'), p.name != 'resources.rpy') for p in sources if p.exists()]

    def desc_for(kind, name, auto=None):
        return described.get(kind, {}).get(name) or auto or PLACEHOLDER_DESC

    # Tint entries carry their own (file, r, g, b); plain and complex
    # declarations carry None for both. Tint is listed before the complex
    # catch-all so `seen` lets the catch-all skip what tint already handled.
    # The last element is the copyable code — None means the usual
    # "<kind> <name>"; uncategorized extras are shown under their bare name,
    # which is exactly what a mod's `show` line takes.
    image_entries = []
    for text, is_extra in texts:
        image_entries += (
            [(k, n, f, None, None) for k, n, f in RE_IMAGE.findall(text)]
            + [(k, n, f, (float(r), float(g), float(b)), None)
               for k, n, f, r, g, b in RE_IMAGE_TINT.findall(text)]
            + [(k, n, None, None, None) for k, n in RE_IMAGE_COMPLEX.findall(text)]
        )
        if is_extra:
            image_entries += [
                ('anim', n, f, None, n) for n, f in RE_IMAGE_PLAIN.findall(text)
                if n.split()[0] not in ('bg', 'cg', 'anim')
            ]

    seen = set()
    for kind, name, file, tint, code in image_entries:
        if (kind, name) in seen:
            continue
        seen.add((kind, name))
        exists = raw_base and file and (root / file).exists()
        loc, time, auto_desc = _parse_bg_name(name) if kind == 'bg' else (None, None, None)
        source = None
        if tint and exists:
            # A recolored variant of `file` — composed on demand from it
            # rather than served as-is (tint_cache.py, res.py's /tinted/).
            raw = f'/resource/tinted/{kind}/{quote(name)}'
            # `file` is an ingredient, not this item's own path — show the
            # actual expression so the file line doesn't claim a path that
            # doesn't exist for a code-built image.
            r, g, b = tint
            source = f'im.MatrixColor("{file}", im.matrix.tint({_fmt_num(r)}, {_fmt_num(g)}, {_fmt_num(b)}))'
        else:
            raw = f'{raw_base}/{quote(file)}' if exists else None
        collection[kind].append(_item(
            name, code or f'{kind} {name}', file,
            raw=raw,
            thumb=f'/resource/thumb/{kind}/{quote(name)}' if exists else None,
            desc=desc_for(kind, name, auto_desc),
            loc=loc, time=time,
            nsfw=kind == 'cg' and name.startswith(NSFW_CG_PREFIXES),
            tint=tint if exists else None,
            source=source,
        ))

    # A plain sound (unlike an image) is useless without its file — there is
    # nothing to preview, nothing to play, just a dead row. A declaration
    # whose file never made it into the decompiled dump is dropped outright
    # rather than shown as a row no one can do anything with.
    music = {}
    for text, _ in texts:
        music.update(dict(RE_MUSIC.findall(text)))
    for name, file in music.items():
        if raw_base and not (root / file).exists():
            continue
        collection['music'].append(_item(
            name, f'music_list["{name}"]', file,
            raw=f'{raw_base}/{quote(file)}' if raw_base else None,
            desc=desc_for('music', name, _music_title(name)),
        ))

    for regex, kind in ((RE_AMBIENCE, 'ambience'), (RE_SFX, 'sfx')):
        sounds = {}
        for text, _ in texts:
            sounds.update(dict(regex.findall(text)))
        for name, file in sounds.items():
            if raw_base and not (root / file).exists():
                continue
            collection[kind].append(_item(
                name, name, file,
                raw=f'{raw_base}/{quote(file)}' if raw_base else None,
                desc=desc_for(kind, name),
            ))

    for items in collection.values():
        items.sort(key=lambda i: i['name'])

    if raw_base:
        _append_undeclared(root, collection, raw_base, described)

    return collection


def _append_undeclared(root, collection, raw_base, described):
    """Files sitting in the asset folders that no declaration references —
    still usable in mods by path, so list them behind the «необъявленные»
    toggle. Compared against every declared file across categories, since
    declarations sometimes borrow files from another category's folder."""
    declared_files = {
        item['file'].lower() for items in collection.values()
        for item in items if item['file']
    }
    # Sprite layer files count as referenced too: the sprite folders are not
    # scanned at all, so a layer that happens to sit in a scanned folder
    # (zhenya/images holds one) shouldn't surface as its own row either.
    declared_files |= {
        layer.lower() for layers in CONFIG.sprite_layers.values() for layer in layers
    }

    for kind, (folders, exts) in CATEGORY_DIRS.items():
        if kind not in collection:
            continue
        names = {i['name'] for i in collection[kind]}
        image = kind in ('bg', 'cg', 'anim')
        for folder in folders:
            directory = root / folder
            if not directory.is_dir():
                continue
            for file in sorted(directory.iterdir()):
                rel = f'{folder}/{file.name}'
                if not file.is_file() or file.suffix.lower() not in exts or rel.lower() in declared_files:
                    continue
                # A file stem may collide with a declared name (kostry.ogg vs
                # music_list["kostry"]); keep names unique per category.
                name = file.stem if file.stem not in names else f'{file.stem} (файл)'
                names.add(name)
                collection[kind].append(_item(
                    name, f'"{rel}"', rel,
                    raw=f'{raw_base}/{quote(rel)}',
                    thumb=f'/resource/thumb/{kind}/{quote(name)}' if image else None,
                    # Hand-written descriptions apply here too (keyed by the
                    # file stem in descriptions.yaml).
                    desc=described.get(kind, {}).get(name) or UNDECLARED_DESC,
                    declared=False,
                ))


def _sprite_sort_key(name):
    core = name.split()[1:]
    distance = 0
    if core and core[-1] in SPRITE_DISTANCES:
        distance = SPRITE_DISTANCES[core.pop()]
    outfit = len(SPRITE_OUTFITS)  # unknown/no outfit sorts after the wardrobe
    if core and core[-1] in SPRITE_OUTFITS:
        outfit = SPRITE_OUTFITS.index(core.pop())
    return (outfit, ' '.join(core), distance)


def _group_sprites(names, composable):
    """Group sprite names by their character code, known cast first; within a
    group: outfit block → emotion → base/close/far."""
    groups = {}
    for name in sorted(names, key=_sprite_sort_key):
        code = name.split()[0]
        groups.setdefault(code, []).append(_item(
            name, name,
            raw=f'/resource/sprite/{quote(name)}' if composable else None,
            thumb=f'/resource/thumb/sprite/{quote(name)}' if composable else None,
        ))

    ordered = [code for code in SPRITE_CHARS if code in groups]
    ordered += [code for code in sorted(groups) if code not in SPRITE_CHARS]

    # Key is 'sprites', not 'items' — see the note in _item about dict methods.
    return [{
        'code': code,
        'title': SPRITE_CHARS.get(code, {}).get('title', code),
        'color': SPRITE_CHARS.get(code, {}).get('color'),
        'sprites': groups[code],
    } for code in ordered]


def _crosslist_character_images(collection):
    """A handful of `anim` items are bare full-screen images of a known
    sprite character — "mz irl" (the Женя scenario's real-photo reveal,
    `image mz irl = "zhenya/images/mz_irl.png"`) rather than a pose built
    from layers — so they can't be composed like a real sprite, but browsing
    by character should still surface them. Cross-list them into that
    character's Спрайты group too, reusing the anim tab's own raw/thumb
    links (no separate compose route needed) instead of moving them and
    losing that serving path."""
    groups = {g['code']: g for g in collection['sprites']}
    for item in collection['anim']:
        group = groups.get(item['name'].split()[0])
        if group:
            group['sprites'].append(item)
            group['sprites'].sort(key=lambda i: _sprite_sort_key(i['name']))


# ── Characters (media.rpy): dialogue codes, display names, name colors ──

# $ colors['dv'] = {'night': (210, 139, 16, 255), …, 'day': (255, 170, 0, 255), …}
# (the odd `colors[ 'sh']` spacing in media.rpy is real, hence \s*)
RE_CHAR_COLOR = re.compile(r"^\s*\$ colors\[\s*'(\w+)'\s*\]\s*=\s*(\{.*\})", re.M)
# $ names['dv'] = translation_new["dv"]
RE_CHAR_NAME = re.compile(r"^\s*\$ names\[\s*'(\w+)'\s*\]\s*=\s*translation_new\[\s*\"(\w+)\"\s*\]", re.M)
# $ store.names_list.append('dv') — the game builds one DynamicCharacter per
# entry, so this list IS the speaking cast; its order is the doc's order.
RE_CHAR_APPEND = re.compile(r"^\s*\$ store\.names_list\.append\(\s*'(\w+)'\s*\)", re.M)
# "dv" : "Алиса" rows of translation_ru in tl/None/translation.rpy
RE_TL_PAIR = re.compile(r'"([^"]+)"\s*:\s*"([^"]*)"')

# names_list entries with no names[]/colors[] declaration of their own.
CHAR_AUTO_DESCS = {
    'narrator': 'Рассказчик — текст от автора, выводится без имени.',
    'th': 'Мысли Семёна — выводятся в обрамлении «~ … ~».',
}


def _parse_characters(root, described):
    """The speaking cast from media.rpy: every store.names_list entry the game
    turns into a (Dynamic)Character, with its Russian display name and its
    name colors by time of day. These are the codes a mod's dialogue lines
    use (`dv "Привет!"`), so they belong in the reference next to sprites.
    The extra sources declare theirs the same way (the Женя scenario adds
    pi2-pi4 and uv2), so they parse from the same combined text."""
    if not (root / 'media.rpy').exists():
        return []

    sources = [root / 'media.rpy'] + [root / extra for extra in EXTRA_RPY]
    text = '\n'.join(p.read_text('utf-8') for p in sources if p.exists())

    colors = {}
    for code, literal in RE_CHAR_COLOR.findall(text):
        try:
            colors[code] = ast.literal_eval(literal)
        except (ValueError, SyntaxError):
            logger.warning(f'Unparsable colors[] literal for character "{code}"; skipping its colors.')

    # Display names resolve through the Russian translation table, the same
    # one the game itself uses for translation_new.
    tl_path = root / 'tl' / 'None' / 'translation.rpy'
    tl = dict(RE_TL_PAIR.findall(tl_path.read_text('utf-8'))) if tl_path.exists() else {}
    names = {code: tl.get(key, key) for code, key in RE_CHAR_NAME.findall(text)}

    items = []
    for code in RE_CHAR_APPEND.findall(text):
        auto = names.get(code) or CHAR_AUTO_DESCS.get(code)
        item = _item(
            code, code,
            desc=described.get('characters', {}).get(code) or auto or PLACEHOLDER_DESC,
        )
        rgba = colors.get(code) or {}
        for field, key in (('color', 'day'), ('color_night', 'night')):
            item[field] = '#%02X%02X%02X' % rgba[key][:3] if key in rgba else None
        items.append(item)
    return items


def _build_search_items(collection):
    """Flat corpus rows for the site-wide search, one per original resource.
    `kind: res` lets the search dropdown split them from doc results."""
    items = []
    for category in CATEGORY_TITLES:
        if category not in collection:
            continue
        if category == 'sprites':
            entries = [(g, i) for g in collection[category] for i in g['sprites']]
        else:
            entries = [(None, i) for i in collection[category]]
        for group, item in entries:
            if not item['declared']:
                continue
            row = {
                'label': item['code'],
                'context': CATEGORY_TITLES[category] if not group else f'{CATEGORY_TITLES[category]} / {group["title"]}',
                'url': f'/resources/original/{category}#{quote(item["rid"])}',
                'kind': 'res',
            }
            # Real descriptions (auto bg/music or hand-written) are searchable
            # too; the "уточняется" placeholder would only add noise.
            if item['desc'] and item['desc'] not in (PLACEHOLDER_DESC, UNDECLARED_DESC):
                row['desc'] = item['desc']
            items.append(row)
    return items


def parse_resources():
    described = _load_descriptions()

    original = _parse_rpy(CONFIG.res_path, '/resource/raw', described)
    # sprites.rpy was already parsed by parse_sprites(); these names are
    # composable on demand via /resource/sprite/.
    original['sprites'] = _group_sprites(CONFIG.sprite_layers, composable=True)
    _crosslist_character_images(original)
    # The speaking cast lives in the original collection only — a community
    # collection has no media.rpy, so it simply doesn't get the tab.
    original['characters'] = _parse_characters(CONFIG.res_path, described)

    # An optional community collection: a `community` folder next to `game`
    # in the assets root, holding resources.rpy / sprites.rpy in the same
    # format. Absent today — every category then renders its empty state.
    community_root = CONFIG.res_path.parent / 'community'
    community = _parse_rpy(community_root, '/resource/community', described)
    community.pop('anim')  # the community set has no effects/animations
    sprites_rpy = community_root / 'sprites.rpy'
    community_sprite_names = RE_SPRITE.findall(sprites_rpy.read_text('utf-8')) if sprites_rpy.exists() else []
    community['sprites'] = _group_sprites(community_sprite_names, composable=False)

    # The cut adult CGs live under «Ресурсы сообщества»: valid declarations
    # with no files in the game, waiting for community-supplied ones (looked
    # up in community/<file> so a drop-in re-enables previews and the blur).
    nsfw = [i for i in original['cg'] if i['nsfw']]
    original['cg'] = [i for i in original['cg'] if not i['nsfw']]
    for item in nsfw:
        if item['desc'] == PLACEHOLDER_DESC:
            item['desc'] = NSFW_DESC
        if not item['raw'] and item['file'] and (community_root / item['file']).is_file():
            item['raw'] = f'/resource/community/{quote(item["file"])}'
            item['thumb'] = f'/resource/thumb/cg/{quote(item["name"])}'
    community['cg'] = sorted(community['cg'] + nsfw, key=lambda i: i['name'])

    CONFIG.resources = {'original': original, 'community': community}
    # Merged into CONFIG.search_items by the docs cache refresh (docs_cache.py).
    CONFIG.resource_search_items = _build_search_items(original)

    logger.info('Resources parsed: ' + ', '.join(
        f'{kind} {sum(len(g["sprites"]) for g in items) if kind == "sprites" else len(items)}'
        for kind, items in original.items()
    ))
