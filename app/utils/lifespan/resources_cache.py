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


# image bg ext_beach_day = "images/bg/ext_beach_day.jpg"
RE_IMAGE = re.compile(r'^\s*image (bg|cg|anim) ([\w ]+?)\s*=\s*"([^"]+)"', re.M)
# Declarations with a computed right side (im.MatrixColor etc.) — the name is
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

# Shown when neither descriptions.yaml nor the auto-describer has an answer.
PLACEHOLDER_DESC = 'Описание уточняется.'
UNDECLARED_DESC = 'Не объявлен в игре — используется по пути к файлу.'

# The base game's adult CGs, by declared-name prefix. Their files are absent
# from the decompiled assets today; when they appear, previews blur until the
# NSFW switch on the Арты page is flipped.
NSFW_CG_PREFIXES = (
    'd2_mt_undressed', 'd3_sl_bathhouse', 'd5_dv_us_wash', 'd6_dv_hentai',
    'd2_sl_swim', 'd6_sl_swim', 'd6_sl_hentai', 'd7_sl_morning',
    'd7_un_hentai', 'miku_h', 'uvao_h',
)

# Where each file-backed category's assets live, for the undeclared-file scan.
CATEGORY_DIRS = {
    'bg': ('images/bg', {'.jpg', '.png', '.webp'}),
    'cg': ('images/cg', {'.jpg', '.png', '.webp'}),
    'anim': ('images/anim', {'.jpg', '.png', '.webp'}),
    'music': ('sound/music', {'.ogg', '.mp3', '.wav'}),
    'ambience': ('sound/ambiences', {'.ogg', '.mp3', '.wav'}),
    'sfx': ('sound/sfx', {'.ogg', '.mp3', '.wav'}),
}


def _item(name, code, file=None, raw=None, thumb=None, desc=None, loc=None, time=None,
          declared=True, nsfw=False):
    # Key is 'code', not 'copy': Jinja resolves dotted access against dict
    # methods first, so item.copy would return dict.copy instead of the string.
    return {
        'name': name, 'code': code, 'file': file, 'raw': raw, 'thumb': thumb,
        'desc': desc, 'loc': loc, 'time': time,
        'declared': declared, 'nsfw': nsfw,
        'rid': 'r-' + name.replace(' ', '-'),
    }


def _load_descriptions(root):
    """Optional descriptions.yaml in the assets root: {category: {name: text}}.
    Hand-written entries win over the automatic bg/music descriptions."""
    path = root / 'descriptions.yaml'
    if not path.exists():
        return {}
    try:
        data = yaml.safe_load(path.read_text('utf-8')) or {}
        return {k: v for k, v in data.items() if isinstance(v, dict)}
    except Exception:
        logger.exception('descriptions.yaml is not valid YAML; ignoring it.')
        return {}


def _parse_rpy(root, served, described):
    """Parse one collection root (a folder holding resources.rpy) into
    {category: items}. `served` marks a root whose files the /resource/raw
    route can actually serve — items then get raw/thumb links."""
    collection = {'bg': [], 'cg': [], 'anim': [], 'music': [], 'ambience': [], 'sfx': []}

    path = root / 'resources.rpy'
    if not path.exists():
        return collection

    text = path.read_text('utf-8')

    def desc_for(kind, name, auto=None):
        return described.get(kind, {}).get(name) or auto or PLACEHOLDER_DESC

    seen = set()
    for kind, name, file in RE_IMAGE.findall(text) + [(k, n, None) for k, n in RE_IMAGE_COMPLEX.findall(text)]:
        if (kind, name) in seen:
            continue
        seen.add((kind, name))
        exists = served and file and (root / file).exists()
        loc, time, auto_desc = _parse_bg_name(name) if kind == 'bg' else (None, None, None)
        collection[kind].append(_item(
            name, f'{kind} {name}', file,
            raw=f'/resource/raw/{quote(file)}' if exists else None,
            thumb=f'/resource/thumb/{kind}/{quote(name)}' if exists else None,
            desc=desc_for(kind, name, auto_desc),
            loc=loc, time=time,
            nsfw=kind == 'cg' and name.startswith(NSFW_CG_PREFIXES),
        ))

    for name, file in {n: f for n, f in RE_MUSIC.findall(text)}.items():
        collection['music'].append(_item(
            name, f'music_list["{name}"]', file,
            raw=f'/resource/raw/{quote(file)}' if served and (root / file).exists() else None,
            desc=desc_for('music', name, _music_title(name)),
        ))

    for regex, kind in ((RE_AMBIENCE, 'ambience'), (RE_SFX, 'sfx')):
        for name, file in {n: f for n, f in regex.findall(text)}.items():
            collection[kind].append(_item(
                name, name, file,
                raw=f'/resource/raw/{quote(file)}' if served and (root / file).exists() else None,
                desc=desc_for(kind, name),
            ))

    for items in collection.values():
        items.sort(key=lambda i: i['name'])

    if served:
        _append_undeclared(root, collection)

    return collection


def _append_undeclared(root, collection):
    """Files sitting in the asset folders that no declaration references —
    still usable in mods by path, so list them behind the «необъявленные»
    toggle. Compared against every declared file across categories, since
    declarations sometimes borrow files from another category's folder."""
    declared_files = {
        item['file'].lower() for items in collection.values()
        for item in items if item['file']
    }

    for kind, (folder, exts) in CATEGORY_DIRS.items():
        directory = root / folder
        if kind not in collection or not directory.is_dir():
            continue
        names = {i['name'] for i in collection[kind]}
        image = kind in ('bg', 'cg', 'anim')
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
                raw=f'/resource/raw/{quote(rel)}',
                thumb=f'/resource/thumb/{kind}/{quote(name)}' if image else None,
                desc=UNDECLARED_DESC,
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
                'context': CATEGORY_TITLES[category] if not group else f'{CATEGORY_TITLES[category]} · {group["title"]}',
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
    described = _load_descriptions(CONFIG.res_path.parent)

    original = _parse_rpy(CONFIG.res_path, served=True, described=described)
    # sprites.rpy was already parsed by parse_sprites(); these names are
    # composable on demand via /resource/sprite/.
    original['sprites'] = _group_sprites(CONFIG.sprite_layers, composable=True)

    # An optional community collection: a `community` folder next to `game`
    # in the assets root, holding resources.rpy / sprites.rpy in the same
    # format. Absent today — every category then renders its empty state.
    community_root = CONFIG.res_path.parent / 'community'
    community = _parse_rpy(community_root, served=False, described={})
    community.pop('anim')  # the community set has no effects/animations
    sprites_rpy = community_root / 'sprites.rpy'
    community_sprite_names = RE_SPRITE.findall(sprites_rpy.read_text('utf-8')) if sprites_rpy.exists() else []
    community['sprites'] = _group_sprites(community_sprite_names, composable=False)

    CONFIG.resources = {'original': original, 'community': community}
    # Merged into CONFIG.search_items by the docs cache refresh (docs_cache.py).
    CONFIG.resource_search_items = _build_search_items(original)

    logger.info('Resources parsed: ' + ', '.join(
        f'{kind} {sum(len(g["sprites"]) for g in items) if kind == "sprites" else len(items)}'
        for kind, items in original.items()
    ))
