---
target: ambient background and vignette in ES Doc documentation
total_score: 32
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
target_identity: "file:D:\\GITHUB\\es-doc\\static\\css\\main.css"
target_fingerprint: "sha256:b211012fdbf1b2451af1c121326d668dc1e97b155be387f4668ce7477046bc33"
target_path: "D:\\GITHUB\\es-doc\\static\\css\\main.css"
timestamp: 2026-09-25T09-05-29Z
slug: static-css-main-css
---
## Design specificity
**Strong fit.** A blurred scene from *Бесконечное Лето* belongs in the outer margins of ES Doc: it lends the documentation a sense of place without competing with the article. Keep the reading shell opaque and the image decorative. The vignette should darken the outer margins while leaving the panel edge clean.

## Design health score — Read mode

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3/4 | Active document and current section are visible; the directory has no breadcrumb. |
| 2 | Match to real world | 4/4 | Russian modding terms and ES-specific names fit the audience. |
| 3 | User control and freedom | 3/4 | Global navigation, document tree and browser history provide clear exits. |
| 4 | Consistency and standards | 4/4 | Header, tree, headings and code blocks use consistent patterns. |
| 5 | Error prevention | 3/4 | Grouping reduces navigation errors; no destructive actions are present. |
| 6 | Recognition rather than recall | 3/4 | The tree and article TOC expose locations, though the directory takes scanning. |
| 7 | Flexibility and efficiency | 3/4 | Search and hierarchical browsing support both quick lookup and exploration. |
| 8 | Aesthetic and minimalist design | 3/4 | Reading hierarchy is calm; wide-screen edge separation needs a final visual check. |
| 9 | Error recovery | 2/4 | No context-specific recovery state for a missing or broken article was observed. |
| 10 | Help and documentation | 4/4 | The hub and article TOC support the site's primary task directly. |
| **Total** |  | **32/40 — Good** | Strong reading experience; check the ambient frame at ultrawide width. |

## Cognitive load
**Moderate: 2 of 8 checklist failures.** The documentation directory exposes more than four choices at once and requires scanning. Section headings and the sidebar chunk the material, while the search field offers a faster path. Article reading itself stays focused; no cross-screen memory bridge was observed.

## Emotional journey
The page starts calm and trustworthy: title, tree and TOC establish orientation. Examples and semantic callouts support confidence while reading. On an ultrawide screen, scenery can add the game's atmosphere; weak edge contrast makes it feel like image bleed instead of a deliberate frame. There is no high-stakes emotional peak in this flow.

## Strengths

1. Serif titles and legible sans-serif body text give articles a clear editorial hierarchy.
2. Left navigation, central reading area and right TOC support both browsing and lookup.
3. Semantic callouts and code treatments are easy to distinguish while the article surface stays stable.

## Priority issues

1. **P1 — The ambient effect is only visible when the viewport exceeds the 96rem page shell.** At the available 1265px preview width, the opaque shell fills the viewport and covers the scenery, so it cannot validate the edge treatment. The user's supplied 2524px screenshot does expose the margins. Validate the final vignette above the shell width before tuning it further.
2. **P2 — The earlier vignette was too subtle to read as an intentional frame.** The endpoint and transition have now been strengthened: the light theme reaches 62% ink tint, the night theme 94% page tint, and the transition begins sooner. The night endpoint is already close to opaque; making it stronger risks hiding the scene entirely. Keep the document surface unchanged.
3. **P2 — The documentation directory presents a long run of article links.** Group labels help, but first-time readers still scan many choices. This is separate from the background change; progressive disclosure could help if the directory itself is in scope.

## Persona red flags
- **First-time modder:** many directory links need scanning; the search field and “Как создать свой мод” link are the clearest starting points.
- **Experienced modder:** global search and the article TOC help quick lookup; the first viewport does not show a copy/anchor shortcut for each heading.
- **Keyboard or screen-reader user:** the vignette is decorative and should remain behind the opaque content and focus outlines. No full keyboard or screen-reader pass was part of this review.

## Minor observations
- The article title and breadcrumb are clear and untruncated.
- The page tree's current item is easy to find.
- The documentation index feels sparse at the available viewport; this likely changes at the intended wide layout.
- In dark mode, avoid raising the 94% vignette endpoint without seeing it at wide width.

## Provocative question
Should the scene appear only when the page has wide outer margins, or should the reading shell narrow so that the scene and vignette are visible on regular desktop screens too?
