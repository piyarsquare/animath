---
kind: three-hats
session: 2026-06-24-S01
date: 2026-06-24
title: "Argand review — Hat 3: Math-Visualization & Pedagogy"
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review
status: complete
build: passing
signals: [visual-unverified]
---

# Argand review — Hat 3: Math-Visualization & Pedagogy Expert

## Plan under review

<details>
<summary>Original request</summary>

> Review the Argand app (#/argand, src/animations/Argand/) — its visual design and user experience. ADD TWO HATS beyond the usual three: (4) a graphic designer focused on whether the display is clean and the concepts are well-articulated visually, and (5) a video game designer focused on user experience and interaction feel.

</details>

I am the mathematician-educator hat. I read `complexOps.ts`, `ArgandPlane.tsx`,
`Argand.tsx`, `EXPLAINER.md`, and the four screenshots. My job is to certify (a)
that the picture is **true** and (b) that it **teaches** — and to keep those two
questions apart. Throughout I distinguish **actually wrong / dishonest** (must
fix) from **correct but cluttered / mistunable** (should fix) from **polish**.

The headline: the math engine is unusually honest and largely correct — this is
some of the most carefully-reasoned interpolation code in the repo. The problems
are almost all **pedagogical density**, plus **one honesty gap in EXPLAINER** and
**two semantic-naming issues** the prompt already flagged. This is good work that
is over-furnished for an entry point.

---

## 1. Mathematical fidelity — is the picture true?

I checked each drawn object against its formula.

| Object | Formula in code | Correct? | Notes |
|---|---|---|---|
| `×α₁` leg as honest spiral | `powReal(b,t)=|b|^t·e^{i·t·arg b}` (`complexOps.ts:32`) | ✅ **Yes** | This is the load-bearing honesty claim and it holds: at `t=0`→1, `t=1`→`b`, geometric interpolation in modulus, linear in argument. Never a straight chord. The EXPLAINER's "It never cuts a straight chord; that would be a lie" is *earned*. |
| `+α₀` leg | `add(α₁z, scale(α₀, ·))` (`affineAt:114`) | ✅ Yes | Straight slide, as claimed. |
| Fixed point `z* = α₀/(1−α₁)` | `divG(a0, sub(1,a1), p)` (`fixedPoint:122`) | ✅ Yes | Correct; null-guarded when `α₁→1`. |
| Quadratic fixed points | roots of `α₂z²+(α₁−1)z+α₀` (`polyFixedPoints:167`) | ✅ Formula correct | `B=α₁−1`, `disc=B²−4AC`, `(−B±√disc)/2A`. The quadratic *formula* is right. The **system √ is the caveat** — see §2. |
| Critical point `−α₁/(2α₂)` | `divG(scale(c1,-1), scale(c2,2), p)` (`criticalPoint:180`) | ✅ Yes | `f'(z)=2α₂z+α₁=0` ⟹ `z=−α₁/2α₂`. Correct. |
| Iteration log-spiral | `z* + α₁ˢ·(z−z*)` (`orbitAt:343`) | ✅ Yes | Exactly `fⁿ(z)−z* = α₁ⁿ(z−z*)`. The continuous `α₁ˢ` is the honest spiral interpolant of the discrete iterates. |
| Unit curve `x²−p·y²=1` | ellipse / two lines / hyperbola+asymptotes (`unitCurveNode:361`) | ✅ Yes | `p<0`: ellipse `rx=k, ry=k/√(−p)`. `p=0`: lines `x=±1`. `p>0`: hyperbola branches `(±cosh s, sinh s/√p)` + null-cone asymptotes. All correct. |
| Generalized algebra `mulG`, `expG`, `logG` | (`complexOps.ts:49–84`) | ✅ Yes | `mulG` with `j²=p` is right. `expG`/`logG` correctly specialize to cos/sinh as `p` crosses 0, with the `1/w` normalization so the `p→0` limit is the dual `(e, e·v)`. This is subtle and done correctly. |
| Arc-length pacing | chord-accumulation LUT (`arcLengthMap:296`) | ✅ Yes | Constant geometric speed. Genuinely improves the animation; see §4. |

> [!NOTE]
> **Verdict on fidelity: the core picture is true.** The affine story —
> two honest legs, the spiral multiply, the fixed point, the iteration spiral,
> the three unit curves — is mathematically correct and honestly drawn. The
> spiral-not-chord choice is the single most important pedagogical decision in
> the app and it is made correctly. I endorse the engine.

### The one place the spiral quietly degrades (correct *handling*, weak *disclosure*)

`powRealG` (`complexOps.ts:92`) falls back to a **linear blend** when the
generalized log doesn't exist (dual `Re≤0`; split outside the future cone /
on the null cone). The code is honest *with itself*: `orbitSpiral` is gated by
`powReliable` (`ArgandPlane.tsx:339`), so in degenerate regions the orbit is
drawn as **straight segments between literal iterates** rather than a fake
smooth spiral. That is the right call — the literal iterates are always exact;
only the *interpolation between them* is unavailable, and the code degrades to
honest segments instead of inventing a curve.

But the **animation leg** (`affineAt` via `powRealG`) does *not* expose this:
in the dual/split degenerate region the "×α₁ spiral" silently becomes a
straight line, with no on-canvas signal that the honest-spiral guarantee has
lapsed. A learner watching the dual case morph could conclude the multiply
*is* a straight slide there. It mostly is (dual multiply is a shear, which along
a single point can look linear), but on the null cone in split-complex this is a
genuine degeneration that goes unannounced. **This is the honesty gap to close**
(see §3).

---

## 2. The approximate quadratic fixed points (disclosed where? — must fix)

The handoff flags: *dual/split quadratic fixed points are APPROXIMATE because
the system √ falls back in degenerate regions.* I confirm this is real:

- `polyFixedPoints` (`:167`) computes `sqrtG(disc, p) = powRealG(disc, p, 0.5)`.
- `powRealG` for `p≥0` calls `logG`, which **returns null** on the null
  cone / `Re≤0` / outside the future cone (`:77–81`), and `powRealG` then
  **falls back to a linear blend `1+(disc.re−1)·0.5, disc.im·0.5`** (`:95`).

So when the quadratic's discriminant lands in a degenerate region of the dual or
split plane, the two gold `z*₁/z*₂` are **not the true fixed points** — they're
computed from a stand-in "√" that is just a halved linear interpolation toward 1.
They will be plotted with the same confident gold rings as the exact complex
case. A user dragging α₂ in split-complex mode can watch `z*₂` glide to a
**wrong** location and have no idea.

> [!WARNING]
> **Must fix (honesty).** This is the one place the app can draw something
> *false* with full confidence. Two acceptable fixes, cheapest first:
> 1. **Disclose + flag.** When `logG(disc,p)` returns null, mark those `z*` as
>    *approximate* (hollow/dashed ring, or hide them) and add a one-line note to
>    EXPLAINER's number-systems section: "In the dual and split-complex planes a
>    quadratic's fixed points are exact only when the discriminant lies in the
>    well-defined region; elsewhere they are approximated." A vaguer-but-true
>    note beats a crisp false dot.
> 2. **Fix the √.** A split-complex square root *does* exist for `N>0, Re>0`
>    via the existing `expG(0.5·log)`; the gap is only the genuinely
>    null/negative-norm region where no √ exists at all. There, hiding the dot
>    is the honest move — there is no real fixed point to draw.
>
> Either is fine. **Drawing a confident gold dot at a fabricated location is
> not.** The repo's own attribution policy says "never fabricate"; a fabricated
> *fixed point* is the geometric equivalent.

Everything else in the quadratic layer (critical point, term-sum, Horner chain)
is exact in all three systems, because those use only `mulG`/`add` and integer
powers — no √. So the bug is narrowly scoped to the two quadratic `z*` in
dual/split. Good news; it means the fix is local.

---

## 3. Honesty of EXPLAINER.md

EXPLAINER is mostly excellent — it is careful, it names the spiral-vs-chord
choice as a deliberate truth, and the "Possible sources" block is genuinely good
wayfinding (Argand/Wessel, de Moivre, Needham, Yaglom, Cayley–Klein). It does not
overclaim the affine story. Two corrections:

| Claim in EXPLAINER | Status | Fix |
|---|---|---|
| "It never cuts a straight chord; that would be a lie." (line 31) | ✅ True **in complex**; **silently false in degenerate dual/split** | Add a clause: true wherever the generalized power is defined; in degenerate dual/split regions the multiply degrades to a straight slide. |
| Nothing said about approximate quadratic `z*` in dual/split | ❌ **Omission** | Add the disclosure from §2. |
| "the same engine that, with a `z²` term, makes the Mandelbrot set" (line 50) | ⚠️ True but slightly oversold for the affine page | Fine as written once the reader is at the quadratic section; in the affine section it's a forward-promise, acceptable. |
| Title/framing "Argand Plane" applied to all three systems | ⚠️ **Semantic** | See §5 — "Argand plane" names only the complex case. |

> [!NOTE]
> The EXPLAINER does **not** currently disclose the two approximations
> (degenerate-region spiral fallback; approximate quadratic `z*`). Both are
> honesty must-fixes, both are one sentence each.

---

## 4. Conceptual clarity — does the default view teach, or pile on?

This is where I have the most to say, and it is the prompt's central worry:
*"make the scrubber pay its way — the arc is the payload, not the slider"* and
*"does the affine→quadratic→number-systems progression land before the basics?"*

### What's on the default canvas at once (Point, Linear, complex)

From `2026-06-24-S01-desktop-point.png`, counting simultaneous objects in the
default first-30-seconds view:

1. The cyan `z` handle (+ label)
2. The orange `α₁` diamond (+ label) — at a *coefficient* position
3. The violet `α₀` square (+ a dashed violet vector from the origin)
4. The gold `z*` fixed point (+ label)
5. The orange `×α₁` leg (solid arc)
6. The violet `+α₀` leg (dashed)
7. The teal **diagonal return** arc (dashed)
8. The small orange waypoint dot at `α₁z`
9. The green `f(z)` dot (+ label)
10. The **dashed unit circle** (ellipse)
11. The Cartesian grid + axes + `i`/`Re` labels

That's **eleven** distinct mathematical objects before the learner has touched
anything. Three panels are open on the left (Function, Play, Values), a HUD with
**two** scrubbers (t and j²) sits at the bottom, and an equation card sits
top-right. For an app whose stated job is *entry point for complex numbers*,
the screen is asking a beginner to parse the affine-fixed-point-dynamics-plus-
number-system-trichotomy story all at once.

> [!IMPORTANT]
> **The default view over-teaches.** Objects 5–10 (two legs + diagonal +
> waypoint + z* + unit curve) are the *advanced* affine story — decomposition,
> the return homotopy, the invariant point. A first-timer needs: *here is z,
> here is f(z), and the arrow from one to the other.* The decomposition and the
> fixed point are the **second** lesson, not the first frame.

Two specific clutter calls:

- **The teal diagonal return arc is shown at rest** (object 7). It's drawn
  whenever `(isPoint||isGrid) && !quad && !iterate` regardless of `t` — see
  `ArgandPlane.tsx:530`. The diagonal is a *beautiful* idea (the "all-at-once"
  homotopy vs the two-corner route), but at rest it's a third dashed curve
  competing with the two legs, and its meaning only becomes legible *during the
  return half of Play*. **It should appear only in motion**, like `showMover`
  does for the moving marker. The static frame should show two legs and `f(z)`,
  full stop. This directly answers the backlog item: right now the arc is shown
  but the *scrubber doesn't pay its way* because the arc is already all there at
  rest — there's nothing for Play to reveal.
- **The unit curve is on by default** (`showUnitCircle` defaults `true`,
  `Argand.tsx:54`). In the *complex* default it's a faint dashed circle that
  most beginners will read as "the unit circle, |z|=1" — which is fine and even
  helpful. But it only earns its keep once you move the j² slider; until then
  it's an unexplained dashed ellipse. I'd **default it off** and let the System
  panel turn it on, OR keep it but only when `p≠−1` initially. Minor.

### Is the progression a sensible learning path?

**Yes — the *ladder* is right; the problem is that all rungs are visible at
once.** affine (mx+b cousin) → fixed point/iteration → quadratic (lines bend) →
number systems is a genuinely good pedagogical arc, each step motivated by the
last. Needham would approve of the spine. The flaw is purely that the app
presents the whole ladder in one frame rather than gating it. The Degree pill
and the j² slider are the gates — they exist — but the *default* leaves the
quadratic off (good) while leaving the fixed point, the diagonal, the unit
curve, and a second scrubber **on** (too much).

### Does the scrubber pay its way? (the backlog's question)

Partially. The **arc-length pacing is genuinely valuable** — a tight spiral and
a short slide now feel like one pen at constant speed, which is exactly the right
geometric intuition (`arcLengthMap` comment nails the rationale). But because the
two legs + diagonal are *all drawn statically*, pressing Play mostly slides a dot
along curves that are already fully visible. **The payoff of Play should be that
it reveals structure that isn't there at rest.** Concretely:

- At rest: show `z`, `f(z)`, and a single faint connecting hint.
- On Play: *build* the ×α₁ leg, then the +α₀ leg, then return on the diagonal,
  drawing each as the pen traverses it (a trail that grows, not a pre-drawn
  curve a dot rides).

That turns the scrubber into the payload, which is what the backlog asks for.

---

## 5. Semantic hygiene — are things named the way mathematicians think?

Mostly strong. The `α₁` = slope, `α₀` = shift, the explicit `y=mx+b` analogy,
"fixed point," modulus/argument readouts (both rect and polar — good), and the
elliptic/parabolic/hyperbolic = complex/dual/split mapping in the sources block
are all correct and well-chosen. Two issues, both the prompt anticipated:

| Issue | Where | Severity | Fix |
|---|---|---|---|
| **"Argand plane" names only the complex case.** The app keeps the title "Argand Plane" while the j² slider moves into dual (Galilean/Yaglom plane) and split (Minkowski plane). | Title (`Argand.tsx:490`), EXPLAINER H1 | **Should fix (naming honesty)** | Either (a) keep "Argand Plane" as the app's *name* but say in EXPLAINER that strictly the Argand plane is the complex case, and the dual/split planes have their own names (Galilean/Yaglom, Minkowski); or (b) call the generalized object "the j²-plane" in the System section. The subtitle already correctly says "Complex / Dual / Split," so just align the prose. |
| **`p = j²` vs the slider's "Number system."** Mathematically clean; the slider exposes `p∈[−1,1]` but only the *sign* matters. | System panel | Polish | EXPLAINER already says "Only the sign matters" — good. Consider making the three stops the primary control and the continuous slider the "morph," since the in-between values aren't distinct algebras (they're rescalings). The continuous morph is pedagogically lovely *as an animation* but mathematically there are only three systems. The current framing (slider with three snap stops + a Play morph) actually gets this right. Keep. |

One more naming nicety I'd endorse: the critical point glyph (slate ⊕) is labeled
only in EXPLAINER, not on canvas. In the quadratic screenshot it reads as a
mystery crosshair. A tiny "crit" label (matching the `z*` labels) would help.

---

## 6. Accessibility of the idea & color

### Will a motivated beginner reach the "aha"?

**For the affine story, yes — if the default is decluttered.** The mx+b analogy
is the right on-ramp, the drag-and-watch interaction is immediate, and "View
from z* turns f into a pure spiral" is a real, earnable aha that the math
supports exactly. The iteration spiral toward/away from z* is a second strong
aha. These are the app's best teaching moments and they survive scrutiny.

**For number systems, this is NOT an entry point** — and shouldn't pretend to be.
Dual/split-complex, the null cone, rapidity: this is sophisticated material
(rightly credited to Yaglom). It's fine that it's *available* behind the j²
slider, but an "entry point for complex numbers" should not foreground it. The
bottom HUD currently gives j² **equal billing** with the path scrubber `t`
(`Argand.tsx:423–433`), which over-promotes the hardest idea in the app to a
permanent fixture. I'd demote the j² control out of the always-on HUD into the
System panel (where it already also lives), so the immersive default is pure
complex.

### Color legibility (incl. CVD)

The palette: `z` cyan `#38bdf8`, `α₁` orange `#fb923c`, `α₀` violet `#c084fc`,
`α₂` pink `#f472b6`, `f(z)` emerald `#34d399`, `z*` gold `#fbbf24`.

| Pair | Concern |
|---|---|
| `α₁` orange vs `z*` gold | Both warm; under **deuteranopia/protanopia** orange and gold-yellow are among the hardest to separate. They're also the two most important coefficient/result markers. **Mitigated** by distinct *shapes* (orange diamond vs gold ring), which is the right move — but the term-sum lines in quadratic mode use color *alone* to distinguish α₂z²/α₁z (pink vs orange), and pink-vs-orange is a CVD risk. |
| `α₂` pink vs `α₁` orange | Close in red-green-deficient vision; the term-sum legs rely on this distinction. |
| Grid "color by angle" (domain coloring) | The hue=arg(z) wheel is standard and matches the Complex Particles charts (good consistency), but it's inherently CVD-hostile (red/green opposite ends of the wheel map to opposite arguments). It's off by default (good) and is an *advanced* readout, so acceptable — but worth a one-line note that it encodes angle, for users who can't see the wheel. |

> [!NOTE]
> The app's saving grace on accessibility is that **every role has a distinct
> glyph** (circle/diamond/square/triangle/ring) and an attached **text label**,
> so color is reinforced, not sole-carrier — except in the quadratic
> **term-sum vectors**, which distinguish terms by color alone. Add a glyph or
> a tiny term label there.

The domain-colored grid screenshot (`grid-colored.png`) is, frankly, gorgeous
and also the most over-saturated/illegible frame in the set — a rainbow lattice
of bent lines with the affine story buried inside. It's a *demo* look, not a
*teaching* look. Fine as an option; should never be a default (it isn't).

---

## 7. Quadratic view density (the hardest frame to parse)

`2026-06-24-S01-quadratic.png` is the most crowded: term-sum vectors (pink/
orange/violet tip-to-tail), the teal collapse-diagonal, the slate critical-point
crosshair, **two** gold `z*` (one off-screen-ish at lower right), the unit
ellipse, the handles. A beginner cannot parse this; even I had to trace the
term-sum chain deliberately. The term-sum-as-tip-to-tail-vectors idea is
*excellent* mathematics (a polynomial value as a chain of vector contributions —
this is genuinely the right mental model) but it needs **isolation** to land:
hide the unit curve, hide the diagonal at rest, and let Play lay the term vectors
down one at a time (which `polyTermLoopAt` already supports — it's just that the
static frame shows all of them at once).

The critical point and the two fixed points are correct and worth keeping, but
they belong to a *third* lesson ("where does the fold/the invariant sit"), not
the first quadratic frame.

---

## Verdict

This is mathematically honest, carefully-reasoned work with one real honesty
bug and a pervasive over-teaching problem. The engine I endorse; the default
presentation I would cut by half.

### Must-fix (correctness / honesty)

1. **Approximate quadratic `z*` in dual/split are drawn as confident gold dots.**
   (`§2`) Flag them as approximate (hollow ring / hide) when `logG(disc,p)` is
   null, and disclose in EXPLAINER. *Drawing a fabricated fixed point is the
   geometric equivalent of a fabricated citation.* **Highest priority.**
2. **The "never cuts a straight chord" claim lapses silently** in the degenerate
   dual/split regions where the multiply leg falls back to linear. (`§3`) Add one
   clause to EXPLAINER scoping the guarantee to where the generalized power
   exists.
3. **"Argand plane" names only the complex case.** (`§5`) Align the prose: the
   dual plane is Galilean/Yaglom, the split plane is Minkowski. One sentence in
   EXPLAINER.

### Should-fix (clarity — the entry point should start simpler)

4. **Declutter the default first-30-seconds view.** (`§4`) Target default frame:
   `z`, `f(z)`, and one faint connector — nothing else. Specifically:
   - Show the **diagonal return arc only during Play** (it's currently static).
   - **Default the unit curve OFF** (or only when `p≠−1`).
   - **Demote the j² control out of the always-on HUD** into the System panel,
     so the immersive default is pure complex. Number systems are not an entry
     point and shouldn't sit beside the basic scrubber.
5. **Make Play the payload.** (`§4`) At rest show endpoints; on Play *build* each
   leg as a growing trail rather than sliding a dot along pre-drawn curves. The
   arc-length pacing is already excellent and should stay.
6. **Quadratic term-sum needs isolation.** (`§7`) Lay the term vectors down one
   at a time on Play; hide the unit curve and diagonal in the static quadratic
   frame; label the critical point on canvas.

### Nice-to-have (polish)

7. Add a glyph or term label to the quadratic term-sum vectors so they don't rely
   on pink-vs-orange color alone (CVD). (`§6`)
8. One-line note that "color by angle" encodes argument (for CVD users). (`§6`)
9. Label the critical point ⊕ on canvas. (`§5`)

### What I endorse without reservation

The honest spiral multiply; the fixed point and its `View from z*` reveal; the
iteration log-spiral; the arc-length pacing; the three-system unit-curve math;
the mx+b framing; the polar+rect dual readout; the distinct-glyph-per-role
accessibility move; and the sources block. The *bones* are right. This is an
app that knows what's true — it just shows too much of it at once, and draws two
dots it shouldn't be confident about.

---

## Self-reflection

1. **What would you do with another session?** Actually run the app and drag
   into the dual/split degenerate regions to *see* the approximate `z*` move to a
   wrong location, confirming §2 visually rather than by code-reading. I'd also
   build the "decluttered default" mock and screenshot it to test my claim that
   it teaches better.
2. **What would you change about what you produced?** I leaned on the four
   provided screenshots for the clutter argument; I'd have wanted a fifth showing
   the dual/split *quadratic* case where the fixed-point approximation bites, to
   make that must-fix concrete rather than reasoned-from-source.
3. **What were you not asked that you think is important?** Whether the app
   should ship a true "lesson 1 / lesson 2 / lesson 3" layout progression (the
   `LayoutDef` mechanism already supports this) so the ladder is *paced* by
   layouts rather than dumped in one frame. That's a framework-aligned fix I only
   gestured at.
4. **What did we both overlook?** I should double-check whether the static
   diagonal-at-rest is *intentional* design the team likes — I asserted it's
   clutter, but a teammate might consider the two-routes contrast a core teaching
   point worth showing at rest. My recommendation assumes it isn't.
5. **What did you find difficult?** Separating "correct but cluttered" from
   "wrong" took care in the quadratic frame, where the *only* wrong thing
   (dual/split `z*`) sits amid many correct-but-dense objects; easy to lump them.
6. **What would have made this task easier?** A short note from the author on
   which approximations were known/intentional vs accidental — the handoff flag
   helped, but the EXPLAINER omission left me unsure whether disclosure was
   planned-and-pending or overlooked.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Method: **source reading + reasoning + screenshot inspection (read
   headless, not live).** I traced every drawn object to its formula in
   `complexOps.ts`/`ArgandPlane.tsx` and verified the math by hand (fixed point,
   critical point, quadratic formula, unit-curve parameterizations, expG/logG
   limits). I did **not** run the app, so the clutter/legibility claims rest on
   static screenshots, and the §2 wrong-fixed-point claim is reasoned from the
   `powRealG`→`logG`-null fallback path, **not observed live**. `signals:
   visual-unverified` set accordingly. The fidelity findings (correct/wrong math)
   are high-confidence from source; the pedagogy/density findings are
   judgment-from-screenshots and should be confirmed against the running app.
8. **Follow-up value:** MEDIUM — conclusions are sound and the must-fix bug is
   well-localized, but the wrong-`z*` claim and the declutter recommendation both
   warrant a live-app confirmation pass before acting.
