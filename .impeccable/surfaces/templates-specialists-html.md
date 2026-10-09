---
version: 1
slug: "templates-specialists-html"
primary_target: "templates/specialists.html"
related_targets: ["static/css/specialists.css","static/js/specialists.js"]
---

## Mode
Operate / extend the incumbent collaborator directory while preserving records and ES Doc's visual system.

## Direction and navigation
Find a collaborator by discipline, availability and work. Retain the five wrapping category links with counts, gallery/board/table views, search and status controls. Category changes preserve view, search, status and sort. Empty categories explain the relevant work and provide the existing contact link. Default sorting places open commissions first, then names; explicit alphabetical sorting survives URL synchronization.

## Profiles and portfolios
Category lists in specialists.yaml hold independent profiles, including separate portfolios for the same person in different disciplines. Preserve contacts, commission statuses and examples. Preview is explicit and never derives from or populates works. Relative work links use the confined /specialists/res route; images and tracks use the shared lightbox and player.

## Gallery and identity
Gallery cards retain equal heights within each row, a 3:2 preview frame and corner status. Missing or failed artwork shows a decorative PT Serif initial. Failed previews remove their lightbox link and loading skeleton. Missing descriptions remain absent; previews remain independent from work examples.

Each identity row has a round decorative initial: 30px in gallery/board and 26px in the table. An optional logo covers it; a missing or failed logo exposes it. Transparent logos retain the existing background so the initial cannot show through. The fallback is hidden from assistive technology because the adjacent name supplies the identity.

## Quality bar
Inherit leaf day / lake night, PT Serif headings, Inter body and flat bordered surfaces. Preserve directory state, portfolio playback, initial fallbacks and equal gallery heights on desktop and mobile. The inherited status-badge clamp reaching 0.625rem remains an existing exception, not a new typography rule. No shipping raster assets or additional design tokens are required.
