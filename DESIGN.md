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
  selection-bg: "#DD7F22"
  selection-text: "#EEE"

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

**CSS architecture:** Shared components (skip link, sr-only, site header/nav, site footer) live in `main.css` and are available on every page. Page-specific styles live in `home.css`, `doc.css`, and `authors.css`. Never import `vars.css` in page-specific files — `main.css` already does it.

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

**Color strategy:** Restrained. Amber accent at ≤10% of any surface on the homepage. Docs pages are more accent-heavy (all headings use `--accent`) — but content rules there, not chrome.

**Selection:** Amber background (`--accent`), body text color (`--text: #EEE`) — not pure white.

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
- Body max-width: `55ch` (hero desc); `65–75ch` recommended for doc content

**Monospace identity:** `Consolas, "Courier New", monospace` on `.nav-logo` (wordmark) and `.sections-heading` (directory label). No letter-spacing on body. Monospace labels use `letter-spacing: 0.1em; text-transform: uppercase` to signal meta/structural information.

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

### Site Header / Nav
Sticky, 52px minimum height. Defined in `main.css` — shared across all pages. `align-items: stretch` cascades from `.site-nav` → `.nav-links li` → `a`, making each nav link a full-height tap target (no padding tricks needed). Logo uses monospace identity font. Active page link uses `aria-current="page"` for both AT and CSS styling.

```css
.site-header { position: sticky; top: 0; z-index: 10; border-bottom: 1px solid var(--border); }
.site-nav { display: flex; align-items: stretch; justify-content: space-between; padding: 0 48px; min-height: 52px; }
.nav-links { list-style: none; display: flex; align-items: stretch; }
.nav-links li { display: flex; }
.nav-links a { display: flex; align-items: center; padding-inline: 16px; font-size: 0.875rem; }
.nav-links a:hover,
.nav-links a[aria-current="page"] { color: var(--text); }
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
.section-arrow { opacity: 0; transition: opacity 0.15s ease; }
a.section-row:hover .section-arrow { opacity: 1; }
```

### WIP Badge
Inline bordered label. Text-only, no background fill. Signals "not yet linked" without disabling the row visually.

```css
.section-wip-badge { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  border: 1px solid var(--border); border-radius: 2px; padding: 2px 6px; }
```

### Docs Sidebar
Fixed 260px width, sticky below the site header, scrollable. `top: 52px` and `height: calc(100vh - 52px)` account for the sticky nav above it. Background is `--bg-sidebar` (`#181818`). Nested nav lists use a 1px left border indent (structural, not decorative). At ≤768px collapses to a full-width horizontal-scrolling nav strip above content; nested lists hidden at mobile.

```css
.sidebar { width: 260px; padding: 24px; background: var(--bg-sidebar); border-right: 1px solid var(--border);
  position: sticky; top: 52px; height: calc(100vh - 52px); overflow-y: auto; }
.sidebar ul ul { padding-left: 18px; border-left: 1px solid var(--border); }
```

### Blockquote
Full neutral border (`1px solid var(--border)`) with `--bg-light` fill. No accent side-stripe — that pattern is banned. The fill alone provides sufficient visual separation from body text.

```css
blockquote { margin: 1.5em 0; padding: 0.8em 1.2em;
  border: 1px solid var(--border); background: var(--bg-light); color: var(--text-soft); }
```

### Site Footer
Shared component in `main.css` (class `.site-footer`). Used on every page. Footer links use `display: inline-block; padding-block: 6px` to reach ~29px touch target (meets WCAG 2.5.8 24px minimum).

```css
.site-footer { padding: 20px 48px; border-top: 1px solid var(--border); font-size: 0.875rem; color: var(--text-soft); }
.site-footer a { display: inline-block; padding-block: 6px; color: var(--text-soft); text-decoration: none; }
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
.anchor { opacity: 0.3; transition: opacity 0.15s ease; }
.heading:hover .anchor,
.anchor:focus-visible { opacity: 1; }
.heading { scroll-margin-top: 76px; }
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
- Write `transition` with an explicit property and easing: `transition: color 0.15s ease`, never bare `transition: 0.15s` (which animates all properties, including layout ones)
- Reveal elements hidden by `opacity` at `:focus-visible` — anything a keyboard user can tab to must be visible when focused
- Add `aria-current="page"` to the active nav link on every page template — it signals current location to AT and drives the active-state CSS
- Use the shared component classes from `main.css` (`site-header`, `site-nav`, `skip-link`, `site-footer`, `sr-only`) on every page template without reimplementing them

**Don't:**
- Add drop shadows. This system uses zero `box-shadow`. Depth is borders + background tint only.
- Use `oklch()` relative color syntax (`oklch(from var(--x) ...)`) — insufficient browser support; use static `rgb()` or direct hex values.
- Create cards (icon + heading + text, repeated in a grid). The section-row list pattern is the primary grouping affordance.
- Use gradient text (`background-clip: text`). Single solid accent color only.
- Add `border-left` as a decorative accent stripe wider than 1px, or colored with `--accent`, on any UI component (blockquotes, callouts, list items). Use full borders, background tints, or nothing. Exception: sidebar nested nav indent (structural, 1px, `--border` color only).
- Import `vars.css` in page-specific stylesheets — `main.css` already does it.
- Use weights other than 400, 600, or 700. Weight 500 was removed from the scale.
- Use `#000`, `#fff`, or any literal hex value that has a corresponding token. Prefer `var(--text)` over `#EEE`, `var(--border)` over `#333`, `var(--bg-sidebar)` over `#181818`, etc.
