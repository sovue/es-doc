import re, time
from PIL import Image

from ..config import CONFIG
from ..file import ROOT
from ..logging import root_logger

logger = root_logger.getChild('lifespan').getChild('sprites-cache')

def cache_sprites():
    temp_path = ROOT / 'temp' / 'sprites'

    temp_path.mkdir(exist_ok=True)

    sprites = {}

    for sprite in re.findall(r'image ([\w ]+)\b[\s\S]+?im.Composite\(\n?\(\d+,\d+\),\s?(.+)\),?\n', (CONFIG.res_path / 'sprites.rpy').read_text(), re.M | re.U):
        sprites[sprite[0]] = re.findall(r'\"([\w\\/.]+)\"', sprite[1], re.M | re.U)

    logger.info(f'{len(sprites)} sprite combinations found, composing started...')

    starttime = time.time()

    for name, layers in sprites.items():
        img = Image.open(str(CONFIG.res_path / layers[0]))
        for layer in layers[1:]:
            img.alpha_composite(Image.open(str(CONFIG.res_path / layer)))
        img.save(temp_path / f'{name}.png')

    logger.info(f'Sprite composing finished in {time.time() - starttime:.4f}s')