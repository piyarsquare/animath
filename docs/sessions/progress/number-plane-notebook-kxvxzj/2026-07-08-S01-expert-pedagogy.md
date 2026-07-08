---
kind: three-hats
session: 2026-07-08-S01
date: 2026-07-08
title: "Math-Viz & Pedagogy Expert"
branch: claude/number-plane-notebook-kxvxzj
slug: number-plane-notebook-kxvxzj
status: complete
build: n/a
---

# Math-Viz & Pedagogy Expert — Chapter II, the plate grid

## Under review

I reviewed `public/number-planes/chapter-2.html` — the vanilla-JS port of the
Claude-Design "Chapter II — the plane" mockup onto the shared guide-theme layer. It is a
seven-plate live grid (C2 hub, PL level-curves, CR circle-dial, DV/QD/L2/FTA flip cards)
in which a single dial value `p = j²` is meant to drive every plate at once. I read it in
full against its spec (`docs/design/notebook-handoff/README.md`), its reference prototype
(`.../designs/Chapter II - The Plane.dc.html`), the content graph
(`public/number-planes/cards/*.md`), the theming layer it builds on
(`public/guide-theme.css` + `src/chrome/theme.css`), and the sibling artifact it links to,
the staged passage `public/number-planes/notebook.html`. My lens is whether the picture
*teaches* the number-planes idea — not whether the formulas are correct (a separate hat),
but whether the true math is taught well: reading order, the default frame, the framing of
the hard bits, and the aha.

My one-line verdict up front: **as an instrument it is beautiful and the "one p, seven
views" idea genuinely lands once you drive it — but as a first-contact teacher it strands a
cold reader, because the default frame hides the very responsiveness it promises, and the
`∞` end tells two contradictory stories at once.**

---

## What the grid gets right

I want to be concrete about the strengths, because several are real and hard-won.

- **The shared-`p` instrument is honest and delightful *in motion*.** When you flip to
  MULTIPLICATION and drag the j² slider, the product node walks its rail, PL morphs
  ellipse → parallel lines → hyperbola, the CR knob rotates, DV/QD update, and the whole
  page sweeps blue → green → orange together. That *is* the embodiment of "one dial, three
  worlds," and it is the single best thing here.
- **The product-rail figure (C2, mul mode) is excellent.** For fixed `z, w`, the product
  `(xa + p·yb, xb + ya)` is linear in `p` in the first coordinate and constant in the
  second, so it slides along a horizontal rail as you turn the dial (`chapter-2.html:458`,
  `471–478`). "Slide the dial and the product walks its rail" is a genuinely good
  concretization of a bilinear product parametrized by one number.
- **Rail count ⇄ root count ⇄ plane is unified cleanly.** PL's `0 RAILS · ellipse` /
  `1 RAIL · two lines` / `2 RAILS · hyperbola` (line 523) is the same integer as QD's
  live root count (`t² = p`), and the copy says so out loud. That is exactly how a
  mathematician wants these tied together.
- **L2 "strangers" → the split plane in disguise** (lines 336–357), with "tilt the plane
  45° at PL to watch it happen," is a real aha: coordinate-wise multiplication *is*
  `ℝ × ℝ` = split, seen in the `e± = (1±j)/2` basis. The tilt animation that swings the
  hyperbola's rails onto the axes makes the isomorphism visible rather than asserted.
- **The color language is disciplined.** Blue = complex (`p<0`), green = dual (`p=0`),
  orange = split (`p>0`) is consistent across the slider, knob, curves, dots, and readouts,
  and it matches the handoff's semantic contract. The motions vocabulary (turns / shears /
  squeezes in DV; SPIN / SHEAR / BOOST in the passage) is mathematician-native.
- **Renormalization is coupled to the main plot, not just PL.** The vertical unit carries
  `rsS` (`Y(v)=235−v·44·jS`, line 453), so a "reform to ±1" animation squashes the hero
  picture too — reinforcing "the plane didn't change, our ruler did." Good instinct.

Those strengths are why I land on "needs onboarding," not "rebuild."

---

## The central question: does the grid teach, or is it a control panel?

**Today it is a control panel that rewards prior understanding.** The distinction I care
about: a *teacher* sequences revelations and lands each one; an *instrument* exposes every
knob at once and trusts you to already know what you're looking for. This page is the
second thing wearing the first thing's title ("Chapter II").

Concretely, to reach the core aha ("the three planes are one family, chosen by one dial") a
first-time reader must, unprompted:

1. Notice that dragging the headline control (the j² slider) does *nothing* to the biggest
   plate (see next section) — and not conclude "the dial is inert."
2. Discover that the fix is to tap the word ADDITION to flip to MULTIPLICATION.
3. Drag the dial again and now watch the rail move.
4. Move `p` off a cut so PL's "reform to ±1" button even appears.
5. Click it, then hover to read the caption that explains what just happened.

Nothing on the page sequences those five steps, and — critically — the handwritten
prompts that *would* nudge them are `opacity: 0` until hover or lock
(`.c1t .ann{opacity:0}`, lines 70–71; `.fgl{opacity:0}`, line 81). On a fresh desktop load
with no pointer over the plate, and on touch (no hover at all), the guiding prose is
invisible. The reader faces a gorgeous dashboard with no reading order and no instructions.

> [!IMPORTANT]
> The staged passage (`notebook.html`) states its own governing principle: a living
> section "whose text is all present." Chapter II inverts that — its teaching text is
> hidden by default and revealed only on hover. The two halves of the same "living
> notebook" disagree about whether guiding prose should be present on load. That is a
> coherence problem, and the grid is on the wrong side of it: a page that trusts the reader
> to read must first *show them the words*.

**The passage teaches; the grid confirms.** `notebook.html` is heavily sequenced —
cover → living section → four stops (the question · the sign · the motions · the mirror),
each gated moment landing one beat: "only the sign survives" (Stop B), "three planes, one
dial" with the reason the middle sticks, "what do they share" (Stop C), the conjugate/norm
`N(z)=x²−p·y²` (Stop D). It builds the idea; the grid displays the finished idea. The right
relationship is **passage first (learn) → grid second (play / reference)**, which I return
to at the end.

---

## The default frame: p = −1, ADD — the dial that appears to do nothing

The page loads at `S={p:-1, pm:'add', …}` (line 390) and shows `MODE: ADDING`
(lines 121, 448). This is a faithful copy of the reference's default
(`Chapter II - The Plane.dc.html:395`), but as a *deployed teaching page* it is the wrong
first frame, for a chain of reasons that all point the same way.

**In ADD mode the hero plot is p-independent.** The addition figure draws `z+w` from
`smx = zx+wx, smy = zy+wy` (lines 456, 466–469) — no `p` anywhere — and every direct `p`
set resets `rsS → 1` (line 416), so the vertical scale is fixed too. So when a reader drags
the headline j² slider in the default frame, the **largest, most central plate (the 3×3
hub) does not move at all**, while the small satellite plates (PL, CR, DV, QD) do. The
visual hierarchy is inverted against the lesson: the biggest thing ignores the control; the
small things respond. A reader's eye is on the hero, so the natural conclusion is "this
dial doesn't do much" — the exact opposite of the page's headline, "ONE p FOR THE WHOLE
PAGE · THE SLIDER SPEAKS TO EVERY PLATE" (line 108).

**Where `p` bites is hidden behind a flip.** The operation that responds to the dial —
multiplication — is one 3-D card-flip away, and the prompt to flip it ("tap the word — it
flips the whole plot") is right there but *not* opacity-hidden (line 152, good) — yet the
deeper explanation ("addition never feels the dial," line 181) *is* hidden until
hover/lock. So the reader gets the instruction to flip but not the reason it matters.

**At p = −1 two of PL's three affordances are also dead.** The "reform to ±1" button only
renders when `p` is off the cuts (`canRescale`, lines 529, 544) — at the default `p=−1`
it is hidden, replaced by "already ±1 · normal form." And tilt at `p=−1` rotates a *circle*
(the complex level set, `ry=52`), which is visually invariant, under a vague caption
"a change of basis — spin the frame" (line 552). So PL, the second-largest plate, also
under-sells itself at the default: renormalize absent, tilt inert.

> [!WARNING]
> Net effect of the default frame: a reader who lands cold and does the most natural thing —
> drag the big dial — sees the two largest plates sit still. The promise "the slider speaks
> to every plate" is contradicted by the opening move. Everything needed to fix it is a
> design decision, not a rewrite.

**What would make "one dial, three worlds" visible immediately** (in rough order of
preference, all compatible with "trust the reader / no forced narration"):

1. **Default to `pm:'mul'`** so the hero plot responds to the dial from the first drag. The
   product rail is the best figure on the page; lead with it.
2. **Reveal the guiding prompts by default** (drop the `opacity:0` on the C2/PL `.ann`, or
   at least on the "drag the dial" / "tap the word" nudges). A living page shows its words.
3. **A one-time gentle sweep on load** — animate `p` once from −1 → +1 and back so every
   plate visibly moves together, then rest at the default. This is the cheapest way to
   *demonstrate* the shared-`p` promise without a word of narration. (If the "no narration"
   ethos forbids autoplay, prefer 1+2.)
4. Consider opening at a **non-cut `p`** (say −0.6) so PL's renormalize button and the
   "off the three worlds" state are live in the first frame, making the "reform to a cut"
   idea self-advertising.

---

## The ∞ end: "dual again" fights the live root count

The prompt asks directly whether the `∞`-end is honestly the dual plane and whether QD
tells a consistent story there. **It does not — the page tells two contradictory stories at
`p ≥ 15` simultaneously, and one of them is reachable by a snap on the CR dial.**

At `|p| ≥ 15` the code sets `isInf` and then:

- `pColor = 'var(--ok)'` (green, the dual color) and `planeName = 'the dual plane, again'`
  (lines 421–422); the header and DV both echo "the dual plane, again."
- **But QD's count is unguarded by `isInf`:** `n = pos ? 2 : zero ? 1 : 0` (line 568), so at
  `p=16` (`pos` true) it shows **2 dots, "2 real roots," in green** (lines 568–573).

So a reader who spins the CR knob to the bottom (which snaps to `p=±16` via
`setFromCr`, line 640) lands on a frame that says: *plane = "the dual plane, again"*, colored
*green (dual)*, showing *2 real roots*. Dual (`t²=0`) has exactly **one** (double) root. The
banner and the count disagree.

The deeper issue is that the two disagree because the page runs **two incompatible
compactifications of the p-line without reconciling them:**

| View | Statement | Where | What it implies at large `p>0` |
|---|---|---|---|
| Renormalize / sign invariant | "only the sign survives the stretch" → three planes | PL renormalize box (line 238), DV | `sign(+∞)=+` ⇒ **split** (2 roots, orange) |
| The p-circle (`p ↦ 1/p`) | "the dual sits at both 0 and ∞ · one loop" | CR (line 332), PL `isInf` branch | **dual** (green, "dual again") |

Both ideas are legitimate and both are in the source cards (CR.md literally names 0 and ∞
"the two dual points"). But the page's *own* renormalize principle — the one it teaches as
the reason there are exactly three planes — says the invariant is `sign(p)`, and `sign(16)`
is `+`, i.e. **split**. `t²=16` genuinely has two real roots (`±4`), so QD's "2" is the
*correct ring behavior*; it is the green "dual again" **label** that is wrong at a finite,
reachable `p`. The level curves going horizontal as `p→∞` is honest for the *shape* of the
norm's level sets (they degenerate to parallel lines, rotated 90° from the dual's), but
"the level lines look like the dual's again" is a statement about a limiting *picture*, not
"this is the dual ring."

> [!WARNING]
> At `p=16` the page asserts a plane identity ("the dual plane, again") that its own
> renormalization lesson refutes, and pairs it with a root count that belongs to the *other*
> plane. A careful learner who trusts the page will come away believing dual has two roots,
> or that a large positive `p` is dual — both false.

**Fix options (pick one and make the whole frame obey it):**

- **Preferred:** treat `p≥15` as **split** for identity/color/roots (orange, 2 roots), and
  demote "dual again" to a *limit caption on CR only* — e.g. "the far side of the loop:
  the level lines go parallel again, but rescaling has run out — it is still split." Keep
  the poetry, drop the false ring identity.
- Or, if you keep "dual at ∞" as the headline, you must make QD and the color honest to it —
  but you cannot, because `t²=16` has two real roots. That is precisely why the first option
  is the only self-consistent one.

Either way, the "three worlds" (DV, a 3-element set) vs "one loop, not three boxes" (CR, a
circle) juxtaposition needs one sentence of reconciliation, because right now the page
asserts both — "three worlds" and "not three boxes" — on adjacent plates with no bridge but
a cryptic "the dual sits at both 0 and ∞."

---

## The renormalization aha, and PL's buried payload

Renormalization — "rescale `j` by `√|p|` and any `p` slides to its sign; only the sign
survives" — is the conceptual heart: it is *why* infinitely many `p` collapse to exactly
three planes. The animation is well built (two smoothstep phases, `rsS: 1→√|p|` then
`p→±1`, lines 650–664) and it drives both PL and the hero plot's vertical scale.

But the payload is buried under a discovery chain with no prompt:

1. It only fires from the "reform to ±1" button, which only exists off the cuts
   (`canRescale`, line 544) — so at the default `p=−1` it is hidden.
2. So the reader must first *think to move `p` off a cut* before the mechanism even
   appears.
3. The caption that states the lesson — "only the sign survives the stretch" — is an `.ann`,
   `opacity:0` until hover/lock (line 238 + 70–71).

Contrast the passage's Stop B: "Each p can be rescaled by any `s²` — **touch each number and
let it settle**" (`notebook.html:510`) actively hands the reader the action and narrates the
result. The grid has the better *animation* and the worse *teaching* of the same idea.

**Recommendation:** surface the lesson without waiting for hover — make "only the sign
survives the stretch" a persistent caption in the renormalize box, and consider a subtle
resting affordance at the cuts ("nudge the dial off a cut to reshape it") so the reader
learns that renormalize *exists* before they've already left the default. Pairing this with
a non-cut default (previous section) would let the very first frame advertise the mechanism.

---

## Reachability: keyboard, touch, and the continuous morph

The two "hero" continuous controls — the j² slider (`#psl`) and the CR knob (`#crsvg`) —
are pointer-only: `pointerdown/move` handlers, no `keydown`, no `role="slider"`, no
`tabindex`, no `aria-*` (confirmed: a grep for `keydown|role=|tabindex|aria-` in
`chapter-2.html` returns nothing). The discrete controls fare better — the `−1/0/+1` chips
and the DV plane buttons are real `<button>`s, so Enter/Space reach the *three cut planes*.

Pedagogically that means a keyboard user (or a screen-reader user) can reach "three
worlds," but **cannot perform the continuous sweep that is the whole thesis** — the
blue → green → orange morph that shows the planes are one family is mouse/touch-only. For a
tool meant to teach in a classroom, that is a real exclusion, even if it is inherited from
the reference. A minimal fix: make `#psl` focusable with arrow-key increments and a
`role="slider"` + `aria-valuenow`, and let the CR knob mirror it. Not my primary hat, but it
gates who can reach the aha, so I log it.

---

## Semantic hygiene: color roles across skins

The handoff is explicit: `--accent`/`--voice` are **UI voice**, the plane colors
(`--d1`/`--ok`/`--d5`) are **data**, and the two must stay distinct on every skin. The port
maps `--live ← --accent2`, `--voice ← --accent` (lines 31–32) and defines the plane colors
via `light-dark()` defaults (lines 34–36) with per-skin overrides for **only** `light`,
`primary`, `blueprint`, `phosphor` (lines 42–47). But `guide-theme.css` ships **eight**
skins; the four *unhandled* ones (`dark`, `neon`, `daylight`, `mirage`) fall back to the
`light-dark()` plane defaults while still taking their own `--accent`/`--accent2`.

That produces object/data hue collisions on at least two skins:

| Skin | `--voice`/`--live` (UI, from accent) | Nearest plane color (data) | Collision |
|---|---|---|---|
| `daylight` | `--live` = `--accent2` = `#e0683a` (orange) — the **z** spoke | split `--d5` ≈ `#bd5f1c` (orange) | z (object) reads as split (data) |
| `mirage` | `--voice` = `--accent` = `#ffb37a` (peach) — the **w** spoke | split `--d5` = `#ff9a5f` (orange) | w (object) reads as split (data) |

On those skins a learner can conflate "the `w` arrow is orange" with "the split plane is
orange," which is exactly the confusion the data/voice split is meant to prevent. This
overlaps the framework/theming hat, so I keep it P3 and defer the token specifics there —
but flag that "works with any theme" (Dan's trigger for this review) should mean the
*color-role semantics* survive all eight skins, not just that nothing turns invisible. The
cleanest pedagogy-preserving fix is to give the plane colors per-skin overrides (or a
skin-independent triad) for the four unhandled skins so the data triad never shares a hue
with the current accent.

---

## How the two artifacts should relate

Both artifacts are strong; they are teaching *different* things and should be sequenced, not
merged:

- **`notebook.html` (the staged passage) is the teacher.** It sequences the argument and
  lands each beat. It is the right first experience for someone meeting the idea.
- **`chapter-2.html` (the grid) is the instrument / lab.** It is where you *play* once you
  understand — turn the one dial and watch seven views agree. It is a wonderful "so it's
  all really one thing" confirmation and a reference surface.

The footer already links the grid back to the passage ("← the walk in (the choice)",
line 379), which implies the intended order passage → chapter, and that is right. What is
missing:

1. A cold visitor who lands directly on `chapter-2.html` gets no signal to do the walk
   first. Add a one-line "new here? take the walk in first →" at the top, or a "start here"
   marker on C2.
2. The grid needs the minimal onboarding above (default to mul or sweep-on-load; reveal the
   guiding prompts) so that even a reader who *skips* the passage isn't stranded — an
   instrument should still be legible on its own.
3. On phone the single-column stack imposes a de-facto reading order (C2 → PL → DV → QD →
   CR → L2 → FTA, the DOM order) that is actually pretty good. The **desktop** grid has no
   such path — the eye can start anywhere. Consider giving the desktop grid a light reading
   order (subtle numbering, or a "start at C2" cue) so it inherits the phone's implicit
   sequence.

---

## Findings

| ID | Severity | Category | Claim | Where |
|---|---|---|---|---|
| pedagogy-1 | P1 | pedagogy | Default frame (`p=−1`, ADD) makes the headline dial appear inert: the hero plot is `p`-independent in add mode and `rsS` resets on every set, so the two largest plates don't move when you drag the slider. | `chapter-2.html:390,448,456,466–469,416` |
| pedagogy-2 | P1 | coherence | At `p≥15` the page names "the dual plane, again" (green) while QD shows "2 real roots"; dual has one root, and the renormalize principle ("only the sign survives") makes large `p>0` split. Two contradictory stories at one reachable state. | `chapter-2.html:421–422,547,568–573,640` |
| pedagogy-3 | P2 | pedagogy | Guidance is hidden by default: the `.ann`/`.fgl` prompts are `opacity:0` until hover/lock, so a cold desktop/touch load is a control panel with no reading order or instructions — contradicting the notebook's "text all present" principle. | `chapter-2.html:70–71,81–82,181,238` |
| pedagogy-4 | P2 | pedagogy | The renormalization aha is gated: the "reform to ±1" button exists only off the cuts, so at the default `p=−1` it's hidden, and its lesson caption is hover-only; tilt at `p=−1` rotates a circle (visually inert). PL under-sells itself at the default. | `chapter-2.html:529,544,552,238` |
| pedagogy-5 | P2 | coherence | "three worlds" (DV) and "one loop, not three boxes" (CR) are asserted on adjacent plates with no reconciliation; the `∞`=dual bridge is cryptic and reached by an unexplained snap-to-16. | `chapter-2.html:332,262–287` |
| pedagogy-6 | P3 | a11y | The continuous controls (j² slider, CR knob) are pointer-only (no keyboard/ARIA); keyboard users reach the three cuts via chips but not the continuous morph that is the thesis. | `chapter-2.html:597–647` |
| pedagogy-7 | P3 | design-fidelity | On unhandled skins (daylight, mirage) the UI-voice accent (`--live`/`--voice`) shares a hue with a plane's data color (z/w spoke ≈ split orange), blurring the object/data color roles the handoff says to keep distinct. | `chapter-2.html:31–47` + `guide-theme.css:31,33` |

---

## Verdict

**Ship it as an instrument, but not as a first teacher — and fix the two P1s before it
teaches anyone.**

The grid is a genuinely lovely realization of "one `p` drives everything," and in motion it
delivers the aha it promises. But two defects undercut the pedagogy at exactly the moments a
learner is most vulnerable. The **default frame** (pedagogy-1) makes the headline dial look
inert on the very first interaction — the single worst place to lose a reader — and it is
fixable by defaulting to multiply, revealing the guiding prompts, and/or a one-time sweep.
The **`∞` end** (pedagogy-2) asserts a plane identity the page's own renormalization lesson
refutes, paired with a root count from the other plane; a learner who trusts the page learns
something false at a reachable state. Both are design/logic decisions, not rewrites.

Beyond those, the grid teaches only those who already understand it, because its guiding
prose is hidden until hover (pedagogy-3) and its best conceptual payload — renormalization —
is buried behind a discovery chain (pedagogy-4). The right frame for the whole effort is
**passage teaches → grid confirms**: keep `notebook.html` as the sequenced first experience,
position `chapter-2.html` as the lab, wire the forward link, and give the grid just enough
onboarding (default-to-mul or sweep-on-load, present-by-default prompts, a "start at C2" cue)
that a reader who lands cold still sees the promise move. Do that and this becomes a page I
would happily teach from.

---

## Self-reflection

1. **What would you do with another session?** Actually drive the page in a browser across
   all eight skins at the three cuts and at `p=16`, screenshot the `∞`-end contradiction and
   the daylight/mirage color collisions, and test the default frame with a naive user to
   confirm the "the dial does nothing" reaction I'm predicting from the code rather than
   observation. I'd also diff the ported logic against the reference's `renderVals()`
   line-by-line to confirm no behavior drifted in the port beyond what I checked.
2. **What would you change about what you produced?** I leaned on code-reading for
   claims that are ultimately about *perception* (visual hierarchy, "the eye goes to the
   hero"). Those are well-grounded but not observed; I've flagged the ones that are
   judgment vs. code fact, but a real user test could move pedagogy-1's severity either way.
3. **What were you not asked that you think is important?** Whether there's a Chapter I /
   Chapter III that establishes the dial *before* this page — if so, the default-frame
   critique softens (the reader arrives pre-loaded). The footer says "chapter I · chapter
   III — not yet laid," so today Chapter II is effectively first-contact, which is why I held
   pedagogy-1 at P1.
4. **What did we both overlook?** The phone stack accidentally solves the reading-order
   problem the desktop grid has — the single-column DOM order is a decent sequence. Neither
   the handoff nor the port treats phone layout as a *pedagogical* asset; it could be one.
5. **What did you find difficult?** Drawing the line between "correctness" (another hat) and
   "taught well" (mine) at the `∞` end. I resolved it by focusing on the *internal
   contradiction* (dual label vs. split root count) and the *renormalize principle the page
   itself teaches*, rather than adjudicating whether "dual at ∞" is defensible projective
   geometry — which it partly is, as a limit.
6. **What would have made this task easier?** A running instance (or pre-captured
   screenshots per skin/per `p`) so I could verify the visual claims instead of reasoning
   from SVG coordinates and token math.
7. **How did you verify this, and does each passing check test the user-visible claim?**
   Method: **reasoning + static code/CSS/token reading only — not verified in a browser.**
   The code facts (add-mode plot is `p`-independent; `rsS` resets on set; QD count unguarded
   by `isInf` while color/name flip to dual; renormalize button hidden at cuts; no keyboard
   handlers; the four unhandled skins fall through to `light-dark()` defaults) are directly
   confirmable in the source and I cite line numbers. The *pedagogical consequences* of those
   facts (a reader concludes "the dial is inert"; the color collision confuses) are reasoned,
   not observed — `signals: visual-unverified`. The `∞`-end contradiction (pedagogy-2) is a
   code fact and the strongest-verified finding; the "hero plot looks frozen" impact
   (pedagogy-1) is code-grounded but perceptually unverified.
8. **Follow-up value:** MEDIUM — conclusions are correct on the code facts and the two P1s
   are solid, but the perception-dependent severities (esp. pedagogy-1) and the cross-skin
   color claims deserve a real browser pass before acting.
