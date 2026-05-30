---
colors:
  bg: "#111"
  bg-light: "#221911"
  bg-surface: "#1B1B1B"
  bg-sidebar: "#181818"
  bg-table-head: "#1d1d1d"
  text: "#EEE"
  text-soft: "#BBB"
  accent: "#DD7F22"
  accent-hover: "#F93"
  border: "#333"
  target-bg: "#DD7F2233"
  code-inline: "#ff8080"
  surface-hover: "rgb(255 245 230 / 0.04)"
  selection-bg: "#DD7F22"
  selection-text: "#EEE"

motion:
  ease-out: "cubic-bezier(0.22, 1, 0.36, 1)"
  duration-fast: "0.15s"

typography:
  family-body: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
  family-mono: "Consolas, \"Courier New\", monospace"
  scale-hero: "clamp(1.85rem, 4.5vw, 2.8rem)"
  scale-h1: "2.4rem"
  scale-h2: "1.8rem"
  scale-base: "1rem"
  scale-sm: "0.875rem"
  scale-xs: "0.75rem"
  weight-bold: "700"
  weight-semibold: "600"
  weight-normal: "400"
  line-height-body: "1.7"
  line-height-heading: "1.15–1.2"

rounded:
  none: "0"
  xs: "2px"
  sm: "3px"
  md: "6px"
  lg: "12px"

spacing:
  1: "8px"
  2: "16px"
  3: "20px"
  4: "24px"
  5: "32px"
  6: "40px"
  7: "48px"
  8: "56px"
  9: "64px"
  10: "72px"
---

# ES Doc Design System

## Overview

**Creative North Star:** A modder's field manual — built in a tent at midnight, by hand, because the community needed it. Warm enough to trust, precise enough to ship.

ES Doc is a dark-themed code-reference tool for Russian-speaking modders of the visual novel "Everlasting Summer." Design serves legibility and navigability above all else. The accent amber is the only warmth — everything else is controlled restraint. Monospace identity signals that this is a developer resource, not marketing material.

**Register:** Product — design serves the content.

**Users:** Russian-speaking modders building on the RenPy engine, ranging from beginners to experienced contributors. Russian-language UI.

**Anti-references:** ReadTheDocs clutter; Confluence corporate gray; neon/cyberpunk gaming aesthetics; SaaS landing page templates.

**CSS architecture:** Three-layer split, loaded as three parallel `<link>` tags from `head.html`.

- `vars.css` — design tokens (custom properties), including `color-scheme: dark` so browser-native form controls and scrollbars render in dark mode.
- `main.css` — foundation only: resets, `body`, `body.bg-solid` opt-in, `::selection`, `.sr-only`, `.skip-link`. No `@import` — `vars.css` must be linked before `main.css` in the head partial.
- `components.css` — every reusable class: site-header/nav (`.site-header`, `.site-nav`, `.nav-logo`, `.nav-links`), site-footer, page shell (`.page` plus `.page > main` and `.page > .layout` flex-grow rules), page header (`.page-hero`, `.page-hero--lg`, `.page-hero-inner`, `.page-eyebrow`, `.page-title`, `.page-title--lg`, `.page-lead`), main column (`.page-main`), sections directory (`.sections-list`, `.section-row`, `.section-name`, `.section-desc`, `.section-arrow`, `.section-wip`, `.section-wip-badge`), monospace section label (`.authors-list-label`), contributors spacing (`.contributors-section`), authors list family (`.authors-list`, `.author-row`, `.author-meta`, `.author-avatar`, `.author-name`, `.author-role`, `.author-socials`), GitHub gallery (`.gh-contributors`, `.gh-contributor`, `.ghcontributor-avatar`, `.gh-contributors-status`), and `.thanks-list`.
- Page-specific files: `home.css` (`.hero-search` form, `.home-contributors` strip), `doc.css` (prose, `.layout`, `.sidebar`, `.content`, `.heading`/`.anchor`/flash keyframes). No `authors.css` and no `error.css` — both pages live entirely on the three shared stylesheets.

`head.html` links the three shared stylesheets in dependency order — `vars.css` → `main.css` → `components.css` — and then any per-page `extra_css`. They fetch in parallel because every `<link>` is at the same depth; the older `@import` chain inside `main.css` was a serial waterfall and is forbidden.

**Template architecture:** Jinja inheritance from `templates/base.html` with three partials in `templates/partials/`: `head.html`, `header.html`, `footer.html`. Child templates set `page_title`, `extra_css` (list), `with_contributors_js` (bool), `body_class` (e.g. `'bg-solid'`), and `active` (one of `'docs'`, `'authors'`) via top-level `{% set %}` before the `content` block. `header.html` reads `active` to apply `aria-current="page"`. Footer is included by each page inside its `.page` wrapper so the flex column can push it to the viewport bottom — base.html does not render the footer itself.

**Landmark structure:** Every page wraps its primary content inside one `<main id="main-content">` that is itself the flex-growing child of `.page`. On home/authors/error, `<main>` contains the `.page-hero` (so the H1 is part of the main landmark) followed by the `.page-main` content column and, on home, the `.home-contributors` strip. On doc pages the wrapper is `<div class="layout">` (sidebar + `<main class="content">`); `.page` still owns the flex-column shell so the footer floors to the viewport bottom on short doc routes too.

**JS architecture:** A single shared script, `static/js/contributors.js`, loaded `defer` from `<head>` on `/` and `/authors` via the `with_contributors_js` head-partial flag. It populates `#contributors-status` with one line at a time and toggles `#contributors[data-state]`. No bundler, no framework. New shared behaviour goes in `static/js/<name>.js` and is served via the `/static/js/{name}` route.

**Breakpoints:**
- Tablet: ≤768px (doc sidebar collapses to horizontal nav strip; layout stacks)
- Mobile: ≤640px (nav and hero padding reduction, min-width adjustments)
- Narrow: ≤400px (GitHub nav link hidden, section descriptions hidden, doc padding tightens)

---

## Colors

Dark-only theme. No `prefers-color-scheme` query is intentional — this surface is built for dim ambient light. Neutrals are warm-tinted (amber pull), never pure gray.

| Token | Value | Role |
|---|---|---|
| `--bg` | `#111` | Page background — near-black, warm undertone |
| `--bg-light` | `#221911` | Gradient terminus / blockquote fill — amber-tinged dark |
| `--bg-surface` | `#1B1B1B` | Input, code block, and card surfaces |
| `--bg-sidebar` | `#181818` | Sidebar background (docs pages) |
| `--bg-table-head` | `#1d1d1d` | Table header fill |
| `--text` | `#EEE` | Body text |
| `--text-soft` | `#BBB` | Secondary text, labels, muted states |
| `--accent` | `#DD7F22` | Amber — primary interactive color, headings in docs |
| `--accent-hover` | `#F93` | Lighter amber for hover states |
| `--border` | `#333` | All borders and dividers |
| `--target-bg` | `#DD7F2233` | Anchor-target flash background (20% accent) |
| `--code-inline` | `#ff8080` | Inline `<code>` text color |
| `--selection-bg` | `var(--accent)` | Text selection background |
| `--selection-text` | `var(--text)` | Text selection foreground |

**Color strategy:** Restrained. Amber accent at ≤10% of any surface on the homepage. Docs pages are more accent-heavy (all headings use `--accent`) — but content rules there, not chrome.

**Selection:** Use `var(--selection-bg)` and `var(--selection-text)` in `::selection` rules — never `var(--accent)` directly. Amber background, body text foreground; not pure white.

---

## Typography

Two families: the system sans-serif for all body/UI copy, and Consolas monospace for identity elements (wordmark, directory label) and all code. No web fonts loaded.

**Three-tier scale:**

| Tier | Size | Weight | Use |
|---|---|---|---|
| Hero | `clamp(1.85rem, 4.5vw, 2.8rem)` | 700 | Homepage H1 only |
| Base | `1rem` | 600 / 400 | Body, section names, doc paragraphs |
| Small | `0.875rem` | 400 | Nav links, descriptions, footer, search input |
| Label | `0.75rem` | 600 | Monospace labels (sections heading), WIP badge |

**Docs heading scale** (doc.css, distinct from homepage):

| Level | Size | Style |
|---|---|---|
| H1 | `2.4rem` / 700 | Border-bottom 2px |
| H2 | `1.8rem` / 700 | Border-bottom 1px |
| H3+ | Inherits | No border |

**Line heights:**
- Body: `1.7` — long-form reading comfort
- Headings: `1.15–1.2` — tight, editorial
- Body max-width: `55ch` (hero desc); `72ch` enforced on doc prose via `.content p, .content blockquote, .content > ul, .content > ol { max-width: 72ch }` — tables, `pre`, and images remain full-width

**Monospace identity:** `Consolas, "Courier New", monospace` on `.nav-logo` (wordmark) and `.authors-list-label` (all section directory headings). No letter-spacing on body. Monospace labels use `letter-spacing: 0.1em; text-transform: uppercase` to signal meta/structural information.

---

## Elevation

Flat architecture — no drop shadows anywhere. Depth is expressed through background tint, borders, and z-index layering only.

| Layer | z-index | Element |
|---|---|---|
| Skip link | 100 | `.skip-link` — must be above everything |
| Header | 10 | `.site-header` — sticky nav |
| Content | 0 | All other content |

**Border as separator:** `1px solid var(--border)` is the universal divider. Used for: header bottom, hero bottom, section rows, search box, pre/code blocks, table cells, sidebar right edge.

**Surface tinting:** Darker surfaces are used for inputs, code blocks, and panels — not for generic cards. Cards are not used in this design system. Token mapping: `--input-bg` and `--code-bg` for `#1B1B1B` surfaces; `--bg-sidebar` for `#181818` sidebar; `--bg-table-head` for `#1d1d1d` table headers. (`--bg-surface` in DESIGN.md frontmatter maps to the same `#1B1B1B` value — use the more specific token in code.)

---

## Components

### Page Shell (`.page`)
Flex-column wrapper used by **every** page (home, authors, error, and doc). `min-height: calc(100vh - 52px)` accounts for the sticky 52px nav above; its flexible child (`<main>` on non-doc pages, `<div class="layout">` on doc) gets `flex: 1` so the footer rendered after it floors to the viewport bottom on short pages. `.page-main` itself is just a content column — no `flex` — because the flex behavior moved up one level when `<main>` was promoted to wrap the hero too.

```css
.page { min-height: calc(100vh - 52px); display: flex; flex-direction: column; }
.page > main, .page > .layout { flex: 1; min-height: 0; }
.page > main { display: flex; flex-direction: column; }  /* hero stacks above page-main */
```

### Page Header (`.page-hero`)
Unified page banner used on home, authors, and error. Bottom border separates it from the main column. Base padding is `56px 48px 48px`; the `.page-hero--lg` modifier ups it to `72px 48px 64px` for landing-style pages (home, error). The `.page-hero-inner` cap of `640px` keeps headlines from stretching across wide monitors. Combined with `.page-eyebrow` (small amber monospace label, e.g. "Ошибка 404") and `.page-title` / `.page-title--lg` / `.page-lead`, this replaces the older `.hero` / `.authors-header` / `.authors-title` family — all of which were near-duplicates.

```css
.page-hero { padding: 56px 48px 48px; border-bottom: 1px solid var(--border); }
.page-hero--lg { padding: 72px 48px 64px; }
.page-hero-inner { max-width: 640px; }
.page-eyebrow { font-family: Consolas, "Courier New", monospace; font-size: 0.875rem;
  font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); }
.page-title { font-size: clamp(1.6rem, 3.5vw, 2.2rem); font-weight: 700; line-height: 1.15; color: var(--text); }
.page-title--lg { font-size: clamp(1.85rem, 4.5vw, 2.8rem); }
.page-lead { margin: 18px 0 0; font-size: 1rem; color: var(--text-soft); max-width: 55ch; }
.page-main { padding: 56px 48px; max-width: 760px; }
```

### Site Header / Nav
Sticky, 52px minimum height. Defined in `components.css` — shared across all pages. `align-items: stretch` cascades from `.site-nav` → `.nav-links li` → `a`, making each nav link a full-height tap target (no padding tricks needed). Logo uses monospace identity font. Active page link uses `aria-current="page"` for both AT and CSS styling; the partial in `templates/partials/header.html` toggles it from the `active` template variable (`'docs'` / `'authors'`). The active state gets an **inset 2px accent underline** via `box-shadow` — chosen over `border-bottom` so it doesn't displace the link by 2px, and chosen over color-only (which would collide with the hover state, both of which lift `color` to `--text`).

```css
.site-header { position: sticky; top: 0; z-index: 10; border-bottom: 1px solid var(--border); }
.site-nav { display: flex; align-items: stretch; justify-content: space-between; padding: 0 48px; min-height: 52px; }
.nav-links { list-style: none; display: flex; align-items: stretch; }
.nav-links li { display: flex; }
.nav-links a { display: flex; align-items: center; padding-inline: 16px; font-size: 0.875rem; }
.nav-links a:hover,
.nav-links a:hover { color: var(--text); }
.nav-links a[aria-current="page"] { color: var(--text); box-shadow: inset 0 -2px 0 var(--accent); }
```

### Search Input Group
Border wraps input + button together. `focus-within` highlights the border on keyboard focus inside the group. Button is 44px tall (`padding: 14px` × 2 + 16px icon).

```css
.hero-search { display: flex; align-items: stretch; border: 1px solid var(--border); border-radius: 3px; background: var(--input-bg); overflow: hidden; }
.hero-search:focus-within { border-color: var(--accent); }
.hero-search button { padding: 14px; border-left: 1px solid var(--border); }
```

### Section Row
Flex baseline alignment. Arrow appears on hover via opacity transition. WIP rows use `<span>` (not `<a>`) and suppress the arrow entirely.

```css
.section-row { display: flex; align-items: baseline; gap: 20px; padding: 16px 0; text-decoration: none; }
.section-arrow { opacity: 0; transition: opacity 0.15s var(--ease-out); }
a.section-row:hover .section-arrow { opacity: 1; }
```

### WIP Badge
Inline bordered label. Text-only, no background fill. Signals "not yet linked" without disabling the row visually.

```css
.section-wip-badge { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  border: 1px solid var(--border); border-radius: 2px; padding: 2px 6px; }
```

### Docs Sidebar
Fixed 260px width, sticky below the site header, scrollable. `top: 52px` and `height: calc(100vh - 52px)` account for the sticky nav above it. Background is `--bg-sidebar` (`#181818`). Nested nav lists use a 1px left border indent (structural, not decorative). The sidebar's section label uses `<p class="sidebar-title">{{ title }}</p>` — a paragraph, not a heading. The document body's markdown already opens with the same title as `<h1>`, so promoting the sidebar label to `<h2>` would (a) duplicate the page title in the document outline and (b) place an h2 before the h1. The paragraph keeps the visual treatment without polluting the heading hierarchy. At ≤768px the sidebar collapses to a full-width horizontal-scrolling nav strip above content; nested lists hidden at mobile. Each link in the mobile strip is `inline-flex` with `min-height: 44px` (WCAG 2.5.5 AAA + Apple HIG comfort) — the mobile sidebar is the primary navigation on doc pages and deserves comfortable taps.

```css
.sidebar { width: 260px; padding: 24px; background: var(--bg-sidebar); border-right: 1px solid var(--border);
  position: sticky; top: 52px; height: calc(100vh - 52px); overflow-y: auto; }
.sidebar-title { margin: 0 0 0.6em; color: var(--accent); font-size: 1.8rem;
  font-weight: 700; line-height: 1.2; border-bottom: 1px solid var(--border); padding-bottom: 0.2em; }
.sidebar ul ul { padding-left: 18px; border-left: 1px solid var(--border); }

@media (max-width: 768px) {
  .sidebar-title { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--text-soft); margin-bottom: 10px; border: none; padding: 0; }
  .sidebar a { display: inline-flex; align-items: center; min-height: 44px;
    padding: 0 16px 0 0; white-space: nowrap; }
}
```

### Blockquote
Full neutral border (`1px solid var(--border)`) with `--bg-light` fill. No accent side-stripe — that pattern is banned. The fill alone provides sufficient visual separation from body text.

```css
blockquote { margin: 1.5em 0; padding: 0.8em 1.2em;
  border: 1px solid var(--border); background: var(--bg-light); color: var(--text-soft); }
```

### Site Footer
Shared component in `components.css` (class `.site-footer`). Rendered via `templates/partials/footer.html`, included by each page inside its `.page` wrapper — not by `base.html` — so the flex column can push it to the viewport floor on every page including docs. Footer links use `display: inline-block; padding-block: 10px` to reach ~34px touch target (clears WCAG 2.5.8 minimum with margin to spare; the 20px row gap keeps the spacing exemption comfortable).

```css
.site-footer { padding: 20px 48px; border-top: 1px solid var(--border); font-size: 0.875rem; color: var(--text-soft); }
.site-footer a { display: inline-block; padding-block: 10px; color: var(--text-soft); text-decoration: none; }
.site-footer a:hover { color: var(--accent); }
```

### Anchor Target Flash
CSS `@keyframes flash` on `:target` — fades `--target-bg` in and out. Gives navigational feedback without JS. Disabled entirely under `prefers-reduced-motion`.

```css
.heading:target { animation: flash 1s ease; }
@keyframes flash { 0% { background: transparent; } 20% { background: var(--target-bg); } 100% { background: transparent; } }
```

### Anchor Links (section permalinks)
Hidden by default at `opacity: 0.3`. Reveals on parent hover and on `:focus-visible` — keyboard users must see them when tabbed to. `scroll-margin-top: 76px` accounts for the 52px sticky nav plus clearance.

```css
.anchor { opacity: 0.3; transition: opacity 0.15s var(--ease-out); }
.heading:hover .anchor,
.anchor:focus-visible { opacity: 1; }
.heading { scroll-margin-top: 76px; }
```

### Authors List (shared partial)
Core authors list injected into both `/` and `/authors` via `templates/partials/authors_core.html`. Styles live in `components.css`. Two-tier layout: 56px circular avatar on the left, name / role / socials stacked on the right inside `.author-meta`. This replaces the earlier 4-column flex (avatar | name | role | links) where two `flex: 1` siblings fought for the same space and broke at narrow widths. Avatars carry a 1px `--border` ring on `--bg-surface` to ground the photo on the dark page; at ≤400px the avatar drops to 48px while the meta block keeps the full remaining width. The `<img>` uses `alt=""` — `.author-name` next to it is the accessible label.

```css
.authors-list { list-style: none; border-top: 1px solid var(--border); }
.authors-list li { border-bottom: 1px solid var(--border); }
.author-row { display: flex; align-items: center; gap: 18px; padding: 16px 0; }
.author-avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover;
  flex-shrink: 0; border: 1px solid var(--border); background: var(--bg-surface); }
.author-meta { display: grid; grid-template-columns: minmax(0, 1fr); row-gap: 2px; min-width: 0; flex: 1; }
.author-name { font-size: 1rem; font-weight: 600; color: var(--text); line-height: 1.3; }
.author-role { font-size: 0.875rem; color: var(--text-soft); line-height: 1.4; }
```

### Author Socials (inline list)
Inline list of external profile links (VK, Telegram, GitHub) under the author role. Monospace identity, uppercase, narrow tracking — matches `.authors-list-label` so the links read as meta, not as primary content. Items separated by a CSS-generated middle dot (`·`) in `--border` color via `li + li::before` — no markup commas, no fragile text separators. Every link gets `target="_blank" rel="noopener noreferrer"` and a Russian `aria-label` (e.g. *"poi во ВКонтакте"*).

Hit targets: each `<a>` is `inline-flex` with `padding-block: 6px` and `min-height: 24px`. Combined with `line-height: 1` on the parent `ul`, this lifts the touch target to WCAG 2.5.8 (24×24) without changing the visual baseline rhythm — labels still sit on the same line as the role above them.

```css
.author-socials { list-style: none; display: flex; flex-wrap: wrap; gap: 0 14px;
  font-family: Consolas, "Courier New", monospace; font-size: 0.75rem;
  letter-spacing: 0.06em; text-transform: uppercase; line-height: 1; }
.author-socials li { position: relative; display: flex; align-items: center; }
.author-socials li + li::before { content: '·'; position: absolute; left: -9px;
  top: 50%; transform: translateY(-50%); color: var(--border); }
.author-socials a { display: inline-flex; align-items: center;
  padding-block: 6px; min-height: 24px;
  color: var(--text-soft); transition: color 0.15s var(--ease-out); }
.author-socials a:hover { color: var(--accent); }
.author-socials a:focus-visible { color: var(--text); outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 2px; }
```

### GitHub Contributors Gallery
Avatar wall fetched at runtime from `/api/contributors` (server escapes every interpolation, sets a User-Agent, appends `s=96` to GitHub avatar URLs so the wire payload matches the 44px@2x render instead of GitHub's 460px default, caches the response for 5 minutes to stay under the 60/hr unauthenticated limit, and falls back to the last cached payload on failure). On hard upstream failure the server returns `502` with an empty body, letting the client render the recovery copy with a working GitHub link instead of duplicating that message in two places. Rendered on both `/` and `/authors`. Layout is a wrap-aware flex row of 44px circular avatar-links — deliberately smaller than the 56px core author avatars so the hierarchy reads at a glance. The link wrapper `.gh-contributor` owns the hover/focus affordance; the inner `<img>` is `alt=""` because the link's `aria-label="{login} на GitHub"` is the accessible name.

Structure: a sibling status paragraph `#contributors-status` (with `role="status" aria-live="polite"`) sits above the gallery container `#contributors`. The loader (`/static/js/contributors.js`, loaded `defer` from `<head>` and shared by both pages) writes one line at a time into the status (*"Загружаем список с GitHub…"* → empty on success → recovery copy with link on failure). The gallery container carries `data-state="loading|ready|error"` and is hidden while empty or errored so status text isn't visually competing with an empty box. A `<noscript>` inside the status paragraph links to GitHub's contributors graph for the JS-disabled case — the status text is empty by default so nothing stale is shown.

Hover/focus: outline ring transitions from `--border` to `--accent`. Not a scale or shadow — flat system rule (no `box-shadow`, no layout-property animation).

```css
.gh-contributors-status { margin: 0 0 12px; font-size: 0.875rem; color: var(--text-soft); }
.gh-contributors-status:empty { display: none; }
.gh-contributors[data-state="loading"]:empty,
.gh-contributors[data-state="error"] { display: none; }
.gh-contributors[data-state="ready"] { display: flex; flex-wrap: wrap; gap: 10px; padding-bottom: 4px; }
.gh-contributor { display: inline-flex; border-radius: 50%;
  outline: 1px solid var(--border); outline-offset: -1px;
  transition: outline-color 0.15s var(--ease-out); }
.gh-contributor:hover { outline-color: var(--accent); }
.gh-contributor:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.ghcontributor-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; display: block; }
```

### Thanks List (markdown-rendered)
Special thanks section parsed from `content/main/thanks.md` and injected as `{thanks_section}`. Styles live in `components.css`. Top-level list items get bordered rows; nested sub-lists use a `—` CSS-generated marker. Links use `--text` at rest, `--accent` on hover.

```css
.thanks-list { list-style: none; border-top: 1px solid var(--border); }
.thanks-list > li { border-bottom: 1px solid var(--border); padding: 12px 0; font-size: 0.875rem; color: var(--text-soft); }
.thanks-list ul { list-style: none; margin: 6px 0 0; padding: 0; }
.thanks-list ul li { padding: 3px 0 3px 16px; position: relative; }
.thanks-list ul li::before { content: '—'; position: absolute; left: 0; color: var(--border); }
.thanks-list a { color: var(--text); }
.thanks-list a:hover { color: var(--accent); }
```

### Section Heading Label (`.authors-list-label`)
Shared monospace label used for all section headings: "Авторы", "Разделы", "Особые благодарности". Lives in `components.css`. Signals meta/structural, not content hierarchy. (Distinct from `.sidebar-title` in `doc.css`, which is a per-document title label and uses the larger amber treatment, not the monospace uppercase tracking used here.)

```css
.authors-list-label { font-family: Consolas, "Courier New", monospace; font-size: 0.75rem;
  font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-soft); }
```

### Contributors Section Spacing
`.contributors-section` is the wrapper for each thematic group on the authors page and home page contributors block. Adjacent sections get `margin-top: 48px` (36px on mobile). Defined in `components.css`.

```css
.contributors-section + .contributors-section { margin-top: 48px; }
```

### Focus States
Consistent `2px solid var(--accent)` outline across all interactive elements. `outline-offset` varies:
- Nav links: `-3px` (contained within the element bounds)
- Logo, section rows, footer links: `2–3px` (outside the element)
- Search button: `-2px` (contained)

---

## Do's and Don'ts

**Do:**
- Use `var(--accent)` for all primary interactive affordances (links, buttons, focus outlines, heading color in docs)
- Use `var(--text-soft)` for labels, secondary descriptions, timestamps, and anything that ranks below primary content
- Apply `Consolas, "Courier New", monospace` for structural/meta UI labels (wordmarks, directory headings, badges) — not for body copy
- Use `align-items: stretch` on flex nav containers to get full-height tap targets without duplicated padding
- Wrap `transition` rules in `@media (prefers-reduced-motion: reduce)` that sets them to `none`; also disable `animation` for keyframe-based effects
- Use `focus-visible` (not `focus`) for all keyboard focus styles — avoids showing outlines on mouse click
- Set `scroll-margin-top` on anchor targets — use `76px` on doc pages (52px sticky nav + 24px clearance)
- Write `transition` with an explicit property and the project ease token: `transition: color 0.15s var(--ease-out)`. Never bare `transition: 0.15s` (animates all properties), and never bare `ease` (which is roughly ease-in-out and dulls interactive feedback — the project standard is ease-out-quart)
- Reach for `var(--surface-hover)` for the wash-of-light hover effect on dark buttons or icon controls. Never write the raw `rgb(255 …)` value inline
- Reveal elements hidden by `opacity` at `:focus-visible` — anything a keyboard user can tab to must be visible when focused
- Add `aria-current="page"` to the active nav link on every page template — it signals current location to AT and drives the active-state CSS
- Use the reusable classes from `components.css` (`page`, `page-hero`, `page-hero-inner`, `page-eyebrow`, `page-title`, `page-lead`, `page-main`, `site-header`, `site-nav`, `site-footer`, `sections-list`, `section-row`, `authors-list-label`, `authors-list`, `thanks-list`, `contributors-section`) and the base utilities from `main.css` (`skip-link`, `sr-only`, `body.bg-solid`) on every page template — never reimplement them locally
- Extend `templates/base.html` for every new page and reuse the partials (`partials/head.html`, `partials/header.html`, `partials/footer.html`) — set `page_title`, `extra_css`, `with_contributors_js`, `body_class`, and `active` via top-level `{% set %}` rather than rewriting the page chrome
- Use `var(--selection-bg)` and `var(--selection-text)` in `::selection` rules — never the raw `var(--accent)` or `var(--text)` directly
- Wrap `scroll-behavior: smooth` in `@media (prefers-reduced-motion: no-preference)` — not in the bare `html {}` block
- Merge all `prefers-reduced-motion: reduce` transition/animation rules into a single block at the end of each stylesheet
- Add `<span class="sr-only"> (открывается в новой вкладке)</span>` inside any `target="_blank"` link where the link text alone doesn't indicate new-tab behaviour
- Use тире (`—`, U+2014) as the canonical Russian title separator (`'Авторы — ES Doc'`, `'ES Doc — Документация…'`) and as the nested-list marker glyph (`.thanks-list ul li::before { content: '—' }`). This is a deliberate override of the English "no em dashes" default — Russian typography requires тире in both positions, and the audience reads Russian. Don't replace тире with colons, pipes, or middle dots in user-visible copy. The override applies only to copy that ships to the reader; in MD/HTML comments and PR titles, write however you like

**Don't:**
- Add drop shadows. This system uses zero `box-shadow`. Depth is borders + background tint only.
- Use `oklch()` relative color syntax (`oklch(from var(--x) ...)`) — insufficient browser support; use static `rgb()` or direct hex values.
- Create cards (icon + heading + text, repeated in a grid). The section-row list pattern is the primary grouping affordance.
- Use gradient text (`background-clip: text`). Single solid accent color only.
- Add `border-left` as a decorative accent stripe wider than 1px, or colored with `--accent`, on any UI component (blockquotes, callouts, list items). Use full borders, background tints, or nothing. Exception: sidebar nested nav indent (structural, 1px, `--border` color only).
- Import `vars.css`, `main.css`, or `components.css` in page-specific stylesheets, and don't reintroduce `@import` chains anywhere — the head partial links all three in parallel. Page-specific files only contain the page's unique rules.
- Place the `<h1>` outside `<main>`. Every page must wrap its `.page-hero` + content column (or `.layout` on doc pages) inside one `<main id="main-content">` so the H1 is part of the main landmark for AT users navigating by landmark.
- Use raw `rgb(255 255 255 / …)` or pure `#fff` for hover washes. Use `var(--surface-hover)` so the tint stays consistent and themeable.
- Duplicate site chrome (head / header / footer / skip link) in a page template — extend `base.html` and let the partials render them.
- Resurrect the old `.hero` / `.hero-inner` / `.hero-title` / `.hero-desc` / `.home` / `.home-main` / `.authors-page` / `.authors-header` / `.authors-title` / `.authors-main` family. They were unified into `.page` / `.page-hero` / `.page-hero-inner` / `.page-title` / `.page-lead` / `.page-main`. Reach for the unified classes; add a `--lg` modifier only when the landing-style padding/scale is genuinely required.
- Use weights other than 400, 600, or 700. Weight 500 was removed from the scale.
- Use `#000`, `#fff`, or any literal hex value that has a corresponding token. Prefer `var(--text)` over `#EEE`, `var(--border)` over `#333`, `var(--bg-sidebar)` over `#181818`, etc.
- Replace тире (`—`) in Russian-language `<title>` separators or list markers with English-typography substitutes (colon, pipe, middle dot). The override is documented in the corresponding "Do" — тире is the correct Russian glyph for both positions and the audience reads Russian.
