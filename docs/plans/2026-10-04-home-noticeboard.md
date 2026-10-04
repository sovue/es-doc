# Homepage noticeboard implementation plan

**Goal:** Replace the homepage's seven directory rows with accessible notices configured in the assets repository.

**Architecture:** Load `home_notices.yaml` alongside the existing curated YAML catalogs into `CONFIG.home_notices`. Jinja renders ordinary links in source order; CSS supplies the framed board and paper treatments, using the site's existing theme tokens and fonts. The existing assets watcher refreshes the catalog.

**Tech stack:** FastAPI, Jinja2, PyYAML, CSS; no new dependencies.

1. Add `tests/test_home_notices.py`: YAML drives rendered links and optional text; invalid entries are skipped; invalid YAML preserves the last catalog; missing/empty catalogs hide the board; watcher reloads edits. Run the tests and confirm the feature is absent.
2. Add `app/utils/lifespan/home_notices_cache.py`, the configuration field, startup loading and watcher registration. Keep configuration order and allow root-relative and HTTP(S) URLs.
3. Add `D:/GITHUB/es-doc-assets/home_notices.yaml`, preserving all seven existing destinations and descriptions, with optional categories.
4. Pass notices through `app/routes/root.py`; replace the hardcoded lists in `templates/home.html` with a semantic section and list of links, accessible names and descriptions. Preserve the hero, track and contributor sections.
5. Replace the directory-specific CSS in `static/css/home.css` with a framed board, a larger first poster, smaller sheets and modest decorative fasteners. Inherit PT Serif, Inter and leaf/lake themes. Use three, two and one columns with visible focus, wrapping text and reduced-motion support.
6. Document editing and hot reload in README. Run focused tests, project checks, all seven destination requests and a bounded desktop/mobile visual and keyboard check. Submit the final changes to an independent finish reviewer as directed by impeccable.
