# Specialists implementation plan

**Goal:** Replace the artist directory with a specialist directory, preserving existing artists and preparing five categories without invented participants.

**Architecture:** FastAPI and Jinja render one directory in gallery, board and table views. Store every participant in specialists.yaml, with local media under specialists/. Normalize categories and typed work examples in the cache, use the existing image cache, lightbox and shared audio player.

**Tech stack:** Python, FastAPI, Jinja, YAML, progressive JavaScript, existing ES Doc CSS tokens.

1. Add regression tests for specialist data, categories, typed works, media confinement, redirects and page rendering. Verify missing functionality fails.
2. Add normalized specialist data and refresh watchers. Use one data source and specialist image URLs for all disciplines.
3. Replace the directory page with /specialists, five category links, accessible filters and work examples in every view. Redirect /artists with its query string; update navigation and sitemap.
4. Move existing artists into specialists.yaml with explicit categories and work examples; preserve their contacts and statuses. Move local images into specialists/ and remove the old artist data source.
5. Run Python and JavaScript tests, inspect desktop/mobile/light/dark views and interactions, run the design detector, then finish review.

## Direction contract

THESIS: Find a collaborator by discipline, availability and actual work.

OWN-WORLD: Inherit ES Doc's white/leaf day and blue lake night, PT Serif headings, Inter body, flat bordered surfaces.

STORY: Choose one of five disciplines, inspect work, check commission status, follow a contact.

FIRST VIEWPORT: Existing page hero, wrapping category navigation with counts, familiar view/search/status controls, artwork-led cards. Empty categories explain what examples belong there and offer the existing contact link.

FORM: Extend the existing directory directly; no concept seed for this scoped extension. Keep gallery, board and table.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
