"""When each article last actually changed.

Two sources, in order of trustworthiness:

**Git.** The assets repo is a git repo, and a commit date is the only record
of when someone *edited* an article rather than when the server happened to
receive it. One `git log` call covers the whole directory — not one per file,
which would be 23 subprocesses per cache refresh.

**Filesystem mtime.** The fallback, for a deploy that ships the assets as a
tarball, an export, or a checkout with no git binary on the box. It is honest
most of the time: `git pull` only rewrites the files a commit touched, so on a
long-lived checkout an untouched article keeps its old mtime. It is wrong
exactly once, on a fresh clone, where every file claims today.

Failure is never fatal and never loud: an article with no date simply shows
none, which is better than showing one that is made up.
"""

import subprocess
from datetime import datetime, timezone
from pathlib import Path

from .config import CONFIG
from .logging import root_logger

logger = root_logger.getChild('modified')

# `git-timeout` is long enough for a cold repo on a slow disk, short enough
# that a hung git never holds a cache refresh open. The refresh runs in a
# worker thread, so this blocks that thread and not the event loop.

def format_ru(moment: datetime) -> str:
    """`09.09.2026 14:30` — numeric date plus time to the minute, no seconds."""
    return moment.strftime('%d.%m.%Y %H:%M')


# Genitive, the case a date takes in Russian: «11 сентября», not «11 сентябрь».
# Spelled out rather than read from the locale, which on a server is whatever
# the box was installed with.
_MONTHS_GENITIVE = (
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
)


def format_ru_date(day) -> str:
    """`11 сентября 2026` — for a publication date read as a date, where
    format_ru's timestamp would be precision nobody asked for."""
    return f'{day.day} {_MONTHS_GENITIVE[day.month - 1]} {day.year}'


def _git_dates(directory: Path) -> dict[str, datetime]:
    """Last commit date per file under `directory`, keyed by file name.

    `--name-only` prints the commit date once, then the files that commit
    touched, so walking the output top-down and keeping the *first* date seen
    for each file gives every file its newest commit in a single pass — git
    lists commits newest first.
    """
    try:
        result = subprocess.run(
            ['git', '-C', str(directory), 'log', '--pretty=format:%cI',
             '--name-only', '--no-renames', '--', '.'],
            capture_output=True, text=True, encoding='utf-8',
            timeout=CONFIG.setting('git-timeout'), check=True,
        )
    except (OSError, subprocess.SubprocessError) as error:
        # Not a repo, no git, or a repo with no commits yet. All three mean
        # the same thing here: use mtimes.
        logger.info(f'Git dates unavailable ({type(error).__name__}); falling back to file mtimes.')
        return {}

    dates: dict[str, datetime] = {}
    current: datetime | None = None

    for line in result.stdout.splitlines():
        line = line.strip()

        if not line:
            continue

        if line[0].isdigit() and 'T' in line:
            try:
                current = datetime.fromisoformat(line)
                continue
            except ValueError:
                # Not a date after all — fall through and treat it as a path.
                pass

        if current is not None:
            # Git reports paths from the repo root; the caller keys by name.
            dates.setdefault(Path(line).name, current)

    return dates


def modified_map(directory: Path, suffix: str = '.md') -> dict[str, datetime]:
    """`{file name: when it last changed}` for one directory."""
    if not directory.is_dir():
        return {}

    dates = _git_dates(directory)
    out: dict[str, datetime] = {}

    for path in directory.glob(f'*{suffix}'):
        moment = dates.get(path.name)

        if moment is None:
            try:
                moment = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc)
            except OSError:
                continue

        out[path.name] = moment

    return out
