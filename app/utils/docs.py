from .config import CONFIG
from .file import ROOT
from .md import outline


def build_index():
    """Scan the docs directory into a list of {slug, title, headings}, ordered
    by filename. Shared by the search API (/api/search-index) and the docs
    index page (/docs/) so both stay in sync. Title falls back to the filename
    when a doc has no H1, matching how the doc page itself titles untitled docs.
    """
    docs_dir = ROOT / CONFIG.config['docs']['path']
    index = []

    if docs_dir.is_dir():
        for path in sorted(docs_dir.glob('*.md')):
            try:
                data = outline(path.read_text('utf-8'))
            except Exception:
                continue
            index.append({
                'slug': path.stem,
                'title': data['title'] or path.stem,
                'headings': data['headings'],
            })

    return index
