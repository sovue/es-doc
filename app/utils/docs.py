import re
import yaml

from .config import CONFIG
from .file import resolve
from .md import outline


def _docs_dir():
    return resolve(CONFIG.docs_path)


def build_index():
    """Scan the docs directory into a list of {slug, title, headings}, ordered
    by filename. Title falls back to the filename when a doc has no H1, matching
    how the doc page itself titles untitled docs. Built once per cache refresh
    (see app/utils/lifespan.py), not per request.
    """
    docs_dir = _docs_dir()
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


def build_items(index):
    """Flatten the index into the flat corpus the ranking scores over: one row
    per doc title, plus one per h2/h3 heading (carrying its doc's title as
    context and the heading's own anchor). This is what the search endpoint
    matches against."""
    items = []
    for d in index:
        items.append({'label': d['title'], 'doc': d['slug'], 'anchor': '', 'context': ''})
        for h in d['headings']:
            items.append({
                'label': h['text'],
                'doc': d['slug'],
                'anchor': h['slug'],
                'context': d['title'],
            })
    return items


def build_tree(index=None):
    """Resolve `tree.yaml` (in the docs dir) into a nested [{slug, title,
    children}] structure for the docs index. A node is a filename (string) or
    {doc: filename, children: [...]}, nested to any depth — every node is a real
    doc. Only docs named in the tree are returned; unplaced files and
    unknown/typo'd slugs are simply omitted, so /docs/ lists exactly what
    tree.yaml declares. Pass a prebuilt `index` to reuse a cache refresh's scan.
    """
    if index is None:
        index = build_index()
    titles = {d['slug']: d['title'] for d in index}
    tree_path = _docs_dir() / 'tree.yaml'

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
            out.append({'slug': slug, 'title': titles[slug], 'children': walk(children)})
        return out

    if not tree_path.exists():
        return []
    try:
        data = yaml.safe_load(tree_path.read_text('utf-8')) or {}
        return walk(data.get('tree', []))
    except Exception:
        return []


def _score(label, q):
    """Rank a candidate label against the lowercased query `q`: 0 = prefix,
    1 = word-start, 2 = mid-word substring, -1 = no match — so prefix and
    word-start hits sort above mid-word ones. This is the ranking that used to
    run in the browser."""
    low = label.lower()
    i = low.find(q)
    if i == -1:
        return -1
    if i == 0:
        return 0
    if re.match(r'[\s(\[«]', low[i - 1]):
        return 1
    return 2


def search(query, limit=8):
    """Rank the cached corpus against `query`, returning the top matches as
    [{label, doc, anchor, context}]. Ties break on original corpus order so
    doc titles precede their headings. Runs over CONFIG.search_items, which the
    lifespan cache refresh keeps in memory — no disk access per query."""
    q = (query or '').strip().lower()
    if not q:
        return []

    scored = []
    for pos, item in enumerate(CONFIG.search_items):
        s = _score(item['label'], q)
        if s != -1:
            scored.append((s, pos, item))

    scored.sort(key=lambda t: (t[0], t[1]))
    return [item for _, _, item in scored[:limit]]
