# Independent specialist profiles

**Goal:** Separate portfolios by discipline, serve relative files at `/specialists/res/*`, default to open commissions then name, and make preview/description independent optional fields.

**Architecture:** Keep FastAPI/Jinja and the three existing views. Store category lists under `specialists` in the assets YAML; normalize each category entry into a separate profile. Accept the old list format during migration, splitting its work types by category. Explicit previews never come from works and never create works. Direct resource URLs use the same confined assets root as the YAML.

**Tech stack:** Python, FastAPI, Jinja, YAML, CSS, JavaScript, unittest and Node tests.

1. Add failing Python regressions for category independence, relative URLs/downloads, missing media, independent previews/descriptions, status/name ordering and resource confinement. Add JavaScript ordering/state/error regressions.
2. Normalize category lists, optional fields and relative source URLs; retain validated contact handling. Add the confined raw resource route and use one specialist assets root.
3. Render optional preview and description, put status in the body, label categories in the all view, remove monograms/reserved heights/portfolio auto spacing, and default browser sorting to open.
4. Migrate assets preserving every contact and work, split multi-category entries, add explicit existing artist previews, document schema in YAML, README and DESIGN.
5. Run Python/Node checks and Ruff, inspect desktop/mobile and interactions, run the design detector and request code review. Fix material issues and leave reviewable changes in both repositories.

## Subsequent user clarification

Restore the large initial placeholder when preview is absent or broken, retaining equal preview frames and gallery-card heights within a row. This supersedes the original no-preview-space requirement; descriptions remain optional without a reserved block. Correct the misspelled `puhhhtel` assets directory to `puhhhel` so both image endpoints and the existing direct work URL succeed.
