"""Crawler entry points for the public pages of the site."""

from urllib.parse import quote
from xml.etree import ElementTree

from fastapi import Response
from fastapi.responses import PlainTextResponse

from ..utils.config import CONFIG
from . import main_router
from .resources import CATEGORIES

SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
ElementTree.register_namespace('', SITEMAP_NS)

STATIC_PAGES = (
    '/', '/docs/', '/authors', '/artists', '/literature', '/news',
    '/news/sources', '/support', '/resources/', '/resources/community',
)


@main_router.get('/robots.txt', response_class=PlainTextResponse)
async def robots_txt():
    return f'User-agent: *\nAllow: /\n\nSitemap: {CONFIG.site_url}/sitemap.xml\n'


@main_router.get('/sitemap.xml')
async def sitemap_xml():
    paths = list(STATIC_PAGES)
    paths.extend(f'/docs/{quote(doc["slug"], safe="")}' for doc in CONFIG.search_index)
    paths.extend(f'/news/{quote(post["slug"], safe="")}' for post in CONFIG.news)
    paths.extend(
        f'/resources/{collection}/{category}'
        for collection, data in CONFIG.resources.items()
        if collection in ('original', 'community')
        for category in CATEGORIES
        if category in data or category == 'warpers'
    )

    root = ElementTree.Element(f'{{{SITEMAP_NS}}}urlset')
    for path in dict.fromkeys(paths):
        entry = ElementTree.SubElement(root, f'{{{SITEMAP_NS}}}url')
        ElementTree.SubElement(entry, f'{{{SITEMAP_NS}}}loc').text = CONFIG.site_url + path

    return Response(
        content=ElementTree.tostring(root, encoding='utf-8', xml_declaration=True),
        media_type='application/xml',
    )
