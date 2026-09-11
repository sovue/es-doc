from fastapi import HTTPException, Request

from . import main_router
from ..utils.config import CONFIG
from ..utils.file import templates, read_text
from ..utils.lifespan.news_cache import news_posts_path
from ..utils.md import render

router = main_router

@router.get('/news')
async def news_page(request: Request):
    # The project's own news, newest first (news_cache.parse_news_posts).
    return templates.TemplateResponse(request, 'news.html', {'posts': CONFIG.news})

# Registered before /news/{post}, which would otherwise take «sources» for a
# post slug; news_cache skips a post file of that name for the same reason.
@router.get('/news/sources')
async def news_sources_page(request: Request):
    return templates.TemplateResponse(request, 'news_sources.html', {'resources': CONFIG.news_sources})

@router.get('/news/{post}')
async def news_post(post, request: Request):

    # Served only if indexed. Looking the slug up in the index, rather than
    # joining it onto a path, means nothing the listing doesn't show can be
    # reached through a crafted segment.
    posts = CONFIG.news
    idx = next((i for i, p in enumerate(posts) if p['slug'] == post), None)

    if idx is None:
        raise HTTPException(404, f'Новости «{post}» не существует.')

    entry = posts[idx]

    # read_text raises the styled 404 if the file went away since indexing.
    title, _nav, body = render(read_text(news_posts_path() / f'{entry["slug"]}.md'))

    return templates.TemplateResponse(request, 'news_post.html', {
        'post': entry,
        'title': title or entry['title'],
        # A post with no h1 gets one from the template, so the page never
        # goes without a heading.
        'has_h1': bool(title),
        'body': body,
        # Newest first, so the older neighbour is the next index along.
        'older': posts[idx + 1] if idx + 1 < len(posts) else None,
        'newer': posts[idx - 1] if idx > 0 else None,
    })
