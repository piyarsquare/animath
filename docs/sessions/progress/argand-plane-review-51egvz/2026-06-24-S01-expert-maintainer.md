---
kind: three-hats
session: 2026-06-24-S01
date: 2026-06-24
title: "Argand review — Hat 1: Framework Maintainer"
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review-51egvz
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

## Augmentation (2026-06-24) — the complex–dual–split slider as a cross-app "unitary spaces" lens

Dan's framing: ℂ is the most *familiar* entry point but should be treated as **one setting
of `p` on the elliptic/parabolic/hyperbolic (Cayley–Klein) continuum**, not a privileged
home — "a foreigner we need to understand." The invariant that makes this coherent is
already in `complexOps.ts`: `normG(z) = x² − p·y²`, the quadratic form each algebra
preserves. "Unitary spaces" = the family of planes that each preserve their own `normG`.

I find the *idea* strong and the *engine* already built. My entire job here is to keep an
appealing cross-app idea from quietly dissolving the property that lets this repo run many
parallel app branches without merge pain. So I'll answer each sub-question, then draw the
boundary I'd actually defend.

> [!CAUTION]
> This is the single most framework-destabilizing proposal I've reviewed for this repo. Not
> because it's wrong — because a "suite-wide `p`" by construction touches a **shared lib +
> multiple app folders + per-app GLSL** at once. That is the exact shape the "self-contained
> folder, append-only shared files" rule exists to forbid. The whole value of my analysis is
> in the *sequencing* that defuses that, so I lead with the tension and treat the mechanics
> as subordinate to it.

### Q1 — Promote `complexOps.ts`'s generalized algebra to a shared `lib/` module?

**Yes — but as an additive extraction, not a move, and only when the second consumer is
real.** Today `mulG`/`conjG`/`normG`/`invG`/`divG`/`powRealG`/`sqrtG`/`expG`/`logG` are the
cleanest, best-commented code in the app and are genuinely app-agnostic (no React, no DOM,
pure number-in/number-out over `p`). They are a natural sibling to `lib/complexMath.ts`.

Migration shape that keeps Argand safe:

| Approach | What happens | Risk to Argand | Verdict |
|----------|--------------|----------------|---------|
| **Move** the generalized fns to `lib/generalizedAlgebra.ts`, delete from `complexOps.ts` | Argand imports flip; `complexOps.ts` keeps only the Argand-specific path/format/snap helpers | Churns Argand imports; any in-flight Argand branch (this one) conflicts | Reject for now |
| **Extract a copy** to `lib/`, re-export from `complexOps.ts` | New shared module; Argand keeps importing from `complexOps` (which now re-exports) | ~zero — Argand's import surface is unchanged | **Recommended** |
| Leave in place; second app imports `from '../Argand/complexOps'` | No new file | Cross-app import into an app folder — forbidden coupling, breaks self-containment | Reject |

> [!IMPORTANT]
> Do **not** promote speculatively. The trigger is "a second app honestly needs `mulG`/
> `normG`." Until that app exists, promotion is pure churn with no payoff and it collides
> with the very Argand branch doing the round-1 fixes. When the trigger fires: create
> `lib/generalizedAlgebra.ts` as a **new** file (append-only-friendly — no existing shared
> file is edited), move the pure generalized fns there, and have `complexOps.ts`
> `export * from '@/lib/generalizedAlgebra'` so Argand's imports never move. That makes the
> promotion a one-file *addition* plus a one-line re-export, not a repo-wide rename.

One correctness caveat the promotion must carry forward: `complexOps.ts` itself warns that
`powRealG`/`logG` are **only well-defined in part of the plane** (dual needs `Re>0`, split
needs the future cone) and *fall back to a linear blend* in degenerate regions. A shared
module that other apps trust must keep that contract loud — ideally with the unit tests I
already asked for in round 1 (item 5), which become *more* important once the code is shared.

### Q2 — Extend `functionHandoff.ts` to carry `p`?

**Yes, and it's the cheapest, safest piece of the whole program — do it first if anything.**
`FunctionState` is `{ index, p?, q?, quad? }`. Note the trap: it **already has a `p`**, and
it means the `p` of `z^(p/q)`, *not* the number system. Reusing that key would be a silent
semantic collision.

> [!WARNING]
> Naming. The handoff's existing `p` is the exponent numerator of `z^(p/q)`. The number
> system is also conventionally `p = j²`. Do **not** overload. Add a distinct key —
> `sys` (or `jsq`) — for the algebra: `FunctionState = { index, p?, q?, quad?, sys? }`.

Backward-compat is clean by design: the codec already returns `{}` for anything unparseable
and only emits keys that are present. Adding `if (s.sys !== undefined) parts.push(...)` to
`encodeFunction` and a guarded `num('sys')` read to `decodeFunction` is **purely additive** —
old links (no `sys`) decode exactly as before (target keeps its own / defaults to ℂ), and a
target app that doesn't understand `sys` simply ignores the extra key. This edits one shared
file (`lib/functionHandoff.ts`) but the edit is append-only within the function bodies and
non-breaking, so it is the lowest-risk shared-file touch in the suite.

The honest limit: a handoff is only meaningful between apps that *can act on* `sys`. Carrying
`sys` from Argand to Complex Particles only helps once Complex Particles can render a
non-complex `p` — so Q2's wire is necessary-but-not-sufficient; it's plumbing laid ahead of
the consumer. That's fine (cheap, reversible) as long as nobody mistakes laid pipe for a
shipped feature.

### Q3 — The framework tension, and how to sequence it

The rule (CLAUDE.md, parallel-branches): *each app is a self-contained folder; the shared
files it edits are append-only.* A suite-wide `p` violates this three ways at once — it needs
a **shared algebra lib**, **edits inside ≥4 app folders**, and **per-app GLSL rewrites**
(FractalsGPU/Correspondence multiply in the shader, not in `complexOps`). Done as one change
it's a repo-wide refactor that conflicts with every in-flight app branch.

The defusing move is to recognize this is **not one change** — it's a fan-out of
independent, app-local changes sharing one additive lib. Sequenced:

**Phase 0 — shared substrate (one new file + one additive shared edit).**
`lib/generalizedAlgebra.ts` (Q1, copy-and-re-export) and the `sys` key in
`functionHandoff.ts` (Q2). Both additive; neither breaks an existing consumer. This is the
*only* phase that touches shared files, and it touches them additively. Land it once,
quietly, on its own small branch.

**Phase 1 — Argand consolidates (in-folder).** Argand is already the reference consumer;
once Phase 0 lands, Argand flips to importing the shared lib (no-op if we re-export) and
becomes the canonical `p`-aware app. No other folder touched.

**Phase 2..N — one app at a time, each in its own folder branch.** Each app that *can*
honestly take the dial adds it independently, reading the shared lib and the `sys` handoff
key. Because each app is its own folder, these branches **do not conflict with each other** —
they only ever conflict if two of them re-edit Phase 0's shared files, which they shouldn't
need to (the substrate is already there). The merge-order-independence the repo relies on is
preserved *as long as Phase 0 is complete before any Phase-2 branch opens.*

**Which apps can honestly take the dial:**

| App | Engine | Can take `p` honestly? | Why |
|-----|--------|------------------------|-----|
| **Argand** | `complexOps` (JS) | ✅ already does | affine/poly are `mulG`-native |
| **Plane Transform** | plane map (JS, `f:ℂ→ℂ`) | ✅ *iff* `f` is affine/poly/rational | same `mulG`/`divG` substrate; transcendentals don't generalize |
| **Complex Particles** | 4D particle graph (JS sampling) | ⚠️ partial | the graph is sampled in JS, so affine/poly variants can use `mulG`; but its zoo (exp/sin/Γ/…) has **no dual/split analogue** |
| **FractalsGPU** | GLSL | ⚠️ rewrite | multiply lives in the shader; needs a `mulG` GLSL port + the iteration recast — real work, per-app |
| **Correspondence** | GLSL (Mandelbrot↔Julia) | ⚠️ rewrite | same as FractalsGPU; `z²+c` over `p` is meaningful (it's literally Dan's "with a z² term" remark) but it's a shader change |

> [!CAUTION]
> The transcendental zoo is the hard boundary. `complexMath.functionNames` (~23 fns:
> exp/sin/Γ/ζ-likes) is **ℂ-specific** — there is no clean dual or split-complex `exp`/`Γ`.
> Any `p`-aware app must therefore expose the dial **only for the maps that generalize**
> (affine, polynomial, rational) and either hide it or hard-pin `p=−1` for the rest. A global
> `p` slider that silently does nothing (or NaNs) on `sin z` is worse than no slider. This is
> a per-app gating decision, not something the shared lib can enforce.

### Q4 — One app's feature, a shared widget, or a multi-app program?

**A multi-app *program*, delivered as a shared *substrate* + per-app *opt-in*, that should
not begin life as a shared *widget*.**

- **Not one app's feature** — Dan's whole point is that ℂ-as-foreigner is a *suite* stance;
  confining it to Argand contradicts the framing.
- **Not (yet) a shared widget** — a "drop-in `<UnitarySpaceSlider>`" sounds tidy but is a
  trap: the framework's shared UI is the **archetype-typed panel**, and `p` is cleanly a
  `domain`-tier control (it's "which input space"). The slider is three lines of `Slider`
  with three stops; standardizing it as a component before two apps even use it is premature
  abstraction. If a *third* app adopts it, *then* extract a `SystemSlider` panel body to
  `components/`. (Same discipline as Q1: extract on the second/third real consumer, not on
  spec.)
- **It is a program** — substrate (Phase 0) + a documented contract ("apps may read `sys`;
  apps must gate it to generalizable maps") + incremental per-app adoption.

Recommended boundary, stated plainly: **the shared thing is the math (`lib/
generalizedAlgebra.ts`) and the wire (`functionHandoff` `sys` key). The per-app thing is the
UI dial and the decision of whether the dial is honest for that app's maps.** The framework
already names that boundary — `domain`-tier panel per app, shared `lib/` for the engine —
so the program fits the existing seams without inventing a new sharing mechanism.

### Augmented verdict (delta)

**Green-light first (lowest risk, real value):**
1. **Phase 0 substrate** — `lib/generalizedAlgebra.ts` as an additive extraction with a
   re-export from `complexOps.ts` (zero churn to Argand), **plus** the `sys` (not `p`!) key
   in `functionHandoff.ts` (purely additive, backward-compatible). Pair it with the
   round-1 unit tests, which are now load-bearing for shared correctness.
2. **Plane Transform** as the second consumer — it shares Argand's JS substrate and its
   affine/poly maps generalize cleanly; it's the cheapest honest second app and validates
   the substrate before any GLSL work.

**Resist / sequence carefully:**
- **A single global `p` slider across all apps in one PR** — it's the repo-churn bomb; it
  conflicts with every in-flight branch and forces GLSL rewrites under one diff. Fan it out
  per app folder, strictly after Phase 0.
- **Exposing the dial on the transcendental zoo** — gate it to generalizable maps or pin
  `p=−1`; never ship a slider that NaNs on `sin z`.
- **Promoting the algebra before a second consumer exists** — premature; pure churn that
  collides with the active Argand fix branch. Trigger on the second real need.
- **A standardized `<UnitarySpaceSlider>` component before app #3** — premature
  abstraction; keep it a `domain` panel per app until adoption proves the shape.

Net: I endorse the *idea* and most of the *engine reuse*, and I'm comfortable green-lighting
the additive substrate immediately — **provided the program is sequenced so that exactly one
small branch ever touches shared files, and every subsequent app adopts `p` inside its own
folder.** That preserves the parallel-branch property that makes this repo cheap to work in,
which is the one thing I will not trade for elegance.

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
   need one verification pass before someone implements the layout fix. *(Augmentation
   delta: the cross-app "unitary spaces" program is a design recommendation, not yet
   verified against the GLSL apps' shader structure — the FractalsGPU/Correspondence
   "rewrite" cost is estimated from the architecture, not from reading their shaders; a
   follow-up should confirm the `mulG` GLSL-port effort before committing a phase plan.
   Follow-up value stays MEDIUM.)*
