from pathlib import PurePosixPath

from .config import CONFIG


def material_file(relative):
    """Resolve a curated attachment inside the materials directory only."""
    if not isinstance(relative, str) or not relative or any(c in relative for c in ('\\', ':', '\x00')):
        return None
    path = PurePosixPath(relative)
    if path.is_absolute() or '..' in path.parts or path.as_posix() != relative:
        return None
    root = (CONFIG.docs_path.parent / 'materials').resolve()
    try:
        candidate = (root / relative).resolve()
        if candidate.is_relative_to(root) and candidate.is_file():
            return candidate
    except (OSError, ValueError):
        pass
    return None


def published_material_files(sections):
    """Walk the nested catalog, exposing only its explicitly listed files."""
    for section in sections:
        for item in section['items']:
            yield from item.get('files', [])
        yield from published_material_files(section['sections'])
