from .file import ROOT

SVG = {
    'info':     (ROOT / 'static' / 'img' / 'info.svg').read_text('utf-8'),
    'warning':  (ROOT / 'static' / 'img' / 'warning.svg').read_text('utf-8'),
}