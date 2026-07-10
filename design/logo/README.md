# Handoff: LifeOrg Logo & Icon System

## Overview
Brand mark package for **LifeOrg**, a life-organization program. Two deliverables:

1. **`life.org` wordmark** (primary, per latest direction) — type-only mark with a styled green period between "life" and "org". No glyph.
2. **Open-book icon set** (earlier explorations, kept as options) — Spotify-energy circular/squircle icons with an open-book glyph, for favicon / app / installer contexts where the wordmark is too small to read.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look, not production code. Recreate them in the target codebase's environment using its established patterns; if no environment exists yet, choose the most appropriate stack. The SVGs in `assets/` ARE production-ready vectors and may be used directly.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and geometry are final. Recreate pixel-perfectly.

## The Wordmark: `life.org`
- Font: **Outfit**, weight **700** (Google Fonts: https://fonts.google.com/specimen/Outfit)
- Case: all lowercase — `life` + dot + `org`
- Letter-spacing: `-0.02em`; line-height: `1`
- Text color: `#0B1512` (near-black, green-tinted)
- **Styled period**: not the font's glyph — a geometric circle:
  - diameter `0.18em`, `border-radius: 50%`, fill `#12B76A`
  - horizontal margin `0.07em` each side, sits on the baseline
  - at very small sizes (≤32px icon), bump diameter to `0.2–0.25em` so it survives rasterization
- On dark backgrounds: text `#FFFFFF` or `#F2F5F3`, dot stays `#12B76A`

### Icon-size ramp (installer / OS requirements)
Render the wordmark centered in a square canvas at: **16, 32, 48, 64, 128, 256, 512 px**
(Windows ICO: 16–256; macOS ICNS: 16–512@2x = 1024; Linux hicolor: 16–512.)
Font-size ≈ `0.26 × canvas size` fills ~94% of the width.
⚠ Known limitation, flagged in the design: below 48 px the wordmark is illegible. Recommend pairing with one of the glyph icons (assets/) for 16–48 px slots.

## Icon Set (options, `assets/`)
All on a 100×100 viewBox, strokes `round` cap/join:
- `icon-wave-green-circle.svg` — green circle, dark "stacked pages + spine" glyph (stroke 7)
- `icon-wave-dark-circle.svg` — inverted: `#0B1512` circle, green glyph
- `icon-book-green-circle.svg` — green circle, classic open-book outline (stroke 6)
- `icon-wave-green-squircle.svg` — app-icon rounded square, `rx=24`
- `icon-book-dark-squircle.svg` — dark squircle, green book — installer/desktop feel
- `glyph-wave-green.svg` — bare glyph, no container (header use)

## Design Tokens
- Green (brand): `#12B76A`
- Ink (near-black): `#0B1512`
- Page/canvas neutrals used in the exploration doc: `#f2f5f3` (page), `#eef1ef` (tile), `#e5eae7` (border), link green `#0f7a44`
- Squircle radius: 24% of icon size
- Glyph stroke: 7/100 of icon size (6/100 for book outline)

## Interactions & Behavior
None — static brand assets. No hover/loading/error states.

## State Management
None required.

## Assets
- `assets/*.svg` — original vectors created in this project (no third-party imagery)
- Outfit font — Google Fonts, OFL license

## Files
- `LifeOrg Icon.dc.html` — full exploration canvas: Turn 2 = life.org wordmark + size ramp (id `2a`); Turn 1 = six icon explorations (ids `1a`–`1f`)
- `assets/` — standalone SVG icons listed above
