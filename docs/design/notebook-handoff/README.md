# Handoff: Number Planes — the interactive notebook (Chapter II reference build)

## Overview

**Number Planes** is a "living notebook" that teaches the three real 2-D number
systems — **complex, dual, split** — as one family controlled by a single dial:
`j² = p`. Turn `p` and the whole arithmetic of the plane changes. The notebook is
built from **plates** (cards on a grid) and **chapters** (curated reading paths
through those plates). This handoff covers the interactive chapter surface, and in
particular **Chapter II — the plane**, which we just finalized as the *reference
implementation* of the notebook's central idea:

> **One `p` drives everything.** There is a single source of truth for the dial
> value, and every plate on the page — the slider, the spinnable knob, the level-curve
> plot, the three-worlds selector, the quadratic root count, the main product plot —
> reads and writes that one value. Move any control and the entire page re-derives
> together.

That shared-state contract is the thing to preserve when porting to the codebase.
Everything else is presentation.

## About the design files

The files in `designs/` are **design references authored in HTML** — high-fidelity,
fully interactive prototypes that show the intended look, motion, and behavior. **They
are not production code to lift directly.** Each `*.dc.html` is a self-contained
"Design Component": template + a small logic class, rendered by our prototype runtime
(`designs/support.js`). Open any of them over `http://` to explore the real interactions.

Your task is to **recreate these designs in the target codebase's environment** (React,
Vue, Svelte, native — whatever the app already uses) with its established patterns:
its component library, its state store, its router, and — importantly — its **existing
theme/skin system** (see *Design Tokens* below; the app already has one, and the
prototype only mirrors a subset of it). Do not port `support.js`; it is a prototype
harness, included only so the references run.

The `cards-reference/` folder is the **content graph** these plates render. Each plate
on the grid corresponds one-to-one to a card ID (`C2`, `PL`, `CR`, …). The prose,
glances, and cross-links in those Markdown+YAML files are the real copy — pull text
from the cards rather than the prototype where they differ, and use the card `links`
to wire navigation. Your repo very likely already contains this corpus; it is included
here so the plate↔card mapping is unambiguous.

## Fidelity

**High-fidelity.** Colors, typography, spacing, grid geometry, animation timing, and
interaction semantics in Chapter II are final and intentional. Recreate them precisely
using the codebase's libraries. Where the prototype hard-codes a palette inline, map it
onto the app's theme tokens instead of copying hex values (the inline palette is a
faithful subset of the app skins — see *Design Tokens*).

Chapters I and III and the Notebook are included as **context**: Chapter III is where
the shared "j² dial as a slider" language originated (Chapter II now matches it);
*Number Planes — The Notebook* is the source of the figures Chapter II absorbed (its
Figure 4 level-curves + renormalization, and Figure 3a "tilt the axes"). Treat those
two as reference for the math/figures, not as final page layouts.

---

## Screens / Views

### Chapter II — the plane  (`designs/Chapter II - The Plane.dc.html`) — PRIMARY

A single scrollable page: a header (running readout), a **plate grid**, and a footer
line with chapter nav.

**Layout — the plate grid.**
- CSS Grid, `grid-template-columns: repeat(5, 208px)`, `grid-template-rows: repeat(4, 208px)`,
  `gap: 12px`, `justify-content: start`. Rendered size ≈ **1088 × 868 px**; page container
  is `min(1160px, 100%)`, centered, with column-gap flex layout `gap: 22px` vertically.
- Body padding `40px clamp(14px,3.5vw,56px) 90px`. Background is a radial "desk" gradient
  per theme.

Seven plates fill all 20 cells:

| Plate | Card | Grid area (col / row) | Footprint | Role |
|---|---|---|---|---|
| **C2** | `C2` | 1–3 / 1–3 | 3×3 hub | main product plot + j² slider + add/mul flip |
| **PL** | `PL` | 4–5 / 1–2 | 2×2 | level-curve plot + renormalize box + tilt box |
| **DV** | `DV` | 4 / 3 | 1×1 flip | three planes at the cuts |
| **QD** | `QD` | 5 / 3 | 1×1 flip | quadratic, live root count |
| **CR** | `CR` | 1–2 / 4 | 2×1 | the dial-is-a-circle **spinnable knob** |
| **L2** | `L2` | 3 / 4 | 1×1 flip | "strangers" multiply |
| **FTA** | `FTA` | 4–5 / 4 | 2×1 flip | the sealed orb (not-yet-in-book) |

Every plate: `background: var(--paper)`, `1px solid var(--border)`, `border-radius: 2px`.
Hover raises `--border` → `--border-strong`; the two hub plates (C2, PL) additionally
support a **locked** state (click to pin) that switches the border to `--voice` with an
inset ring and reveals handwritten annotations (`.ann`, `--hand` font, `--voice` color).

#### C2 — the hub (the control center)
Top strip: a live pulse dot, `C2 · THE PLANE` label, a mode word (`MODE: ADDING` /
`MODE: MULTIPLYING`), and a hover/lock annotation.

- **The j² slider** (this replaced the old rotary dial). Row of three snap chips
  `−1 · 0 · +1` (each lights in its plane color when active) + a live numeric readout,
  above a horizontal SVG track (viewBox `0 0 600 30`):
  - Left half `x∈[14,300]` stroked `--d1` (blue), right half `[300,586]` stroked `--d5`
    (orange), zero node `--ok` (green) at center.
  - Ticks + labels at `−2 −1 0 +1 +2` (`x = 300 + m·143`).
  - Ring thumb: outer `r=9` `--paper2` fill, `2.4px` stroke in the current plane color,
    `r=2.5` center dot. Position `x = 300 + clamp(p,−2,2)·143`.
  - Drag or click anywhere on the track. Value clamps to `[−2, 2]`, **snaps to −1/0/+1**
    within `0.09`, rounds to 2 dp. Setting it resets the rescale ruler (`rsS → 1`).
  - This control's visual grammar (blue/green/orange zones, ring thumb) is shared with
    Chapter III — keep them identical.
- **ADDITION / MULTIPLICATION flip.** A big display word (`--disp`, 700, 25px) that flips
  in 3-D (`rotateY(-180deg)`) on tap, with a **cutout flap** below (`.cut`, 60px tall,
  bleeds to the plate edges) that turns a beat later (`+0.055s` stagger). Front word
  `ADDITION` in `--live`, back `MULTIPLICATION` in `--voice`. Tapping toggles `pm`
  between `add`/`mul` and swaps what the plot draws.
- **The main z·w plot** (viewBox `0 0 560 470`): axes crossed at `(280,235)`.
  - Coordinate map: `X(v) = 280 + v·44`, `Y(v) = 235 − v·44·rsS`. **The vertical scale
    carries `rsS`**, so a renormalization animates *here too*, not only in PL.
  - Two draggable points **z** (`--live`) and **w** (`--voice`), `r=12` haloed handles,
    each drawn as a spoke from origin. Drag clamps `x∈[−5.8,5.8]`, `y∈[−4.8,4.8]`.
  - **Add mode:** dashed guides from z and w to their vector sum; a bold `--ink` spoke to
    `z+w`. (Addition ignores `p`.)
  - **Mul mode:** the product `z·w = (xa + p·yb, xb + ya)` drawn as a `--pColor` node on
    a dashed **rail**; faint rail line + tick marks at the product for `p = −1, 0, +1`.
  - Point labels `z`, `w`, and `z+w` / `z·w` follow the geometry.

#### PL — the plane's shape (was the dial panel)
Header label + a live rail-count readout (`0 RAILS · an ellipse` / `1 RAIL · two lines` /
`2 RAILS · a hyperbola` / `∞ · dual again`).

- **Level-curve plot** (viewBox `-130 -130 260 260`, unit `U = 52`px): faint grid
  (`--grid`), axes at 38% ink. A `<g transform="rotate(rot)">` wraps the level set so the
  **tilt** animates the whole figure. Depending on `p`:
  - `p<0` **complex** → an **ellipse** `rx=52`, `ry = min(52·rsS/√|p|, 320)`.
  - `p=0` **dual** → a **double vertical line** at `x=±52` (`--ok`).
  - `p>0` **split** → a **hyperbola** (sampled `cosh/sinh`, `--pColor`) plus its two
    dashed asymptote rails (`--d5`).
  - `p→∞` → treated as dual-again.
  - Markers: unit `1` at `(52,0)`, `j` at `(0,−52·rsS)`, and `j²` at `x = 52·p`. Axis
    tick labels (`1`, `j`, `j²`) fade out while tilted.
- **Renormalize box** (`ĵ = j/√|p|`): a mini number line with `−1 / 0 / +1` marks, a
  dashed target circle at the sign of `p`, a filled `--pColor` dot at `p`, and a little
  arc from `p` to its normal form. A **"reform to ±1 ↻"** button appears only when
  `p` is off the cuts and finite; otherwise a resting message (`already ±1 · normal form`
  / `p = 0 · nothing to stretch` / `p → ∞ · the far dual`). Clicking runs the animation
  described under *Interactions*.
- **Tilt box** (`e± = (1±j)/2`): a tiny axes glyph that also rotates with `rot`, plus a
  **"turn 45° ↻ / turn back ↻"** button. Copy changes with sign.

#### CR — the dial is a circle (now a spinnable knob)
A 180×180 SVG dial (radius 62 around center `(90,90)`): left semicircle `--d1`, right
`--d5`, `--ok` nodes at top (`0 · dual`) and bottom (`∞ · dual again`), `−1`/`+1` labels
at the sides. A pointer line + ring thumb sit at angle `φ = 2·atan(p)`.
- **Spin it.** Pointer angle `φ = atan2(px−90, 90−py)` maps to `p = tan(φ/2)` — this is
  the `p ↦ 1/p` circle: top = `0`, right = `+1`, bottom = `±∞`, left = `−1`.
- Snaps to `0 / ±1 / ±∞` near the cardinal points; reaches high `|p|` (clamped to **16**,
  used as the ∞ proxy). Setting it resets `rsS → 1`. It reads and writes the same `p` as
  everything else — it is a *second view of the dial*, not an independent control.
- Beside it: live `j² =` readout, plane name, and a handwritten caption.

#### DV / QD / L2 / FTA — the flip plates
3-D flip cards (`rotateY(180deg)`), triggered by hover **or** click per the `trigger`
prop. Front = glance; back = the card's note plus small in-context actions.
- **DV** "three worlds": front shows `−1 · 0 · +1` and the current plane name; back has
  three buttons (`p<0` complex/turns, `p=0` dual/shears, `p>0` split/squeezes) that each
  **set `p`**, with the active one outlined in its plane color.
- **QD** `t² = p`: front shows a live **root count** (2 dots / 1 dot / ∅) colored by
  plane; back explains discriminant ↔ rail count ↔ root count.
- **L2** "strangers": `(a,b)·(c,d) = (ac,bd)`; back has a **"set the dial to +1"** link
  (it *is* the split plane) — ties into the tilt at PL.
- **FTA** the seal: a dashed "sealed / not yet in the book" orb; back explains ℂ completes
  algebra ("the dial forced to −1").

### Chapter I / III & the Notebook (context only)
- `Chapter I - The Line.dc.html` — the one-coordinate "before the plane" beats.
- `Chapter III - Three Worlds.dc.html` — origin of the shared **j² slider** grammar.
- `Number Planes - The Notebook.dc.html` — the full plate room; **source of the figures**
  Chapter II absorbed (Figure 4: level curves + renormalization; Figure 3a: tilt the axes).

---

## Interactions & behavior

**Shared-state contract (the important one).** All of these read/write a single `p`:
the j² slider, the CR knob, the DV plane buttons, the L2 "+1" link, the QD dots, the PL
level curves + rail label + renormalize + tilt-availability, the main z·w plot (both its
product math and its vertical scale via `rsS`), and the header/CR readouts. **Default
`p = −1` (the complex plane) on load and after reset.** Any reset that returns `p` to
`−1` must snap *every* dial/knob/selector back in sync — they are all projections of `p`.

**Animations & easing.**
- Plate/word/flap flips: `transform` over `0.55–0.6s`, `cubic-bezier(.3,.85,.35,1)`;
  the mode cutout flap is delayed `+0.055s` after the word. A global **speed** multiplier
  (`--spd`, prop `speed`) divides all these durations.
- **Renormalize** (≈1.8s, two phases, smoothstep `u·u·(3−2u)`): phase A (900ms) stretches
  the ruler `rsS: 1 → √|p|`; phase B (900ms) slides `p → ±1` while `rsS = √|p(t)|`, landing
  at `p=±1, rsS=1`. Drives the ellipse/hyperbola in PL *and* the main plot's vertical scale.
- **Tilt** (800ms smoothstep): `rot` animates `0 ↔ 45°`, rotating the PL level-curve group
  and the tilt-box glyph.
- Hover raises plate borders; hub-plate hover/lock fades in `.ann` annotations.

**Controls.** Slider = drag/click with snap; CR = rotational drag with snap; z/w = point
drag on the plot; mode word = tap to toggle; renormalize/tilt = button; DV/L2 buttons and
snap chips = set `p`; hub plates = click to lock; flip cards = hover or click.

**Guards.** Renormalize and tilt each no-op while their own animation is mid-flight.
Renormalize is disabled at the cuts (`p≈0, ±1`) and at ∞.

## State management

Single component state, all views derived in one `renderVals()` pass:

- `p: number` — **the dial value (j²). The one source of truth.** Default `−1`.
- `pm: 'add' | 'mul'` — product-plot mode. Default `add`.
- `zx, zy, wx, wy: number` — the two draggable points. Defaults `(1.6,1.1)`, `(−1.2,0.9)`.
- `rsS: number` — renormalization ruler scale (vertical unit multiplier). Default `1`.
  Reset to `1` by any direct `p` set; animated by renormalize.
- `rot: number` — tilt angle in degrees, `0` or `45` (animated between).
- `on: {[cardId]: true}` — which flip plates are open.
- `pin: {C2, PL: boolean}` — which hub plates are locked.

Derived per render: plane name/color (`p<0` complex/`--d1`, `p=0` dual/`--ok`,
`p>0` split/`--d5`, `|p|≥15` dual-again/`--ok`), rail count, root count, all SVG
geometry, the CR angle `2·atan(p)`, and every label. In the codebase, `p` (+ `pm`,
`rsS`, `rot`) should live in a **shared store** scoped to the notebook page so plates in
different components stay coherent; the flip/lock flags can be local.

## Design tokens

**Use the app's existing skin system — do not hard-code these.** The prototype defines an
inline palette per theme on a `.nbr[data-nb="…"]` wrapper for 5 skins: **observatory**
(default dark), **manuscript** (warm paper), **primary** (bright light), **blueprint**
(blue), **phosphor** (green terminal). These are a faithful **subset** of the app's chrome
skins. The canonical source in the repo is **`src/chrome/theme.css`** (8 skins keyed on
`[data-theme]`), with the shared saved-skin key **`animath:v1:chrome:skin`** and the
document-context mirror in **`public/guide-theme.css`**. Map the prototype's local names
onto the real chrome tokens:

| Prototype (`--*` on `.nbr`) | Meaning | Chrome equivalent (`theme.css`) |
|---|---|---|
| `--desk` / `--deskimg` | page background + radial | `--bg` (+ derived gradient) |
| `--paper`, `--paper2` | plate / raised surface | `--card` |
| `--ink`, `--dim`, `--dim2` | text, muted, faint | `--fg`, `--muted` |
| `--border`, `--border-strong`, `--grid` | rules & grid | `--rule` |
| `--live` / `--voice` | primary / secondary accent | `--accent2` / `--accent` |
| `--seal` | orb/seal highlight | `--accent` |

**Semantic (plane) colors** — keep these meanings across skins:
`--d1` blue = `p < 0` complex · `--ok` green = `p = 0` dual · `--d5` orange = `p > 0` split.
Observatory values: `--d1 #5fa8ff`, `--ok #4cc878`, `--d5 #ff9a5f`, `--live #5fe3cd`,
`--voice #ffce47`, `--ink #eef1f7`, `--dim #8d96ab`, `--paper #0d1119`, `--desk #06070c`.

**Typography** (Google Fonts in the prototype; substitute the app's families):
- `--disp` display — Space Grotesk (600/700), plate mode word, headings.
- `--serif` body — Newsreader.
- `--mono` labels/readouts — Space Mono (the `C2 ·`, `RENORMALIZE ·` micro-labels, numeric
  readouts). Micro-label spec: `8–9px`, `letter-spacing .16–.22em`, `--dim`.
- `--hand` annotations — Caveat (Shadows Into Light on blueprint, VT323 on phosphor);
  used for the `.ann` handwritten margin notes in `--voice`.

**Geometry / other:** plate radius `2px`; grid cell `208px`, gap `12px`; plate padding
`12px 14px` (hubs) / `9px 11px` (flip cards); flip easing `cubic-bezier(.3,.85,.35,1)`;
pulse dot `6px` on a 2.6s `pr-pulse` opacity keyframe. Speed multiplier `--spd` (0.25–3×).

**Tweakable props** exposed on the reference (implement as page-level settings):
`theme` (enum of the 5 skins), `trigger` (`hover`|`click` for flips), `speed` (0.25–3×).

## Plate ↔ card mapping

Each plate renders a card in `cards-reference/` (Markdown + YAML frontmatter: `id`, `title`,
`kind`, `glance`, `links`, `figures`, and `## note` / `## full` bodies). Pull copy and
navigation from the cards:

- **C2** `+ and × on the plane — now there are choices` (hub; `gathers` L2, PL, DV, CR, QD…)
- **PL** `The plane has one knob` (figure: `jsq-dial`) → now the level-curve/renorm/tilt panel
- **CR** `The dial is a circle` (figure: `p-circle`) → the spinnable knob
- **DV** `Three planes, at the cuts` (figure: `jsq-dial` marks `[-1,0,1]`)
- **QD** `It was a quadratic all along` (`t²=p`)
- **L2** `Treat the two numbers as strangers` (`same-as: SP`)
- **FTA** `The fundamental theorem of algebra` (`kind: orb` — sealed)
- **AX** `Why we fix addition` — referenced in C2's addition copy

The card `links` (`same-as`, `contrasts`, `opens`, `leans-on`, `gathers`, `used-for`) are
the navigation graph; `figures` name the interactive widgets (`jsq-dial`, `p-circle`,
`tri-compare`, `number-plane`) that these plates implement. See `cards-reference/README.md`
for the full card format, kinds, and voice.

## Assets

No raster/image assets — every figure is inline SVG drawn from `p` (grid, axes, level
curves, dials, rails, root dots). Fonts are Google Fonts (Newsreader, Space Grotesk,
Space Mono, Caveat, Shadows Into Light, VT323); swap for the app's equivalents. No icon
set — glyphs are Unicode (`↻ ∞ √ ± ĵ ∅`).

## Files

In `designs/`:
- **`Chapter II - The Plane.dc.html`** — the finalized reference build (this document).
- `Chapter I - The Line.dc.html`, `Chapter III - Three Worlds.dc.html` — context.
- `Number Planes - The Notebook.dc.html` — figure source (Fig 4, Fig 3a).
- `support.js` — prototype runtime **(do not port)**; present only so the `.dc.html`
  files run when opened over http.

In `cards-reference/`:
- `README.md` — the card format / kinds / voice spec.
- `manifest.json` — the full card id list (the graph).
- `C2, PL, CR, DV, QD, L2, FTA, AX .md` — the cards backing Chapter II's plates.

To view a prototype: serve the `designs/` folder over `http://` and open the `.dc.html`
(the runtime needs `support.js` as a sibling). Everything is client-side; no build step.
