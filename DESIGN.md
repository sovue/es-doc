---
name: ES Doc
description: A modder's field manual for Everlasting Summer — a white shirt and a green leaf by day, the lake by night.
colors:
  shirt-white: "#FFFFFF"
  leaf-shade: "#EEF8E7"
  leaf-paper: "#F4F9F1"
  ink: "#17261A"
  ink-soft: "#596859"
  leaf: "#2F7524"
  leaf-deep: "#206220"
  leaf-muted: "#D4EFBF"
  logo-leaf: "#6DBE45"
  sunset: "#E89460"
  bark: "#8F4A1B"
  sky: "#8FB2C8"
  hairline: "#D1DDCD"
  code-chip: "#EAEFE4"
  table-head: "#E9F3E3"
  info: "#215D70"
  info-bg: "#D4EEFB"
  warning: "#A81824"
  warning-bg: "#FED9D5"
  danger: "#7E1220"
  danger-bg: "#FFCFCD"
  attention: "#805407"
  attention-bg: "#FBE6B7"
  tip-bg: "#DCF2D0"
typography:
  display:
    fontFamily: "PT Serif, Georgia, \"Times New Roman\", serif"
    fontSize: "clamp(1.85rem, 4.5vw, 2.8rem)"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  page-title:
    fontFamily: "PT Serif, Georgia, \"Times New Roman\", serif"
    fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "PT Serif, Georgia, \"Times New Roman\", serif"
    fontSize: "2.4rem"
    fontWeight: 700
    lineHeight: 1.35
  title:
    fontFamily: "PT Serif, Georgia, \"Times New Roman\", serif"
    fontSize: "1.8rem"
    fontWeight: 700
    lineHeight: 1.35
  subtitle:
    fontFamily: "PT Serif, Georgia, \"Times New Roman\", serif"
    fontSize: "1.4rem"
    fontWeight: 700
    lineHeight: 1.35
  lead:
    fontFamily: "PT Serif, Georgia, \"Times New Roman\", serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Inter, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  caption:
    fontFamily: "Inter, system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-monospace, \"SF Mono\", Consolas, \"Courier New\", monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.1em"
rounded:
  xs: "2px"
  sm: "4px"
  md: "8px"
  full: "999px"
  code: "6px"
  block: "12px"
components:
  site-header:
    backgroundColor: "{colors.leaf-shade}"
    height: "52px"
  docs-sidebar:
    backgroundColor: "{colors.leaf-shade}"
    textColor: "{colors.ink-soft}"
    width: "260px"
  link-inline:
    textColor: "{colors.leaf}"
  link-inline-hover:
    textColor: "{colors.leaf-deep}"
  callout-info:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.info}"
  callout-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning}"
  callout-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger}"
  callout-attention:
    backgroundColor: "{colors.attention-bg}"
    textColor: "{colors.attention}"
  callout-tip:
    backgroundColor: "{colors.tip-bg}"
    textColor: "{colors.leaf-deep}"
  search-box:
    backgroundColor: "{colors.shirt-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "34px"
  search-option-active:
    backgroundColor: "{colors.leaf-muted}"
    textColor: "{colors.ink}"
  code-inline:
    backgroundColor: "{colors.code-chip}"
    textColor: "{colors.bark}"
    rounded: "{rounded.code}"
  section-row:
    textColor: "{colors.ink}"
    padding: "16px 0"
  nav-link:
    textColor: "{colors.ink-soft}"
    typography: "{typography.caption}"
    height: "52px"
  news-item:
    textColor: "{colors.ink}"
    padding: "22px 0"
  blockquote:
    backgroundColor: "{colors.leaf-paper}"
    textColor: "{colors.ink-soft}"
    padding: "0.8em 1.2em"
---

# Design System: ES Doc

## Overview

**Creative North Star: "Noon at Sovyonok"**

ES Doc is a field manual for Russian-speaking modders of the visual novel *Everlasting Summer* (Бесконечное Лето). The whole system lives inside the game's own camp, «Совёнок»: high summer noon by day — the white of a pioneer shirt and the green of the leaf the game's logo is drawn around — and the deep blue of the lake by night. It should feel like a senior modder left you good notes, clear enough to trust and precise enough to ship from. Content is the product; every colour, border and font exists to make text findable and readable, never to decorate.

The theme is genuinely bimodal, not a dark tool with a light afterthought. **Light is the default** (`prefers-color-scheme` chooses): the reading column is white, the chrome around it — header, section bar, docs sidebar — sits in the leaf's shade, and the leaf itself, deepened until it can carry a word, marks everything you can press. Red survives only as the ladybug on that leaf: the pioneer star in the logo, and the warning/danger rungs. **Dark is the night scene by the lake**: deep night-blue surfaces, warm-cream text, and its own lake-blue accent — the leaf's hue turned to the water's, rather than carried over from day. Code panels follow the theme too: a leaf-paper sheet by day, film-dark by the lake at night — one syntax palette each, rather than one palette forced to serve both.

Until September 2026 the day was warm sand and cream paper with pioneer red as the accent («The Endless Golden Hour»). It was replaced wholesale to put the game's own two colours, white and green, on the page; the night kept its ground and briefly took the leaf too, before the accent turned to lake-blue there instead.

This system explicitly rejects the sterile autogenerated look of ReadTheDocs and Sphinx, the corporate gray of a Confluence wiki, and try-hard neon/cyberpunk gaming aesthetics. Familiarity is a feature here: modders know wikis, and nothing should surprise them except how much it feels like the game.

**Key Characteristics:**
- White is the page; the leaf's shade is the chrome; every other neutral leans toward the leaf by day and the lake by night. Never `#000`, never an untinted gray.
- The leaf is a once-per-screen spotlight for what you can press, not a fill.
- Red is the ladybug: the logo star and the warning ladder, never anything interactive.
- PT Serif carries the warmth in headings; Inter carries the body; Consolas signals meta and code.
- Flat by default; a shadow only under what genuinely floats — the search popover, the image lightbox, the player bar, the back-to-top button.
- Light and dark are equal citizens, switched by ambient preference.

## Colors

A white-and-leaf palette at summer noon: white for the page, the leaf's shade for the chrome, one deepened leaf green as the interactive voice, a ladybug red kept for alarm, and a small bench of relief colours for the callouts and the night.

### Primary
- **Leaf** (`#2F7524`): The leaf from the game's logo, deepened until it can carry a word by day: 5.69:1 on white, 4.98 on a table head, and ≥4.5 through the middle band of every callout. The primary interactive colour — links, the current nav item's underline, the current TOC entry, focus rings, the «ES Doc» wordmark, native checkboxes and ranges, the caret.
- **Lake Blue** (dark `#7CBDFF`): The accent's night half, and no relation to the leaf — same lightness and chroma as the leaf's day value, hue turned from 138° to 250°, so the interactive voice stays exactly as prominent when the theme flips without carrying the brand's day colour into the night scene. 6.55:1 on `--bg-elevated`, where the leaf it replaced held 6.77:1 and the pioneer red before that managed 4.12:1. Distinct from `--info`'s teal (227°) and `--code-type`'s cyan (233°) so all three still read apart on one screen.
- **Leaf Deep** (`#206220`): The leaf's shade side, one step below the accent rather than a second hue. By day it is the hover/pressed state of every accent element (`--accent-hover`) and, under the name `--pine`, the ink of `:::tip`, the "copied" confirmation, the "open" status pill and a link whose whole label is inline code (7.42:1 on white). At night `--accent-hover` lifts along with the rest of the blue family to `#AED5FF`, while `--pine` keeps the sage `#8FB07A` it has always had there — success and "open" states stay green even where the interactive accent has turned blue.
- **Leaf Muted** (`#D4EFBF`, dark `#233A51`): Pale leaf behind selected text (ink on it, 12.7:1) by day; at night the same role is a pale wash of the lake-blue accent instead. Never the full accent colour on a passive surface.
- **Logo Leaf** (`#6DBE45`): The logo's own mid-green, 2.3:1 on white — a colour for fills, never for words or state. It appears once, at 22%, as the anchor-target flash (`--target-bg`); every other green in the set is derived from it.

### Secondary
- **Sunset** (`#E89460`, dark `#F5A878`) and its day ink **Bark** (`#8F4A1B`): the warm counterpoint to all that green. Inline `<code>` text in both themes — bark on its chip by day (5.68:1), sunset itself at night — and, mixed toward ink, the folder icon in the file browser. Nowhere near the leaf, so a code chip never reads as a link.

### Tertiary
- **Sky** (`#8FB2C8`, dark `#6F8EA3`): Faded daytime sky; the hue family the info callout is drawn from.

### Neutral
- **Shirt White** (`#FFFFFF`, dark `#161B26`): The page, and what sits on it — cards, pills, controls, the search field, popovers, which separate by their hairline rather than by a tint. Deep night-blue (never black) by the lake. The one pure neutral in the system (see the One White Rule).
- **Leaf Shade** (`#EEF8E7`; at night the header takes the page's own `#161B26` and the sidebar `#1A2030`): The chrome's ground — header, section bar, the phone search sheet, the docs sidebar (`--bg-chrome`, `--bg-sidebar`). A green so pale it reads as white until it meets the page beside it, which is exactly what makes the reading column the brightest thing on screen.
- **Leaf Paper** (`#F4F9F1`, dark `#1F2532`): Blockquotes, `:::details`, preview frames, the artist link chips, the code panel (`--bg-light`, `--code-bg`). A breath off white, leaning on its 1px border.
- **Ink** (`#17261A`, dark `#ECE2C9`): Primary text. The leaf's darkest vein by day (15.8:1 on white), warm cream by night, never pure.
- **Ink Soft** (`#596859`, dark `#B5A88E`): Secondary text, captions, labels, quiet wayfinding. ≥5.1:1 on the page and the chrome, and ≥4.5 even on the strongest band of the status banners it explains in.
- **Hairline** (`#D1DDCD`, dark `#3A4254`): The universal 1px divider: header, hero, rows, cards, table cells, sidebar edge.
- **Table Head** (`#E9F3E3`, dark `#222A3A`): Header cells of article tables.
- **Code Chip** (`#EAEFE4`, dark: the panel `#12161E`): Inline code. Greyer and a step deeper than the panel, because the panel leans on a border an inline span has no room for.

### Semantic
- **Info** (`#215D70`, dark `#86C0DA`): Deep sky-blue for `:::info` callouts. Carries the callout's border, icon, and `<strong>`, not the body text, which stays ink so the note reads as ordinary prose; `--info-bg` / `--info-bg1` are its gradient bands. Reads as "note", never alarm — by day, the one cool note on a page otherwise drawn in leaf.
- **Warning** (`#A81824`, dark `#F46974`): The ladybug. The one red a day page shows outside the logo, and since nothing interactive is red any more, caution never has to compete with a link for it (5.71:1 on its strongest band).
- **Danger** (`#7E1220`, dark `#FF8A93`): The top rung of the alarm ladder — `:::danger` is the hard constraint («ВАЖНО»: initialise the map exactly once, these modules are unsupported), where `:::warning` is a caution («ВНИМАНИЕ»: don't forget). Its band runs a half-step deeper and redder than warning's (day: OKLCH L 0.895 at hue 21°, against 0.915 at 25°) — enough to separate the two side by side, nowhere near enough to name one on its own, so the ink and the icon still carry the distinction: an octagon where warning is a triangle. By day danger is the deepest red of the set (7.55:1 on its strongest band); at night nothing can go darker than warning and stay legible, so it goes hotter and brighter instead (5.55:1 on its own strongest band, where warning sits at 4.79:1).
- **Attention** (`#805407`, dark `#F0C05A`): Ochre-yellow for `:::attention`, the step between tip and warning — "read this before you continue", without claiming something is about to break. Yellow can't carry text on white at full saturation, so the token is the deepened ink and the sun lives in the bands (5.36:1 on the strongest).
- **Tip** (`#206220`, dark `#8FB07A`): `:::tip` is the leaf talking — Leaf Deep as ink over the palest leaf in the set (6.24:1 on its strongest band). It shares the accent's family on purpose: a friendly aside in the brand's own voice, kept from reading as a link by its icon and paired hairlines.

### How the tokens are declared
Every value that changes with the theme is one `light-dark(day, night)` pair in `vars.css`, inside an `@supports (color: light-dark(#000, #fff))` block; the plain light values above it are what a browser without the function keeps. The night set used to be written twice — once under `prefers-color-scheme`, once under the toggle's `[data-theme="dark"]` — and those two copies had to be edited in lockstep, which this file's own header called out as a bug waiting to happen. There is now nowhere for them to disagree.

Two tokens exist only because the day theme split what the night keeps together: `--bg-chrome` (the header, section bar and phone search sheet; Leaf Shade by day, the page's own night-blue at night) and `--bg-page-end` (where the body's horizontal gradient lands; white by day, so the page is flat, and `#1F2532` at night, the faint lift it always had).

The toggle also sets `color-scheme` on the root, which is both what `light-dark()` reads and what the browser paints its own surfaces from, so forcing a theme now takes the scrollbars, form controls and caret with it instead of leaving them on the OS preference. The root also sets `accent-color` to the leaf, and fields set `caret-color`, so the parts of the page the browser draws itself carry the palette too.

### Named Rules
**The One-Leaf Rule.** The full-strength leaf appears on ≤10% of any screen: links, the current place, focus, one call to action. Its tints — shade, paper, muted — are free; the leaf itself is a spotlight. A whole sidebar of green links breaks it, and so does a green heading, which reads as one more link. Emphasis inside a leaf-tinted surface leans on weight, not more green.

**The Ladybug Rule.** Red is the ladybug on the leaf: the pioneer star in the logo, and the warning → danger ladder (with the «устарела» banner that borrows warning's colour). Nothing interactive is red, in either theme. A red link, button, focus ring or current-page mark is drift back to the old palette.

**The Shade-Frames-The-Shirt Rule.** By day the chrome (header, section bar, phone search sheet, docs sidebar) sits on Leaf Shade and the reading column on white, so the page is always the brightest thing on screen. Things *on* the page — cards, pills, inputs, popovers — are white too and separate by their hairline, not by a tint. A new bar that belongs to the site's frame takes `--bg-chrome`; anything the reader reads or operates sits on `--bg`. At night the chrome is simply the page, as it always was.

**The Two-Palette Code Rule.** Code panels follow the theme like every other surface. That means two syntax palettes, not one: the ink weights on `#F4F9F1` by day, the lifted film palette on `#12161E` at night, each verified ≥4.5:1 against *its own* panel (and, by day, ≥4.7 on a line lit by `--target-bg`). Adding a `--code-*` token to one theme without the other is the same bug as any other half-defined token.

**The Opaque-Band Rule.** By day a callout band is a plain opaque tint, each hue mixed toward white until its ink holds ≥5.3:1 on the strongest band and a body link holds AA through the middle one — never a saturated hue laid on at 8–16%. That was learned on the old sand page, where `#F4EAD6`, a yellow at chroma 11, dragged every thin film toward itself (sky-blue info composited to a grey-green at hue 130°) and the bands had to be pre-mixed and laid on at 92% to keep their hue. White drags nothing, so the recipe simplified with the sand gone; the rule against films did not. Night keeps the thin-film treatment: a dark page is cool and neutral enough that a translucent hue stays the hue it started as.

**The One White Rule.** White is the page and the things on it; it is the brand's own colour, not a missing tint. Every other neutral is pulled toward the leaf by day — ink, ink soft, hairline, shade, paper, chip and table head all sit between hue 127° and 150° — or toward lake-blue by night. Never `#000`, and never an untinted gray. Prefer the token (`var(--text)`, `var(--border)`) over any literal hex that has one.

## Typography

**Display / Heading Font:** PT Serif (with Georgia, "Times New Roman", serif)
**Body Font:** Inter (with system-ui, -apple-system, "Segoe UI", sans-serif)
**Label / Mono Font:** ui-monospace / SF Mono / Consolas ("Courier New", monospace)

Both webfonts are self-hosted, subset to Cyrillic + Latin, and served same-origin with `font-display: swap` to avoid a render-blocking third-party request. **Character:** PT Serif gives headings and pull-quotes an editorial, hand-set warmth; Inter keeps the running text and dense UI neutral and legible; Consolas marks anything structural or literal (wordmark, section labels, code).

### The Scale

Nine steps, and every `font-size` on the site is one of them, reached through
its token rather than retyped. Two steps are fluid; the rest are fixed. No two
steps sit closer than 2px, because a difference under that is not a hierarchy —
it is a rounding error, and the site carried twenty-six sizes before this
was true (0.9rem, 0.925rem and 0.95rem all did the same job, 0.8px apart).

| Token | Value | Face / weight | Role |
| --- | --- | --- | --- |
| `--fs-display` | `clamp(1.85rem, 4.5vw, 2.8rem)` | PT Serif 700, tracking -0.01em | Home and error page titles only |
| `--fs-page-title` | `clamp(1.6rem, 3.5vw, 2.2rem)` | PT Serif 700 | Section page titles (`/resources`, `/authors`, …) |
| `--fs-headline` | `2.4rem` | PT Serif 700 | Article H1, with a 2px bottom border |
| `--fs-title` | `1.8rem` | PT Serif 700 | Article H2, with a 1px bottom border |
| `--fs-subtitle` | `1.4rem` | PT Serif 700 | Article H3, and H2 once the viewport is narrow |
| `--fs-lead` | `1.25rem` | PT Serif 700 / Inter 600 | Article H4; group and card titles: resource groups, the next-article card, warper families; the sidebar document title, which is wayfinding rather than a headline |
| `--fs-body` | `1rem` | Inter 400/600 | Prose, section names (600), everything read at length. Runs the full width of the article column, like the code panels and tables beside it. **The reading floor — nothing prose-shaped goes below it.** |
| `--fs-ui` | `0.875rem` | Inter 400/600 | Dense chrome, table bodies, and secondary prose that is genuinely secondary: hatnotes, footnote lists, banner bodies |
| `--fs-label` | `0.75rem` | Consolas 600, tracking 0.1em, UPPERCASE | Section-directory headings, badges, social links, the raw-source link, keyboard hints, flags. Signals meta and structure, never content. |

**Two sanctioned exceptions**, both sizing a glyph rather than setting a text
role, and both allowed to stay literal: `.artist-monogram` at `2.6rem` is an
initial drawn to fill its avatar circle, and `.fb-specimen-lg` at `1.7rem` is
the font specimen, where the size is the thing being shown. Relative `em`
sizes (`.ref`, `.ref-back`, `.res-usage`) are also off the ramp on purpose:
they follow whatever they are nested in.

### Leading

Four steps, for the same reason the sizes have nine: thirteen raw values were
doing four jobs, and 1.5, 1.55 and 1.6 sat inside one pixel of each other.

| Token | Value | Role |
| --- | --- | --- |
| `--lh-flat` | `1` | Glyphs and icons, where the line box is the glyph |
| `--lh-heading` | `1.35` | Every heading and title-shaped thing |
| `--lh-ui` | `1.5` | Dense chrome, table cells, short descriptions |
| `--lh-prose` | `1.7` | Anything read at length |

**The Cyrillic-Leading Rule.** Headings led at 1.2 until it was measured: PT
Serif 700 at 38.4px has a 51px font box, and a 1.2 line box is 46px, so two-line
headings overlapped their own em boxes. Russian exposes what Latin hides — Ё and
Й carry marks above cap height while у, р, ц, щ and д descend, which left 2.5px
between one line’s descenders and the next line’s diaereses. Leading on this
site is budgeted for Cyrillic, not for a ratio borrowed from Latin setting.

**The Hyphenation Rule.** Prose sets `hyphens: auto`, and `lang="ru"` on the
document is what makes it work. At 375px a Russian paragraph runs about 30
characters a line, far under the 45 the eye wants, and the body size cannot
come down to meet it. Hyphenation is the only lever left.

### Named Rules
**The Serif-Carries-Warmth Rule.** Headings are ink-colored, not accent-colored. PT Serif carries the warmth so the leaf stays a spotlight (see the One-Leaf Rule) — and on this site green means "you can press this", so a green heading reads as a link. A page full of green headings is drift.

**The Three-Weight Rule.** Only 400, 600, and 700 exist. Weight 500 was removed from the scale; do not reintroduce it.

## Layout

One column of content under one sticky bar; the docs sidebar is the only thing that ever sits beside it. The page is a flex column (`.page`) that floors to the viewport under the header, so the footer lands at the bottom of a short page instead of halfway up it.

- **Header** (52px, fixed to the top, `z-index: 10`): logo lockup, search, the section links and the theme toggle on one row, separated by a flat 32px gap rather than `space-between`. The search grows from a 240px basis to 360px; width left over after that trails past the toggle instead of inflating the gaps. The docs sidebar's sticky top and `--scroll-offset` (the header plus 12px, and the page's `scroll-padding-top`) hang off `--header-h`: 52px at every width at the default text size, and kept equal to the real header by a `ResizeObserver` in `header.html` for a reader whose larger default text gives it a second row. It is `position: fixed` over a matching `padding-top` on the body rather than `position: sticky`, which looks the same: with the page's `scroll-padding-top`, Chrome counted anything focused inside a sticky header as out of view and scrolled the page 465–930px to reveal it, and a fixed box is never scrolled to.
- **Section bar** (≤1139px): once the header row can't hold the five section links beside a usable search, they move to a 44px bar directly under it, *outside* the sticky header, so it scrolls away with the page and the 52px above never changes (see Navigation).
- **Gutters**: 48px for the header, page hero and page body; the header tightens to 32px at ≤800px, and everything goes to 20px at ≤640px.
- **Measures**: section pages hold their column to 760px (`.page-main`) and a lead paragraph to 55ch; an article runs to 1200px beside a 260px sidebar; a news post, with no sidebar to share the width, stops at 860px.
- **Rhythm**: page hero 56px top / 48px bottom (72/64 on the landing variant, 28/24 on nested browsing pages that stack more chrome below it), page body 56px. List rows breathe between 10px (doc tree) and 22px (news items) each way, 16px for the standard section row.

Breakpoints are measured, not named after devices: **1139px** (section links leave the header row), **800px** (header gap and gutter tighten), **768px** (the docs sidebar stacks above the article), **640px** (search becomes an icon and a sheet, section-row descriptions wrap to their own line, 20px gutters), **400px** (last trims: author rows, article padding, code panels). A few pages keep local ones where their own content needs it (the warper sandbox at 1000/700/460px, the player bar at 480px). They are written in em — 71.1875em is 1139px at the default 16px — so a reader who raises the browser's default text size reaches the compact header and the single column early, instead of a header that wraps to three rows.

**The Measured-Breakpoint Rule.** A breakpoint sits where something measured stops fitting, and the stylesheet says what was measured next to it. Never a device width picked for its name.

**The Fixed-Header Rule.** The header, fixed to the top of the viewport, is one 52px row at every width at the default text size. Anything that would make it taller goes underneath it and scrolls. Nothing copies that 52px, though: the sticky sidebar and every scroll offset read `--header-h`, which follows the real header, so when a larger default text size does give it a second row, nothing slides underneath.

## Elevation & Depth

Flat by default, with ink-tinted lift reserved for the few surfaces that genuinely float above the page. Depth is otherwise expressed through background tint and the universal 1px border, plus z-index layering (skip-link 100 › header 10 › content 0). By day the tint runs the "wrong" way on purpose: the page is the brightest plane and the chrome around it the shade (see the Shade-Frames-The-Shirt Rule), so a white popover over a white page leans on its shadow and hairline alone.

### Shadow Vocabulary
- **Soft** (`--shadow-soft`: `0 2px 12px rgba(23,38,26,0.06)` light / `0 2px 12px rgba(0,0,0,0.35)` dark): A quiet ink-tinted lift for small things fixed over the scrolling page: the back-to-top button and the floating now-playing bar.
- **Modal** (`--shadow-modal`: `0 1px 3px rgba(23,38,26,0.12), 0 16px 48px rgba(23,38,26,0.14)` light / `0 1px 3px rgba(0,0,0,0.45), 0 16px 48px rgba(0,0,0,0.5)` dark): The lift under the search results listbox and the resource image lightbox. Two layers: a tight contact shadow that draws the edge — by day a white listbox over a white page has nothing else to separate it — and the deep lift that puts it above the page. These two carry **no visible border**: they used to wear a hairline under the wide shadow (a ghost card), and the contact layer now does the hairline's job. Their border is `1px solid transparent`, kept so Windows' high-contrast mode, which drops every shadow, still paints an edge.
- **Fade** (`--fade-shadow`: `rgba(23,38,26,0.15)` light / `rgba(0,0,0,0.35)` dark): Not a lift but an edge — the shadow at the side of a horizontally scrollable strip that still has content past it (a clipped code line, the mobile TOC).

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow appears only when an element genuinely leaves the page plane: the search popover and the image lightbox (Modal), the back-to-top button and the player bar (Soft). Cards, rows, callouts, and panels use borders and tint, never a drop shadow. Elevation is declared once: a surface wears a border or a shadow, not a hairline under a wide lift.

**The Hidden-Means-Hidden Rule.** Something that floats in and out — the back-to-top button, the player bar — is hidden at rest with `visibility: hidden`, never with `opacity: 0` alone. Transparent controls stay in the tab order and the accessibility tree: both of these once put a focus ring around nothing on every page. The visibility flip is delayed by the fade's own duration on the way out and immediate on the way in, so the motion is unchanged; and a control that hides while it holds focus hands focus on first (Stop returns it to the play button, back-to-top to the skip link).

## Shapes

Mostly square, softened only where something is held or looked at. Structure is drawn with the universal 1px `--border` hairline — rows, frames, table cells, the header's underside — and a list of text never gets a rounded container at all: a section row is a line on a page, not a card.

- **Hairline corner** (2px): focus rings, badges, the skip link — rounded just enough not to read as sharp.
- **Control** (4px): the search field and other compact inputs.
- **Frame** (6px): inline code chips, blockquotes and `:::details` disclosures, and fenced panels once a narrow screen tightens them.
- **Popover** (8px): the search listbox, the floating player bar and the resource viewer's panels.
- **Picture** (12px): code panels, article screenshots, artist cards and their previews.
- **Pill** (999px): the support control, status badges, play buttons and the artist monogram — the only fully round forms, each one a single control or mark.

**The Picture-Gets-The-Curve Rule.** 12px belongs to things that are pictures of something — code, screenshots, artwork. A frame around text stops at 6px, and a list gets no frame at all.

## Components

### Navigation
Fixed 52px header carrying the five sections — Документация, Ресурсы, Новости, Литература, Художники — declared once in `header.html` and rendered in two places. It sits on `--bg-chrome`: Leaf Shade by day, so the white page under it is the brighter plane, and the page's own night-blue at night. Links use `align-items: stretch` so each is a full-height tap target. Ink-soft at rest, warming to ink on hover. The active page carries `aria-current="page"`, drawn as an inset 2px leaf-green underline via `box-shadow` (no layout shift), and every page of a section sets it, sub-pages included: `/news/sources` and a single post both light up «Новости». Авторы and «Поддержать проект» are about the project rather than sections of it, and live in the footer.

**Section bar.** At ≤1139px the links leave the header row for a 44px bar directly under it (see Layout). It is the same `.nav-links` list with the same states, so the current-page underline reads identically in both places, and only one copy is ever displayed, so a screen reader meets the list once. On a phone the bar is wider than the screen and scrolls sideways under a 32px right-edge fade rather than wrapping or folding into a menu — a flat row of words is the nav modders already know, and a hamburger hides every section behind a tap. An inline script scrolls the current section into view before first paint, and again if a width change leaves it out of sight; a section already in view stays where the reader put it.

The wordmark is a lockup: a 24px mark (`/favicon.webp`) plus «ES Doc» in leaf-green Consolas, 9px apart — green type beside a red mark, the same pairing as the game's own logo, where the ladybug sits on the leaf. The mark and the favicon are deliberately the same file — one route, already cached on every page, and the tab icon matches the header it came from, so replacing the logo is a one-file swap rather than a template change. 24px because the pioneer star's points reach its box edges and it reads optically smaller than a square of the same height; at Consolas' ~10.5px cap height that lands the mark on the wordmark's weight without overpowering it. The mark carries `alt=""`: the wordmark beside it already names the link. With the section links in a bar of their own on narrow screens, the full lockup fits the header row at every width down to 320px, so nothing drops.

### Site Footer
One 20px row, deliberately: this is a docs site, and the footer is wayfinding, not a second homepage. Two text links (Авторы, «Нашли ошибку?»), then the platform icons, then the support control. The row wraps, since it no longer fits below ~580px, but nothing else about it grows.

**Platform icons.** GitHub, VK and Telegram as 18px `currentColor` marks with no labels, ink-soft at rest and accent on hover like every other footer link. They sit in a `.footer-socials` span with no gap of its own, so each icon's 6px of padding leaves 12px between glyphs against the row's 20px: the set reads as one answer to "where else are you" rather than three more list items. VK's viewBox is tightened to `1 1 22 22` because it's a squircle where the other two are circles, and on a plain box its glyph renders at 15px against their 18, reading a size smaller; 16.4px is where a square carries an 18px circle's optical weight.

**Support control.** A bordered pill on `--bg-surface` with a `currentColor` heart, ink text at rest, accent text and border on hover, surface unchanged. Not a green fill and not green at rest, because the footer sits under *every* page, and a leaf-green button here would spend the One-Leaf Rule's one spotlight on all of them at once. Hover leaves the background alone, the way `.to-top` does: a control that only recolours reads as the same control. (Holding the surface began as an AA fix for the old pioneer red, 4.12:1 on `--bg-elevated` at night; the accent — leaf by day, lake blue by night — holds 6+ there either way, so it is consistency now, not contrast.) It carries no caption — the label is the whole message. It points at `/support` rather than straight at a payment page: the platforms are config-driven and may be several, and an outbound jump from a footer link is a jarring way to leave a docs site.

**The right gutter at ≤640px** (64px, with the column gap tightened to 16px) keeps the row out of the fixed to-top button's lane. Without it there's a ~40px band of viewport widths where the line still fits whole and the support button's right edge lands underneath it; with it, the row is either whole and short of the lane, or already wrapped with the button alone on the left.

### Search (combobox + listbox)
The header's centerpiece: a bordered input group that rings itself in accent on `:focus-within` (the border plus a 1px `box-shadow` ring, the same 2px the filter fields draw — a ring, not a lift), dropping a `--bg-elevated` listbox (white by day) with the Modal shadow. The field itself is white on the header's Leaf Shade — the one place in the chrome that is the page's own colour, because it is where you type. Matched substrings are marked with **weight 700, not color** (keeping the leaf rare). The highlighted/hovered option takes the pale Leaf Muted tint; its context prefix lifts to full ink so the row the eye is sent to reads clearest. Collapses to an icon-triggered full-width sheet at ≤640px. Fully keyboard-driven (WAI-ARIA combobox) and degrades to a navigable `<form>` without JS.

### Heading Anchors
Every heading below h1 carries a hover-revealed `#` anchor and a slug built from the **path of headings containing it**: an h2 is `{h2}`, an h3 under it `{h2}/{h3}`, an h4 under that `{h2}/{h3}/{h4}`. Two sections called «Плюсы» under different parents are therefore two different anchors, with no disambiguation needed; genuine collisions under one parent get `-2`, `-3` in document order.

This replaced a flat `{текст}-{номера строк}` scheme whose uniqueness came from the heading's line numbers, which meant every anchor on a page moved the moment anyone inserted a paragraph above it. A path survives edits elsewhere in the document, and reads as a location rather than an accident. Slashes are legal in both `id` attributes and URL fragments; the TOC scroll-spy matches ids as strings, never as CSS selectors, so nothing needs escaping.

### Section Row & Doc Tree
The primary grouping affordance, a bordered list of rows, never a card grid. Baseline-aligned flex rows with a leaf-green arrow that fades in on hover/focus. The docs index nests these into a tree with a 1px `--border` left-indent guide (structural, not a decorative stripe). Names truncate with ellipsis on a wide screen, capped at their row's width so a long one can't run past it; the arrow stays pinned right, and it's pinned by its own `margin-left: auto`, not by `.section-desc`'s `flex: 1`. The description is optional — some rows carry none — so hanging the arrow's position on it left the arrow tucked against the name in exactly those cases. Below 640px nothing is clipped: the name wraps, and the description takes a full line of its own under it: a quarter of a sentence ending in an ellipsis is a broken explanation, not a shorter one.

**Grouping a long tree.** `tree.yaml` takes two nodes that aren't pages: `- ---` draws a `--border` hairline between groups, and `- heading: Текст` labels one, in the quiet uppercase Consolas the sidebar uses for every other section label. Both work at any depth and render in both docs navs — the `/docs/` index and the sidebar's «Все статьи» — from one resolved tree, so a group written once appears in both places at their own scales.

Neither is a link, and neither is furniture the reader has to step over: the rule is `role="presentation"` and `aria-hidden`, and a heading's items are named to a screen reader through the `aria-label` of the list it heads. The group itself is a real list item — its label plus its own list — not a presentational one: an outer `role="list"` that owns something other than list items has its count wrong in a screen reader (axe's `aria-required-children`), which is what the grouped tree shipped with until the September 2026 audit. A heading's children keep the indent of the rows around them rather than nesting — the indent guide means "these belong to the article above", and above a group there is no article. A rule with nothing left to separate (leading, trailing, or following another) is dropped rather than drawn, so a group whose articles are all missing or renamed doesn't leave a hairline hanging against the top of the list.

### Callouts (Info / Warning / Danger / Attention / Tip)
Full-width note blocks with a top+bottom hairline in the semantic color and a faint vertical gradient band behind. **Info** is deep sky-blue and calm; **Warning** is the ladybug red, the one red on a day page outside the logo; **Danger** is the rung above warning, for a hard constraint rather than a caution; **Attention** is ochre-yellow, the middle setting; **Tip** is the leaf's shade (`--pine`), a friendly aside in the brand's own voice. All five lead with a `currentColor` icon (`class="icon"`) so the types read at a glance and match in size. No side-stripe; the gradient band and paired borders carry the emphasis. The `*-content` body stays ink (`--text`) so the note reads as ordinary prose; only the border, icon, and `<strong>` take the semantic colour. (A callout whose whole paragraph is coloured is the wrapper missing its `color: var(--text)` reset.)

The icon is **24px, sized to one line of body text** (1.7 line-height on 1rem), nudged down by half the difference so it parks on that first line's optical centre. It used to be a fixed 32px, which set the height of the box: a one-sentence callout — which is most of them here — came out 64px tall, two thirds of it empty. With the icon out of the way the sentence sets the height and the same callout is 53px. Vertical padding is 12px for the same reason. Alignment stays `flex-start`, so on a long callout the icon still sits with the first line rather than drifting to the middle of the paragraph.

The five boxes differ only in hue, so `doc.css` declares the shape once and each name contributes three custom properties (`--callout`, `--callout-bg`, `--callout-bg1`). Another callout is that one line, its name added to the five selector lists that follow it, and a `template()` registration in `md/__init__.py`.

The content wrapper needs `min-width: 0`, and it is not cosmetic. It is a flex item beside the icon, so its default `min-width: auto` refuses to shrink below its own min-content — and a callout can hold a fenced code block, whose min-content is a line of code. On a phone that pushed the wrapper to five times the viewport (1837px inside a 343px callout) and made the browser zoom the whole article out to fit. Any flex container that takes arbitrary markdown needs the same line.

Because two of the five are reds a page apart, **the icon is load-bearing, not decoration**: warning's triangle and danger's octagon are what a reader actually tells apart at a glance. Their bands do differ (see Danger under Colors → Semantic), but only enough to separate the two side by side — never enough to name one on its own. A new callout that reuses an existing hue needs a silhouette of its own.

The washes themselves follow the Opaque-Band Rule (Colors → Named Rules): plain opaque pale tints by day, thin translucent films at night. That is a per-theme *recipe*, not just a per-theme value — a film is the right tool on a dark, neutral page and the wrong one on any light ground that carries a hue of its own.

### Collapsible Section (`:::details`)
`:::details Заголовок` … `:::` renders a native `<details>`/`<summary>`, closed by default. Native, not scripted: it needs no JavaScript, works on a no-JS page, and the browser's own find-in-page opens it when the match is inside — which a hand-rolled toggle would swallow. For material that would bury the page if it were always open: a long reference implementation, an aside two readers in ten will follow.

It is deliberately **not** a callout. A callout says "this passage matters"; a disclosure says "there is more here if you want it", so it carries no semantic colour and takes blockquote's treatment instead — a 1px `--border` frame on Leaf Paper (`--bg-light`), `--radius-code`. The summary is PT Serif bold in plain ink (it is the heading of the thing it hides) and warms to accent on hover. The UA's disclosure triangle is suppressed in favour of a CSS-drawn chevron that turns from pointing right to pointing down, drawn as a pseudo-element so it never lands in the summary's text content. The body's top rule only ever appears while the box is open, so it doubles as the seam between the summary and what it revealed.

The opener's text is parsed as **inline markdown**, not escaped flat, because titles in these docs routinely name a function in `code`. With no title the summary falls back to «Подробнее» — a `<summary>` must never be empty, or it collapses to a bare marker with no hit area. A missing `:::` closer fails the block outright, as with the callouts; here the stakes are higher, since text swallowed into a disclosure would be *hidden* by default and the mistake that much easier to miss.

### Article-Status Banners (Stub / WIP / Outdated)
`:::stub`, `:::wip` and `:::outdated` mark an article that isn't finished, isn't settled, or no longer matches the game. They are *about the page*, not about a passage in it, but visually they're built from the same family as the Info/Warning/Attention/Tip callouts below: a top+bottom hairline in the status colour over the same faint gradient wash, reusing each colour's existing `-bg` / `-bg1` tint. What sets a banner apart from a callout is its content, not its box — a serif title plus a note, in place of one paragraph of prose. Stub takes `--attention`, WIP `--info`, Outdated `--warning`.

Each banner ships **its own wording**: a serif title in the status colour plus a sentence of ink-soft explanation. That is the point — every unfinished article says the same thing the same way, so readers learn to recognise the banner instead of parsing a slightly different apology on each page. Authors choose the state, not the words; a note written after the marker replaces the default sentence when a page needs to be specific ("the Export section isn't written yet").

### Disambiguation Hatnote
`::about A | Б | ссылка` renders the one italic line above an article that says what this page covers and where the other meaning lives — «Эта статья о A; о Б см. …». PT Serif italic in ink-soft, boxed in a plain `--border` frame. Double colon, not triple: unlike every other `:::name` block on this page, a hatnote is one physical line with no body and no closer, and the shorter marker makes that visible on sight instead of inviting an author to hunt for a `:::` to close it. The frame is unpainted (no `--bg-light` fill), a step quieter than blockquote's painted card and well short of a banner's status-coloured one — it reads as its own aside, not as content in its own right. Exactly three `|`-separated fields, both subjects in the prepositional case so the sentence's single «о» serves both. Anything else fails the block and leaves the raw `::about` line visible on the page — a half-filled sentence is worse than an obvious mistake.

### Sources (manual footnotes)
`текст^1` in prose and `1^ Источник` in the list, both numbered by hand — the marker's number *is* the list's number, and nothing renumbers, reorders or collects anything. The marker is a small superscript link in the leaf; the list is ink-soft rows led by a mono back-link that mirrors the `1^` the author typed, and the entry you arrive at highlights with the same `--target-bg` wash headings use, so the eye finds the right line in a list of twenty.

A `^N` only becomes a marker if the page actually defines source N — markdown-it finishes block parsing before any inline parsing, so every entry is known by the time a marker is read. That keeps a page from ever carrying a `#ref-N` link that lands nowhere, and leaves prose like `t^2` alone on pages that cite nothing numbered 2. On a page that *does*, a literal caret is escaped the way markdown escapes any special character (`t\^2`) or, better, written as `code` — which is where DESIGN.md already puts formulas.

### Blockquote
Full 1px `--border` hairline with a Leaf Paper (`--bg-light`) fill, set in PT Serif italic (the brand's quote voice). Never an accent side-stripe; the fill alone separates it from body text.

### Code
**Inline chips copy too.** Every inline `code` in an article copies on click — a colour, a function name, a path in running prose is as much the thing the reader came for as a whole fence, and selecting seven characters by hand is a worse gesture than clicking them. Confirmation is the same green as everywhere else, announced through the page's existing live region. The chip is promoted in place rather than wrapped in a `<button>`, since a real button inside a sentence brings its own font, baseline and box to argue with; that means spelling out role, tab stop and keyboard activation by hand, exactly as `warpers.js` does for its promoted controls. Code inside a link is skipped — there the click already means "go there".

**A hex colour written as inline code carries a dot of itself**, the same 9px swatch the character listings use for a name colour, drawn server-side so it survives a page with no JS. The docs were doing this by hand before — a raw `<b style="color: …">■ #A0C6D1 ■</b>` per value, which no theme could follow, no reader could copy, and which put two black squares on the page as fake swatches. The regex that recognises the colour (`#` plus 3, 4, 6 or 8 hex digits) is the whole sanitiser for the `style` attribute it writes.

Inline code is a chip: `--code-bg-inline` behind `--code-inline` text, small radius. By day that's Bark on a greyer leaf chip, deep enough to hold its own inside a line of prose and warm enough never to be mistaken for a green link; at night it's sunset orange on the panel itself, which a night-blue page already separates. A link whose whole label is code keeps the chip but takes link ink and an underline (faint at rest, full on hover/focus) — otherwise the chip's colour wins and the only thing marking it as a link is the cursor.

Fenced blocks sit on `--code-bg` with a 1px border and a per-token syntax palette, one palette per theme.

**Whitespace is drawn — painted, not typed.** Every space in every code panel carries a dot in `--code-whitespace`, the muted token colour, the way an editor's "show whitespace" and Ren'Py's own linter draw it: in a language where indentation *is* syntax, three spaces where four belong is worth being able to see. A Pygments *filter* tags each run of spaces as `Whitespace` — the only place the treatment can be uniform, since lexers disagree wildly about whether whitespace is a token at all (the stock Python lexer leaves indentation untokenised entirely, the Ren'Py one tags some of its own) — and CSS then tiles one dot per `1ch` cell across the resulting `span.w`.

The characters underneath stay ordinary spaces, and that is the point. The first version substituted a `∙` glyph into the text, which made every route off the page responsible for swapping it back: the copy button, a hand-made selection, the file viewer's own button (which forgot, and shipped `import∙random` to the clipboard), and anything added later. It also put 522 bullet characters into the accessible text of a single article, for a screen reader to read out. Painting the dots leaves one source of truth — what you see is a rendering of what is actually there.

One token is exempt: `<<Имя персонажа>>`, the marker for a value the reader must supply. The renderer turns it into one `span.cs` showing single brackets (`<Имя персонажа>`), in any language and in inline code as well as fences, and `code.js` hangs "replace this value" on it as a tooltip. That only works while the whole marker is a single span — dotting split it around its space and left two half-markers with their brackets showing. The label is prose to overwrite, not code to count spaces in, so it keeps them.

`code.js` carries what every code panel needs — the copy button, the copyable inline chips — and is loaded site-wide rather than per template, since panels appear on docs pages, in the resource browser's viewer and on the warper page, several of them out of markdown no template inspects; a page with none pays nothing for the script. Nothing in it touches the clipboard's contents any more: with the dots painted, every copy path takes the code exactly as it stands.

The copy button is rendered **only on fences of two or more lines**. On a one-line fence the button's corner is the same row the code occupies, so it covered the end of the line with nothing to scroll past it — and a single line is what a reader selects by hand in one gesture anyway. Where the button does exist it sits opaque in the panel's corner and reserves nothing. It used to hold a 52px lane on the `pre` so the first line could never run under it, but that lane came out of every line and ended the scrollport short of the panel; measured against the corpus it almost never saved a scroll, and anything under the button comes out with the nudge of scroll the line was going to need anyway.

**Line numbers** appear on the same fences the copy button does, and on every file in the resource browser's viewer. They live in a `.code-gutter` / `.fb-gutter` column that is a *sibling* of `<code>`, never a child: both copy paths read `code.textContent`, and numbers inside would paste along with the code. `user-select: none` keeps them out of a hand-made selection too, so the two ways of taking code off the page agree. The panel is two columns, and only the second scrolls: the code sits in its own `.code-scroll` box beside the gutter, so the numbers stay put while a long line scrolls sideways, without the gutter ever painting over it. (It used to be `position: sticky` *inside* the scroller, and being positioned and opaque it hid the first ~22px of every long line at any scroll offset.) The column is right-aligned so the ones column holds as the count crosses 10 and 100. In the docs the numbers are inert and `aria-hidden`; nothing links to them, and a screen reader counting down the side of every snippet is noise.

The split into rows relies on Pygments' `nowrap=True` output being span-balanced *per line* — a token spanning several lines is emitted as one closed span per line — so the highlighted HTML can simply be split on newlines (`md/lines.py`).

**Line links.** In the resource browser's file viewer the numbers are real links, and every row carries `id="L42"`, so one line of a script can be pointed at directly (`…/browser/globals.rpy#L42`). The addressed row highlights from `:target` alone — no JS in the path — and `resources.js` only mirrors that onto the gutter number, which no selector can reach from the code column.

They share **one tab stop**, not one each. A 1 400-line file put 1 418 links in the tab order, so reaching anything below the code meant 1 418 presses of Tab; they now move under the arrow keys (Home/End/PageUp/PageDown too), the roving-tabindex pattern any long list of controls uses, and arriving at a line makes it the way back in. Without JS every link keeps its own tab stop, which is the honest no-script fallback. Rows stay inline rather than `display: block`: the newline between them sits *outside* the row span, which is what keeps the line breaks in `code.textContent` for the file's copy button.

### Article Illustrations
Screenshots inside an article ship `loading="lazy"` and `decoding="async"`, added by a render rule rather than by hand, since the author writes plain markdown. They are all below the fold — no article in the corpus opens with an image — so nothing about first paint depends on them, and a page like «Действия с изображениями» stops fetching a dozen screenshots at once. `img { max-width: 100% }` and the `--radius-block` corner come from the prose stylesheet; the images carry no dimensions of their own, which is the one thing left to fix if a page ever shifts as they arrive.

### Shared Vocabulary
Four things that existed in several places and now exist once. Each was extracted only after the copies had already drifted, which is the bar: duplication is cheaper than the wrong abstraction until it starts lying.

**`syntax.css`** — one mapping from Pygments' token classes to the `--code-*` tokens, scoped to `pre` so it covers the docs' `pre > code`, the file viewer's `.fb-code` and the warper page's samples alike. It was two lists before, and they had drifted: the viewer painted Ren'Py's `{interpolation}` as a plain string, its `|placeholders|` as comments, and knew nothing of `.se` escapes or `.err` unbalanced brackets. Same lexer, same file, two colourings.

**`--focus-ring`** (`2px solid var(--accent)`) — the ring was written out at 37 call sites. Offsets stay local, since a chip, a row and a full-bleed tab each need a different distance; a panel with its own palette retints the token rather than bypassing it (`.code-copy` takes `--code-inline`).

**`--scroll-offset`** (`calc(var(--header-h) + 12px)`, 64px by default) — how far a scrolled-to target clears the sticky header. It is the page's `scroll-padding-top`, so anchor jumps and keyboard focus both honour it without every target carrying a margin; headings add a 12px `scroll-margin-top`, since a heading is read together with the line under it.

**`copyControl(element, getValue, {message, status})`** in `code.js` — every copy on the site does the same four things (write, flash `.copied`, announce in a live region, drop the flash after 1600ms), and four places had grown their own copy of it. The value is read at click time, because the viewer's payload is the DOM's text. Callers keep what is theirs: which element, what to announce, and the role/key handling for a control promoted from a span.

Not extracted, deliberately: the uppercase Consolas section label appears in six places at four sizes, but the sizes are context-specific and a shared class would be overridden at every call site.

### Home Hero Slideshow
The homepage hero carries the camp itself: four game backgrounds crossfading on a slow 32s cycle (~2.5s fades), day shots in light theme and their night variants in dark. The photos are set dressing, never content — a wash of `--bg` keeps the title column on near-solid page colour, and the image dissolves into the page below rather than ending on a hard edge. By day that wash is white, so the camp reads as noon glare over the beach; at night it is the lake's blue. Reduced motion collapses it to one quiet still. **There is no pause control, on purpose, and it is to stay that way.** A pause button over the photo was built and then removed at the project owner's request: the crossfade is set dressing behind a paper wash, slow (8s a slide, ~2.5s fades), carries no information, and `prefers-reduced-motion` already turns it into a still for anyone who asked for less motion. An audit that flags WCAG 2.2.2 here is reporting this decision, not a defect to fix. Only the first photo loads with the page — it is the largest paint — and the other three wait until the page has loaded (under reduced motion, forever); until they arrive, and without JS, the hero is that one still. Images are served as 1600px WebP downscales (`/resource/hero/`), composed lazily like thumbs; screens up to 480px get a 0.95:1 center crop of the same downscale (`?crop=narrow`) — every pixel a portrait hero box ever showed, at about half the bytes.

### Character Swatch
On the Персонажи resources page, a 36px bordered square carrying the character's in-game name color — the game's *day* value in light theme, the *night* value in dark (same two-way theme plumbing as the sprite group colors). Characters with no name color (narrator, `th`) get an empty dashed frame, never a fake gray fill. The "цвет имени: день / ночь" line under the name repeats both values as text, each led by a small color chip, so both can be compared without toggling the site theme. Name and code stay plain ink: this is a reference page for 40+ characters, and their raw in-game colors are largely undimmed neon (`#FFFF00`, `#4EFF00`, `#FF3200`, …) tuned for a dark dialogue box — recoloring the running text in all of them read as a rainbow list, at odds with the one-accent-color discipline everywhere else on the site. The swatch and chips carry the color; the text doesn't.

### Warper Sandbox

Above the warper reference, a 16:9 window onto a real game background with the chosen curve running on it. The image is overscanned (never below scale 1) so an overshooting warper can't drag an edge into frame, and it carries no CSS transition: every frame is written by the same warper function the graphs plot, or the curve on screen would stop being the curve you picked. Controls reuse the shared `.filter-select` / `.filter-input` treatment; the Play button is the page's one call to action and the only element allowed the leaf at rest, since the previews spend theirs only under the cursor. Under the frame the equivalent ATL is generated live, tokenised with the Ren'Py lexer's own classes (`.k`, `.kt`, `.n`, `.m`, `.w`) so it reads exactly like the hand-written samples, dotted indents included, and copies back out as real spaces. The whole section ships `[hidden]` and is revealed by warpers.js: without JS it would be a dead frame over dead selects.

### Easing Generator

Picking «своя формула» in the sandbox opens a formula field beside a 148px square preview of the curve it describes. The curve redraws on every keystroke; the stage below waits for Enter or Play, since a frame restarting per character is unreadable. A formula that doesn't parse leaves the last good curve on screen and turns the hint line under the field into the parser's complaint (`--warning`, `aria-invalid` on the input) — the hint and the error share one slot so nothing shifts as you type. Formulas are code and read in the mono face. The generated block registers the warper via `@renpy.atl_warper` above the show statement, so what you copy runs as-is: `^` is normalised to `**` on the way into the code (Python would read it as xor), and the field's own spacing is preserved rather than re-emitted from the tokeniser.

### Support Page

`/support` splits the ask in two: «Деньгами», a list of donation platforms read from `config.yaml`, and «Временем», the two ways to help that cost nothing: report something, or send a patch. Both use the same `.section-row` vocabulary as `/news/sources` and the docs index, so the page introduces no new component. Two rows, not three — a «Предложить материал» row pointed at `issues/new` while «Сообщить об ошибке» pointed at `issues`, which is the same act filed through a different door, and the reader has to stop and work out the difference. The rows carry no descriptions either: «Сообщить об ошибке» is already the whole instruction, and a caption spelling out what an error is reads as sanctimonious on a page that is asking the reader for something. The money list is config-driven and legitimately empty, in which case it falls back to the standard `.res-empty` block: a docs site should never point at a payment page that isn't set up yet, and the «Временем» half keeps the page useful in that state rather than reading as a stub. The platforms live in `config.yaml` rather than the assets repo (where news, artists and literature live) because they're the project's own identity, not curated content.

### Font Specimen
A font file in the resource browser previews itself: the viewer declares `@font-face { font-family: 'fb-specimen' }` over the raw file and sets four lines of Cyrillic, Latin and figures in it. That face is deliberately outside the type system — it is the artefact being inspected, not a voice the site speaks in, and it is the one place a font-family here names something DESIGN.md does not.

### Project News

`/news` is the project's own news: one markdown file per post in the assets repo's `news/` folder, named `YYYY-MM-DD-что-угодно.md` so the date survives a fresh clone and the folder sorts the way the page does (an undated name falls back to git, then the mtime, like an article's «Последнее изменение»). The listing is `.news-list` rows, not cards: the date in the mono label voice, the post's h1 as a serif title — the only part that warms to accent — and its first top-level paragraph as a lead, clamped to three lines so one long opening can't push every other post down. A post renders through the same markdown pipeline and prose styles as an article, minus the sidebar, and stops at 860px since there's no second column to share the width with; the article pager runs through time instead of the tree («Раньше» / «Следующая новость»). After the posts, «Где ещё следить» points at the project's Telegram channel and at `/news/sources`, the community channels list that used to be all `/news` was. That list keeps its `news.yaml`; `sources` is a reserved post name, since the route shadows it.

### Community Links («Прочие ссылки»)

Under the category list on «Ресурсы сообщества», a second list for everything the community shares that this site can't scan into a listing of its own: an archive, a pack, a tool hosted elsewhere. Same `.sections-list` rows as the categories above it and as `/news/sources` — an outbound link is a row like any other here, and same tab, per the external-links rule below — so the only thing the block adds is a serif title marking where the site's own holdings end and the rest of the internet begins.

It sits *outside* the hub's «здесь пока пусто» check: a collection with nothing scanned yet can still be worth the visit for what it points at. It's on the community hub only — every original resource lives in the game folder, so that side has nothing to link out to. The rows come from `links.yaml` in the **assets repo**, next to news and literature, because this is curated content rather than the project's own identity (the split the Support Page describes), and they carry the same `{name, url, note}` shape as news.yaml so an author only learns it once. An empty list renders nothing at all — unlike the money list on `/support`, which falls back to a stub, an empty "и вот ещё что" section says nothing worth the space it takes.

### Warper Preview

In the «Варперы» section of «Ресурсов» (the engine's own set under the original collection, community-contributed ones under the other), a small plot of one Ren'Py easing curve: a 1px `--border` frame over Leaf Paper, a solid hairline at the start value, a dashed one at the target (the only way to see that back/elastic/bounce overshoot), and the curve itself in `--ink-soft`. The box is square so time and value get equal length: the time scale runs along the bottom (quarter ticks, `0`/`1` labelled in the mono face), and the value track runs down the right edge, sharing the plot's vertical mapping so its ticks land exactly on the two guide levels. Both the plot and the row's formula chip are copy controls (promoted from plain picture and plain `<code>` by warpers.js, so a no-JS page grows no dead buttons): the plot hands over that exact variant's formula, the chip the one it displays. What they copy is always the machine-readable form — `t ** 2`, not the typeset `t²` — because the point of taking it is pasting it into the generator, into warpers.yaml or into a mod. Confirmation is the same green the copy buttons use elsewhere, one step more specific than the hover rule so it still reads under the cursor. The whole preview stays ink-quiet at rest, with hollow markers parked at the start of both scales; the leaf appears only on the curve currently hovered or focused, as the traced portion plus the three markers (curve, value, time — one moment shown three ways), so a page of 33 previews still spends its green once (the One-Leaf Rule). Colours are read from the CSS custom properties at runtime and re-read on theme change, since canvas can't inherit them. The reference is a matrix, ten families × three prefixes, so the previews repeat deliberately: they carry no card chrome, only the plot and the name, and the row/column labels do the explaining. Reduced motion parks the marker at the target instead of animating it there.

## Do's and Don'ts

### Do:
- **Do** reach for the token, `var(--ink)`, `var(--border)`, `var(--accent)`, `var(--info)`, never a literal hex that has a token.
- **Do** give every new color token both halves at once: a plain light value in `:root` and a `light-dark(day, night)` pair in the `@supports` block of `vars.css`. A token that exists in only one mode is a bug (this is exactly how the info callout was once broken).
- **Do** keep the leaf to a once-per-screen spotlight; use weight or size for emphasis inside tinted surfaces.
- **Do** put the site's frame on `--bg-chrome` (or `--bg-sidebar`) and everything the reader reads or operates on `--bg`: by day the page is the brightest plane on screen, and a new bar or panel has to say which of the two it is.
- **Do** keep red for the ladybug — the logo star and the warning → danger ladder — in both themes.
- **Do** give code panels a palette per theme, and verify each one against its own panel.
- **Do** use PT Serif for headings/quotes, Inter for body/UI, Consolas for meta labels and code, at weights 400/600/700 only.
- **Do** pair every callout/icon with `class="icon"` and `currentColor` so it inherits the semantic color and the shared 24px size.
- **Do** keep the site's own links in the **same tab** — the nav, section rows, footer icons, and outbound rows like `/news/sources` and «Прочие ссылки»: no `target="_blank"`, so readers keep their back button and choose a new tab themselves (WCAG G200; NN/g; GOV.UK). The one exception is a link *inside an article's prose* that leaves the site: the markdown renderer opens it in a new tab with `rel="noopener noreferrer"`, because articles are reference material read while doing something else, and following the Ren'Py manual mid-example shouldn't cost the reader their place in it. Authors write both kinds the same way; the renderer decides. The other exception is hand-written, at the owner's request: the resource lightbox's «Открыть файл» opens the original beside the list, so the lightbox and the reader's place in a long listing survive the look.
- **Do** use тире (`—`, U+2014) as the Russian title separator (`'Авторы — ES Doc'`) and nested-list marker. This deliberately overrides the English "no em dashes" default: the audience reads Russian, where тире is correct.
- **Do** respect `prefers-reduced-motion`: disable both transitions and keyframe animations, merged into one block per stylesheet.
- **Do** underline links inside running text at rest — a faint `--link-underline` (half the link's own colour), full on hover and focus. Colour alone can't mark them: accent on ink is 2.78:1 by day and 1.49:1 at night, under WCAG 1.4.1's 3:1. Navigation, section rows and buttons read as links by place and shape and stay bare; footnote markers and code-labelled links carry their own cue.
- **Do** keep every state visible in Windows' high-contrast mode (`forced-colors: active`), which drops shadows and repaints backgrounds: focus goes through `outline` (a transparent one where the design draws its ring with a shadow), the current page gets a `text-decoration` underline, the active search option the system `Highlight`.
- **Do** draw icons that repeat down a long list with CSS (`.res-icon`: a data-URI mask filled with `currentColor`), not inline SVG — on the 1 162-row sprite listing, three SVGs a row were half the HTML and some 9 300 DOM nodes.

### Don't:
- **Don't** ship the sterile autogenerated **ReadTheDocs / Sphinx** look, the corporate gray of a **Confluence wiki**, or try-hard **neon/cyberpunk gaming** aesthetics (PRODUCT.md anti-references).
- **Don't** use `#000` or any untinted gray, and don't use white for anything but the page and the things that sit on it. Every other neutral leans toward the leaf by day and the lake by night.
- **Don't** make anything interactive red — no red links, buttons, focus rings or current-page marks (the Ladybug Rule).
- **Don't** use `border-left`/`border-right` wider than 1px as a colored accent stripe on callouts, banners, rows, or blockquotes. Use a full border, a background tint, or nothing. (The sidebar's 1px `--border` nested-nav indent is the only allowed structural exception.)
- **Don't** add drop shadows to cards, rows, or callouts. Only the search popover, the image lightbox, the player bar and the back-to-top button leave the page plane.
- **Don't** color headings green; ink + PT Serif carries them, and on this site a green heading reads as a link.
- **Don't** reintroduce font-weight 500, or a display font in UI labels/data.
- **Don't** replace тире (`—`) in Russian copy with a colon, pipe, or middle dot.
- **Don't** hand-write `target="_blank"` anywhere else — the renderer owns the prose case, and the lightbox's «Открыть файл» is the one written by hand — and don't add external-link/new-tab icons (NN/g and GOV.UK found they aren't reliably understood; GOV.UK removed theirs).
- **Don't** add a pause or stop control to the home hero's crossfade. It was removed deliberately at the owner's request and is to stay out; `prefers-reduced-motion` is its off switch (see the hero under Components).
