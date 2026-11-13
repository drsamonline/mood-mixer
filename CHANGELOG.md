# Changelog

Everything below is one static site: HTML, CSS, vanilla JavaScript. No build step, no framework, no network calls.

## 2.19.1 — 2026-11-13

**Closed out**

- `selftest.html` fetches its nineteen files in parallel instead of one after another; on a slow connection the page used to finish after the reader had given up and read as "files: 0".
- README carries a status line: complete at 2.19.0, nothing planned or partial.
- Tag `v2.19.1` marks the release.

## 2.19.0 — 2026-11-13

**Lighthouse motion removed**

- Every lighthouse animation is gone: no beam rotation, no lamp pulse, no glow, no water drift, no float. All `@keyframes` for it were deleted, along with the `requestAnimationFrame` driver.
- The `Beacon` button in the hero and the `Lighthouse beacon` switch in Settings are removed, with their state, persistence and classes.
- The drawing now appears only in focus mode, still, at 0.85 opacity. Nothing about it runs on a timer.
- Verified: `transform` attribute absent, `animationName: none` on the sweep and the lamp, no beacon controls in the DOM, zero console errors.

## 2.18.0 — 2026-11-13

- The beam is now driven by `requestAnimationFrame` writing `transform="rotate(…)"` on the SVG group, so it no longer depends on CSS transform support for SVG elements. Measured: 6.4° → 12.9° → 31.3° → 44.6° over two seconds.
- The lighthouse is visible on the mixer as well as in focus mode — faint at 0.38 opacity in the lower corner, full strength in focus — so the motion is visible without hunting for a mode.
- Beacon starts on load, not only when focus mode opens.
- The `Beacon` button and the Settings switch both stop and restart the loop immediately.
- Under reduced motion the beam still turns, at a 56-second revolution, while the float and water drift are dropped.

## 2.17.0 — 2026-11-13

- The beacon now animates without any script: motion is on by default in CSS and only an explicit `lh-still` opt-out stops it, so a JavaScript failure can no longer leave a dead lighthouse.
- `body:has(.app-container.focus-mode)` fallback for visibility, in addition to the class the script sets.
- `Beacon` button beside the hero actions, next to the Settings switch.
- Under `prefers-reduced-motion` the spatial motion stops but the lamp and glow keep pulsing, so the drawing is never inert.
- Background is solid by default; short palette links no longer force a gradient. Gradients are opt-in and stay inside one hue (lighter → base → darker of the current colour).
- One-time migration: a stored save with no `schemaVersion` resets background to solid and switches the beacon on, so a gradient picked up from an old shared link does not stick.
- `Reset` also returns the background to solid.

## 2.16.0 — 2026-11-13

- The beacon now rotates a full revolution every 14 s instead of rocking ±13°, so the motion is unmistakable.
- `transform-box: view-box` on the animated groups: without it the rotation origin resolved against the bounding box and the sweep barely moved.
- Fixed an initialisation-order bug: the motion class was applied before its `root` reference existed, which threw and left every animation off.
- `Lighthouse beacon` switch in Settings, persisted; under `prefers-reduced-motion` the same motion runs at a quarter speed rather than stopping dead.
- Verified by sampling computed transforms 900 ms apart: the rotation matrix advances (0° → 28° → 54°) and six animations are live.

## 2.15.0 — 2026-11-13

**Visual polish**

- Focus mode gains a vector lighthouse: tapered tower, gallery, lantern with a glow, roof, rocks and two water lines, plus two beam shafts that sweep on a seven-second alternate and a lamp that pulses.
- The drawing is tinted from the current colour but pulled 82 % towards the backdrop's opposite ink, so it reads on light and dark palettes alike.
- `prefers-reduced-motion` stops the sweep, the pulse and the water drift; print hides the drawing entirely.
- Polish pass across the app: selection colour, inner highlight on cards, sheen on primary buttons, visible focus rings on swatches, preset and pair cards, dividers between panel sections, hover states on history and saved rows.

## 2.14.0 — 2026-11-13

**Hardening**

- Lint is real: ESLint (no-undef as error), html-validate on all four pages, stylelint on all stylesheets. Configs are committed (`.htmlvalidate.json`, `stylelint.config.js`).
- `tools/check-links.mjs` verifies every local `href`/`src`, every precached file and every manifest icon.
- CI at `.github/workflows/check.yml` runs links, JS, HTML, CSS and manifest validation on every push.
- Fixed a real defect found by ESLint: a stray `if (active)` inside the focus-mode HUD timer threw on every tap while in focus.
- ARIA fixes: `role="group"` on the labelled containers so `aria-label` is legal.
- This changelog.

## 2.13.0

- Paste an image anywhere to seed the sliders from its dominant colour.
- `Export folder` downloads one folder as JSON.
- Saved moods gained `Compare`; the dialog takes any palette.
- Focus mode shows a hex caption for 1.4 s on entry and on colour change.

## 2.12.0

- `From photo` in the hero seeds the sliders without opening the panel.
- `Rename folder` rewrites every mood in the active folder.
- Comparison saves as an SVG sheet.
- Footer links to the offline self-test; the page reads the asset version from the mixer so its list cannot drift.

## 2.11.0

- Import can apply a bundle's settings, with a switch in the preview.
- Compare takes an optional second palette: three columns.
- Deleting saved moods leaves an Undo strip for twenty seconds.
- `selftest.html` loads all 19 precached files and labels each network or cache.

## 2.10.0

- Compare marks the higher-contrast colour at each position.
- Naming dialog with three suggestions replaces the prompt.
- Quiet mode suppresses announcements.
- Export is one bundle: settings, moods, collections, version.

## 2.9.0

- Palette compare, colour by colour, with both grades.
- Saves land in the last used folder.
- Half-second press on non-controls enters focus mode.
- Offline pill appears only when the network drops.

## 2.8.0

- Bulk select, move and delete for saved moods.
- Nearest CSS colour name under the current hex.
- Pinned palette, vibe word and panel state survive a reload.
- Recent palettes print as an A4 sheet.

## 2.7.0

- One note per saved mood; search across name, vibe, hex, folder and note.
- Focused sliders step 1 point, 10 with Shift, announced politely.
- Twelve recent palettes export as one SVG contact sheet.

## 2.6.0

- Sheet PNG: the SVG sheet rasterised at 2×.
- Saved moods show their text-contrast grade.
- Import previews counts before merging.
- Names pre-filled as `<vibe> · <harmony>`.

## 2.5.0

- SVG sheet with hex, RGB, HSL and contrast per colour.
- Pinned palette links (`#q=…`) restore exact colours.
- Slow drift option in focus mode.
- Typography via `local()` `@font-face` — no webfont request.

## 2.4.0

- Colour-vision simulation rows.
- Image eyedropper: five dominant colours, local.
- Collections: named palettes with settings, carried in the backup.
- Undo reorder for palette history.

## 2.3.0

- Six-character palette codes (`#p=…`) replace the long query hash.
- Backdrop-aware text: near-black or white by contrast.
- Saved-mood thumbnails.
- Install button when the browser offers one.

## 2.2.0

- Focus mode hides every surface at once; the screen becomes the colour.
- Randomise button in the header.
- Copy link, with a clipboard fallback.

## 2.1.0

- Offline hardening: service worker v11, network-first, 19-file precache.
- `?v=` asset versioning so a stale cache cannot win.
- Presets, text export, keyboard dialog.

## 2.0.0

- Shared colour engine (`color-core.js`): HSL, RGB, HSV, six harmony schemes, WCAG grading.
- Contrast badges per swatch; readable pairs.
- Exports: CSS, JSON, Tailwind, PNG card.
- Undo/redo, keyboard shortcuts, URL state.
- Landing page with a working demo; sponsor block on both pages.
- Installable PWA with relative paths, icons, `404.html`, `robots.txt`, `sitemap.xml`.
- MIT licence.

## 1.0.0 — initial

Landing page, mixer, sliders, palettes, local saving.
