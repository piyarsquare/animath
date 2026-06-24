---
kind: three-hats
session: 2026-06-24-S01
date: 2026-06-24
title: "Argand visual-design review — Hat 4, the Graphic Designer"
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review-51egvz
status: completed
build: passed
---

# Argand visual-design review — Hat 4, the Graphic Designer

## Plan under review

<details>
<summary>Original request</summary>

> Review the Argand app (#/argand, src/animations/Argand/) — its visual design and user experience. ADD TWO HATS beyond the usual three: (4) a graphic designer focused on whether the display is clean and the concepts are well-articulated visually, and (5) a video game designer focused on user experience and interaction feel.

</details>

I am the **Graphic Designer** lens: I judge what the eye receives, not whether the
math is correct. My questions are Tufte's and Bret Victor's — where does the eye land
first, how much ink is doing work, is the palette a system or a confetti, and *does the
picture itself do the explaining?* I read the four screenshots as my primary material
and traced every stroke back to `ArgandPlane.tsx` and `Argand.tsx`.

The short version: the *idea* of this app is beautiful and the color discipline behind
it is real and admirable. But the **first frame the user sees is a failure of visual
hierarchy** — the hero picture is shoved to the right, sits small, is half-covered by a
giant centered hint pill, and is fenced in on the left by three control panels that
overlap and clip each other. The concept ("multiply spins, add slides") is *encoded*
correctly but is not *legible at a glance* because too many marks fire at once with no
figure/ground discipline. Fixable, mostly with layout and progressive disclosure, not a
rewrite.

---

## 1. First-frame hierarchy: where does the eye go?

Open the app (`2026-06-24-S01-desktop-point.png`) and trace your own gaze. The eye
does **not** land on the math. It lands on a tie between three loud competitors:

| Rank | What grabs the eye | Why | Should it? |
|------|--------------------|-----|------------|
| 1 | The big centered hint pill "drag z · α₁ · α₀ · pinch or scroll to zoom…" | High-contrast rounded card, **dead center**, sits *on top of* the diagram | **No.** This is chrome, not content. |
| 2 | The three left panels (Function / Play / Values) | A dense ~290px column of monospace text, leftmost = first read in LTR | Partly — but they should support, not dominate. |
| 3 | The actual diagram (legs, handles, f(z)) | Small, **pushed into the right ~45% of the stage**, the spiral leg only ~150px wide | **This is the hero and it's ranked third.** |

> [!CAUTION]
> The single biggest visual problem: **the math picture is not the focal point.** It is
> small, off-center-right, and occluded. In an app whose entire pedagogy is "watch the
> picture," the picture loses the first-frame competition to a tooltip and a wall of
> controls. Everything else in this review is secondary to fixing this.

Three compounding causes:

1. **The `hint` pill is centered over the stage and persistent.** It is rendered by the
   workspace from `views[].hint` (`Argand.tsx:442`) and in the screenshot it floats at
   the vertical middle, directly across the diagram, reading
   `drag z · α₁ · α₀ · pinch or scroll to zoom · two-finger or shift-drag to pan ·
   double-click to recenter`. That is a 110-character instruction manual laid across the
   artwork. A hint should fade, sit in a corner, or appear only on first visit.

2. **The default "Essentials" layout parks three panels in a left column** at
   `x:24` (`Argand.tsx:483`), so the live region starts only after them. The diagram's
   `defaultRect.x` is 320 (`:441`), so it is *born* shifted right, and because the stage
   is `immersive` the plane actually fills the whole stage *behind* the panels — but the
   meaningful action (the spiral, the handles) is composed around math-origin, which the
   `extent:4` default and the panel occlusion push to the right third.

3. **The diagram content is small relative to its frame.** With `extent: 4` the visible
   half-width is 4 units, but the actual story — z at `1.5+i`, f(z), z* at `0.6+0.8i`,
   the unit ellipse of radius 1 — all lives within ~2 units of the origin. So the
   interesting marks occupy roughly the central quarter of an already-shoved-right
   canvas. There is a lot of empty grid and very little hero.

**What I'd change (must-fix):** make the hint a corner toast that auto-dismisses;
let the default layout open with the diagram centered and the panels either collapsed to
the rail or docked so they don't sit over math-origin; and consider a tighter default
`extent` (≈3) so the legs-and-loop fill more of the frame on load.

---

## 2. Clutter & data-ink: how many things share the canvas?

I counted the distinct visual object *classes* that can be simultaneously on the Point
canvas at rest, before any feed/quadratic/iterate options:

| # | Mark | Source | Always on? |
|---|------|--------|-----------|
| 1 | Ghost identity grid (mono, op 0.22) | `:451` | yes |
| 2 | Unit curve (ellipse, dashed, op 0.28) | `:364` | default on |
| 3 | Both axes (op 0.45) + "i"/"Re" labels | `:457-462` | yes |
| 4 | α₀ translation vector from origin (violet dashed, arrowhead) | `:504` | yes |
| 5 | Return diagonal (teal dashed) | `:530` | yes |
| 6 | ×α₁ leg (orange solid) | `:532` | yes |
| 7 | +α₀ leg (violet dashed) | `:533` | yes |
| 8 | α₁z waypoint dot (orange) | `:534` | yes |
| 9 | f(z) dot + "f(z)" label (emerald) | `:540-542` | yes |
| 10 | z* fixed-point ring + dot + "z*" label (gold) | `:587` | yes |
| 11 | z handle (cyan circle) + "z" label | `:596` | yes |
| 12 | α₁ handle (orange diamond) + "α₁" label | `:597` | yes |
| 13 | α₀ handle (violet square) + "α₀" label | `:598` | yes |

That is **13 mark classes**, several with their own text label, on a canvas where the
whole story is a two-segment path and a return. The screenshot confirms it reads as
*busy near the origin and empty everywhere else*: in `desktop-point.png` the cluster of
α₁ diamond + α₁ label + z* ring + z* label all stack on top of one another in the
lower-middle, while the α₀ vector arrow and "α₀" label collide at the very edge of the
visible cluster (the "α₀" label is partly behind the Values panel at the left, `:598`).

The biggest redundancy I see:

> [!WARNING]
> **The α₀ translation vector (mark #4) and the +α₀ leg (mark #7) are the same number
> drawn twice.** One is α₀ anchored at the origin; the other is α₀ anchored at α₁z. Both
> are violet, both dashed, both carry the "this is the shift" meaning. A first-time
> viewer sees two violet dashes and cannot tell which one *is* the +α₀ step of the path.
> The origin-anchored vector is decoration that competes with the leg that actually
> teaches. I would **drop the origin-anchored α₀ vector by default** (offer it as a
> "show α₀ from origin" toggle) and let the +α₀ leg carry the meaning alone.

Second redundancy: the **return diagonal (mark #5)** is conceptually lovely (the
"all-at-once" shortcut) but visually it competes with the two honest legs for the same
space and adds a *third* dashed line in a *fourth* color (teal #2dd4bf). At rest, when
nothing is animating, the diagonal is pure ink with no motion to justify it. I'd hide
the diagonal at rest and reveal it only during the *return* half of Play — exactly when
its meaning is being demonstrated. (The code already gates the *mover* on `showMover`;
the diagonal could share that gate.)

**Net:** at rest, the canvas should show roughly: axes, faint grid, the two legs, the
three handles, f(z), z*. That is ~7 classes, not 13. The other six are *progressive-
disclosure* material — reveal them when their concept is being acted on.

---

## 3. The domain-colored grid: signal or noise?

`2026-06-24-S01-grid-colored.png` is the clearest case for restraint in the whole set.
Toggling "Color grid by angle" (`gridColor`, `:316`) turns the entire plane into a
rainbow lattice of HSL-by-angle segments (`domainHue`, `ArgandPlane.tsx:295`) drawn at
`strokeOpacity ≈ min(1, op*2)` over the dark bg.

What the eye receives: **a plaid of saturated red/green/blue/magenta lines edge to
edge**, and somewhere in the middle a tiny knot of orange/cyan/gold handles that you
have to *hunt* for. The signal (the handles, the path, f(z)) is buried under the
texture. This is the canonical Tufte failure: the chartjunk has higher contrast than the
data.

| Aspect | Judgment |
|--------|----------|
| Concept it serves | "watch colors flow as f deforms the plane" — legitimate and pretty in motion |
| At rest | the rainbow is **louder than every functional mark**; figure/ground inverts |
| Saturation | 68% S, 62% L hues at near-full opacity — these are *more* saturated than any of the deliberate palette colors |
| Verdict | Keep the feature, but **drop its default opacity hard** (this is a *texture*, it should sit at op ~0.15–0.2 like the ghost grid), and/or **only color the image grid, leaving the identity grid mono** so the deformation reads as color *entering* rather than the whole field being plaid. |

The domain-coloring genuinely sings during a Grid-feed animation (color streaming as
lines bend). The problem is purely that it is given equal or greater ink than the hero
marks at rest. This is a brightness-default fix, not a concept fix.

---

## 4. Color system: a coherent palette or confetti?

This is where I want to *praise* the build first. There is a real, disciplined,
role-based palette, defined in one place (`ArgandPlane.tsx:11-18`) and *shared between
the handles, the equation spans, the panel helper text, and the value readouts.* That
"the picture reads like the formula" discipline (every α₁ is orange, everywhere) is
exactly right and is the best thing about the visual design. Keep it religiously.

But count the simultaneous hues the app *can* show:

| Hex | Role | Where | Contrast on #0c0c10 dark | Note |
|-----|------|-------|--------------------------|------|
| `#38bdf8` | z (input) | cyan circle | excellent | core |
| `#fb923c` | α₁ (slope) | orange diamond | excellent | core |
| `#c084fc` | α₀ (shift) | violet square | good | core |
| `#f472b6` | α₂ (quadratic) | pink triangle | good | core |
| `#34d399` | f(z) (output) | emerald | excellent | core |
| `#fbbf24` | z* (fixed) | gold ring | excellent | core |
| `#94a3b8` | critical pt | slate ⊕ | adequate (intentionally quiet) | core |
| `#2dd4bf` | return diagonal | teal dashed | good — **but near-twin of emerald f(z)** | sixth+ hue |
| `#f87171` | null cone | red asymptotes (split only) | good | situational |
| `#fde68a` | mover/sweep | pale yellow dot/path | good — **but near-twin of gold z***| situational |
| (rainbow) | domain coloring | full HSL wheel | — | floods everything |

> [!NOTE]
> **Seven role colors is already at the ceiling** for a single diagram — and the
> palette is well-chosen up to there. The trouble is the *eighth, ninth, tenth* hues:
> teal #2dd4bf sits a few degrees from emerald #34d399 (diagonal vs f(z) — two greens
> that mean different things), and pale-yellow #fde68a sits next to gold #fbbf24 (mover
> vs fixed point — two yellows). On the dark bg these pairs are genuinely hard to tell
> apart, and they encode *different* concepts. That is the confetti risk: not too many
> *bright* colors, but **too many near-collisions**.

Recommendations:

- **Merge or re-pick the teal diagonal.** Either make the return path a *neutral* gray
  dash (it's a "shortcut," not a colored actor) or pick a hue far from emerald (a desaturated
  lavender-gray reads as "auxiliary"). Two greens that mean different things is the worst
  case.
- **The mover/sweep** #fde68a is fine *because it only appears in motion* (gated by
  `showMover`), so it never co-exists with a static gold z* in a confusing way — but it's
  close enough that I'd nudge it toward white (`#fafafa`) so "the thing that's moving" reads
  as a bright neutral, not "a paler z*."

### The skin problem (a real bug, not taste)

> [!CAUTION]
> **Every color in the SVG is a hardcoded hex, and the diagram's background is keyed to a
> hardcoded `--viz-bg` default `#0c0c10`** (`ArgandPlane.tsx:422`). But the actual theme
> tokens differ per skin: `dark` sets `--viz-bg: #04060c`, and **`light` sets
> `--viz-bg: #f6f3ec`** and `phosphor` `#020c07` (`theme.css:50,74,123`). The palette
> (cyan, orange, gold, pale yellow, slate) was tuned for a near-black field. On the
> **light skin** that whole palette renders on a *cream* background — pale-yellow #fde68a
> and gold #fbbf24 will all but vanish, cyan/emerald wash out, and the handle outline
> stroke (`stroke="var(--viz-bg,#0c0c10)"`, `:399`) becomes a *cream* halo on cream,
> erasing the dark rim that makes handles pop. The app's five-skin promise is broken for
> this view.

This is the one item in my review that is a correctness failure rather than a judgment
call. The viz palette needs to either (a) be redefined per-skin as CSS variables the SVG
reads, or (b) the view should be acknowledged as a fixed-dark surface (some viz views
legitimately are) and *force* `--viz-bg` dark regardless of skin so at least the contrast
the palette was designed for is guaranteed. Right now it silently inherits a cream
background it was never tuned against. I defer the math of which skins matter to the
framework hat, but visually: **light skin will look broken.**

---

## 5. Typography & labels

| Element | Size/style | Judgment |
|---------|-----------|----------|
| Corner equation `f(z) = α₁·z + α₀` | 14px mono, 700, colored spans | Good — the colored-span equation is the single best teaching device on screen. |
| Coefficient readout under it | 11px dim mono | Fine. |
| Handle labels "z" "α₁" "α₀" | 19px, 700, colored | A touch large and they **collide with each other and with the f(z) label** near the origin (visible in `desktop-point.png`: α₁/z*/z* labels stack). |
| Axis "i" / "Re" | 21px, op 0.5 | "Re" is at `x = w − 24` (`:462`) and in the desktop shot it is **clipped at the right edge** — only "Re" partly shows, hugging the frame. Needs more inset (≈ `w − 36`) or right-anchored text. |
| Panel helper text | 11px dim | Legible but there's a lot of it; the Play panel's footer paragraph is clipped (see §6). |
| z* subscript | 11px tspan baseline-shift sub | Fine. |

The **label collision near origin** is the typography manifestation of the §2 clutter:
when 4–5 marks pile within a unit of each other, their 19px bold labels overlap. The fix
is the same — fewer simultaneous marks — plus optional leader-line offset for labels in
dense regions. The font *system* itself (mono throughout, consistent dim helper color
via tokens) is coherent and good.

---

## 6. Layout & spacing — the panels clip each other

This is the second must-fix after the hierarchy problem, and it's visible in *every*
desktop screenshot.

> [!CAUTION]
> **The default "Essentials" layout's three panels overlap and clip their own content.**
> They are placed at fixed y-offsets — Function `y:18`, Play (`scrub`) `y:320`, Values
> `y:580` (`Argand.tsx:483`) — but the panels' natural heights exceed those gaps:
> - **Function** (`estHeight: 280`, `:357`) runs from y≈18; its last rows ("View from z*",
>   the helper paragraph) are **hidden behind the Play panel** — in `desktop-point.png`
>   the Function panel visibly cuts off mid-row right where "Play" begins.
> - **Play** (`estHeight: 250`, `:361`) is then overrun by **Values** at y:580 — its
>   footer paragraph ("…back along the diagonal, spinning and shifting at once. A closed
>   loop.") is **clipped** by the Values panel's top edge in the shot.
> - **Values** itself runs to the bottom of the viewport and its lower rows (z*, polar
>   forms) are clipped by the window bottom.

So the *default* state a new user sees is three panels eating each other. That is a
spacing/packing bug, not a taste call. The fix is straightforward: the fixed y-offsets
(18 / 320 / 580) must respect the panels' `estHeight` (280 / 250 / 220) — they need
roughly 18 / 320 / 590 *only if* heights were 280/250, but the real rendered heights are
clearly taller (the helper paragraphs wrap). Either auto-pack from `estHeight` (the
geometry helpers in `chrome/workspace/geometry.ts` exist for exactly this) or hand-tune
the offsets so nothing overlaps at the default panel width. Better still: **the default
layout shouldn't try to show all three at once** — show Function + Play, leave Values to
the rail, and you reclaim the whole left column from overlap.

The **bottom control HUD** (`controlHud`, `:391`) is, by contrast, *nicely* designed —
a `min(94%,540px)` rounded glass card, blurred, centered, with feed pills + two labeled
scrubbers. It's the most polished single object in the app. Its only issue is duplication
(it repeats the feed switcher that's already in the top-bar mode pills *and* the Input
panel — feed is now settable in three places), but as an object it's clean.

---

## 7. Does the picture articulate the concept? (the crux)

The brief's core question: does the picture make **"multiply = spin+scale, add =
slide"** obvious *at a glance*, and is the **two-legs-out / diagonal-back loop** legible
as a loop?

My honest read from the static screenshots: **partly, and only after study — not at a
glance.** Here's the diagnosis.

**What works.** The *decomposition into colored legs* is the right idea, and the colors
do map to the equation. Once you know orange = ×α₁ and violet = +α₀, the orange-arc-then-
violet-dash path genuinely reads as "spin, then slide." The colored-span equation in the
corner is the Rosetta stone that makes it click. This is good Bret-Victor-style
representation: the formula and the picture share a color key.

**What doesn't, at a glance.**

1. **At rest, there is no motion, so "spin" and "slide" are inert.** The orange leg is a
   static arc and the violet leg a static dash. An arc *can* be a spiral or just a bent
   line — the eye can't tell at rest that the orange leg is a *rotation by arg α₁*. The
   concept is fundamentally a *motion* concept, and the default frame is frozen. The
   teaching only lands when you press Play — but nothing about the still frame *invites*
   Play or signals "this moves."
2. **The loop isn't legible as a loop at rest.** Out by two legs (orange, violet),
   back by a third path (teal). Three differently-styled, differently-colored lines
   forming a triangle near the origin doesn't read as "a there-and-back loop"; it reads
   as "three lines." The "back" semantics of the diagonal is invisible without the
   animation that draws it returning.
3. **Too many marks dilute the two that matter.** Per §2, the α₀-from-origin vector, the
   unit curve, the ghost grid, and the z* apparatus all share the frame with the legs, so
   the legs aren't visually privileged as *the point*.

> [!TIP]
> **A cleaner visual language** (Bret Victor lens — let the representation explain):
> - **Default to motion, or a near-motion still.** On load, either auto-play one slow
>   loop, or render the still frame *with a directional gradient/arrowheads along the
>   legs* so "spin then slide" is encoded as direction, not just shape. The orange leg
>   should visibly *curve around* (a spiral with an arrowhead), the violet leg should be
>   a straight arrow — direction is what distinguishes rotate from translate.
> - **Stage the legs, don't show all at once.** Progressive disclosure: frame 0 shows z.
>   Press Play and the orange spiral *draws itself* to α₁z (and *only* the orange leg and
>   its label are bright; everything else dims). Then the violet slide draws to f(z).
>   Then the diagonal returns. At each stage the *active* leg is the only saturated thing.
>   This is how you make a glance teach: one idea lit at a time.
> - **Drop the at-rest diagonal and the origin-α₀ vector** (per §2). Out-by-two-legs is
>   the lesson; the diagonal is the *punchline* and should arrive only on the return.
> - **Make the hero big and centered** (per §1) so the spin actually has radius to read.
>
> Net: fewer simultaneous marks + direction encoded + one-idea-at-a-time reveal +
> motion-forward default. The math is already right; the *staging* is what's missing.

The **quadratic view** (`2026-06-24-S01-quadratic.png`) is, interestingly, *cleaner* in
one respect — the tip-to-tail term vectors (α₂z² → α₁z → α₀, `:557`) form a single
connected polyline that reads more clearly as "a sum of contributions" than the affine
two-legs do. But it also drops a second gold "z*₂" far to the lower-right with a
disconnected label, and a stray slate ⊕ critical-point glyph mid-canvas, both
unexplained at a glance. The same progressive-disclosure prescription applies.

---

## 8. Phone (`2026-06-24-S01-phone.png`)

The phone re-chrome is the **cleanest frame in the whole set** — and tellingly so. The
diagram is centered, the bottom dock + HUD are tidy, the panels are off-screen in the
rail. It proves the point: when the panels aren't allowed to occupy the stage, the hero
picture reads. *But* the same centered hint pill problem recurs (the multi-line hint card
sits across the middle of the diagram), and at phone size the diagram content is *very*
small — the entire path-and-handles cluster is maybe 120px across, with labels ("f(z)",
"z", "α₁") crowding it. On phone especially the default `extent` is too generous; the
hero should fill more of the card.

---

## Verdict

**What I endorse (keep):**
- The **role-based color system** (one color per actor, shared by handles + equation +
  readouts). This is the best thing here. Guard it.
- The **colored-span equation** in the corner — the Rosetta stone that makes the picture
  legible. Keep it prominent.
- The **bottom control HUD** as an *object* — clean, glassy, well-proportioned.
- The **quadratic tip-to-tail** rendering — clearer than the affine staging.
- The **phone layout's** centered hero — it's the model the desktop should follow.

**Must-fix (clutter / contrast / layout — in priority order):**
1. **Fix the first-frame hierarchy.** The math picture must be the focal point on load:
   center it, make the hint a corner/auto-dismiss toast (not a slab across the diagram),
   and stop the default panels from sitting over math-origin. *(§1)*
2. **Fix the overlapping default panels.** Function/Play/Values currently clip each
   other's content at the prescribed y-offsets; auto-pack from `estHeight` or open fewer
   panels by default. *(§6)*
3. **Fix the skin/contrast bug.** The hardcoded dark palette renders on the light skin's
   cream `--viz-bg` and will look broken; either theme the viz palette per-skin or force
   a dark viz surface for this view. *(§4)*
4. **Cut the at-rest clutter from 13 marks to ~7.** Drop the origin-anchored α₀ vector
   (redundant with the +α₀ leg) and hide the return diagonal until the return half of
   Play. *(§2)*
5. **Tame the domain-coloring default brightness** so the rainbow is a texture, not the
   loudest thing on screen; consider coloring only the image grid. *(§3)*
6. **Un-clip "Re"** (more right inset) and **de-collide the origin labels**. *(§5)*

**Nice-to-have (polish):**
- Re-pick the **teal diagonal** away from emerald (two greens that mean different
  things), and nudge the **mover** toward white away from gold.
- **Motion-forward default + progressive leg disclosure** so "spin then slide" teaches at
  a glance, not only after pressing Play. *(§7)* — this is the highest-*value* change for
  the app's stated pedagogy, even if it's labeled polish; it earns "must" the moment the
  layout is fixed enough to see the picture.
- De-duplicate the **feed switcher** (top-bar pills + Input panel + HUD all set it).
- Tighten the default **extent** (~3 desktop, smaller-feeling hero on phone) so the loop
  fills the frame.

The core idea is strong and the color thinking is genuinely good. The app's problem is
not its concept or its palette — it's *staging*: the hero loses the first frame, the
panels clip, too much ink fires at once, and the one concept that is fundamentally about
*motion* is presented as a frozen, cluttered still. Fix the staging and this becomes one
of the clearest views in the toolkit.

---

## Self-reflection

1. **What would you do with another session?** Mock up the proposed clean default frame
   (centered hero, corner-toast hint, one-leg-lit progressive Play, dropped origin-α₀
   vector and at-rest diagonal) as an actual screenshot or quick branch, so the
   recommendations are shown rather than described — and check the light/phosphor skins
   live to confirm the contrast bug I inferred from the tokens.
2. **What would you change about what you produced?** I judged motion-dependent claims
   ("spin doesn't read at rest," "the loop isn't legible as a loop") from *static*
   screenshots only. A short screen-capture of Play would either confirm or soften those.
   The review leans heavily on the four stills I was given.
3. **What were you not asked that you think is important?** Accessibility: this palette
   leans on hue alone to distinguish actors (orange α₁ vs gold z* vs pale-yellow mover vs
   red null-cone — four warm hues). For color-vision-deficient users that's a real
   legibility risk that shape-coding (the distinct handle glyphs) only partly mitigates,
   since the *paths* aren't shape-coded.
4. **What did we both overlook?** Whether any of these "clutter" marks are *off by
   default* in normal use vs the screenshot's configuration — I assumed the screenshots
   reflect defaults, but `usePersistentState` means the shots could show a tweaked state.
   The defaults in code (`gridColor:false`, `showUnitCircle:true`) mostly match, but the
   grid-colored shot is clearly a toggled state.
5. **What did you find difficult?** Separating "this is genuinely cluttered" from "this
   is a still frame of something that's clean in motion." Several marks I flag as clutter
   may be self-explanatory once animated; I tried to flag that distinction in §7.
6. **What would have made this task easier?** A short animation/GIF of Play, and one
   screenshot on the light skin, would have let me verify rather than reason about the two
   claims I'm least sure of (motion legibility, skin contrast).
7. **How did you verify this, and does each passing check test the user-visible claim?**
   Method: reasoning over four static screenshots + reading every stroke/color/offset in
   `ArgandPlane.tsx` and `Argand.tsx` and cross-checking color/layout values against
   `theme.css`. The layout-overlap, label-clip, redundant-mark, hue-collision, and
   hardcoded-hex-vs-token findings are grounded in the source and the stills and are
   solid. The motion-legibility (§7) and light-skin-contrast (§4) claims are *reasoned,
   not observed* — I inferred the skin bug from token values, not by rendering the light
   skin. Signal: `visual-unverified` (motion and non-dark-skin rendering not captured).
8. **Follow-up value:** MEDIUM — the static/source-grounded findings (hierarchy, panel
   clipping, redundant marks, hardcoded palette) are correct and actionable now; a
   follow-up with a Play capture and a light-skin screenshot would confirm the two
   motion/contrast claims and let the cleaner-staging proposal be shown rather than
   described.
