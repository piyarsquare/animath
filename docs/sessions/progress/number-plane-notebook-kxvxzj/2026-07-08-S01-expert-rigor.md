---
kind: three-hats
session: 2026-07-08-S01
date: 2026-07-08
title: "Mathematical Rigor Auditor"
branch: claude/number-plane-notebook-kxvxzj
slug: number-plane-notebook-kxvxzj
status: complete
build: n/a
---

# Mathematical Rigor Auditor — Chapter II (the plane)

## Under review

I audited `public/number-planes/chapter-2.html` — the **plate-grid** port of the
Claude-Design "Chapter II — The Plane" mockup: seven live cards on a 208px grid
(C2 hub, PL level curves, CR circle-dial, DV/QD/L2/FTA flip cards) driven by one
shared parameter `p = j²`, default `p = −1`. My lens is **correctness only**:
I re-derived every formula and geometric claim from the algebra of `ℝ[j]/(j²−p)`
and checked it line-by-line against the code in the `<script>` block (and the
static SVG markup it drives), independent of pedagogy or fidelity. I trusted the
algebra, not the labels. I cross-checked intent against the source cards
(`cards/CR.md`, `cards/PL.md`) and the reference prototype
(`docs/design/notebook-handoff/designs/Chapter II - The Plane.dc.html`).

**Headline:** the core mathematics is *correct and honest* — the product, the
product rail, the renormalization, the level curves, and the 45° tilt to null
coordinates all check out from scratch. There is **one genuine internal
contradiction** at the `p → ∞` end (QD root count vs. the "dual again"
name/color), and **one wording imprecision** on the CR dial ("far side" reads as
antipode = −1/p, but the intended and drawn map is the ±1-fixing mirror = 1/p).

---

## 1 · The product z·w — CONFIRMED

Code (line 458): `const q=pv=>[zx*wx+pv*zy*wy, zx*wy+zy*wx];`

Derive from scratch with `z = x + yj`, `w = a + bj`, `j² = p`
(`zx=x, zy=y, wx=a, wy=b`):

```
(x + yj)(a + bj) = xa + xbj + yaj + yb·j²
                 = (xa + p·yb) + (xb + ya) j
```

- real part `xa + p·yb` = `zx*wx + pv*zy*wy` ✓
- j-part `xb + ya` = `zx*wy + zy*wx` ✓

Numeric spot-check at the default state `z=(1.6,1.1)`, `w=(−1.2,0.9)`, `p=−1`
(ordinary complex multiply): `(1.6+1.1i)(−1.2+0.9i) = −2.91 + 0.12i`; code
`q(−1) = [1.6·−1.2 + (−1)·1.1·0.9, 1.6·0.9 + 1.1·−1.2] = [−2.91, 0.12]`. ✓

Displayed sentence (line 488):
`'multiplying: z·w = (xa + p·yb, xb + ya) = …'` — matches the derivation
character-for-character. **CONFIRMED.**

## 2 · The product rail — CONFIRMED

Claim (line 185): "only the first coordinate feels p — slide the dial and the
product walks its rail," rendered as a horizontal dashed rail `railL`.

- The j-coordinate of the product is `xb + ya`, which has **no `pv`**. As `p`
  varies, `q(pv)[1]` is constant. ✓ p-independent.
- Rail geometry (lines 471–472): `railL` runs from `X(q(−1.9)[0])` to
  `X(q(1.9)[0])` at a single height `Y(q(0)[1])` for both endpoints (`y1 = y2`).
  Since `q(·)[1]` is constant, the rail is exactly horizontal, and the product
  dot `prDot` sits on it: `prDot.cy = Y(pr[1]) = Y(q(pMain)[1]) = Y(q(0)[1])`. ✓
- The x-coordinate `q(pv)[0] = xa + pv·yb` is **affine in `pv`**, so the dot
  slides linearly along the rail as `p` moves. ✓

**CONFIRMED.** (Screen scale note: `Y(v)=235−v·44·jS` applies the ruler factor
`jS` to *both* the rail and the dot identically, so the on-screen rail stays
horizontal under renormalization too.)

## 3 · The CR circle — map CONFIRMED, one wording imprecision

Code (lines 555–556): `phi = 2·atan(p)`; knob at
`(90 + 62 sinφ, 90 − 62 cosφ)`; inverse map on drag (line 641)
`p = tan(φ/2)` with `φ = atan2(px−90, 90−py)`.

**Self-consistency.** `φ = 2·atan(p) ⇒ φ/2 = atan(p) ⇒ tan(φ/2) = p`. Forward and
inverse agree. ✓

**Cardinal points** (φ measured clockwise from top):

| p | φ = 2·atan(p) | knob (x,y) | position | label in SVG |
|---|---|---|---|---|
| 0 | 0 | (90, 28) | top | "0 · dual" (y=15) ✓ |
| +1 | π/2 | (152, 90) | right | "+1" (x=162) ✓ |
| −1 | −π/2 | (28, 90) | left | "−1" (x=18) ✓ |
| ∞ | π | (90, 152) | bottom | "∞ · dual again" (y=173) ✓ |

All four **CONFIRMED**.

**Is `p = tan(φ/2)` the right map for "the far side is 1/p"?** This is the one
place the *wording* drifts from the *math*.

- Where does `1/p` actually land? `1/p = cot(φ/2) = tan(π/2 − φ/2) = tan((π−φ)/2)`
  ⟶ angle `π − φ`. Knob(π−φ) = `(90 + 62 sinφ, 90 + 62 cosφ)` — same `x`, `y`
  reflected about the horizontal center line `y=90`. So **`1/p` is the mirror of
  `p` across the ±1 diameter** (the horizontal axis through left/right), with the
  two on-axis points **±1 as fixed points** and **0 ↔ ∞ swapped**. This is
  exactly what `cards/CR.md` states: *"x ↔ y sends p ↦ 1/p, fixing ±1 and
  swapping 0 ↔ ∞."*
- The **antipode** (diametrically opposite point, φ+π) is
  `p(φ+π) = tan(φ/2 + π/2) = −cot(φ/2) = −1/p`. Test: `+1` (right) ⟶ antipode is
  `−1` (left) = `−1/1`, **not** `1/1`.

So `p = tan(φ/2)` is the *correct and natural* parametrization — indeed the only
continuous circle parametrization in which `p↦1/p` can appear at all, since `1/p`
has fixed points `±1` and no involution with fixed points can be antipodal on a
circle. The map is right. The HTML copy (line 332) says **"the far side is
p ↦ 1/p"** — and "far side" reads as *antipode*, which is `−1/p`. A reader who
spins to the diametrically opposite point and reads it as `1/p` will be off by a
sign.

> [!WARNING]
> **CR wording (rigor-2).** The dial map is mathematically correct, but "the far
> side is p ↦ 1/p" mislabels the geometry: `1/p` is the **mirror across the ±1
> diameter**, not the antipode. The antipode is `−1/p`. The source card is
> precise ("swapping the coordinates … fixing ±1"); the chapter-2 copy drifted.
> Reword to e.g. "the mirror image across the ±1 axis is 1/p."

## 4 · Level curves (PL) — CONFIRMED (with an honest ∞ subtlety)

The plotted curves are the **unit level set of the plane's norm**
`N_p(z) = z·z̄ = x² − p·y²`, i.e. `N_p = 1`. Screen scale `U = 52` px per unit in
`x`; the `y` ruler carries the renormalization factor `jS = rsS`.

**Complex (`p<0`, ellipse), lines 500–501.** `N = x² + |p|y² = 1` is an ellipse,
semi-axis `1` in `x`, `1/√|p|` in `y`. Code:
`rx=52` (fixed), `ry = 52·jS/√(−p)`. At `jS=1`, `ry = 52/√|p|`. ✓ It is precisely
the unit norm curve `x² + |p|y² = 1`.

**Dual (`p=0`, lines 209–210).** `N = x² = 1 ⇒ x = ±1`, drawn as vertical lines
at `x = ±52`. ✓ "1 RAIL · two lines" — the degenerate form `x²` has one null
direction (the y-axis). ✓

**Split (`p>0`, hyperbola), lines 503–510.** `N = x² − p y² = 1`, parametrized
`x = cosh t`, `y = sinh t/√p`. Code: `x = U·cosh t`, `y = −U·jS·sinh t/√p`. ✓
Asymptote rails: the asymptotes of `x²−py²=1` are `x = ±√p·y`, screen slope
`jS/√p`; `railA/railB` run from `(∓130·sp, ±130)` with `sp = √p/jS`, giving slope
magnitude `1/sp = jS/√p`. ✓ "2 RAILS · a hyperbola." ✓

**`j²=p` dot** (line 512): `j2x = 52·p` on the real axis — `j² = p` is the real
number `p`, correctly plotted at `(p, 0)`. ✓

> [!IMPORTANT]
> **The `p → ∞` horizontal lines `y = ±1` are honest — not a fudge — but they are
> a *switch*, not a limit.** Two facts to hold together:
>
> 1. **They are the coordinate-swap image of the dual.** `cards/CR.md` /
>    `cards/PL.md` intend the compactification via `x ↔ y ⇒ p ↦ 1/p`. The swap
>    sends the dual-at-0 unit curve `x = ±1` to exactly `y = ±1`. So drawing the
>    ∞ end as horizontal lines `y = ±52` (lines 213–214) is the *precise*
>    coordinate-swap image of the 0 end. Coherent and correct under the stated
>    reciprocal reading.
> 2. **It is NOT the metric limit of the drawn hyperbola.** `x² − p y² = 1` as
>    `p→∞` keeps its vertices at `x = ±1` and flattens its branches toward the
>    **x-axis** (asymptote slope `1/√p → 0`); the pointwise limit of the drawn
>    curve is `y = 0` doubled, not `y = ±1`. The code *discontinuously switches*
>    from the flattening hyperbola to horizontal lines at `isInf`
>    (`|p| ≥ 15`). This is defensible (it draws the compactified/​swapped dual,
>    not the raw limit), but a rigorous reader should know it is a change of
>    object, not a continuous degeneration.

## 5 · Renormalization — CONFIRMED honest

Claim (line 238): "only the sign survives the stretch"; the unit curve stays
fixed. `doRescale` (lines 650–664): phase A drives `rsS: 1 → √|p₀|`; phase B
slides `p: p₀ → sign(p₀)` while pinning `rsS = √|p|`; settle `rsS = 1`.

The renormalization is the honest change of ruler `ĵ = j/√|p|`, so `ĵ² = sign(p)`.
Check that the on-screen unit curve is **invariant through phase B**:

- **Complex:** `ry = 52·jS/√|p|`; in phase B `jS = rsS = √|p|`, so
  `ry = 52·√|p|/√|p| = 52 = rx`. The ellipse becomes a **fixed circle of radius
  52** and stays put as `p` slides to `−1`. ✓ (Phase A stretches the flat ellipse
  up into that circle — that *is* the ruler change, correctly shown, not a
  cosmetic morph.)
- **Split:** `y = −52·jS·sinh t/√p = −52·√p·sinh t/√p = −52 sinh t`, `x = 52 cosh t`
  in phase B — the **fixed unit rectangular hyperbola** `x² − y² = 52²`,
  independent of `p`. The asymptote rails have `sp = √p/jS = 1`, i.e. the null
  cone `x = ±y`, also fixed. ✓

So the invariant `N̂(z) = x² − sign(p)·Y²` (with `Y = √|p|·y`) is genuinely held
constant while only the sign label changes. **CONFIRMED** — an honest change of
j-ruler, matching `ĵ = j/√|p|` in the label (line 226).

## 6 · Root count (QD) and the ∞ inconsistency — GENUINE DEFECT

`t² = p`: two roots (`p>0`), one double root (`p=0`), none (`p<0`).
Code (line 568): `const n = pos?2 : zero?1 : 0;`. For finite `p` this is correct.

**The ∞ end breaks.** At the CR bottom, `setP(16)` ⇒ `isInf` true, but
`pos = p>.001` is *also* true. Trace the render:

- `planeName` (line 422) → **"the dual plane, again."**
- `pColor` (line 421) → `var(--ok)` — the **dual/green** color.
- `railLabel` (line 523) → **"∞ · dual again."**
- QD (lines 568–572): `n = 2` (because `pos`), dots painted `pColor = ok`
  (green), label **"2 real roots."**

So at the ∞ stop the page simultaneously asserts *"the dual plane"* (which
everywhere else means **one** root — QD's own back copy: "one … as p is …
zero") **and** *"2 real roots,"* drawn in the dual's green. That is a
self-contradiction, and it is **reachable** (drag the CR dial to the bottom).

Either reading of the compactification says QD should not show 2 dual-green
roots:

- If ∞ is "dual again" (the name/color the code chooses, and the
  `p↦1/p`, 0↔∞ story), then `t²` at the dual has a **double root ⇒ n = 1**.
- If ∞ is just far-split (`p=16`), then it should be **orange/split**, `dv3`
  should light, and "dual again" is the wrong name — but then `n=2` is fine.

The code mixes the two: dual name + dual color + split root count. Related minor
symptoms at the same stop: **no DV button lights** (`dv3` uses `pos && !isInf`,
`dv2` uses `zero` — line 567/566), and the multiply sentence uses `pMain`
clamped to `6` (line 457) while the header reads `∞`.

> [!IMPORTANT]
> **rigor-1 (defect).** At `|p| ≥ 15` the QD plate renders "2 real roots" in the
> dual's green under the header "the dual plane, again." Pick one story: treat
> `isInf` as dual (`n = 1`, a double root — matches name/color) **or** stop
> naming/coloring the ∞ end "dual" and let it read as far-split (orange,
> `n = 2`, DV split lit). As written it is internally false.

## 7 · The tilt / strangers claim (L2) — CONFIRMED

Claim: `j² = +1` is the "componentwise" product `(a,b)·(c,d) = (ac,bd)`, its rails
turned onto the axes; tilt 45° to see it; `e± = (1±j)/2` (label, line 242).

Split plane `j²=+1` has idempotents `e± = (1±j)/2`:
`e±² = (1 ± 2j + j²)/4 = (1 ± 2j + 1)/4 = (1±j)/2 = e±`, and
`e+e− = (1−j²)/4 = 0`. In the null basis, `(a e+ + b e−)(c e+ + d e−) = ac e+ + bd e−`
— exactly the componentwise multiply. **CONFIRMED.**

**Is 45° the right change of basis?** As vectors in `(1, j)` coordinates,
`e+ ∝ (1,1)` and `e− ∝ (1,−1)` — the two diagonals at ±45°. These are precisely
the null lines / asymptotes of the split unit hyperbola. Rotating the frame by
**45°** carries `(1,1)→` horizontal axis and `(1,−1)→` vertical axis, i.e. puts
the rails **onto the coordinate axes**, where the product is componentwise.
`doTilt` (lines 666–674) animates `rot: 0→45` and rotates both `lcg` and `tiltg`
by `rot`; `tPos` draws the ±45° rails (lines 248–249). **CONFIRMED** — correct
angle, correct change of basis to null coordinates.

> [!NOTE]
> **rigor-6 (P3 caveat).** The 45° tilt lands the rails exactly on the axes
> **only at `p = +1`** (asymptotes at exactly 45°). At, say, `p = +2` the split
> asymptotes sit at `arctan(1/√2) ≈ 35.3°`, so a rigid 45° rotation over-rotates
> them. The L2 card mitigates by prompting "set the dial to +1" first, and
> `tiltAnn` softens the copy off-split ("a change of basis — spin the frame"), so
> this is polish, not a defect. The claim "(a,b)·(c,d)=(ac,bd) *is* j²=+1" is
> exact.

---

## Findings

| id | severity | verifiable | claim | evidence |
|---|---|---|---|---|
| rigor-1 | P1 | true | At `\|p\|≥15` QD shows "2 real roots" in dual-green under header "the dual plane, again" — a self-contradiction (dual ⇒ 1 double root). | chapter-2.html:421–422, 523, 568–572; reachable via CR `setP(16)` line 640 |
| rigor-2 | P2 | true | "the far side is p ↦ 1/p" mislabels the geometry: `1/p` is the mirror across the ±1 diameter (fixes ±1); the antipode is `−1/p`. | chapter-2.html:332 vs. 555–556; `cards/CR.md:23` ("fixing ±1, swapping 0↔∞") |
| rigor-3 | P3 | true | The `p→∞` unit curve switches to horizontal lines `y=±1` (correct as the x↔y image of the dual) — but this is a discontinuous object-switch, not the metric limit of the drawn hyperbola (which flattens to `y=0`). | chapter-2.html:212–214, 496; `cards/CR.md`, `cards/PL.md` |
| rigor-4 | P3 | true | At `isInf`, no DV button lights (dv3 gated by `pos&&!isInf`, dv2 by `zero`) though the header names the dual plane. | chapter-2.html:566–567, 564 |
| rigor-5 | P3 | true | At `isInf` the multiply sentence uses `pMain` clamped to 6 while the header reads `∞`, so the shown numeric product uses `p=6`. | chapter-2.html:457–459, 488 |
| rigor-6 | P3 | false | The 45° tilt aligns rails to axes exactly only at `p=+1`; off-split the rigid 45° over-rotates the asymptotes. | chapter-2.html:666–674, 248–249 |

All P1–P2 items and rigor-3/4/5 are concrete, file-checkable facts
(`verifiable:true`); rigor-6 is a judgment about how much the off-`+1` mismatch
matters (`verifiable:false`).

## Verdict

The core arithmetic of Chapter II is **mathematically sound and, impressively,
*honest*** — not cosmetic. The product `(xa + p·yb, xb + ya)`, the p-independent
product rail, the unit-norm level curves (ellipse / vertical lines / hyperbola +
asymptotes), the renormalization as a true `ĵ = j/√|p|` ruler change with an
invariant unit curve, and the 45° tilt to the idempotent null basis `e±=(1±j)/2`
all derive correctly from `ℝ[j]/(j²−p)`. The "one p drives every plate" contract
holds and every derived quantity I checked re-derives.

Two things should change before this is called finished:

1. **rigor-1 (P1) — the `p→∞` QD contradiction.** A reachable stop renders a
   false root count against its own dual name/color. Decide whether ∞ is "dual
   again" (⇒ `n=1`) or "far split" (⇒ orange, `n=2`) and make QD, the color, the
   name, and the DV highlight agree.
2. **rigor-2 (P2) — the CR "far side" wording.** The map is right; the prose
   turns the ±1-fixing mirror into an antipode (which is `−1/p`). Align the copy
   with the source card ("the mirror across the ±1 axis is 1/p").

The remaining items are polish. Nothing else in the file is mathematically wrong.

## Self-reflection

1. **What would you do with another session?** Drive the page headless via
   `window.__ch2.setP(v)` across a sweep of `p` (including the `±16` ∞ stops and
   the animated renormalize/tilt) and snapshot the derived SVG attributes to
   confirm the render matches the algebra at runtime, not just by reading source.
2. **What would you change about what you produced?** I'd add an explicit
   truth-table for the `isInf` branch (name × color × QD count × DV highlight ×
   railLabel) so the fix for rigor-1 can be checked exhaustively rather than
   spot-checked.
3. **What were you not asked that you think is important?** Whether `p→∞` should
   exist as a reachable state at all. The whole inconsistency evaporates if the CR
   dial clamps just short of the poles (e.g. `|p|≤ some max < 15`) and the "dual
   again" idea is presented as a limit label rather than an occupied stop.
4. **What did we both overlook?** Nothing math-breaking beyond the flagged items.
   The `pMain`/`pDraw` clamps (±6) are display-only and I confirmed they never
   feed an invariant claim — worth a note but not a defect.
5. **What did you find difficult?** Adjudicating the ∞ end fairly: two legitimate
   compactification stories (sign-invariant renormalization vs. reciprocal
   `p↦1/p`) disagree about what ∞ "is," and the code straddles them. The card
   text (`x↔y ⇒ p↦1/p`) was the tiebreaker that made the horizontal-lines-at-∞
   honest and the QD count the actual defect.
6. **What would have made this task easier?** A one-line statement in the file of
   *which* norm/compactification convention is authoritative. I reconstructed it
   from the cards; having it inline would remove the ambiguity that produced
   rigor-1.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Reasoning only — hand derivation from `ℝ[j]/(j²−p)`, line-by-line
   against the code, plus one numeric spot-check of the product and a cardinal-
   point table for the CR map. I did **not** run the page or screenshot it, so the
   runtime rendering and the animation frames are reasoned, not observed
   (`visual-unverified`). The algebraic findings (rigor-1,2,3,5) are exact and
   independent of rendering; rigor-4/6 are also source-confirmed.
8. **Follow-up value:** MEDIUM — the math audit is complete and the P1/P2 defects
   are precisely located, but a headless runtime pass over the `p` sweep and the
   two animations would upgrade "correct by reading" to "correct by observation."
