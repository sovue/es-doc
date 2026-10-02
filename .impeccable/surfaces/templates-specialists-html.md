---
version: 1
slug: "templates-specialists-html"
primary_target: "templates/specialists.html"
related_targets: ["static/css/specialists.css","static/js/specialists.js"]
---

## Mode

Operate. Scoped extension of the incumbent artist directory. Preserve the existing visual system and artist records; prepare the four additional categories empty.

## Direction contract

THESIS: Find a collaborator by discipline, availability and actual work.

OWN-WORLD: Inherit ES Doc's white/leaf day and blue lake night, PT Serif headings, Inter body, flat bordered surfaces.

STORY: Choose one of five disciplines, inspect work, check commission status, follow a contact.

FIRST VIEWPORT: Existing page hero, wrapping category navigation with counts, familiar view/search/status controls, artwork-led cards. Empty categories explain what examples belong there and offer the existing contact link.

FORM: Extend the existing directory directly; no concept seed for this scoped extension. Keep gallery, board and table.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Finish result

Disposition: **ship**. The finish reviewer opened all seven valid captures in `.impeccable/review/`: `desktop.jpg`, `mobile.jpg`, `dark-desktop.jpg`, `dark-mobile.jpg`, `empty-mobile.jpg`, `user-530.jpg` and `desktop-viewport.jpg`. No material rendering or behavior defect remained in the scoped extension. Fresh verification passed 35 Python tests, nine relevant JavaScript tests and Ruff.

The built directory retains all 22 artists, contacts and commission statuses. Category links preserve view/search/status/sort, including empty categories; artwork and tracks use the existing lightbox and player. DESIGN.md and its existing sidecar now record Specialists navigation, category affordances and the implemented portfolio schema. No new shipping raster assets were created.

Not canonized: the inherited artist status-badge clamp reaching 0.625rem, reported as one detector advisory. It remains an incumbent exception rather than a new typography rule; this scoped extension does not change the global type system.

## No-art gallery follow-up

Disposition: **ship** after scoped review of `no-art-dark-desktop.jpg`, `no-art-dark-mobile.jpg`, `no-art-light-desktop.jpg` and `no-art-light-mobile.jpg` in `.impeccable/review/`. Every gallery card keeps its 3:2 preview frame and corner status; missing or failed artwork shows a decorative PT Serif first initial, and the Inter name row reserves the optional avatar space to maintain mobile alignment. Fresh verification passed 13 targeted Python tests and one JavaScript state test. No material fixes remained, no design tokens changed and no new shipping raster assets were created.

## Independent profile follow-up

The user's 2026-10-02 request supersedes the no-art framing above. Missing previews now render no frame or initial, and a failed preview removes its entire surface. Status stays in the body; optional descriptions occupy space only when supplied. Gallery items use their natural height without a reserved avatar row or a portfolio pushed down to fill the card.

Separate category lists in `specialists.yaml` now hold independent profiles. Migration preserved all contacts, statuses and work examples: 24 people become 25 category profiles, including separate coding and music portfolios for the same author. Preview is explicit and never derives from or populates works. Relative work links use the confined `/specialists/res/*` route; `teromioset/preview.jpg` loaded successfully in the shared lightbox. Default sorting puts open commissions first, then names within each status; explicit alphabetical sorting survives URL synchronization.

Disposition: **ship** after direct browser inspection at 1280px and 390px. Verified gallery/table navigation preserves categories, missing `puhhhel` preview removes its frame, and Progress plays through the shared player. All 46 Python tests, five specialist JavaScript tests and Ruff passed. Independent code review found no actionable defect. The full JavaScript suite also exposes an unrelated pre-existing `warpers_reload` test-stub failure; the changed UI has only the inherited 0.625rem status-font detector advisory. No new shipping raster assets were created.

## Restored initial fallback

The user's subsequent clarification explicitly restores the large preview-area placeholder. Gallery cards now retain their 3:2 frame and corner status, show a PT Serif initial when preview is absent or fails, and stretch to equal heights within each row. Missing descriptions remain absent, and previews remain independent from work examples. Failed previews remove their lightbox link and loading skeleton.

The original `puhhhel` files were present under the misspelled assets directory `puhhhtel`; that directory is now `puhhhel`, matching the existing YAML. Direct HTTP verification confirmed the logo, cached preview and raw work image all return 200, and every configured local profile image exists. Browser measurements at 1280px and 390px confirmed equal card and preview heights for the two coder profiles. The inherited status-font advisory is unchanged.

## Round avatar fallback

Every identity row now has a decorative initial in the same round avatar frame: 30px in gallery/board, 26px in the table. An optional logo covers the initial; a missing or failed logo leaves it visible, with failed-image loading skeletons cleared. Transparent logos retain the existing background colour so the initial cannot show through them. The fallback uses the existing serif face, size and colour tokens and is hidden from assistive technology because the adjacent name provides the identity.

Verified at 1280px and 390px: the real logo and `poi` initial both occupy 30px square frames, and the established equal gallery-card height is preserved. All 47 Python tests and six specialist JavaScript tests passed; Ruff and whitespace checks passed. The detector only reports the inherited status-font advisory.
