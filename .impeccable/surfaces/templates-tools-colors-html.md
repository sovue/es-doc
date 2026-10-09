---
version: 1
slug: "templates-tools-colors-html"
primary_target: "templates/tools_colors.html"
related_targets: ["static/css/colors.css","static/js/colors.js","static/js/colors-core.js","static/js/colors-named.js"]
---

## Mode
Operate / practical color workbench for Russian-speaking Ren'Py modders.

## Direction
Preserve ES Doc's leaf day / lake night, Inter, PT Serif and flat Lucide controls. The workflow is pick or paste / refine / copy / compare a foreground-background pair / explore palettes or a local image. Spectrum gradients and checkerboards represent color data.

## Layout
Six editable formats occupy the left desktop column, the visual editor the right, and contrast follows both. DOM and visual order agree. Mobile keeps formats first and offers section buttons that focus and scroll without navigating or resetting selection. Tabs wrap; keyboard help stays beside the editor. Mobile inputs use the body size and controls retain 44px targets.

## Behavior
One sRGB selection synchronizes HEX, Python RGB/RGBA, CSS RGB/HSL/OKLCH and precise channels. HEX shortens only losslessly and includes alpha automatically; Python RGB excludes alpha and edits preserve existing alpha. OKLCH wraps without hiding precision. Invalid fields retain the last valid color and show individual errors with accessible descriptions. Clipboard failures expose a selectable value.

The edit-role selector chooses an existing preview color; swap exchanges the pair and reset restores the original green/white pair. Contrast composites transparency over white, checks unrounded ratios and rounds its display down. A 64-step undo history includes color, preview pair/role and saved collections. Recent colors remain separate, limited to twelve. Clearing saved colors has both undo and an explicit recovery action that retains later color edits. Duplicate saves create no history step; unavailable storage reports session-only persistence.

Field, wheel and image sampling work by keyboard. Local images retain sampled alpha, have bounded canvas dimensions and explicit loading failures. Soft navigation releases listeners, decoded bitmaps, timers and canvas memory, and rejects stale asynchronous work. The native screen pipette is feature-detected.

## Named palette
«Именованные цвета» preserves all 1012 name/HEX pairs and their source order from charColorCodes.rpy. Search accepts names, full or shortened HEX, ignores case and treats е/ё alike. Initially render 100 colors; an explicit action reveals the next 100. Every sample shows its name and HEX. Delegate sample clicks and avoid repainting unchanged samples during color editing.

## Quality bar
Keep all six formats visible and editable, independent field errors, recovery, copy feedback and keyboard focus. Verify desktop and mobile in both themes without document overflow. Never use U+00B7 in authored UI or design-system copy; use slash separators. DESIGN.md and this contract hold current rules rather than historical review logs.
