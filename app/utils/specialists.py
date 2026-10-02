"""Shared category and portfolio metadata for the specialist directory."""

CATEGORIES = {
    'artists': {'label': 'Художники', 'examples': 'Арты', 'types': ('art',)},
    'ai-artists': {'label': 'Нейрохудожники', 'examples': 'Арты, созданные с помощью нейросетей', 'types': ('art',)},
    'coders': {'label': 'Кодеры', 'examples': 'Моды и проекты', 'types': ('mod', 'project')},
    'composers': {'label': 'Композиторы', 'examples': 'Один-два трека для знакомства с музыкой автора', 'types': ('track',)},
    'writers': {'label': 'Сценаристы', 'examples': 'Моды и фанфики', 'types': ('mod', 'fanfic')},
}

WORK_LABELS = {'art': 'Арт', 'track': 'Трек', 'mod': 'Мод', 'project': 'Проект', 'fanfic': 'Фанфик'}

STATUS_ORDER = ('open', 'unknown', 'closed')


def profile_order(person):
    return STATUS_ORDER.index(person['status']), person['name'].casefold()
