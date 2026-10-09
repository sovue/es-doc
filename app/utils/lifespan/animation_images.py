"""Small posters and the game's black_long color pipeline, cached on demand."""

import hashlib
import os

from PIL import Image

from ..config import CONFIG


def image_file(source, *, poster=False, sepia=False):
    key = hashlib.sha256(f'v1:{source.resolve()}:{poster}:{sepia}'.encode()).hexdigest()
    return CONFIG.cache_path / 'animation-images' / f'{key}.webp'


def original_sepia(image):
    # media.rpy: im.Map(m,m,m) -> im.matrix.hue(180) -> im.Sepia.
    # The legacy im.matrix composition applies grayscale before the tint.
    # Reference: https://github.com/renpy/renpy/blob/master/renpy/display/im.py
    palette = [0] * 85 + [128] * 86 + [255] * 85
    mapped = image.convert('RGB').point(palette * 3)
    rotated = mapped.convert('RGB', (-0.574, 1.43, 0.144, 0,
                                     0.426, 0.43, 0.144, 0,
                                     0.426, 1.43, -0.856, 0))
    desat = (0.2126, 0.7152, 0.0722)
    matrix = tuple(value for tint in (1, 0.94, 0.76)
                   for value in (*(weight * tint for weight in desat), 0))
    return rotated.convert('RGB', matrix)


def make_image(source, *, poster=False, sepia=False):
    target = image_file(source, poster=poster, sepia=sepia)
    if target.is_file() and target.stat().st_mtime >= source.stat().st_mtime:
        return target
    with Image.open(source) as base:
        image = original_sepia(base) if sepia else base.convert('RGBA')
        if poster:
            image.thumbnail((640, 640), Image.Resampling.LANCZOS)
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix('.webp.tmp')
        image.save(temporary, 'WEBP', quality=80, lossless=not poster)
        os.replace(temporary, target)
    return target
