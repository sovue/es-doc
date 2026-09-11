"""ASCII slugs for URLs built from free-form names.

A name a person wrote — an artist's signature, say — is not a URL segment. It
can carry a `/`, which Jinja's `urlencode` leaves as it is and which the server
decodes back out of `%2F` before routing, so no amount of quoting keeps it one
segment; a bare `..`; emoji; trailing dots; or Cyrillic that turns into a wall
of `%D0%…` in the address bar. `slug()` reduces all of that to `[a-z0-9-]`,
transliterating Cyrillic rather than dropping it, so «Мифия» becomes `mifiya`
and not an empty string.
"""

import re
import unicodedata

# Russian, plus the few Ukrainian and Belarusian letters the community also
# writes in. Hard and soft signs carry no sound of their own and vanish.
_CYRILLIC = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'і': 'i', 'ї': 'yi', 'є': 'ye', 'ґ': 'g', 'ў': 'u',
}

_NON_SLUG_RE = re.compile(r'[^a-z0-9]+')

# Long enough for any real name, short enough that a pasted paragraph can't
# become a paragraph-long URL.
MAX_LENGTH = 60


def slug(text: str) -> str:
    """`Тупое название -_-` → `tupoe-nazvanie`. May return '' for a name with
    nothing transliterable in it (all emoji); see unique_slugs() for that."""
    text = unicodedata.normalize('NFC', text).casefold()

    # Transliterate before decomposing: NFKD splits «й» into «и» plus a
    # combining breve and «ё» into «е» plus a diaeresis, and stripping the
    # marks below would take the distinction with them.
    text = ''.join(_CYRILLIC.get(ch, ch) for ch in text)

    # Latin with diacritics keeps its base letter (é → e); anything with no
    # ASCII form at all falls into the separator run below.
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))

    text = _NON_SLUG_RE.sub('-', text).strip('-')
    return text[:MAX_LENGTH].rstrip('-')


def unique_slugs(names, fallback: str) -> list[str]:
    """One slug per name, in the order given, none repeated.

    A name that slugs to nothing takes `fallback`; a clash takes `-2`, `-3`
    in order — checked against every slug handed out so far, so a real name
    that happens to end in `-2` can't collide with a suffixed one either.
    """
    used = set()
    out = []

    for name in names:
        base = slug(name) or fallback
        candidate, n = base, 1

        while candidate in used:
            n += 1
            candidate = f'{base}-{n}'

        used.add(candidate)
        out.append(candidate)

    return out
