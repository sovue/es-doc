# Books and downloadable materials implementation plan

**Goal:** Add Russian reading links to the existing book list and make curated files easy to publish and download.

**Architecture:** Keep the nested catalog in `es-doc-assets/materials.yaml`. Extend each item with an optional reading label, access note, and list of files relative to `es-doc-assets/materials/`. Serve only existing, catalogued files through an attachment route, with canonical path containment checks. Reuse the current materials list and filesystem watcher.

**Tech stack:** FastAPI, Jinja2, PyYAML, unittest / HTTPX.

1. Add integration tests for nested catalogs, link-only and file-only entries, multiple formats, attachment responses, missing files, unpublished files, traversal, malformed entries, and file watcher changes. Run against the current implementation to confirm the missing behavior.
2. Implement shared file resolution, catalog parsing, download routing, and watcher refresh. Preserve existing optional URLs and nested sections.
3. Extend the existing list with named reading/download actions and access notes. Keep the current typography, colors, keyboard focus, and mobile layout.
4. Verify direct Russian reading URLs for the existing books and update the assets catalog. Clearly distinguish full reading, subscription access, and excerpts.
5. Document adding a link or publishing multiple local file formats in both repositories. Do not add actual books without supplied files.
6. Run the Python suite, compile application code, inspect rendered HTML and desktop/mobile layout, and check the final diff in both repositories.
