import yaml

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


def build_tree():
    """Resolve `tree.yaml` (in the docs dir) into a nested {slug, title,
    children} structure for the docs index. A node is a filename (string) or
    {doc: filename, children: [...]}, nested to any depth — every node is a
    real doc. Docs not placed in the tree, plus everything when there's no
    tree.yaml, are returned flat in `rest` (the "Прочее" bucket), so nothing
    ever disappears. Unknown/typo'd slugs are skipped rather than crashing.
    """
    index = build_index()
    titles = {d['slug']: d['title'] for d in index}
    tree_path = ROOT / CONFIG.config['docs']['path'] / 'tree.yaml'
    used = set()

    def walk(nodes):
        out = []
        for node in nodes or []:
            if isinstance(node, str):
                slug, children = node, []
            elif isinstance(node, dict):
                slug, children = node.get('doc'), node.get('children')
            else:
                continue
            if not slug or slug not in titles:
                continue
            used.add(slug)
            out.append({'slug': slug, 'title': titles[slug], 'children': walk(children)})
        return out

    tree = []
    if tree_path.exists():
        try:
            data = yaml.safe_load(tree_path.read_text('utf-8')) or {}
            tree = walk(data.get('tree', []))
        except Exception:
            tree = []

    rest = sorted((d for d in index if d['slug'] not in used), key=lambda d: d['title'].lower())
    return {'tree': tree, 'rest': rest}
