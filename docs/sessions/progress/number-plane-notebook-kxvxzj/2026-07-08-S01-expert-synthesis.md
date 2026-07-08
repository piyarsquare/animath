---
kind: three-hats
session: 2026-07-08-S01
date: 2026-07-08
title: "Chapter II review — convergence"
branch: claude/number-plane-notebook-kxvxzj
slug: number-plane-notebook-kxvxzj
status: complete
build: n/a
---

# Chapter II (the plate-grid notebook) — Convergence Analysis

Six lenses — **Framework Maintainer**, **Architecture & Quality Consultant**,
**Math-Viz & Pedagogy**, **Accessibility**, **Mathematical Rigor**, and **Editorial &
Product-Coherence** — reviewed `public/number-planes/chapter-2.html` independently. An
adversarial pass then tried to refute every checkable P1/P2 claim. This is the synthesis:
what survived, what didn't, where the lenses disagree, and one ranked punch list.

The one-sentence verdict shared across all six: **the port is a faithful, correct,
theme-live realization of the handoff's core contract — and it is not yet the accessible,
navigable, singular "reference implementation" it is billed to be.** Ship it on the branch;
do not yet bless it as the permanent chapter template or the code to port to React.

---

## 1. What holds up

Endorsements two or more lenses share, at high confidence (several corroborated by the
adversarial pass):

- **The one-`p` contract is honored, faithfully.** A single source of truth (`S.p`, default
  −1) funnels every control — slider, CR dial, DV/L2 chips, mode flip — through `setP`, and
  a single `render()` re-derives every plate in one pass. *(Maintainer, Consultant, Pedagogy,
  Editorial, Rigor — near-unanimous; this is the thing the handoff said to protect.)*
- **The mathematics is a correct, honest transcription — not a cosmetic morph.** The product
  `(xa + p·yb, xb + ya)`, the p-independent product rail, the unit-norm level curves
  (ellipse / vertical lines / hyperbola with correct asymptotes), the renormalization as a
  true ĵ = j/√|p| ruler change with an invariant unit curve, and the 45° tilt to the
  idempotent null basis e± = (1±j)/2 all derive correctly from ℝ[j]/(j²−p). *(Maintainer,
  Consultant, Rigor — Rigor found exactly one genuine math defect in the whole file.)*
- **The theming mechanism is the right pattern and its most-doubted claim is TRUE.** Tokens
  derive from chrome vars via `var()`/`color-mix`, and every SVG color is `fill=var(--…)`, so
  a skin switch recolors the whole page **live with zero `render()` call**. The "works across
  all 8 skins" claim holds: `light-dark()` resolves correctly because `color-scheme` is
  CSS-inherited and every guide-theme skin block sets it. *(Maintainer, Consultant, Editorial —
  the trigger question for this review, answered yes.)*
- **In motion it is a genuine, delightful realization of "one dial, three worlds."** Flip to
  MULTIPLICATION and turn the dial: the product walks its rail, PL morphs ellipse → parallel
  lines → hyperbola, CR rotates, DV/QD sweep blue → green → orange together. *(Pedagogy, with
  Rigor confirming the underlying claims are honest rather than staged.)*
- **Meaning is redundant with text, not hue alone.** Every plane state carries a written label
  beside its color — the single biggest protection for color-vision-deficient readers, and
  what pulls the color findings from catastrophic down to serious. *(Accessibility, Pedagogy.)*
- **It is parallel-branch and CI safe, with a headless hook.** The commit touches only
  `public/number-planes/` and `docs/`, none of the append-only shared files; Vite copies it
  verbatim and the sole CI gate never touches it; `window.__ch2 = {get, setP}` is a cheap
  verification affordance worth keeping. *(Maintainer, Consultant.)*
- **Mobile hardening improved on the prototype.** A `≤1140px` flex-column fallback with
  per-plate min-heights stacks the plates without horizontal clipping. *(Maintainer, Consultant.)*

---

## 2. Confirmed defects, ranked

Findings the adversarial pass **confirmed** (survives = true), most severe first. Where the
verifier tightened the wording, the corrected statement is given.

### P1 — fix before it teaches or ships as "reference"

1. **Renormalize/tilt tweens are not cancelled on a new `p` — mid-animation actions get
   clobbered.** `setP` sets `S.p`/`S.rsS` and re-renders but never touches the running
   `rsA`/`tiltA` loops, whose captured from/to overwrite `S.p` every frame until they land.
   Repro: drag to p=1.5, click "reform to +1", then during the ~1.8s stretch click the "−1"
   chip — it reverts to +1. *(Consultant-1; ~2-line fix: `cancelAnimationFrame` in the setters.)*

2. **The ∞ end renders a self-contradiction: dual name + dual green + split root count.** At
   |p|≥15 the header reads "the dual plane, again" in green (`--ok`), yet QD's `n = pos?2` is
   ungated by `isInf`, so it paints **2 green dots labeled "2 real roots."** Reachable by
   snapping the CR dial to the bottom (`setP(±16)`). *Corrected framing:* "2 real roots" is
   arithmetically honest for x²=16; the defect is that the ∞ state is dressed as dual (name +
   color, matching the suppressed level-curves and DV cards) while QD alone still reports the
   split-signature count. Commit to one story and gate `n`/`pColor` on `isInf` like everything
   else in `render()`. *(Pedagogy-2 and Rigor-1 independently — two lenses, both confirmed.)*

3. **Core continuous controls are pointer-only — no keyboard path.** The j² slider, CR dial,
   and z/w handles are SVGs wired with pointer events only (no `tabindex`/`role`/`keydown`);
   the mode toggle is a bare `<div>`. A keyboard user cannot set an off-cut p, open the
   MULTIPLICATION plot, drag z/w, or spin to infinity. *(Accessibility-keyboard-primary.)*

4. **The renormalization lesson is structurally keyboard-unreachable.** `canRescale` requires
   p off-cut, so the "reform to ±1" button is `display:none` at every cut — but the cuts are
   the only p-values a keyboard user can reach. The whole "only the sign survives the stretch"
   payload is pointer-gated. *(Accessibility-renorm-unreachable-kbd; downstream of #3.)*

5. **Flip-card back-face buttons are focusable but painted away.** DV/L2 back faces carry real
   `<button data-pset>` controls that stay in tab order at all times under
   `backface-visibility:hidden`; there is no `:focus-visible` anywhere. A keyboard user tabs
   onto invisible controls and activating one changes p with no visible cause. *Corrected
   scope:* only DV and L2 have back-face buttons (QD/FTA backs are text-only), and
   `backface-visibility` does not hide content from the a11y tree, so SR users meet the back
   prose decontextualized rather than never. *(Accessibility-flipcard-hidden-focus.)*

6. **Zero ARIA: live readouts update silently and every SVG figure is unlabeled.** No live
   region on the running readouts (plane name, rail label, root count), no `role=img`/label on
   any plot or dial, no `aria-pressed` on chips or the mode toggle — a screen reader announces
   nothing when p changes. *(Accessibility-sr-silent-state.)*

7. **The rAF renormalize/tilt animations ignore `prefers-reduced-motion`.** The only guard is a
   CSS blanket (`*{animation:none}`) which cannot touch `requestAnimationFrame`; the 1.8s
   ruler-stretch and 0.8s rotate run in full for reduced-motion users. The sibling
   `notebook.html:1606` already gates via `matchMedia` — the pattern was known and not applied.
   *(Accessibility-reduced-motion-js P1 / Consultant-2 P2 — same defect, two lenses.)*

8. **The walk → room seam is one-way; the walk dead-ends.** `chapter-2.html` links back to
   `notebook.html`, but `notebook.html` never links forward to the room — its terminal beat
   reads "next passage, not yet laid" and its only outbound link is the React app. A reader
   who starts at the walk never learns the room exists. *(Editorial-1.)*

9. **A second, competing typographic identity is bolted on across the seam.** `notebook.html`
   renders in the guide's Georgia serif with no display fonts; `chapter-2.html` imports
   Space Grotesk / Newsreader / Caveat / Space Mono. Crossing the seam jolts the reader from a
   plain document into a loud display surface. Traceable to a genuine contradiction *inside the
   handoff* ("recreate typography precisely" vs "substitute the app's families"). *(Editorial-2.)*

### P2 — situation, coherence, and reach

10. **Orphan page: no route, no gallery card, no inbound link from the app.** Unreachable from
    inside the SPA; discoverable only by typing the raw `public/` URL. *Corrected:* the notebook
    edge is one-way and the "collision" is directory-vs-app-name proximity (`public/number-planes/`
    vs `#/number-plane`), not a literal filename clash — the orphan-rot risk itself is confirmed.
    *(Maintainer-2.)*

11. **Plane algebra is duplicated across four locations with no shared module** — the canonical
    tested `numberPlanes.ts`, `notebook.html`, `chapter-2.html`, and the design reference — so a
    sign-convention or new-plane change must be made by hand in up to four places and can silently
    diverge. This restarts the "three near-identical viewers" story the repo previously paid down.
    *(Consultant-5, Maintainer-3 — two lenses.)*

12. **`render()` rebuilds `innerHTML` on 6 groups + ~30-40 `setAttribute`s per pointer-move, no
    rAF coalescing**, with a forced `getBoundingClientRect` layout read before each write — even
    for state that is constant during a z/w drag. Micro-jank risk on low-end Android. *(Consultant-3.)*

13. **Clicks on the plot/caption/empty space inside C2 or PL toggle the plate lock.** Only the
    handles/slider/dial carry `data-dragel`; a click that misses the z handle by a few px falls
    through to `[data-c1t]` and pins the hub. *(Consultant-4.)*

14. **Semantic plane-color readouts fail WCAG AA on the light skins.** Measured: green
    `#149e57` on white = 3.47:1, orange `#e6731f` = 3.07:1, primary red handwriting = 4.31:1 —
    all below 4.5:1 for the meaning-carrying <18px readouts. This directly undercuts the "works
    with any theme" goal that triggered the review. *(Accessibility-contrast-light-skins.)*

15. **Guidance is hidden by default — the grid has no reading order for a cold reader.** The
    handwritten `.ann`/`.fgl` prompts (including the "hover to read · tap to lock" hint itself)
    are `opacity:0` until hover/lock; on fresh desktop load and on all touch there is no
    start-here. This inverts the sibling's explicit "text is present, the reader is trusted"
    principle. *Corrected:* one always-visible plain-span instruction survives (line 152), but
    the bulk of teaching prose is hidden and the flip-card glosses are permanently unreachable on
    touch. *(Pedagogy-3.)*

16. **The renormalization aha is buried behind a discovery chain and dead at the default.** It
    only fires from an off-cut "reform" button, its caption is hover-only, and tilt at the p=−1
    default merely rotates a circle (visually inert) — so PL, the second-largest plate,
    under-sells itself in frame one. *(Pedagogy-4.)*

17. **z/w handles, chips, reform/tilt buttons fall below the 24px WCAG 2.2 (2.5.8) minimum** on a
    ~340px phone — handles worst (~12-15px) and the only way to move a point, with no keyboard
    fallback. *(Accessibility-touch-targets.)*

18. **`touch-action:none` on the tall phone plates can strand vertical scroll.** On the collapsed
    single-column layout the C2 plot fills most of a 620px plate; a swipe begun over it yields no
    page scroll. Soft/escapable (margins still scroll), but easy to hit. *(Accessibility-touch-scroll-trap.)*

19. **The plate room is built three times over** — `notebook.html`'s terminal zDesk, `chapter-2.html`'s
    grid, and the live React `#/number-plane` app the cards point to as canonical — same "one p,
    three planes, live" job, three visual identities, no shared code. *(Editorial-3.)*

20. **The two artifacts teach different color languages for the three planes.** `chapter-2.html`
    makes blue/green/orange a load-bearing cross-skin semantic; `notebook.html` never uses it
    (neutral `var(--stroke)` world cards, `--re/--im` off the accents), so a reader who learns the
    planes in the walk meets an unannounced new color code in the room. *(Editorial-4.)*

21. **CR copy "the far side is p ↦ 1/p" is off by a sign.** The diametrically opposite point on the
    dial is −1/p; the actual 1/p is the ±1-fixing mirror across the horizontal diameter (as
    `cards/CR.md` states). The map is correct; only the hand-voice wording conflates the two
    involutions. *(Rigor-2 — genuinely minor, but a checkable math-phrasing defect.)*

### Also confirmed, P3 (polish — not enumerated in full)

`light-dark()`'s undocumented `color-scheme` coupling + divergence from the chrome's deliberate
`[data-scheme]` convention (Maintainer-5); build on the drift-flagged guide mirror + a fourth
palette copy (Maintainer-6); daylight `--voice` near-collides with the `--d1` data-blue
(Maintainer-7); a dead class name containing a Cyrillic character (Consultant-7); no
`pointercancel` handling → stuck drag flags (Consultant-8); flip/lock state lives only in DOM,
not `S`, and `c2Hint` mutates outside `render()` (Consultant-10); the ∞ curve is a discontinuous
object-switch, not a metric limit, and no DV button lights at ∞ (Rigor-3, Rigor-4); the multiply
sentence clamps p to 6 while the header reads ∞ (Rigor-5); the 45° tilt is exact only at p=+1
(Rigor-6); no `:focus-visible`, flat heading structure, personal revision-marks voice absent from
the room, AX referenced but reachable from no plate (Accessibility-focus-visible /
-heading-structure, Editorial-6, Editorial-9).

### Checked and did NOT hold (do not present these as defects)

- **Google Fonts as a P2 privacy / self-containment regression (Maintainer-1) — REFUTED.** The app
  already loads Google Fonts app-wide (Space Grotesk / Hanken Grotesk / Space Mono, `display=swap`)
  and two of the six families ARE the house fonts, so no new external-dependency category is
  introduced. The genuine, much narrower residue: 4 foreign families (Newsreader, Caveat, Shadows
  Into Light, VT323) were pulled in and the loader wasn't trimmed — a P3, not a P2.
- **"Every control is a div; a keyboard user cannot change p" (Maintainer-4) — REFUTED as stated.**
  The chips and DV rows are 9 native `<button>`s, so a keyboard user CAN set p to −1/0/+1 and
  toggle mode/rescale/tilt. The real, narrower gap (the pointer-only *continuous* controls and
  plate flips) is captured by the confirmed P1s above.
- **"Dragging the slider moves neither of the two largest plates" (Pedagogy-1) — REFUTED as
  overstated.** PL reshapes vividly with the dial on load (ellipse `ry = 52/√(−p)`), and the C2
  knob/readouts/chips update live. The valid, narrower point survives: only the C2 *add-diagram*
  itself (z, w, z+w) is p-independent in the default ADD mode.
- **"Neither page states they are two views of one chapter" (Editorial-5) — REFUTED as stated.**
  `chapter-2.html` DOES link back and reconcile ("← the walk in (the choice)"). The genuine defect
  is the *one-way* seam — already captured as confirmed defect #8.

---

## 3. Points of tension

Where the lenses genuinely pull against each other — these are Dan-calls, not bugs.

- **Pedagogy density vs. the plate grid as an instrument.** Pedagogy's frame is "the passage
  teaches (`notebook.html`), the grid confirms (`chapter-2.html`)" — the grid teaches only those who
  already understand it, because its prose is hidden and its best payload buried. Yet every other
  lens finds the grid *lovely in motion* and the natural chapter template. The resolution both point
  toward: keep the staged walk as the sequenced first experience, position the grid as the lab, and
  give the grid minimal onboarding — not more density.
- **Which artifact is the "reference"?** The handoff bills `chapter-2.html` as *the* high-fidelity
  reference implementation. Accessibility flatly contests this: chapter-2 is the *less* accessible of
  the two artifacts (the 3-days-older `notebook.html` already has a native range input, `role=button`
  cards, `aria-live`, and a `matchMedia` reduced-motion gate — all of which chapter-2 dropped). So the
  file held up as the template is the one that regressed. Editorial independently wants the grid as the
  scalable template for Chapters I/III — but only *after* the a11y passes land.
- **Fidelity-to-mockup vs. repo voice — and the handoff contradicts itself.** The handoff says both
  "recreate typography precisely" AND "substitute the app's families / do not hard-code hex." The port
  chose fidelity (kept the mockup fonts, hard-coded the plane trio). Both choices are individually
  defensible; the *split* across the seam (loud room, plain walk) is the wrong answer. Someone has to
  pick one typographic system and one plane-color language and apply it to both.
- **`light-dark()` theming: it works, and it's a future liability.** Confirmed true across all 8 skins —
  but only via an *undocumented* `color-scheme`-inheritance contract, and it diverges from the chrome's
  deliberate "paired `[data-scheme]` blocks, not `light-dark()` (three modes, not two)" convention. It
  also fails WCAG AA on the light skins despite the "any theme" promise. So "works with any theme" is
  true for *rendering* and false for *contrast* — and every `light-dark()` becomes rework at chrome
  promotion.
- **The three implementations' endgame.** The same idea ships in `numberPlanes.ts` (React app),
  `notebook.html`, and `chapter-2.html`. Consultant/Maintainer want a shared module; Editorial wants
  one plate room chosen; Rigor is agnostic. Nobody resolved whether chapter-2 eventually *feeds*,
  *replaces*, or *coexists with* the React `#/number-plane` app — that is the load-bearing product
  decision underneath most of the coherence findings.

---

## 4. Blind spots

What no lens covered:

- **Nobody opened the page in a browser or on a device.** All six reviews are grep + reasoning over
  source. The perf finding (Consultant-3) was never profiled on real hardware; the touch-target and
  scroll-trap findings were computed from viewBox math, not felt on a phone; the "delightful in motion"
  endorsement is inferred from the code, not observed. `visual-unverified` and `phone-needed`.
- **Content-graph fidelity was only spot-checked.** No lens systematically diffed all 7 plates' teaching
  copy against the real card corpus (`cards/{C2,PL,CR,DV,QD,L2,FTA,AX}.md`). Editorial-9 caught the AX
  gap; the other six cards' claim-to-copy fit is assumed, not audited.
- **No automated test exercises the page.** CI never touches `public/`, and the `window.__ch2` hook —
  built for headless verification — is used by nothing. The one-p contract could regress silently.
- **Print / offline / SEO / RTL / localization** — none considered. The page `noindex`-adjacent status,
  offline font fallback (Georgia collapse), and any non-LTR rendering are unexamined.
- **The `.dc.html` reference's own quality was taken as ground truth.** Rigor validated the *math*, but
  no one asked whether the prototype's pedagogical or a11y choices were worth being faithful to — the
  fidelity mandate was never itself questioned (except implicitly by Accessibility).
- **Security was waved through.** Static page, low risk — but the absent CSP was noted only in passing
  as context for the fonts finding, never evaluated on its own.

---

## 5. Recommended action — one ranked punch list

P1 → P3. "Quick win" = self-contained, minutes-to-an-hour, no product decision. "Needs Dan" = a
product/coherence call. "Bigger build" = real engineering.

**P1**

1. Gate the ∞ state's QD root count + color on `isInf` so name/color/count agree (pick dual⇒1 or
   far-split⇒2). *(quick win)*
2. Cancel `rsA`/`tiltA` in `setP` and the slider/CR setters before applying a new p. *(quick win)*
3. Add a `matchMedia('(prefers-reduced-motion: reduce)')` check in `doRescale`/`doTilt` — snap to end
   state. Copy `notebook.html:1606`. *(quick win)*
4. Make the j² slider and CR dial keyboard-operable (`role=slider`, `tabindex`, arrow/Home/End/PageUp
   keydown, `aria-valuetext`); make the mode toggle a real `<button aria-pressed>`. This is load-bearing
   for pedagogy — it's the only way renormalize becomes reachable. *(bigger build)*
5. Add an `aria-live=polite` status node mirroring the running readouts + `role=img`/`aria-label` on each
   plot/dial; gate flip-card back faces with `inert` until `data-on=1`; add a `:focus-visible` ring.
   *(bigger build)*
6. Decide the walk↔room model in one sentence, print it on both pages, and wire the forward door from
   `notebook.html` to `chapter-2.html`. *(needs Dan)*
7. Pick ONE typographic system (lift the display fonts into the walk, or strip them from the room) and
   apply to both. *(needs Dan)*

**P2**

8. Extract a shared `public/number-planes/planes.js` (dial + plane-name + palette + product math + one
   accessible slider) consumed by both static pages; collapses 2 of the 4 algebra copies and gives the
   React port one file to reconcile. *(bigger build)*
9. Darken the light-skin `--ok`/`--d5`/`--voice` overrides to clear 4.5:1 for text (or reserve the
   saturated hue for strokes and render colored text one step darker). *(quick win)*
10. rAF-coalesce `render()` behind a dirty flag; create the static z/w/z·w labels + rsg circles once and
    only `setAttribute` on move; cache the SVG rect on pointerdown. *(bigger build)*
11. Gate lock-toggle to a deliberate target (e.g. the header pulse-dot row) so mis-clicks near the z/w
    handles don't pin the plate. *(quick win)*
12. Surface the core prompts by default (drop `opacity:0` on "drag the dial" / "only the sign survives" /
    a start-at-C2 cue); default to `pm:'mul'` and/or a one-time p-sweep on load so the dial visibly moves
    a plate in frame one. *(needs Dan — it's a design decision.)*
13. Bump z/w handle radius to ~18 (≈24px on phone) and pad chips/reform/tilt to ≥24px min-height; set
    `touch-action:pan-y` on the main plot. *(quick win)*
14. Add one inbound link (from the NumberPlane app explainer or the gallery) OR commit a docs/ status note
    declaring chapter-2 a deliberate standalone reading surface with an owner. *(needs Dan)*
15. Reword the CR "far side is p↦1/p" copy to the source card's precise statement ("the mirror across the
    ±1 axis is 1/p"). *(quick win)*
16. Decide the plane-color language once and apply it to both walk and room; reconcile the three plate-room
    implementations (which one is canonical vs the React app). *(needs Dan)*

**P3**

17. Trim the font loader to only the families the page uses; document the `light-dark()`/`color-scheme`
    dependency + the divergence from the chrome `[data-scheme]` convention for the eventual promotion.
    *(quick win)*
18. Mirror each `pointerup` with a `pointercancel`; delete the dead Cyrillic-`х` class name; promote plate
    titles to visually-unchanged `<h2>` in `<section aria-labelledby>`; reveal `.ann` on `:focus-within`.
    *(quick win)*
19. Add a real revision-mark margin note to the room (or stop using the handwriting font purely as button
    captions); link or scope-out the AX card. *(needs Dan)*
20. Gate "Chapter II is the reference implementation" on the four a11y passes (#4, #5) landing, so future
    chapters copied from it don't inherit the regression. *(needs Dan)*

---

## Self-reflection

1. **What would you do with another session?** Actually load both pages in a browser and on a phone to
   convert the reasoning-only endorsements ("delightful in motion", the touch-target and scroll-trap
   math) into observed fact, and run the `window.__ch2` hook through the one-p contract to see if any
   plate desyncs — the review is entirely static-analysis and one live pass would either confirm or
   dislodge several findings.
2. **What would you change about what you produced?** The punch list is long (20 items); if I had to cut,
   the true "do these four and it's a different artifact" set is #1–#5 plus the walk↔room decision (#6).
   I could have led with that minimal set more sharply instead of a complete enumeration.
3. **What were you not asked that you think is important?** Whether `chapter-2.html` is meant to eventually
   *replace* the React `#/number-plane` app or coexist — that single product decision collapses roughly a
   third of the coherence findings, and no lens was chartered to answer it.
4. **What did we both overlook?** A systematic content-graph audit: does each of the 7 plates' teaching
   copy actually match its card in `cards/`? Only AX was checked. And no one questioned whether the
   `.dc.html` prototype was *worth* being faithful to — fidelity was treated as the goal, not a choice.
5. **What did you find difficult?** Separating "confirmed but overstated" from "refuted" — four findings
   (Maintainer-1/-4, Pedagogy-1, Editorial-5) had true cores wrapped in false headlines, and the honest
   move was to demote them to their narrow residue rather than either drop or keep them whole.
6. **What would have made this task easier?** A running instance URL I could drive, and a machine-readable
   map of card → plate → teaching-claim so content fidelity could be diffed rather than spot-checked.
7. **How did you verify this, and does each passing check test the user-visible claim?** Reasoning only,
   over the six lenses' structured output and the adversarial verdicts, plus direct reads of the
   self-reflection prompt, the template frontmatter, and a file listing. I did not independently re-grep
   `chapter-2.html` for every cited line — I relied on the adversarial pass's high-confidence
   line-by-line confirmations. No check here tests a *user-visible* rendering: every "confirmed" defect is
   confirmed against source code, not against the page as a browser paints it. `visual-unverified` and
   `phone-needed` both apply to the endorsements and the touch/perf findings.
8. **Follow-up value:** MEDIUM — the synthesis is correct and complete as a code-level convergence, but the
   two decisions that unblock most of the punch list (walk↔room model, chapter-2's relationship to the
   React app) are Dan-calls this review can only frame, not make, and one live browser/phone pass would
   firm up the reasoning-only endorsements.
