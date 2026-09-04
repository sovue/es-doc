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


# A rule between groups, written the way markdown writes a thematic break so
# an author reading tree.yaml recognises it on sight.
DIVIDER = '---'


def _tidy(nodes):
    """Drop rules with nothing to separate: leading, trailing, or two in a row.

    Rules are written between groups, and a group can disappear from under one
    — every doc in it renamed or missing — which would otherwise leave a rule
    hanging against the top of the list or doubled up in the middle."""
    out = []

    for node in nodes:
        if node['kind'] == 'divider' and (not out or out[-1]['kind'] == 'divider'):
            continue
        out.append(node)

    while out and out[-1]['kind'] == 'divider':
        out.pop()

    return out


def build_tree(index=None):
    """Resolve `tree.yaml` (in the docs dir) into the nested structure both
    docs navs render. Every node carries a `kind`:

      - Имя файла                 → {kind: 'doc', slug, title, children}
      - doc: Имя файла            → the same, with children of its own
        children: [ ... ]
      - ---                       → {kind: 'divider'}
      - heading: Текст            → {kind: 'heading', title, children}

    Nested to any depth. Docs are the only nodes that are pages; a divider is
    a rule and a heading is a label, both there to group a long list into
    something a reader can scan. Titles for docs come from the file itself; a
    heading's is written in the tree, since it names no file.

    Only docs named in the tree are returned; unplaced files and unknown or
    typo'd slugs are simply omitted, so /docs/ lists exactly what tree.yaml
    declares. Pass a prebuilt `index` to reuse a cache refresh's scan.
    """
    if index is None:
        index = build_index()
    titles = {d['slug']: d['title'] for d in index}
    tree_path = _docs_dir() / 'tree.yaml'

    def walk(nodes):
        out = []
        for node in nodes or []:
            if isinstance(node, str):
                if node.strip() == DIVIDER:
                    out.append({'kind': 'divider'})
                    continue
                slug, children = node, []
            elif isinstance(node, dict):
                if 'heading' in node:
                    title = (node.get('heading') or '').strip()
                    kids = walk(node.get('children'))
                    # A heading that asked for children and got none labels
                    # nothing — it goes wherever they went.
                    if not title or ('children' in node and not kids):
                        continue
                    out.append({'kind': 'heading', 'title': title, 'children': kids})
                    continue
                slug, children = node.get('doc'), node.get('children')
            else:
                continue
            if not slug or slug not in titles:
                continue
            out.append({
                'kind': 'doc',
                'slug': slug,
                'title': titles[slug],
                'children': walk(children),
            })
        return _tidy(out)

    if not tree_path.exists():
        return []
    try:
        data = yaml.safe_load(tree_path.read_text('utf-8')) or {}
        return walk(data.get('tree', []))
    except Exception:
        return []


def flatten_tree(tree):
    """Flatten a resolved docs tree (as returned by build_tree) into reading
    order: pre-order, parent before its children — the order a reader moving
    through the tree top to bottom would encounter each doc. Drops
    `children` from each row; only {slug, title} survives, since that's all
    the "next article" link needs.

    Only docs are stops on that walk. A divider or a heading is furniture
    between them — nothing to page to — but a heading's children are articles
    like any others, so the walk goes through it rather than around it."""
    out = []
    for node in tree:
        if node['kind'] == 'doc':
            out.append({'slug': node['slug'], 'title': node['title']})
        out.extend(flatten_tree(node.get('children') or []))
    return out


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
        if s == -1 and item.get('desc'):
            # Resource descriptions are searchable too, ranked below any
            # label match (offset past the 0–2 label scores).
            d = _score(item['desc'], q)
            if d != -1:
                s = d + 3
        if s != -1:
            scored.append((s, pos, item))

    scored.sort(key=lambda t: (t[0], t[1]))
    return [item for _, _, item in scored[:limit]]
