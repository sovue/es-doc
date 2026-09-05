---
target: site (homepage + docs + resources)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:D:\\GITHUB\\es-doc\\site (homepage + docs + resources)"
timestamp: 2026-09-05T09-03-13Z
slug: site-homepage-docs-resources
closed: true
---
⚠️ DEGRADED: single-context (Assessment B subagent failed: rate limit hit mid-run — HTTP 429, resets 3:30am Europe/Moscow). Assessment A ran as a fully isolated subagent; Assessment B's remaining scope (detector run, false-positive triage, browser measurements) was completed personally and cross-checked against A's claims.

# Design Health Score — 27/40

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Orphan article (outside tree.yaml) gets no sidebar highlight, no prev/next |
| 2 | Match System / Real World | 4 | Terminology solid; tab row mixes source (original/community) with a tool (browser) |
| 3 | User Control and Freedom | 3 | Theme toggle is 2-state (verified aria-label), no path back to system preference |
| 4 | Consistency and Standards | 2 | home.html hardcodes a link to an article absent from tree.yaml (verified in both files) |
| 5 | Error Prevention | 3 | _tidy() prevents orphan dividers but nothing prevents home/tree drift |
| 6 | Recognition Rather Than Recall | 2 | 13/20 code panels overflow on /docs/narration, worst 2.43x (measured) |
| 7 | Flexibility and Efficiency | 2 | build_items() indexes only titles + h2/h3 (verified in app/utils/docs.py); imagebutton unsearchable |
| 8 | Aesthetic and Minimalist Design | 3 | Palette/type strong; /authors duplicates home.html's contributor block verbatim (verified) |
| 9 | Error Recovery | 3 | Empty-search recovery link points to /docs/, which hides most of the corpus |
| 10 | Help and Documentation | 2 | No callout legend, no inline-code-is-clickable hint beyond mouse-only title attr |
| **Total** | | **27/40** | |

# Design Specificity Verdict

Grounded in the product: day/night character colour chips, the warper playground built on 146 real game backgrounds, home hero crossfading real camp locations. The one thin spot is /docs/ itself — generic hero + bare link list.

Deterministic scan (templates, run personally after Assessment B's failure): 21 findings — 19 design-system-color (all false positives: detector cannot resolve `{{ href }}`, defaults unresolved cascade to rgb(0,0,0)), 2 broken-image (both false positives: empty `<img>` shells in lightbox/warper-preview templates, filled by JS at runtime — confirmed against source).

# Overall Impression

Strong, specific visual world undermined by one structural problem: the docs hub (tree.yaml) shows 6 of 23 real articles, home.html links directly into the hidden set, and search only indexes titles/headings so the terms modders actually search for return nothing. Fix the corpus/search gap and this becomes a genuinely strong Read-mode site.

# What's Working

1. One `--focus-ring` token consumed by ~23 rules sitewide, including a rebind for code.css's own palette — a system, not a convention.
2. Resource surfaces built for copying, not reading: every atom (hex, code, curve formula) has a correct accessible name and live-region confirmation.
3. Reduced motion treated as first-class: opt-in (`no-preference`) rather than opt-out across 8 CSS files; the warper curve stays meaningful with motion off (static canvas, only the marker moves).

# Priority Issues

- **[P0] /docs/ hides 17 of 23 articles; home.html links directly into the hidden set.** Verified: tree.yaml declares 6 nodes with its own comment admitting the omission; home.html:61 links to an article not in the tree. Fix: generate home's doc links from build_tree() output; give tree.yaml a status group for the remaining 17 instead of omitting them. → `$impeccable harden`
- **[P1] Search indexes only titles and h2/h3, missing the terms users actually search.** Verified in app/utils/docs.py build_items(); imagebutton exists only as a lexer keyword, unsearchable despite appearing as a chip 4x on /docs/screens. Fix: add a code-token/identifier row class to the search corpus. → direct implementation
- **[P1] Code panels overflow horizontally on the flagship article.** Measured: 13/20 panels on /docs/narration overflow, worst 2.43x. Fix: soft-wrap as default with hanging indent, toggle for true pre. → `$impeccable adapt`
- **[P2] 55 inline code chips are tab stops whose aria-label overwrites their own text.** Measured: 55/72 focusable elements in <main> on /docs/screens; aria-label replaces (not supplements) the token text. Fix: drop tabindex/aria-label from chips, keep the existing block-level copy button. → direct implementation
- **[P2] Heading level skip (H1→H3, no H2) and mobile TOC overflow.** Measured: heading sequence H1>H3>H3>H3>H3>H3 on /docs/screens; anchor `#` glyph has no aria-hidden; mobile TOC scrollWidth 897 vs clientWidth 343. Fix: normalize heading levels, hide anchor glyph from AT, collapse mobile TOC into <details>. → `$impeccable adapt`

# Persona Red Flags

**Impatient power user (search-driven):** imagebutton search returns nothing despite appearing as a copyable chip on the very page she needs it from; falls back to Ctrl+F; the code example she wants is clipped 2.43x.

**Confused first-timer (mobile):** Reaches an article with no highlighted position in the sidebar and no next-step; nothing in the section list says "start here".

**Keyboard/screen-reader user:** Skip link and focus ring work well (verified, better than average) — then hits an H1→H3 heading skip, an unhidden anchor glyph read aloud as "#Предисловие", and 55 uninterrupted tab stops before reaching the next heading.

# Minor Observations

- /authors duplicates home.html's bottom 60% verbatim (authors_core + GitHub contributors + thanks_section) — confirmed in both template files.
- Theme toggle is 2-state with no path back to system preference (verified via aria-label).
- Self-caught false alarm: an initial contrast reading of 1.96:1 on `.nav-links a` in light theme was a measurement artifact (missing forced reflow after setting data-theme); re-measured correctly at 5.65:1. No real contrast failures found on measured elements in either theme.

# Questions to Consider

- If /docs/ were deleted tomorrow, what would actually break? Search and the article sidebar already cover more than the index does.
- tree.yaml currently encodes editorial status (rewritten vs. not) as visibility. What changes if status becomes a visible facet instead of an omission?
