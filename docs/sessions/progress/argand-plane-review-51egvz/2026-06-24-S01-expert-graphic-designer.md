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

## Augmentation (2026-06-24) — the complex–dual–split slider as a cross-app "unitary spaces" lens

Dan's framing: complex numbers are the *familiar* entry, but even ℂ should be treated
as one foreigner among many — a single setting of `p = j²` on the elliptic / parabolic /
hyperbolic (Cayley–Klein) continuum. The design question for my lens is: **if the `p`
dial spreads from Argand-only to the whole complex suite, what single visual grammar makes
"which space am I in" instantly readable, and how do we keep the suite's signature
domain-coloring honest as `p` moves off −1?**

My round-1 thesis stands and *constrains* the answer: this suite already risks confetti,
and the one thing that works everywhere is a **disciplined, role-stable color/shape key**.
A cross-app dial is worth doing *only* if it rides the same discipline — one signifier,
one palette law, progressive disclosure. Bolt three regime-specific color schemes onto
four apps and you get exactly the plaid I warned about in §3.

### 1. A shared signifier: the unit curve *is* the dial's face

> [!TIP]
> Make the **unit curve + null cone the single, universal "where am I" badge**, rendered
> identically in every app: a faint dashed **circle (p<0) → two parallel lines (p=0) →
> hyperbola + red null cone (p>0)**, level set `x²−p·y²=1`. It is already the honest
> visual signature in Argand (`ArgandPlane.tsx:361-392`); promote it to a shared
> primitive so the *same* glyph deforms the *same* way wherever you are. The eye learns
> one shape-language once and reads it across Plane Transform, Complex Particles,
> Correspondence.

Why the unit curve and not, say, a label or a color swatch:

- It is **the geometry of multiplication made visible** — the orbits of `×(unit α₁)` are
  exactly that curve. A textual "Split-complex" pill tells you; the curve *shows* you.
  That is the Bret-Victor move and it's already built.
- It **survives the morph as one continuous object** (circle pinches to lines, lines
  splay to a hyperbola). A continuous signifier reads as "the geometry is bending"; a
  swapped icon reads as "mode changed." Continuity is the whole pedagogical payload of a
  *slider* (vs three buttons), so the signifier must be continuous too.
- It is **monochrome dashed**, so it never competes with the role colors (z/α₁/α₀/f). It
  is scaffold, not actor — exactly the data-ink tier it belongs in.

The single affordance that reads "you are dialing the geometry of multiplication" should
be **the dial physically attached to that curve**: a small inline track whose thumb sits
*on* a miniature of the morphing curve (circle↔lines↔hyperbola), with the three named
stops Complex · Dual · Split. Argand's bottom-HUD `j²` row (`Argand.tsx:423-433`) is
already 80% of this; the cross-app version is "lift that HUD row into a shared chrome
primitive and draw the curve-thumb on it." One dial, one curve, everywhere.

> [!CAUTION]
> Do **not** signify the space with a global *background tint* or a *skin change* per
> regime. It would fight the per-skin theming (already fragile here — see §4 hardcoded-hex
> bug) and would re-color the whole stage three times, which is the confetti failure at
> suite scale. The signifier must be a *local, monochrome, geometric* badge, not an
> ambient wash.

### 2. The domain-coloring problem: hue = `arg z` lies off ℂ

This is the hard one and the place where a naïve "just spread `p` everywhere" actively
*damages* clarity. Hue = `arg z` is the suite's signature (Complex Particles, Plane
Transform's colored grids). But `arg` is a *complex* notion:

| Regime | Natural "angle" | What hue=arg does today | Honest reading |
|--------|-----------------|-------------------------|----------------|
| Complex `p<0` | true angle `atan2(y,x)`, periodic 0–2π | correct, the signature look | **keep** |
| Dual `p=0` | degenerate — "angle" collapses, no rotation | maps a meaningless quantity to a full hue wheel | **a lie; must not pretend** |
| Split `p>0` | rapidity (hyperbolic angle), *unbounded*, sign-flips across the null cone | wraps a non-periodic quantity onto a periodic wheel → false banding | **a lie; must not pretend** |

> [!WARNING]
> A periodic hue wheel applied to a non-periodic (rapidity) or degenerate (dual) "angle"
> is the textbook misleading-encoding: it manufactures bands and discontinuities that the
> math doesn't have, and it implies a rotational symmetry that only ℂ possesses. Spreading
> the current palette unchanged across `p` would make the *prettiest* app the *most
> dishonest* one off −1.

The honest visual move, kept to **one coherent palette law, not three regimes**:

- **Make the encoding follow the level sets of the generalized norm `N(z)=x²−p·y²`, not
  the angle.** That is the *one* quantity that stays meaningful across the whole
  continuum (it's the very curve in §1). Encode **lightness/value by `|N|`** (iso-norm
  shells — concentric circles, strips, or hyperbolae) and **hue by the generalized
  argument** *only where it's well-defined*. This is a single rule (`color = f(N, argG)`)
  whose *appearance* morphs because `N`'s level sets morph — exactly the continuity we
  want. In ℂ it reduces to the familiar phase-by-angle look (because `N`-shells are
  circles and `argG` is the angle), so we **don't lose the signature** at `p=−1`.
- **Where the generalized argument is undefined or unbounded, desaturate toward neutral
  rather than inventing hue.** In **dual** (`p=0`), angle is degenerate → render
  near-grayscale shaded by `N` only (the picture *should* look flatter; that flatness is
  the truth — multiplication is a shear, not a rotation). In **split**, hue can track
  rapidity *sign and magnitude* but must **break at the null cone** — and the break should
  read as a feature: see §3.
- **One sequential ramp, reused.** To avoid a confetti of regimes, pick a *single*
  perceptually-uniform ramp for `|N|` and a *single* diverging hue pair for the
  generalized argument's sign, and let the *geometry* (shell shape) carry the regime, not
  a new color set. The palette law is constant; only the shapes it paints onto change.

This also resolves a quiet tension with my round-1 role-color key: the role colors
(z/α₁/α₀/f) are **foreground actors** and must stay fixed across all `p`. The
domain-coloring is **background field** and is allowed to morph. Keeping those two tiers
strictly separate (saturated solid actors on top, low-contrast field below) is what stops
the morph from swallowing the hero — the same figure/ground discipline from §2/§3, now
load-bearing across the suite.

### 3. Figure/ground & motion across the morph (including the null-cone discontinuity)

When `p` animates complex→dual→split, the grid/loop/field deforms. To read as "the
geometry is bending" rather than glitch:

- **Move the field, freeze the actors' identity.** During the morph, dim the
  domain-coloring field (drop its opacity, as I urged for the rainbow grid in §3) so the
  *deformation of the iso-norm shells* is what the eye tracks, while z/α₁/α₀/f stay full
  brightness and keep their colors/shapes. The lesson is "the *space* bends, the *players*
  are the same players." That's a figure/ground choice, not an animation trick.
- **Pace by the morph, not the clock.** Argand's `sysPlaying` ping-pongs `p` linearly at
  0.4/s (`Argand.tsx:77-82`). Linear-in-`p` is fine, but the *visually* dramatic stretch
  is near `p=0` where circles snap to lines — ease the dial to *slow down through the
  parabolic knife-edge* so the eye can follow the pinch instead of seeing it flash past.
- **The null cone is a real discontinuity — stage it, don't smooth it.** In split,
  `×α₁` degenerates on the null lines (Argand draws them red, `:388-389`). As `p` crosses
  into split, the red null cone should **fade in as a deliberate event**, and any hue that
  would invert across it should visibly *break* at the red lines (a hard seam, not a smooth
  ramp). The honest reading is "something genuinely different happens here"; a smooth blend
  across the cone would erase the very phenomenon. So: keep the red cone monochrome and
  constant (it's a hazard marker, like the unit curve is a compass), and let the field
  *terminate* at it rather than bleed through.
- **Avoid full-field reflow as noise.** The danger is the whole screen re-striping every
  frame (the §3 plaid, now animated = strobing). Mitigation: animate **only the iso-norm
  shells and a sparse set of guide curves**, not a dense colored lattice, during the
  morph; restore detail only when `p` settles on a stop. Motion at low spatial density
  reads as deformation; motion at high density reads as static/noise.

### 4. Does a suite-wide dial help or hurt the "clean display" I argued for?

**It helps — but only if it inherits the staging discipline, and it raises the stakes on
every round-1 flaw.**

- It **helps** the deepest pedagogical goal: a *continuous* dial with a *continuous*
  signifier (the morphing unit curve) is a better teacher than three separate hardwired-ℂ
  apps, and it reframes ℂ as "one chart among many" exactly as Dan wants. One learned
  grammar, reused — that is *anti*-confetti when done right.
- It **hurts** if added naïvely, in three specific ways my round-1 review already flagged:
  1. **The hardcoded-hex/skin bug (§4) becomes systemic.** A field that recolors by `N`
     across the continuum *must* be theme-aware, or it'll break on light/phosphor skins in
     four apps instead of one. The dial cannot ship until the viz palette is tokenized or
     the viz surface is forced dark. This is now a **blocking prerequisite**, not a polish
     item.
  2. **The clutter ceiling (§2) is suite-wide.** Adding a morphing field + null cone +
     iso-shells to apps that *already* carry their own dense marks (Complex Particles'
     4D cloud, Plane Transform's two grids) risks the 13-mark pileup everywhere. The dial
     must arrive *with* a progressive-disclosure rule: the system signifier is
     low-contrast scaffold by default; the field morph is only loud while the dial is
     being dragged/played, then settles back.
  3. **The role-color key (my favorite thing) must be declared sacred and global.** If the
     dial spreads, the z/α₁/α₀/f/z* colors must be a shared constant across all apps, never
     reused by the domain-coloring field. The whole scheme works *because* foreground roles
     are fixed and only the background space morphs.

So: a suite-wide `p` dial is a **good idea that amplifies whatever discipline is already
there.** On today's Argand — overlapping panels, occluded hero, hardcoded palette — it
would amplify the mess. Fix the round-1 staging first; *then* the dial becomes the
suite's most elegant unifying gesture rather than its loudest source of noise.

### Polar coordinates across Number Planes (2026-06-24)

The unlock here is that **the polar grid and the domain coloring are the same picture
drawn two ways.** In ℂ: the polar **rays** *are* the angle `θ = arg z` — the exact quantity
hue encodes; the polar **circles** *are* the unit-curve family `|z| = const` — the exact
shape the §1 signifier draws. So they cannot be designed separately. When the `p` dial
leaves ℂ, the polar net, the unit-curve signifier, and the domain-coloring field are **one
coordinate system** and must morph as one, or they'll disagree on screen and read as broken.

Generalized polar `z = ρ·e^{jθ}`, `ρ = √|N|`, `N = x²−p·y²`:

| Regime | Circles (ρ = const) → | Rays (θ = const) → | Honest behavior |
|--------|------------------------|--------------------|-----------------|
| Complex `p<0` | the familiar circles | rays at true angle | the signature look — **keep** |
| Dual `p=0` | **parallel lines** `x = const` (the unit-curve pair) | rays = constant slope `θ = y/x` fanning from origin; **the `x=0` axis is degenerate** | flat, shear-like — *should* look flatter |
| Split `p>0` | nested **hyperbolae** sharing the null asymptotes | rays = constant **rapidity**, crowding toward the null lines `y=±x`, never crossing them | four sectors, hard seam at the cone |

> [!TIP]
> **Render circles and rays as one deforming net, not two toggles.** Argand today treats
> "Polar" as a grid *type* (`gridType`, `ArgandPlane.tsx:263`) separate from the unit curve
> and from domain-coloring. Under Number Planes they should be **the same family of curves
> at different densities**: the unit-curve signifier is the `ρ=1` member; the polar circles
> are its `ρ=2,3,…` siblings; the rays are the orthogonal `θ`-level-sets. Draw them with the
> **same monochrome scaffold law** so the whole net pinches (circles→lines) and fans
> (rays→rapidity rays) continuously as the dial moves. One net, one deformation, one
> learned grammar — this is the anti-confetti choice.

**How the deformation teaches rather than glitches** (carrying §3's discipline):

- **The circles morph by the unit-curve family you already accepted in §1**, so there is
  no new shape vocabulary — the polar grid *is* the signifier, thickened. Circle pinches to
  two vertical lines at `p=0`, then splays to hyperbolae. Ease slow through `p≈0` so the
  pinch is followed, not flashed.
- **Rays fan continuously by the generalized angle.** In ℂ they sweep a full 2π; toward
  split they crowd toward the null lines and *stop* — there is no ray "beyond" rapidity ∞.
  Show that as rays **bunching and thinning** toward the cone, not as rays vanishing
  abruptly. The crowding *is* the teaching: "angle runs out of room here."

**The sectors / null set / degenerate line — render as honest structure, not a broken
grid:**

> [!WARNING]
> The instinct will be to fill the whole plane with grid everywhere, including where the
> coordinates don't exist. That's the lie. The engine already knows the legal domain
> (`powReliable`, `ArgandPlane.tsx:339-340`). Use it as a **rendering mask**, not just a
> math guard.

- **Split: four sectors split by the null cone `y=±x`.** Draw the cone as the **same red,
  monochrome, constant hazard line** from §3 — a deliberate boundary, not a missing grid
  line. Inside each sector the net is full strength; *at* the cone it terminates with a hard
  seam (rays bunch into it, circles' asymptotes ride along it). The four-sector structure
  should read as "the plane has genuine walls here," which is exactly true.
- **Dual: the `x=0` line is degenerate.** Rays (slope `y/x`) blow up there. Render the
  `x=0` axis as a **single dimmed/dashed degenerate line** (same hazard styling, calmer),
  with the ray fan visibly *thinning to nothing* approaching it — the picture says "the
  angle coordinate dies on this line," which is the parabolic knife-edge made visible.
- **Everywhere the coordinate is undefined, the net fades to the background** rather than
  drawing a fake curve. Honest absence reads as structure; a drawn-anyway grid reads as a
  bug.

**Unification with the domain-coloring recommendation (one grammar):** this *is* my §2
proposal seen from the dual side. There I said: encode value by `|N|` (iso-norm shells) and
hue by the generalized argument, desaturating where undefined. The polar grid is **the same
two families made into discrete scaffold lines**: the `|N|` shells *are* the polar circles;
the `θ`-level-sets *are* the polar rays; the desaturate-where-undefined rule *is* the
fade/sector/degenerate-line treatment above. So:

> [!NOTE]
> **Polar grid and domain coloring share one rule** — `(ρ,θ)` from `N=x²−p·y²` — rendered at
> two opacities: the **field** (continuous hue/value, low contrast, background tier) and the
> **net** (discrete monochrome scaffold lines, the unit-curve family + θ-rays). The null
> cone and the dual degenerate line are drawn **once**, in the shared red/dim hazard style,
> and *both* layers respect them identically. That guarantees the colored field and the
> drawn grid never disagree about where the geometry exists — the single biggest cleanliness
> win, and it kills the confetti risk because there is only one coordinate law to learn.

So polar coordinates are not merely "meaningful" in dual/split — they are the *clearest*
way to **see** the difference between rotation, shear, and boost, *provided* the circles,
rays, hue, and unit-curve signifier are all driven by the one `N`-based law and all honor
the same legal-domain mask. Build them as one object, not four modes.

### Augmented verdict (delta)

- **Endorse** promoting the unit curve + null cone to a **shared, monochrome, continuous
  signifier** — it is the single best affordance for "which geometry of multiplication am
  I in," and it already exists in Argand. One glyph, drawn the same everywhere.
- **Endorse** re-basing domain-coloring on the **generalized norm's level sets** (`N=x²−p·y²`)
  with a **single palette law** — hue+value where defined, desaturate-to-neutral where the
  generalized argument is degenerate/undefined (dual, across the null cone). This keeps the
  ℂ signature at `p=−1` while refusing to lie elsewhere. Reject spreading the raw
  hue=`arg z` palette unchanged across `p`.
- **New blocking prerequisite (promotes from round-1 "must-fix #3"):** the viz palette must
  be **theme-tokenized** before any cross-app system dial ships, or the skin bug
  metastasizes across four apps.
- **Concern:** suite-wide deformation animation is a clutter/strobe risk; require the
  morph to animate only sparse iso-shells + signifier (field dimmed), and to *break*
  honestly at the null cone rather than smooth across it.
- **Net:** the dial *helps* the clean-display goal **iff** it inherits round-1's staging
  discipline (fixed role-color foreground, low-contrast morphing background, progressive
  disclosure). It is an amplifier — worth building after, not before, the Argand staging
  fixes.

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
   The round-2 augmentation (cross-app `p` dial) is design proposal, not verified against
   any built artifact — it reasons forward from the source facts and round-1 findings.
8. **Follow-up value:** MEDIUM — the static/source-grounded findings (hierarchy, panel
   clipping, redundant marks, hardcoded palette) are correct and actionable now; a
   follow-up with a Play capture and a light-skin screenshot would confirm the two
   motion/contrast claims and let the cleaner-staging proposal be shown rather than
   described.
