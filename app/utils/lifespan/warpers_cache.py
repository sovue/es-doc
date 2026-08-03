import ast
import math
import yaml

from ..config import CONFIG
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('warpers')

# How many points each curve is sampled into. Matches the resolution
# warpers.js draws the built-in curves at, so a custom warper looks exactly
# like an engine one.
SAMPLES = 121

# The vocabulary a formula may use. Everything else — attributes, indexing,
# comprehensions, lambdas, names that aren't here — is rejected by _check
# below, so a warper formula can't reach anything but arithmetic.
ALLOWED = {
    'pi': math.pi, 'e': math.e,
    'sin': math.sin, 'cos': math.cos, 'tan': math.tan,
    'asin': math.asin, 'acos': math.acos, 'atan': math.atan,
    'sqrt': math.sqrt, 'exp': math.exp, 'log': math.log,
    'floor': math.floor, 'ceil': math.ceil,
    'abs': abs, 'min': min, 'max': max, 'pow': pow, 'round': round,
}

ALLOWED_NODES = (
    ast.Expression, ast.BinOp, ast.UnaryOp, ast.IfExp, ast.BoolOp, ast.Compare,
    ast.Call, ast.Name, ast.Constant, ast.Load,
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod, ast.Pow,
    ast.USub, ast.UAdd, ast.And, ast.Or, ast.Not,
    ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.Eq, ast.NotEq,
)


def _check(tree):
    """Whitelist the expression down to arithmetic over `t`. Raises ValueError
    on anything else — the entry is then skipped with a log line, never
    evaluated."""
    for node in ast.walk(tree):
        if not isinstance(node, ALLOWED_NODES):
            raise ValueError(f'запрещённая конструкция: {type(node).__name__}')
        if isinstance(node, ast.Name) and node.id != 't' and node.id not in ALLOWED:
            raise ValueError(f'неизвестное имя: {node.id}')
        if isinstance(node, ast.Call) and not (isinstance(node.func, ast.Name) and node.func.id in ALLOWED):
            raise ValueError('вызов разрешён только для функций из списка')
        if isinstance(node, ast.Constant) and not isinstance(node.value, (int, float)):
            raise ValueError('в формуле допустимы только числа')


def sample(expr: str):
    """Turn a formula in `t` into the fixed list of points the page ships.

    Sampling here rather than in the browser keeps the client free of eval:
    the template hands warpers.js plain numbers, and the same drawing code
    serves built-in and community curves alike."""
    tree = ast.parse(expr.strip(), mode='eval')
    _check(tree)

    code = compile(tree, '<warper>', 'eval')
    scope = {'__builtins__': {}}

    points = []
    for i in range(SAMPLES):
        value = eval(code, scope, {**ALLOWED, 't': i / (SAMPLES - 1)})
        points.append(round(float(value), 5))

    return points


def _warpers_path():
    # warpers.yaml sits at the assets root, next to literature.yaml.
    return CONFIG.docs_path.parent / 'warpers.yaml'


def parse_warpers():
    """Load community-made warpers from warpers.yaml into CONFIG.

    The file doesn't exist yet — the section ships empty until someone
    contributes one, which is not an error. Expected shape:

        warpers:
          - name: ease_soft_back      # the name the mod registers it under
            desc: Мягкий замах…       # optional, one line under the preview
            author: Ник               # optional
            url: https://…            # optional, link on the author
            expr: t * t * (2.4 * t - 1.4)   # formula in `t`, 0.0 → 1.0

    A row without a name or with a formula that doesn't sample is skipped,
    not fatal: one broken entry must never take the section down."""

    path = _warpers_path()

    if not path.exists():
        CONFIG.warpers = []
        logger.info('warpers.yaml not found; the community warper section will be empty.')
        return

    data = yaml.load(path.read_text('utf-8'), yaml.SafeLoader) or {}
    raw = data.get('warpers') or []

    warpers = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue

        name = (entry.get('name') or '').strip()
        expr = (entry.get('expr') or '').strip()

        if not name or not expr:
            logger.warning(f'Skipping a warper without a name or a formula: {entry!r}.')
            continue

        try:
            points = sample(expr)
        except Exception as error:
            logger.warning(f'Skipping warper "{name}": {error}.')
            continue

        warpers.append({
            'name': name,
            'desc': (entry.get('desc') or '').strip() or None,
            'author': (entry.get('author') or '').strip() or None,
            'url': (entry.get('url') or '').strip() or None,
            'expr': expr,
            'points': points,
        })

    CONFIG.warpers = warpers
    logger.info(f'Parsed {len(warpers)} community warper(s) from warpers.yaml.')
