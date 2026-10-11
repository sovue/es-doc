"""Refresh the simple creator's base characters from the original media.rpy.

Run: python scripts/prepare_character_catalog.py /path/to/game/media.rpy
The constructor's small property whitelist is maintained in characters-core.js.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABELS = {'voice': 'Голос', 'me': 'Семён', 'my': 'Я', 'narrator': 'Повествование', 'th': 'Мысли', 'el': 'Электроник', 'elp': 'elp', 'ro': 'Роутер', 'un': 'Лена', 'unp': 'unp', 'dv': 'Алиса', 'dvp': 'dvp', 'dvg': 'dvg', 'sl': 'Славя', 'slp': 'slp', 'slg': 'slg', 'sa': 'Саша', 'us': 'Ульяна', 'usp': 'usp', 'usg': 'usg', 'mt': 'Ольга Дмитриевна', 'mtp': 'mtp', 'cs': 'Виола', 'csp': 'csp', 'mz': 'Женя', 'mzp': 'mzp', 'mi': 'Мику', 'mip': 'mip', 'ma': 'Маша', 'uv': 'Юля', 'uvp': 'uvp', 'sh': 'Шурик', 'shp': 'shp', 'pi': 'Пионер', 'all': 'Все', 'dreamgirl': 'dreamgirl', 'bush': 'bush', 'FIXME_voice': 'FIXME_voice', 'odn': 'odn', 'message': 'message', 'mt_voice': 'mt_voice'}


def generate(source):
    colors = {}
    for key, rgba in re.findall(r"colors\[\s*'([^']+)'\].*?'day':\s*\(([^)]+)\)", source):
        colors[key] = '#' + ''.join(f'{int(channel.strip()):02x}' for channel in rgba.split(',')[:3])
    keys = list(dict.fromkeys(re.findall(r"names_list.append\('([^']+)'\)", source)))
    if not keys or 'me' not in keys or 'narrator' not in keys:
        raise ValueError('Incomplete game character definitions')
    bases = [{'key': key, 'label': LABELS.get(key, key), 'color': colors.get(key, '#e1dd7d')} for key in keys]
    output = '/* Daytime base characters from game/media.rpy. */\n'
    output += 'window.ESDocCharacterCatalog = ' + json.dumps({'bases': bases}, ensure_ascii=False, indent=2) + ';\n'
    (ROOT / 'static/js/characters-catalog.js').write_text(output, 'utf-8')
    print(f'{len(bases)} game bases written')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Pass the path to game/media.rpy')
    generate(Path(sys.argv[1]).read_text('utf-8'))
