---
kind: three-hats
session: 2026-07-08-S01
date: 2026-07-08
title: "Accessibility & Inclusive-Interaction Engineer"
branch: claude/number-plane-notebook-kxvxzj
slug: number-plane-notebook-kxvxzj
status: complete
build: n/a
---

# Accessibility & Inclusive-Interaction Engineer — Chapter II (the plate grid)

## Under review

I reviewed **`public/number-planes/chapter-2.html`** — the vanilla-JS port of the
Claude-Design "Chapter II — the plane" mockup, a seven-plate CSS-grid page whose
whole thesis is *one `p` drives every plate*. My lens is accessibility and
inclusive interaction. The artifact is gesture-driven (SVG `pointerdown`/`move`
handlers), color-coded (plane meaning carried by blue/green/orange), and
animation-heavy (3-D card flips plus rAF-driven "renormalize" and "tilt"
tweens) — a high-risk profile on every axis I test. I read the file in full,
cross-checked it against the design handoff (`docs/design/notebook-handoff/README.md`),
the reference prototype (`Chapter II - The Plane.dc.html`), the theming layer
(`public/guide-theme.css` + `public/guide-skin.js`), and the sibling artifact
(`public/number-planes/notebook.html`) for the coherence question. I computed
WCAG contrast ratios for the smallest colored/dim text across skins. No findings
are hypothetical: every one cites a line and, where it is a contrast claim, a
measured ratio.

> [!WARNING]
> **Headline:** as shipped, a keyboard-only user cannot reach the central
> interactions (intermediate `p`, the multiplication plot, dragging z/w, spinning
> the dial to ∞), a screen-reader user gets almost nothing (zero ARIA; every SVG
> figure and every live readout is unlabeled), and a user who asked for reduced
> motion still gets the full rAF renormalize/tilt animations. The one-`p`-drives-
> everything idea is beautiful and almost entirely locked behind the pointer.

---

## Method

- Read `chapter-2.html` end-to-end (681 lines): markup, inline styles, the CSS
  `<style>` block, and the `<script>` (`render()` + the four pointer drivers +
  the two rAF animators).
- `grep` for `aria|role=|tabindex|:focus|prefers-reduced|matchMedia|<title|<desc`
  in the file — **the only matches are the document `<title>` (l6), one CSS
  `@media (prefers-reduced-motion)` (l99), and an unrelated prose "reduced" (l278)**.
  There is no ARIA, no `role`, no `tabindex`, no `:focus`/`:focus-visible`, no SVG
  `<title>`/`<desc>`, and no reduced-motion check anywhere in the JS.
- Computed WCAG 2.x relative-luminance contrast for the small colored/dim text
  against the plate paper, for the light skins where the semantic hues darken
  (primary, daylight, Paper) and the Observatory desk.
- Compared against the sibling `notebook.html`, which *does* use native
  `<input type="range" aria-label>`, `role="button" tabindex="0"`,
  `aria-live="polite"`, `aria-hidden`, and a JS `matchMedia('(prefers-reduced-motion)')`
  gate (l1606) — establishing that these affordances were known to the author and
  regressed in the newer file.

---

## What is genuinely good

Before the defects, the things this file gets right — several are real
mitigations that pull findings down from "catastrophic" to "serious":

- **Meaning is heavily redundant with text, not hue alone.** Every plane state
  carries a written label next to the color: `planeName` ("the complex plane",
  l422), the chip labels `−1 · 0 · +1`, the rail label `0 RAILS · an ellipse`
  (l523), the DV rows `complex — turns / dual — shears / split — squeezes`
  (l280–282), and the QD `#qdLabel` "2 real roots" (l572). This is the single
  biggest thing protecting CVD users; the hue is decorative-redundant, not
  load-bearing, for most readouts.
- **The snap chips, DV rows, L2 link, and the reform/tilt controls are real
  `<button>` elements** (l129–131, 280–282, 351, 236, 256). Because the global
  handler listens on `document` for `click`, keyboard activation (Enter/Space)
  of these buttons *does* fire and *does* set `p` / run tilt. So a keyboard path
  to the three cut values and to the tilt lesson genuinely exists.
- **The skin picker (guide-skin.js) is button-based and keyboard-operable**, and
  it applies both `data-theme` and `data-scheme` (l26–30 of guide-skin.js), so
  the `light-dark()` semantic colors resolve correctly per skin.
- **`touch-action:none`** is correctly set on the drag surfaces (l136, 154, 314)
  so a drag doesn't fight the browser's scroll — the right instinct, even though
  it has a mobile side effect I flag below.
- The QD root count and the DV/L2 back-face prose are *text*, so where they are
  reachable they degrade gracefully.

These are real and I want the framework maintainer to keep them when the a11y
fixes go in. Now the problems.

---

## Findings

### P1 — must fix (real defects that lock users out)

| id | title | where | verifiable |
|---|---|---|---|
| accessibility-keyboard-primary | No keyboard path to intermediate `p`, the mul plot, z/w, or ∞ | l136, 146, 314, 174–175, 599–647 | yes |
| accessibility-renorm-unreachable-kbd | The renormalize lesson is structurally unreachable by keyboard | l529, 544, 605 | yes |
| accessibility-flipcard-hidden-focus | Flip-card back-face buttons are focusable but painted away | l83–87, 263–360 | yes |
| accessibility-sr-silent-state | Zero ARIA: every readout and every SVG figure is unlabeled | grep (none); l110, 154, 194, 314, 425 | yes |
| accessibility-reduced-motion-js | rAF renormalize/tilt ignore `prefers-reduced-motion` | l99 vs 650–674 | yes |

#### accessibility-keyboard-primary — the core controls are pointer-only

The three primary continuous controls are SVGs wired with `pointerdown` /
`pointermove` and nothing else:

- **The j² slider** `#psl` (l136) — `<svg … touch-action:none>`, no `tabindex`,
  no `role`, no `keydown`. Its driver (l599–611) is `pointerdown`/`pointermove`
  only. There is no way to focus it or nudge `p` with arrow keys.
- **The CR dial** `#crsvg` (l314) — same story; `setFromCr` (l633–644) reads
  pointer angle only. A keyboard user cannot spin it, cannot reach ∞ (`p=±16`,
  l640), cannot reach any non-cut value.
- **The z / w handles** `#zh`, `#wh` (l174–175) — `<circle>` with pointer
  handlers (l615–628); no keyboard equivalent to move a point.
- **The ADD ↔ MUL mode toggle** is a `<div class="opt" … data-mode-toggle>`
  (l146), not a button. It has no `tabindex`, so it is not in the tab order; the
  global handler catches it on *mouse* click (l579–583) but never on keyboard.

The consequence is precise and severe: a keyboard-only user can set `p` to
**exactly −1, 0, or +1** (via the chips / DV / L2 buttons) and can **run tilt**,
but can **never** produce an off-cut `p`, **never** open the MULTIPLICATION plot
(so the entire product-on-a-rail lesson — the heart of C2 — is invisible to
them), **never** drag z or w, and **never** reach the ∞ / `p ↦ 1/p` behavior the
CR plate exists to teach.

> [!IMPORTANT]
> Fix is cheap and high-leverage: give `#psl` and `#crsvg`
> `role="slider" tabindex="0"` + `aria-valuemin/max/now/valuetext` and a
> `keydown` handler (←/→ = ±0.05, Home/End/PageUp/Down = cuts and ∞); make the
> mode toggle a real `<button aria-pressed>`; give z/w `tabindex="0"` +
> arrow-key nudging. The sibling `notebook.html` already proves the pattern with
> a native `<input type="range">` (l431).

#### accessibility-renorm-unreachable-kbd — the renormalization lesson can't be reached

`canRescale = pAbs > .02 && Math.abs(pAbs-1) > .02 && !isInf` (l529) — i.e. the
"reform to ±1 ↻" button is `display:none` **whenever `p` is exactly a cut**
(l544). But per the finding above, the *only* `p` values a keyboard user can
reach *are* the cuts. So the reform button is `display:none` in every state a
keyboard user can occupy. The button is technically operable, yet it can never be
made to appear for that user — the whole "only the sign survives the stretch"
renormalization idea (PL's left box, and the semantic `rsS` vertical-scale
animation on the main plot) is structurally unreachable without a pointer. This
is downstream of `accessibility-keyboard-primary` but worth calling out on its own
because it means "add keyboard nudging to the slider" is *load-bearing for
pedagogy*, not just a nicety.

#### accessibility-flipcard-hidden-focus — focus lands on invisible controls

DV/QD/L2/FTA are `<div class="vat" data-t="…">` (l263, 290, 337, 360) that flip
only on a pointer click of the div (handler l593–594; the div is not focusable).
The back faces carry the real interactive content: the DV `−1/0/+1` buttons
(l280–282) and the L2 "set the dial to +1" button (l351). Those `<button>`s stay
in the DOM — and therefore in the **tab order** — at all times, but the back face
is `backface-visibility:hidden` + `transform:rotateY(180deg)` (l83–87), so while
the card shows its front, those buttons are *painted away yet still focusable*.

Result: a keyboard user tabbing through the page lands on controls they cannot
see, with **no `:focus-visible` styling** anywhere to help (grep: none) — the UA
outline, when it lands on a rotated-away element, is itself invisible. Activating
the focused-but-hidden DV button *does* change `p` (confusing: the page mutates
with no visible cause), and the card's explanatory prose is never revealed to
keyboard or screen-reader users at all. This is a WCAG 2.4.3 (focus order),
2.4.7 (focus visible), and 1.3.2/4.1.2 problem in one. Fix: gate back-face focus
with `inert`/`visibility:hidden` when `data-on!=1`, and make the card itself a
`<button aria-expanded>` so keyboard users can open it.

#### accessibility-sr-silent-state — the screen reader gets almost nothing

There is **no ARIA in the file** (grep for `aria|role=` returns zero hits in the
body). Concretely:

- The running readouts — `#hdrRead` "j² = … · plane name" (l110/425), `#pBig`
  (l133), `#planeNm` (l134), `#railLabel` (l523), `#crRead`/`#crPlane`
  (l560–561), `#qdLabel` (l572) — are updated by `textContent`/`innerHTML` in
  `render()` with **no live region**, so a screen reader announces nothing when
  the user (or another plate) moves `p`. The "everything moves together" idea is
  entirely silent.
- Every SVG figure — the slider (l136), the main z·w plot (l154), the PL
  level-curve plot (l194), the CR dial (l314) — has **no `role="img"`,
  `aria-label`, `<title>`, or `<desc>`**. 100% of the visual meaning is
  unlabeled. To a screen reader these are empty graphics.
- The mode toggle exposes **both** words "ADDITION" (l148) and "MULTIPLICATION"
  (l149) in the DOM simultaneously (the 3-D flip only hides one visually via
  `backface-visibility`), and it has no `role`/`aria-pressed`, so a screen reader
  reads both with no indication of which is active.
- The active snap chip is conveyed by color + background + border only (l434–436)
  — no `aria-pressed`. A screen reader can't tell which of −1/0/+1 is current.

Minimum viable fix: `role="slider"` + `aria-valuetext="j² = −1, the complex plane"`
on the two dials; `role="img"` + a live `aria-label` on each plot summarizing its
state; an `aria-live="polite"` status node mirroring `#hdrRead`; `aria-pressed`
on the chips and the mode toggle.

#### accessibility-reduced-motion-js — the semantic animations ignore the preference

The file's only reduced-motion handling is the CSS blanket at l99:
`@media (prefers-reduced-motion: reduce){*{transition:none!important;animation:none!important}}`.
That stops **CSS** transitions (the card flips) and **CSS** keyframes (the pulse
dots) — but it has **no effect on `requestAnimationFrame`**. The two *semantic*
animations are pure rAF:

- `doRescale()` (l650–664): a ~1.8 s two-phase tween that stretches the ruler
  (`rsS: 1 → √|p|`) then slides `p → ±1`, driving the **moving ellipse/hyperbola
  in PL and the vertical scale of the main plot**.
- `doTilt()` (l666–674): an 800 ms tween rotating the level-curve group and the
  tilt glyph 0 ↔ 45°.

Neither consults `matchMedia('(prefers-reduced-motion: reduce)')` — there is no
`matchMedia` in the script at all. Tilt is reachable by keyboard/click at any `p`,
and renormalize by a mouse user who drags to an off-cut value — so a user who
explicitly requested reduced motion still gets the full stretching-conic and
axis-rotation animations. This is the exact inverse of the concern in the brief:
the media query does *not* silently remove the semantic meaning (the rAF runs to
completion, so the end-state is still taught) — the defect is that it **fails to
honor the preference**, animating motion the user asked to suppress.

> [!IMPORTANT]
> The sibling `notebook.html` gets this right — `animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;`
> (l1606) — and then either skips the tween or jumps to the end state. Chapter II
> should do the same: when reduced motion is set, snap `rsS`/`rot`/`p` to their
> final values in one frame rather than tweening.

---

### P2 — should fix

| id | title | where | verifiable |
|---|---|---|---|
| accessibility-contrast-light-skins | Semantic small text fails WCAG AA on the light skins | l34–47, 133–134, 523, 561, 572 | yes (measured) |
| accessibility-touch-targets | Handles/chips/buttons/slider below the 24px WCAG 2.2 target | l129–131, 136, 174–175, 236, 256 | yes (geometry) |
| accessibility-touch-scroll-trap | `touch-action:none` on tall plates can strand phone scroll | l136, 154, 314 + l90–98 | partial |

#### accessibility-contrast-light-skins — "works with any theme" breaks on the light themes

Dan's stated trigger for this review is *"the notebooks should work with any of
the themes."* On the dark skins the bright `--d1/--ok/--d5` on dark paper are
high-contrast and fine. On the **light** skins the semantic hues darken and the
small colored readouts drop below WCAG AA (4.5:1 for text < 18px; the green/orange
are 9–15px, non-bold). Measured:

| Text (size) | Skin | fg on paper | Ratio | AA (4.5:1)? |
|---|---|---|---|---|
| green plane readout / rail label / root label | primary | `#149e57` on `#ffffff` | **3.47** | fail |
| green plane readout | daylight (light-dark light val) | `#149e57` on `#ffffff` | **3.47** | fail |
| orange plane readout / rail label | primary | `#e6731f` on `#ffffff` | **3.07** | fail (near 3:1 floor) |
| voice handwriting annotations (13–16px) | primary | `#e63327` on `#ffffff` | **4.31** | fail |
| slider tick labels `−2…+2` (9px) | Observatory | `#5d667d` on `#06070c` | **3.51** | fail |
| blue plane readout | Paper/light | `#3565c8` on `#fffdf8` | 5.37 | pass |
| orange plane readout | Paper/light | `#b0592a` on `#fffdf8` | 4.79 | pass |
| dim micro-labels (7.5–9px) | any | muted on paper | 5.9–6.1 | pass |

So the *dim* mono micro-labels actually pass contrast (they're just tiny —
readability, not contrast); the real WCAG failures are the **green and orange
semantic readouts on the two white-card light skins**, plus the primary red
handwriting and the Observatory tick labels. These are exactly the pieces that
carry plane meaning, and they're the ones that break under the "any theme" goal.
Fix: darken the light-skin `--ok`/`--d5` overrides (l42–43 already override some
skins — extend to daylight and bump toward ~4.5:1), or reserve the saturated hue
for the *figure strokes* and render the colored *text* one step darker.

> [!WARNING]
> This finding is the direct, measurable answer to the review's trigger. The page
> is themable in the sense that it *renders* on all 8 skins, but it is not
> *accessible* on the light ones — the plane-color readouts fall below AA.

#### accessibility-touch-targets — most controls are under the 24px minimum

WCAG 2.2 §2.5.8 sets a 24×24 CSS-px minimum (2.5.5 AAA wants 44). On a ~340px-wide
phone plate the rendered targets are:

| Control | Spec | Rendered ≈ | vs 24px |
|---|---|---|---|
| z / w handles (l174–175) | `r=12` in a 560-unit viewBox | ~15px diameter | fail |
| snap chips (l129–131) | `font 10.5px, pad 2px 9px` | ~28×18px | fail (height) |
| reform / tilt buttons (l236, 256) | `font 14px, pad 1px 7px` | ~20px tall | fail |
| j² slider track (l136) | viewBox `600×30`, full width | ~17px tall | fail (height) |
| CR dial (l314) | whole 150px SVG is the target | 150px | pass |
| mode toggle (l146) | `280×34` | 34px | pass |

The z/w handles are the worst — a ~15px grab target for the *only* way to move a
point, on a control that already has no keyboard fallback. Bump handle `r` to ~18
(≈24px rendered on phone), pad the chips/buttons to ≥24px min-height.

#### accessibility-touch-scroll-trap — pointer-only + `touch-action:none` on tall regions

`touch-action:none` (correctly) prevents drag-vs-scroll fighting on the slider,
main plot, and CR (l136, 154, 314). But on a phone the grid collapses to a single
column and the C2 plate is `min-height:620px` (l95), most of which is the
`touch-action:none` plot. A user who instinctively drags to scroll while their
finger is over the plot gets no page scroll, and (per the keyboard finding) there
is no non-drag way to operate these regions. It's a soft trap: reachable-around
(there's paper margin), but easy to hit. Consider `touch-action:pan-y` on the
plot so vertical scroll still works while horizontal drag moves points, or an
explicit scroll affordance.

---

### P3 — polish

| id | title | where | verifiable |
|---|---|---|---|
| accessibility-focus-visible | No `:focus-visible` styling; active chip has no `aria-pressed` | grep (none); l434–436 | yes |
| accessibility-heading-structure | One `<h1>`, then a flat wall of `<div>`s; no landmarks | l107; plate labels l120 etc. | yes |
| accessibility-lock-decor-kbd | Hub-lock annotations reveal only on pointer hover/click | l71, 118, 588–592 | yes |
| accessibility-coherence-regression | Sibling `notebook.html` is far more accessible than this "reference" | notebook l431/526/1606 vs chapter-2 | yes |

#### accessibility-focus-visible

There is no `:focus`/`:focus-visible` rule in the file. Real buttons keep the UA
outline (fine), but nothing styles focus intentionally, and the flip-card back
buttons (above) show that outline on an invisible face. Add a visible
`:focus-visible` ring on all interactive elements, and `aria-pressed` on the chips
(l434–436) and mode toggle so the current selection is programmatically exposed.

#### accessibility-heading-structure

The page has a single `<h1>` (l107); every plate title ("C2 · THE PLANE",
"PL · THE PLANE'S SHAPE", …) is a mono `<span>`, not a heading, and there are no
`<section>`/landmark roles. A screen-reader user has no heading list to navigate
the seven plates — the document is one `<h1>` followed by an undifferentiated
run of `<div>`s. Promote plate titles to `<h2>` (visually unchanged) and wrap
each plate in `<section aria-labelledby>`.

#### accessibility-lock-decor-kbd

The hub-lock plates (`data-c1t`, l118) reveal their handwritten `.ann` margin
notes only on `:hover` or pointer click (l71, 588–592). Keyboard/SR users never
see those annotations. Low stakes (they're flavor, and the core prose is
elsewhere), but it's the same pointer-only pattern once more.

#### accessibility-coherence-regression — the two artifacts have opposite postures

This is the coherence question, and the answer is stark. The sibling
`notebook.html` (dated Jul 4, three days *older* than chapter-2's Jul 7) was built
with real accessibility affordances:

- a native `<input type="range" … aria-label="The plane parameter p">` for the
  dial (l431) — keyboard-operable for free;
- `role="button" tabindex="0"` on its p-setting world cards (l526, 532, 538);
- `aria-label` on its SVGs and controls (l488, 515, 639, 683), `aria-live="polite"`
  on the note body (l707), `role="dialog" aria-label` on its sheets (l723, 725),
  `aria-hidden="true"` on decorative filaments (l749);
- and a real JS reduced-motion gate: `animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;`
  (l1606).

Chapter II — explicitly the "reference implementation" per the handoff — **dropped
every one of these**: raw SVG pointer handlers instead of a native range, no ARIA,
no `tabindex`, no live region, no reduced-motion gate. Two files in the same
directory, part of the same notebook, now disagree completely on accessibility,
and the one being held up as the pattern is the inaccessible one. Whatever the
final layout, the *reference* should be the more accessible file, not the less —
otherwise every future plate copied from Chapter II inherits the regression.

---

## Cross-cutting recommendation

The fixes cluster into four small, mechanical passes — none require rearchitecting
the "one `p`" model:

1. **Make the three dials keyboard-first.** `role="slider" tabindex="0"` +
   `aria-valuemin/max/now/valuetext` + a `keydown` handler on `#psl` and `#crsvg`;
   `tabindex="0"` + arrow-nudge on z/w; a real `<button aria-pressed>` for the
   mode toggle. This single pass unlocks intermediate `p`, the mul plot, z/w, ∞,
   *and* (transitively) the renormalization lesson.
2. **Add a status live region + label the figures.** One `aria-live="polite"`
   node mirroring `#hdrRead`; `role="img"` + a state-summarizing `aria-label` on
   each plot; `aria-pressed` on chips/toggle.
3. **Honor reduced motion in JS.** Read `matchMedia('(prefers-reduced-motion)')`
   in `doRescale`/`doTilt` and snap to the end state instead of tweening — copy
   the sibling's l1606 pattern.
4. **Nudge the light-skin semantic colors and target sizes.** Darken
   `--ok`/`--d5` on the white-card skins to clear 4.5:1 for text; bump handles to
   ~24px and pad chips/buttons to ≥24px min-height; `inert` the flip-card back
   faces until opened.

---

## Verdict

**Do not treat Chapter II as the accessible reference it is billed to be — it is
currently the least accessible of the two Number-Planes artifacts, and the gaps
are P1, not polish.** The design is genuinely lovely and its textual redundancy
means the *content* is closer to reachable than gesture-driven pages usually are —
but the *interactions* that make it a living notebook are almost entirely
pointer-gated. As shipped:

- **Keyboard:** partial and misleading — only the three cut values and tilt are
  reachable; the multiplication plot, intermediate `p`, z/w, ∞, and the whole
  renormalization lesson are not; and tabbing lands on invisible flip-card buttons.
- **Screen readers:** effectively unusable for the interactive story — zero ARIA,
  silent readouts, unlabeled figures.
- **Reduced motion:** violated — the semantic rAF animations run regardless.
- **Color/CVD:** the best-defended axis thanks to text redundancy, but the
  plane-color *readouts* fail WCAG AA on the light skins — which is precisely the
  "any theme" promise under review.
- **Touch:** the primary grab targets (z/w handles ~15px) are below the WCAG 2.2
  minimum.

None of this is expensive to fix, and the sibling `notebook.html` already
demonstrates every needed pattern (native range, `aria-live`, `role=button`,
`matchMedia` gate). My recommendation is to gate "Chapter II is the reference
implementation" on the four passes above landing — otherwise the framework will
propagate an inaccessible template, and the theming goal that triggered this
review is itself not met on the light skins.

---

## Self-reflection

1. **What would you do with another session?** Actually drive the page with a
   keyboard and a screen reader (VoiceOver/NVDA) on a real build to confirm the
   focus-order and silent-readout claims behave as the code predicts, and run an
   automated axe-core/Lighthouse pass to catch anything my read missed. I'd also
   test on a physical phone to confirm the z/w grab-target and scroll-trap
   findings feel as bad as the geometry says.
2. **What would you change about what you produced?** I leaned on computed
   contrast and code reading rather than a rendered device; the contrast table is
   solid but the "rendered px" target sizes are estimates from viewBox math at an
   assumed 340px phone width, not measured screenshots.
3. **What were you not asked that you think is important?** Whether Chapter II is
   destined to become an actual app route (with the chrome's real theming-v2
   `data-scheme` light/dark axis) or stay a static `public/` page — the fix
   surface differs, and if it enters the app it inherits the app's a11y
   expectations wholesale.
4. **What did we both overlook?** The framing assumed reduced-motion might
   *remove* the semantic animations; the real defect is the opposite — the CSS
   media query can't touch rAF, so those animations *ignore* the preference and
   over-animate. Worth correcting in the mental model.
5. **What did you find difficult?** Being precise about what *is* keyboard-
   reachable: the global `document` click handler means the real `<button>`s
   (chips/DV/L2/reform/tilt) work by keyboard, so the honest finding is "partial
   and misleading," not "zero" — which required tracing each control rather than
   asserting a blanket failure.
6. **What would have made this task easier?** A running preview I could tab
   through and point a screen reader at; and a note on whether the `light-dark()`
   semantic tokens are intended to stay hard-coded (they are, per the handoff's
   "keep these meanings across skins"), so I didn't chase them as theming defects.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Method: **code reading + `grep` + computed WCAG contrast (Node,
   sRGB relative luminance)** — no rendered/device verification. The grep result
   (zero `aria`/`role`/`tabindex`/`:focus`/`matchMedia`) directly substantiates
   the ARIA and reduced-motion findings. The contrast ratios are exact for the
   named hex pairs but assume the plate `paper` equals the skin `--card` and that
   the light-skin overrides resolve as written; the keyboard/focus-order and
   touch-target findings are reasoned from the source, **not** confirmed on a real
   browser or device. Set signals: `visual-unverified`, `phone-needed`.
8. **Follow-up value:** MEDIUM — the findings are correct and specific from the
   source, but a keyboard + screen-reader + physical-phone pass on a live build
   would confirm the interaction-order and touch claims and likely surface a few
   more issues (e.g. exact SR announcement order, real focus-ring visibility).
