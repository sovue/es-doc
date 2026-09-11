"""The site's own stylesheets and scripts, as they go over the wire.

Every page links CSS/JS through `asset()`, which stamps the URL with a digest
of the bytes served (`/static/css/doc.css?v=3f2a…`). That URL can never mean
anything else, so routes/static.py lets browsers keep it for a year; the next
deploy changes the digest, which changes the URL, so nothing has to wait out a
max-age to go live.

Stylesheets also lose their comments on the way out. They are written for the
people editing them — whole paragraphs on why a value is what it is — and made
up 18–69% of each file, all of it downloaded and parsed before first paint,
since the stylesheets block rendering. The files on disk keep every word.
"""

import hashlib
import re

from .file import ROOT

# CSS comments can't nest, and no stylesheet here has `/*` inside a string or
# a url(), so a non-greedy match is exact. Replaced by a space rather than
# nothing, because a comment also separates tokens: `1px/**/solid` is two.
_CSS_COMMENT = re.compile(r'/\*.*?\*/', re.DOTALL)

# rel path -> (mtime_ns, size, body, digest). Keyed on the stat, so an edited
# file is picked up on the next request, in dev and in production alike.
_cache: dict[str, tuple[int, int, str, str]] = {}


def _strip_css(text):
    text = _CSS_COMMENT.sub(' ', text)
    # Indentation and blank lines go too; line breaks stay, so a stylesheet
    # read in devtools is still one declaration per line.
    return '\n'.join(s for line in text.splitlines() if (s := line.strip())) + '\n'


def load(rel):
    """Body and digest of a file under the project root, e.g. 'static/css/doc.css'.
    Raises FileNotFoundError when there is no such file."""
    path = ROOT / rel
    if not path.is_file():
        raise FileNotFoundError(rel)

    stat = path.stat()
    hit = _cache.get(rel)
    if hit and hit[:2] == (stat.st_mtime_ns, stat.st_size):
        return hit[2], hit[3]

    body = path.read_text('utf-8')
    if rel.endswith('.css'):
        body = _strip_css(body)
    digest = hashlib.sha1(body.encode('utf-8')).hexdigest()[:12]
    _cache[rel] = (stat.st_mtime_ns, stat.st_size, body, digest)
    return body, digest


def asset_url(url):
    """'/static/css/doc.css' -> '/static/css/doc.css?v=<digest>'. A missing
    file keeps its bare URL: the page still renders, and the browser's 404 for
    the stylesheet points at the typo instead of a 500 hiding it."""
    try:
        _, digest = load(url.lstrip('/'))
    except FileNotFoundError:
        return url
    return f'{url}?v={digest}'
