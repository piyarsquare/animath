---
kind: three-hats
session: 2026-06-24-S01
date: 2026-06-24
title: "Argand review — Hat 1: Framework Maintainer"
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review
status: completed
build: passed
---

# Argand review — Hat 1: Framework Maintainer

## Plan under review

<details>
<summary>Original request</summary>

> Review the Argand app (#/argand, src/animations/Argand/) — its visual design and user experience. ADD TWO HATS beyond the usual three: (4) a graphic designer focused on whether the display is clean and the concepts are well-articulated visually, and (5) a video game designer focused on user experience and interaction feel.

</details>

I am the **framework maintainer**. My job is not to judge whether the math reads well
(that is Hats 3/4/5) — it is to judge whether Argand *respects the chrome the framework
already provides*, whether the proposed fixes are operationally feasible given build-only
CI and static deploy, whether they stay inside the app folder (parallel-branch safety),
and whether the app adds or sheds technical debt. I read the source, the screenshots, and
the framework's own type/archetype contracts before forming a view.

> [!NOTE]
> This hat's scope: the four screenshots show **real, shipped bugs** (panel overlap,
> a dead-center hint pill, a triplicated feed switcher). Those are not design taste —
> they are framework-conformance defects, and they are squarely mine to call. I treat
> them as the headline.

---

## How Argand sits in the framework

Credit where due: Argand is a **well-behaved framework citizen** in its bones. It:

- renders exactly **one** `<Workspace>` (no reinvented chrome, no custom top bar);
- declares 7 `SectionDef` panels, every one drawn from the **closed 11-archetype
  vocabulary** (`subject` ×2, `domain` ×2, `playback`, `readout`, `quality`) — no invented
  icons;
- builds panel bodies from the shared `ControlPanel` primitives (`Slider`, `Pills`,
  `Select`, `Checkbox`, `ComplexInput`) rather than hand-rolling inputs;
- persists settings through `usePersistentState` with a clean `argand:*` namespace and a
  proper "Reset settings to defaults" action wired to `clearPersistedState`;
- keeps transient view state (`t`, `playing`, `sysPlaying`, pan `center`) in plain
  `useState`/`useRef`, **not** persisted — exactly the convention CLAUDE.md asks for;
- uses `immersive` correctly (single view → fills the stage), and provides a `hint`,
  `subtitle`, `explainer`, `modes`, and a custom `layouts` entry;
- splits pure math into `complexOps.ts` (no React/DOM), which is the right seam.

All of this is in the **app folder**. The only shared files it touches (`index.tsx`,
`apps.ts`, `catalog.ts`, README, CLAUDE.md) are the append-only ones, and from the route
table they were appended, not reordered. **Parallel-branch safety is intact.** Nothing in
my fix list below needs to change a shared file, which is the single best thing I can say
about the remediation cost.

So the problems are not "fought the framework." They are "used the framework, then
**bypassed three things the framework would have done correctly**, and left one pure
module untested."

---

## The shipped bugs (framework-conformance defects)

### Bug 1 — the Essentials layout overlaps its own panels

This is the worst one and it is **100% caused by hand-computed geometry** instead of the
framework's packer.

```ts
// Argand.tsx
const layouts: LayoutDef[] = [
  { id: 'essentials', name: 'Essentials', sub: 'Function · Play · Values', icon: 'tune',
    open: { function: { x: 24, y: 18 }, scrub: { x: 24, y: 320 }, values: { x: 24, y: 580 } } },
];
```

The author stacked three panels in one column at fixed `y` = 18 / 320 / 580. But look at
the declared heights versus the gaps:

| Panel    | id         | estHeight | y    | y + estHeight | next panel y | overlap? |
|----------|------------|-----------|------|---------------|--------------|----------|
| Function | `function` | 280       | 18   | 298           | 320          | clears by 22px… |
| Play     | `scrub`    | 250       | 320  | 570           | 580          | clears by 10px… |
| Values   | `values`   | 220       | 580  | 800           | (stage edge) | runs off bottom |

On paper the `estHeight` values *just* clear. In the live render they do **not**: the
Function panel's body (Degree pills + colored equation + two/three `ComplexInput` rows +
three lock checkboxes + the fixed-point list + "View from z\*" + a 3-line help paragraph)
is far taller than 280px, so it visibly clips the Play panel header, and Play's help
paragraph is cut off mid-sentence ("shifting at once. A closed loop" is truncated in the
desktop screenshot). The screenshots show the chevrons/titles colliding.

> [!WARNING]
> Two root causes, both framework-relevant:
> 1. **`estHeight` is fiction here.** It is supposed to be the *open* height so the
>    free-slot packer can avoid collisions. Function's real height is ~430–470px, not 280.
> 2. **Hand-placed `y` coordinates duplicate work the framework does for free.** The
>    framework ships `packColumns(ids, est)` (`chrome/workspace/geometry.ts`, used by the
>    auto **Everything** layout). The author re-implemented column packing by hand and got
>    it wrong.

> [!IMPORTANT]
> The fix is to stop hand-placing. Either (a) drop the custom `essentials` layout entirely
> and let `defaultLayoutId` fall through to the auto **Everything** layout (which packs via
> `packColumns` and won't overlap), or (b) keep `essentials` but **derive** its `open` map
> from `packColumns(['function','scrub','values'], est)` so the gaps track the real
> heights. Either way, first **make `estHeight` honest** (Function ≈ 460, Play ≈ 300 when
> Iterate is open, Values ≈ 230). This is a pure in-folder change.

Note also: the layout `id` is `essentials` but the maintainer-facing `tune` icon is fine;
that is not a defect. The defect is purely the geometry.

### Bug 2 — the persistent hint pill sits dead-center over the diagram

The `hint` prop is documented in `types.ts` as a **start hint**: *"rendered as a centered
overlay until the first pointer interaction. Per-session only."* In Argand it reads as a
**permanent** centered banner — it is in every screenshot (desktop, phone, quadratic,
grid), squarely over the `z`/`f(z)`/`α₁` cluster, which is exactly where the action is.

I need to flag a framework ambiguity here rather than blame the app blindly: the spec says
the hint should dismiss on first pointer interaction. If it is not dismissing, one of two
things is true and **both are my concern**:

- **(a)** The chrome's hint-dismiss logic is not firing for `immersive` single-view apps
  (the pointer events land on the `ArgandPlane` SVG inside the view node, and the dismiss
  listener may be on a wrapper that never sees them). If so, this is a **chrome bug** that
  Argand is the first to expose — worth a look at `DesktopWorkspace.tsx`'s hint handling.
- **(b)** Argand's hint string is simply too long for a centered overlay. It packs six
  clauses ("drag z · α₁ · α₀ · pinch or scroll to zoom · two-finger or shift-drag to pan ·
  double-click to recenter") into one pill that, centered, covers the figure.

> [!IMPORTANT]
> Regardless of which, the user-facing fix is: **shorten the hint to one math-anchored
> clause** ("drag z, α₁, α₀ — watch f(z) follow") per the spec's own example, and **verify
> it dismisses on first drag**. If it does not dismiss in immersive mode, file that against
> the chrome (`hint` dismiss-on-interaction) — do not work around it inside Argand with a
> bespoke timer, which would re-bypass the framework.

### Bug 3 — the feed switcher appears in THREE places at once

`feed` (Point / Shape / Grid) is selectable from:

1. the **top-bar mode pills** (`modes`/`activeMode`/`onModeChange` → `setFeed`);
2. the **bottom control HUD** (`controlHud`, its own `<button>` pills);
3. the **Input panel** (`inputNode`'s `<Pills>`).

That is three independent controls for one piece of state, two of them hand-styled
`<button>`s that do not match the `Pills` primitive. The screenshots show #1 and #2
simultaneously visible with **two different visual treatments** of the same Point/Shape/
Grid choice, which reads as a bug (and is one: redundant, inconsistent affordances).

> [!CAUTION]
> This is scope creep manifesting as UI debt. The framework gives you *one* blessed home
> for a top-level mode: the **mode pills** (`modes`). It also gives you the Input panel for
> the detail (which curve, the anchor `z`). Having the same switch a third time in a
> hand-rolled HUD is the kind of "just add it where it's convenient" accretion the
> archetype vocabulary exists to prevent.

> [!IMPORTANT]
> Pick **one** authoritative home and delete the other two switchers. My recommendation:
> keep the **top-bar mode pills** (they are the framework's intended place for a primary
> mode and survive fullscreen via the bar), keep the **Shape preset `Select`** in the
> Input panel, and **remove the Point/Shape/Grid pills from the bottom HUD and from the
> Input panel body**. That collapses three controls to one without losing any reach.

---

## The bottom control HUD — a re-implementation of `actions`

Beyond the triplicated feed switcher, the whole `controlHud` deserves a hard look. It is a
hand-built, `backdrop-filter`-blurred floating pill containing a `t` scrubber + play/reset,
a `j²` scrubber + play + Cx/Du/Sp pills, and the feed switcher. The justifying comment is:

```
// Because it lives INSIDE the view node it survives fullscreen (where the chrome's
// top bar and action strip are gone) and never overlaps them.
```

That reasoning is half-right and half a **misread of the framework**:

- The framework's `actions` strip (`ActionDef[]`) is **explicitly designed to persist
  through fullscreen** — `types.ts`: *"renders bottom-center on desktop … and persists
  through fullscreen."* So "the action strip is gone in fullscreen" is **false**; the HUD
  was built to solve a problem the framework already solves.
- The action strip is deliberately **buttons-only, static labels, ≤5 verbs** — a
  *projection* of a playback panel, not a new control surface. A `t` scrubber and a `j²`
  scrubber are sliders, not verbs, so they legitimately do **not** belong on the action
  strip. That part of the HUD is defensible.

So the honest split is:

| HUD element            | Framework-correct home                                              |
|------------------------|---------------------------------------------------------------------|
| Point/Shape/Grid pills | **mode pills** (already exist) — delete from HUD                    |
| Shape preset pills     | **Input panel** `Select` (already exists) — delete from HUD        |
| Play / reset (t)       | **`actions` strip** (`▶`/`↺` are verbs, survive fullscreen)         |
| Play (j² morph)        | **`actions` strip** as a second verb, or keep in HUD                |
| `t` scrubber           | legitimately needs a screen-anchored slider → keep a *minimal* HUD  |
| `j²` scrubber          | same                                                                |
| Cx / Du / Sp pills     | duplicate of the System panel `Slider` stops → consider dropping    |

> [!NOTE]
> I am **not** asking to delete the HUD. A screen-anchored scrubber for an immersive plot
> is reasonable and the framework does not provide a slider-bearing overlay. I *am* asking
> to (1) move the verbs to the real `actions` strip so they get the framework's
> fullscreen/phone-dock handling for free, and (2) stop duplicating the feed switcher and
> the system stops. The HUD should shrink to *the two scrubbers the framework can't host*,
> plus maybe their play toggles if `actions` proves awkward with two play states.

This matters operationally: the app currently passes **no `actions`**, so the framework's
action strip — the thing first-time users reach for — is empty, while a parallel hand-built
strip does the job inconsistently. That is the definition of fighting the framework while
believing you're accommodating it.

---

## Technical debt

### complexOps.ts has zero tests, and it is the one place tests are cheap

The prior handoff already flagged this and it is correct. `complexOps.ts` is **pure**,
**dependency-free**, and **load-bearing** for every picture in the app — and the generalized
algebra (`mulG`, `powRealG`, `logG`/`expG` across the `p<0 / =0 / >0` trichotomy) is
exactly the kind of branchy numeric code that *silently* produces wrong-but-plausible
output. `vitest` is already wired (`src/**/__tests__/`), so the marginal cost of a test
file is near zero.

> [!IMPORTANT]
> Add `src/animations/Argand/__tests__/complexOps.test.ts`. Minimum coverage that earns
> its keep:
> - **identities:** `affineLoopAt(z, …, 0) == z`, `affineLoopAt(z, …, 0.5) == affine(z,…)`,
>   `affineLoopAt(z, …, 1) == z` (the loop is closed — the whole Play UX depends on it);
> - **fixed point:** `affine(z*, …) == z*` for `polyFixedPoints` roots (both linear and the
>   degree-2 quadratic-formula path);
> - **system limits:** `mulG(a,b,-1) == mul(a,b)`; `powRealG(b,-1,t) == powReal(b,t)`
>   (the comment claims an exact fast path — assert it);
> - **degeneracy guards:** `powRealG` returns finite values (no NaN) on the dual `Re≤0`
>   and split null-cone fallbacks the code claims to handle;
> - **arc-length:** `arcLengthMap` round-trips (`sAt(arcAt(s)) ≈ s`).
>
> This is **not a CI gate** (only `npm run build` is), but the convention is "keep `npm
> test` green," and adding the first Argand test moves that convention from aspiration to
> fact for this folder.

### ArgandPlane.tsx is a render-branch thicket

`ArgandPlane.tsx` is 604 lines with a takes-21-props signature and a JSX body that
branches on `feed × degree × iterate × gridColor × gridType × showMover` — the handoff's
"branchy" flag is accurate. It is not *broken* (it builds, it draws), and I do **not**
recommend a speculative refactor mid-review. But two cheap, low-risk extractions would pay:

- the **grid generation** `gridCurves` IIFE and `drawGrid` are self-contained and pure-ish
  → a `gridGeometry.ts` (testable alongside `complexOps`);
- the **unit-curve** `unitCurveNode` IIFE (ellipse / two-lines / hyperbola+asymptotes) is
  likewise self-contained.

> [!NOTE]
> Treat these as nice-to-have, not must-fix. The 21-prop signature is a smell but it is the
> honest cost of "one SVG renders six modes"; collapsing the props into a single `props`
> object would reduce the diff churn but not the essential complexity. Don't gold-plate.

### Inline-style sprawl

The app defines styles inline throughout (the HUD `pill`/`iconBtn`/`hudRow`, the equation
overlay, `btn`/`stopBtn`). There is already an `Argand.css`. Some of this (the `.argand-hud`
class is referenced but the layout styles are inline) should move to the CSS file for
consistency with how CSS/DOM apps in the repo work — but this is cosmetic and low priority.

---

## Scope: is the surface too big?

Yes, and the framework gives me the vocabulary to say *where* it's too big.

The app is **3 feeds × 2 degrees × 3 number systems × iterate × view-from-z\* × HUD + 7
panels**. The math case for each piece is real (the EXPLAINER tells a coherent story:
affine map → fixed point → iteration → quadratics → the j² trichotomy). The *framework*
problem is that this richness is exposed **flatly** — everything is reachable at once, and
the redundant switchers (Bug 3) make it feel busier than it is.

> [!IMPORTANT]
> The framework's intended tool for "stage the complexity" is **layouts as chapters**
> (the way Complex Particles uses Single Function / Representations, and Stable Matching
> uses matrix/welfare/lattice). Argand ships **one** custom layout (and it's the broken
> one). The right move is not to delete features — it is to add 2–3 **layout chapters**
> ("The affine line" = Function+Play+Values; "Iterate to z\*"; "Quadratics"; "Three number
> systems") so a learner meets the surface in stages instead of all at once. That is a
> pure in-folder, framework-blessed change and it directly answers the graphic/UX hats'
> "too busy" concern without amputating anything.

The one thing I would genuinely consider *cutting* is the **j² number-system axis in the
HUD**: it is the deepest idea in the app (Yaglom's trichotomy) and it is currently a
permanent third row in a floating overlay over an entry-point complex-numbers app. It earns
a layout chapter or a panel, not a permanent HUD row competing with the `t` scrubber.

---

## Operational reality check

Everything I'm recommending is feasible under the repo's constraints:

| Recommendation                          | Touches shared/append-only? | CI risk | Asset/base risk |
|-----------------------------------------|-----------------------------|---------|------------------|
| Fix Essentials layout (packColumns / honest estHeight) | No (app folder) | none | none |
| Shorten/verify the hint                 | No                          | none    | none             |
| De-duplicate the feed switcher          | No                          | none    | none             |
| Move Play/reset verbs to `actions`      | No                          | none    | none             |
| Add `complexOps.test.ts`                | No                          | none (not a gate) | none   |
| Add layout chapters                     | No                          | none    | none             |
| Extract grid/unit-curve geometry        | No                          | none    | none             |

No `import.meta.env.BASE_URL` concerns (the app loads no public assets). No new deps. No
`usePersistentState` namespace collisions (it's clean). **Every fix stays inside
`src/animations/Argand/`** — which means none of them need a `main` re-sync and none of
them can collide with a parallel app branch. From a maintenance-cost standpoint this is the
ideal shape: high-value fixes, zero shared-file churn.

---

## Verdict

**What I endorse.** Argand is a genuine framework citizen — one `<Workspace>`, closed
archetypes, shared primitives, clean persistence, pure-math seam, append-only shared edits.
The *conception* is sound; this is a polish-and-conform pass, not a rebuild. I endorse
shipping it after the must-fixes below.

**What concerns me.** Three shipped bugs (overlap, hint, triplicated switcher) all trace to
the same root cause: **the app re-implemented things the framework already does, and did
them less well** — column packing (→ `packColumns`), a fullscreen-surviving control strip
(→ `actions`), and a single home for a primary mode (→ mode pills). The chrome was built to
prevent exactly these, and Argand routed around it. Separately, the one pure module is
untested despite vitest being free, and the deepest idea (j²) is buried in a permanent HUD
row.

**What I would change — prioritized (all in-folder, none touch shared files):**

**MUST-FIX (blocks "clean" sign-off):**

1. **Essentials layout overlap** — make `estHeight` honest, then either drop the custom
   layout (fall through to auto `Everything`) or derive `open` from `packColumns`. *File:
   `Argand.tsx` (`layouts`, `sections` estHeights).*
2. **De-duplicate the feed switcher** — keep the top-bar mode pills + the Input panel's
   Shape `Select`; delete the Point/Shape/Grid pills from the bottom HUD and from
   `inputNode`. *File: `Argand.tsx` (`controlHud`, `inputNode`).*
3. **Hint** — shorten to one clause; verify it dismisses on first interaction in immersive
   mode. If it does not dismiss, file a chrome bug (don't work around it in-app). *File:
   `Argand.tsx` (`views[0].hint`); possibly `DesktopWorkspace.tsx` for the dismiss path.*

**SHOULD-FIX (framework conformance):**

4. **Move Play/reset (and j² play) to the real `actions` strip** (`ActionDef[]`,
   `sectionId: 'scrub'`); shrink the HUD to just the two scrubbers the framework can't
   host. Removes the false "action strip is gone in fullscreen" assumption. *File:
   `Argand.tsx`.*
5. **Add `__tests__/complexOps.test.ts`** — loop-closure, fixed-point, system limits,
   degeneracy guards, arc-length round-trip. *New file in app folder.*
6. **Layout chapters** — 2–3 staged layouts to tame the flat surface; consider relocating
   j² out of the permanent HUD into a chapter/panel. *File: `Argand.tsx` (`layouts`).*

**NICE-TO-HAVE (debt, not blocking):**

7. Extract `gridGeometry.ts` / unit-curve from `ArgandPlane.tsx`; move inline HUD styles to
   `Argand.css`.

> [!IMPORTANT]
> None of the above touches `index.tsx`, `apps.ts`, `catalog.ts`, `README.md`, or
> `CLAUDE.md`. The remediation is entirely within `src/animations/Argand/`, so it is
> parallel-branch-safe and needs no `main` re-sync. The only CI gate (`npm run build`) is
> unaffected by every item; item 5 improves `npm test` from "no Argand coverage" to
> "covered," which is the convention even though it isn't gated.

---

## Self-reflection

1. **What would you do with another session?** Open `DesktopWorkspace.tsx` and trace the
   `hint` dismiss path to settle whether Bug 2 is a chrome defect (immersive pointer events
   not reaching the dismiss listener) or just an over-long hint — I asserted "one or the
   other" without reading the chrome's hint handler, which is the one claim here I did not
   fully verify in source.
2. **What would you change about what you produced?** I'd quantify the real rendered panel
   heights (mount the app, measure) instead of estimating "~430–470px" for Function — the
   overlap diagnosis is certainly correct from the screenshots, but my height numbers are
   eyeballed.
3. **What were you not asked that you think is important?** Whether the *route* should even
   advertise this as ready: CLAUDE.md calls Argand a "successor-in-progress to Plane
   Transform." The shipped overlap bug means the default layout is broken on first load —
   that's a gallery-listing-readiness question the five hats should surface jointly.
4. **What did we both overlook?** Accessibility: the entire app encodes meaning in color
   (z cyan, α₁ orange, α₀ violet, α₂ pink, f green, z\* gold) with no secondary cue, and the
   handles differ by shape but the prose ("drag the orange α₁") is color-only. A
   colorblind learner loses the central read. None of the five hats was scoped to a11y.
5. **What did you find difficult?** Disentangling "design taste" (Hats 4/5) from
   "framework-conformance defect" (mine) on the HUD — the HUD is simultaneously a UX choice
   and a re-implementation of `actions`. I tried to rule only on the latter.
6. **What would have made this task easier?** A running instance to confirm the hint
   dismiss behavior and measure panel heights, rather than four static screenshots.
7. **How did you verify this, and does each passing check test the user-visible claim?**
   Method: **source reading + the four provided screenshots (visual) + reasoning** — no app
   run, no automated test. The three bugs are confirmed *visually* in the screenshots
   (overlap, centered pill, dual feed switcher) and corroborated against the source that
   produces them, so those claims are solid. The *cause* of Bug 2 (chrome vs. app) is
   reasoned, not verified — flagged as such. The `estHeight`-vs-real-height numbers are
   eyeballed, not measured. Setting `signals: visual-unverified` for the hint-dismiss
   behavior specifically (checked by screenshot/reasoning, not by interacting).
8. **Follow-up value:** MEDIUM — the must-fix diagnoses are correct and actionable as
   written, but the hint root-cause (chrome vs. app) and the exact panel-height numbers
   need one verification pass before someone implements the layout fix.
