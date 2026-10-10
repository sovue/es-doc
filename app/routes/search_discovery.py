"""Crawler entry points for the public pages of the site."""

from urllib.parse import quote, urlsplit, urlunsplit
from xml.etree import ElementTree

from fastapi import HTTPException, Response
from fastapi.responses import PlainTextResponse

from ..utils.config import CONFIG
from . import main_router
from .resources import CATEGORIES

SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
ElementTree.register_namespace('', SITEMAP_NS)

STATIC_PAGES = (
    '/', '/docs/', '/authors', '/specialists', '/materials', '/news-resources',
    '/support', '/resources/', '/resources/community', '/tools', '/tools/unpack', '/tools/colors', '/tools/warpers', '/tools/characters',
)


def _site_origin():
    value = CONFIG.site_url
    if not isinstance(value, str) or not value.strip():
        return None
    origin = value.strip().rstrip('/')
    if any(char.isspace() for char in origin):
        return None
    try:
        parsed = urlsplit(origin)
        if (parsed.scheme not in ('http', 'https') or not parsed.hostname
                or parsed.username is not None or parsed.password is not None
                or parsed.path or parsed.query or parsed.fragment):
            return None
        parsed.port  # Validate the optional port before publishing the URL.
        return urlunsplit((parsed.scheme, parsed.netloc, '', '', ''))
    except ValueError:
        return None


@main_router.get('/robots.txt', response_class=PlainTextResponse)
async def robots_txt():
    origin = _site_origin()
    return 'User-agent: *\nAllow: /\n' + (f'\nSitemap: {origin}/sitemap.xml\n' if origin else '')


@main_router.get('/sitemap.xml')
async def sitemap_xml():
    origin = _site_origin()
    if not origin:
        raise HTTPException(404, 'Адрес сайта не настроен.')
    paths = list(STATIC_PAGES)
    paths.extend(f'/docs/{quote(doc["slug"], safe="")}' for doc in CONFIG.search_index)
    paths.extend(
        f'/resources/{collection}/{category}'
        for collection, data in CONFIG.resources.items()
        if collection in ('original', 'community')
        for category in CATEGORIES
        if category in data
    )

    root = ElementTree.Element(f'{{{SITEMAP_NS}}}urlset')
    for path in dict.fromkeys(paths):
        entry = ElementTree.SubElement(root, f'{{{SITEMAP_NS}}}url')
        ElementTree.SubElement(entry, f'{{{SITEMAP_NS}}}loc').text = origin + path

    return Response(
        content=ElementTree.tostring(root, encoding='utf-8', xml_declaration=True),
        media_type='application/xml',
    )
