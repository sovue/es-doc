import re

import yaml

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('redirects')

# What may stand in a `/redirect/<key>/` URL. Deliberately narrow: the key is
# typed by hand into a chat message or printed in a mod's readme, so it should
# survive being read aloud and retyped. No case sensitivity to get wrong (keys
# are folded to lowercase on both sides), and nothing that needs escaping.
KEY_RE = re.compile(r'^[a-z0-9][a-z0-9_-]*$')

# Only these reach a browser. `javascript:` and `data:` URLs are the reason:
# a redirect target is content, edited in the assets repo by whoever maintains
# the link list, and a scheme that executes would turn "add a link" into "run
# code in every reader's browser". A site-relative path is allowed too, so a
# key can point at an article that later moves.
_SAFE_SCHEME_RE = re.compile(r'^(?:https?://|/)', re.I)


def _redirects_path():
    # redirects.yaml sits beside links.yaml at the assets root. Like links,
    # it is a curated list the site reads and never writes.
    return CONFIG.docs_path.parent / 'redirects.yaml'


def parse_redirects():
    """Load the short-link table from redirects.yaml into CONFIG.

    Keys are folded to lowercase, so `/redirect/ESTool/` and
    `/redirect/estool/` are the same link — a reader retyping a key from a
    screenshot should not have to reproduce its capitalisation.

    A bad row is skipped with a reason in the log, never fatal: one malformed
    entry must not take down every other short link on the site.
    """

    path = _redirects_path()

    if not path.exists():
        CONFIG.redirects = {}
        logger.info('redirects.yaml not found; /redirect/<key>/ will 404 for every key.')
        return

    try:
        data = yaml.load(path.read_text('utf-8'), yaml.SafeLoader) or {}
    except yaml.YAMLError:
        # Keep whatever was loaded before: a syntax error while someone edits
        # the file should not blank every working short link on the site.
        logger.exception('redirects.yaml is malformed; keeping the previous table.')
        return

    raw = data.get('redirects') or {}

    if not isinstance(raw, dict):
        CONFIG.redirects = {}
        logger.error('redirects.yaml: `redirects` must be a mapping of key -> url.')
        return

    redirects = {}

    for key, entry in raw.items():
        key = str(key).strip().lower()

        # An entry is either a bare URL string or a mapping with `url` and
        # whatever notes the maintainer wants to leave beside it. Only `url`
        # is read; the rest is documentation for the next editor.
        url = entry.get('url') if isinstance(entry, dict) else entry
        url = (str(url) if url else '').strip()

        if not KEY_RE.match(key):
            logger.warning(f'redirects.yaml: skipping key {key!r} — letters, digits, `-` and `_` only.')
            continue

        if not _SAFE_SCHEME_RE.match(url):
            logger.warning(f'redirects.yaml: skipping key {key!r} — target must be http(s):// or a site-relative /path.')
            continue

        redirects[key] = url

    CONFIG.redirects = redirects
    logger.info(f'Parsed {len(redirects)} redirect(s) from redirects.yaml.')
