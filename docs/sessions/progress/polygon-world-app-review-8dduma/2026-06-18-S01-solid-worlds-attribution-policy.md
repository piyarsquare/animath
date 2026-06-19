---
kind: progress
session: 2026-06-18-S01
date: 2026-06-18
title: Solid Worlds review + AI-collaboration attribution policy
branch: claude/polygon-world-app-review-8dduma
slug: polygon-world-app-review-8dduma
status: in-progress
build: passing
followup: null
pr: null
app: docs, polygon-worlds
signals: needs-dan
next: Tier 2 of Solid Worlds — full platycosm catalog, vertex-link manifold check + H₁, Schlegel mini-map, and an automated walk-the-loop chirality test.
---

# Solid Worlds review + AI-collaboration attribution policy

## Session purpose

Review the uploaded `threemanifoldsplan.md` ("Solid Worlds" — walking closed
3-manifolds as the dimensional successor to Polygon Worlds), discuss the design,
and — the now-directed deliverable — **figure out the best way to add an
AI-collaboration attribution policy to the project workflow** and write it.

## Previous session

First tracked session on this branch. Nearest relevant prior work:
[`future-apps-scoping` S01](../future-apps-scoping/2026-06-10-S01-future-app-scoping.md)
(scoped the next wave of apps in `docs/FUTURE_APPS.md`; it already flagged
*"licensing/attribution before any code lands"* as an open item — the same theme
this session is generalizing into a standing policy). Latest handoff overall is
`gallery-app-ordering` (2026-06-15), unrelated to this focus.

## Working notes

### 🟢 code · 03:13 — Solid Worlds Tier 2: turn-spaces, rotation-vs-reflection HUD, schema tests; + an avatar bug fix
**Why:** Continue the plan into Tier 2 (richer catalog + matured schema), and fix
a real bug Dan spotted: the third-person avatar's chirality colors were reversed
relative to the footprints.

- **Catalog grew 2 → 4** (`worlds.ts`): added the **half-turn (dicosm)** and
  **quarter-turn (tetracosm)** spaces — mapping tori of the 180°/90° rotation of
  the xy-torus, glued on the z-pair (cube-compatible). They're the
  rotation-vs-reflection teaching pair: a proper rotation you can reorient away
  vs. the amphicosm's un-fixable mirror. (Third/sixth-turn + Hantzsche–Wendt need
  a hexagonal prism / richer gluing — deferred.)
- **HUD upgraded** to three states: **ORIGINAL · ROTATED N° · MIRRORED**. The
  engine now reports `rotationDeg` (angle of the carried frame from the trace of
  `bodyLinear`); `det −1` ⇒ mirrored, `det +1` with angle ⇒ rotated. Makes the
  "rotation is cosmetic, reflection is the invariant" lesson visible live.
- **Schema matured** (`solidSchema.ts`): added `rot`, `transposeM3`, `traceM3`,
  `rotationAngleDeg`. **9 vitest tests** (`__tests__/solidSchema.test.ts`) assert
  orientability per world, the amphicosm reverses only on x, the x-loop holonomy
  (once → det −1, twice → identity), and the quarter-turn z-loop is a proper 90°
  rotation of order 4. This closes the **pure-math half** of the flagged
  chirality-harness gap (a headless walk-the-loop test is still TODO).
- **Avatar fix** (`coverEngine.ts`): the third-person figure now puts **cyan on
  its left, magenta on its right**, matching the footprint convention exactly
  (its nose also now points forward); rebuilt as a clearer little figure (body +
  head + nose + side markers).
- EXPLAINER + CLAUDE tree updated for the grown catalog. Build ✓ (4.29s), 9/9
  tests ✓, `eslint src/` 0 errors.

![quarter-turn space: neighbor rooms rotated 90°](assets/2026-06-18-S01-solid-worlds-quarter-turn.png)

![the corrected third-person avatar](assets/2026-06-18-S01-solid-worlds-avatar.png)

### 🟡 milestone · 02:58 — Solid Worlds Tier 1 built, registered, and renders (build + lint green)
**Why:** Author asked to "build out the plan." Tier 1 is the shippable entry —
walk the flat cube worlds and exercise the genuine 3D mirror-flip.

New app `src/animations/SolidWorlds/` — a self-contained first-person walker for
closed 3-manifolds, the 3D successor to Polygon Worlds:

- **`solidSchema.ts`** — pure (Three-free) cube face-pairing algebra; computes
  orientability from the pairing determinants (H₁ / manifold name carried as
  curated catalog facts, per the honesty rule). **`worlds.ts`** — the Tier-1
  catalog: 3-torus + amphicosm (Klein × S¹).
- **`coverEngine.ts`** — the developing-map cover engine. The walker carries a
  body frame; crossing a glide-reflection face premultiplies it by a det −1 linear
  part, so the camera world matrix goes **left-handed** and the whole view renders
  mirror-reversed (DoubleSide materials throughout so the reflected view doesn't
  cull). Seamless universal-cover tiling via a BFS over the deck generators
  (works for the non-abelian amphicosm group), shared room + trail geometry cloned
  per cell. Chiral footprint trail (F/arrow/cyan-magenta) + an opaque HELLO sign.
- **`SolidWorlds.tsx`** — Workspace integration (immersive, third/first-person
  modes, looks, cover-depth/room-size, free-flight WASD+QE, drag-look, pinch-zoom)
  + the **chirality HUD** (ORIGINAL / MIRRORED, per-axis loop counts) and a
  readout panel. **`textures.ts`**, **`looks.ts`**, **`engineTypes.ts`**,
  **`EXPLAINER.md`** (with the policy-mandated lineage block).
- Registered: `index.tsx` route `#/solid-worlds`, `apps.ts` entry, `catalog.ts`
  META (new `solid` preview kind in `previews.tsx` — a rotating cube-strip with a
  chiral F pair), CLAUDE.md routing table + tree, README.md.

**Verified headless** (`scripts/shoot.mjs`, SwiftShader): the 3-torus tiles the
room in all directions with all signs reading forward (no loop flips it); the
amphicosm cover shows genuinely reflected neighbor cells across the x-pairing. The
first-person mirror is confirmed by construction — after one +x crossing
`bodyLinear = diag(1,−1,1)`, det −1, HUD → MIRRORED. `npm run build` ✓ (4.39s),
`eslint src/` 0 errors (60 baseline warnings, none new).

![3-torus: one room repeating in all directions, signs all forward](assets/2026-06-18-S01-solid-worlds-3torus.png)

![amphicosm: neighbor cells reflected across the x-pairing](assets/2026-06-18-S01-solid-worlds-amphicosm.png)

> [!NOTE]
> **Tier-1 scope honestly stated.** Flat (κ = 0) only; two worlds; the post-loop
> first-person mirror is verified by the determinant logic, not yet by an
> automated walk-the-loop test (the flagged 3D `trail-chirality` harness gap is
> still open). Tiers 2–4 (full platycosm catalog, Schlegel mini-map, the 4×4
> kernel + curved render, seam slider) remain as planned.

### 🟡 milestone · 00:07 — Solid Worlds written up as a `kind: plan` report
**Why:** Author chose "write it up as a planned report first" (over starting the
Tier 1 build). A pick-up-cold plan preserves the design discussion before context
is lost.

Wrote [`2026-06-18-S01-solid-worlds-plan.md`](2026-06-18-S01-solid-worlds-plan.md)
(`kind: plan`, `status: proposed`). It distills the uploaded draft + this session's
discussion into a file-level, tiered sequence grounded in the *real* codebase:
the reality-check table (app-local kernel, `surfaceSchema.ts` reused as the 3D
manifold-certifier, `coverModel.ts`/`looks.ts` reuse), the separate-app decision,
the session's design calls (footstep chirality headline, `ollɘH` sign, rotation-
vs-reflection pair, portal rooms / free-frame / cover view), Tiers 1–4, the
validation strategy (with the flagged 3D-`trail-chirality` harness gap), risks,
naming, and a policy-conformant "Possible sources" block.

### 🟡 milestone · 23:55 — Attribution policy added across the workflow (full scope); build green
**Why:** Author chose the full-workflow option; a policy doc only sticks if the
binding rule, the build checklist, and a worked example are all in place.

Wrote four pieces:

1. **`ATTRIBUTION.md`** (repo root) — the up-front policy statement (AI
   collaborators plural; "possible sources"; clarity/wayfinding not priority; two
   honest provenances; the honesty guardrail; and the 3-point in-practice
   workflow).
2. **`CLAUDE.md` → new section *Attribution & AI collaboration*** (after Code
   Conventions) — the standing rule that makes future sessions *do* it: per-app
   "Possible sources & where to go further" block, name-what-you-can-stand-behind /
   flag-uncertainty / never-fabricate, record both provenances, capture in handoff.
3. **`docs/BUILDING_AN_APP.md` §3d** — added the lineage block as a build step in
   the "document your app" checklist.
4. **`src/animations/PolygonWorlds/EXPLAINER.md`** — first worked example: a
   "Possible sources & where to go further" block crediting Weeks (*Torus Games*,
   *The Shape of Space*), the edge-word surface classification + Gauss–Bonnet, and
   the Steiner Roman surface.

`npm run build` passes (`tsc && vite build`, ✓ built in 6.49s). Nothing committed
yet.

### 🟣 decision · 23:51 — Run /start-session; record the design discussion + the directed deliverable
**Why:** The conversation moved from open-ended design talk to a concrete,
committed task ("add the attribution policy to our workflow"), so the session
needs an audit trail from here on.

Discussion to date (no code yet):

- **Reviewed the Solid Worlds plan** against the real `PolygonWorlds` code.
  Confirmed: the geometry kernel is app-local
  (`src/animations/PolygonWorlds/lib/cayleyKlein.ts`), *not* a shared
  `src/lib/geometry/` — so the plan's §3 "promote vs fork" is genuinely
  un-started. Separate-app recommendation fits house style; `PolygonEngine`
  (`engineTypes.ts`) is the interface to mirror as `SolidEngine`; Polygon Worlds
  already uses the `immersive` Workspace mode the 3D walk would reuse.
- **Chirality Q&A** (the conceptual spine): the **footstep/ink trail** lifts and
  becomes the *headline* instrument (det = −1 lands on the body — no normal to
  absorb it), while the 2D **glass sign's see-through mechanism breaks** and is
  replaced by a 3D chiral totem. Worked the concrete case: an opaque "Hello" sign
  in the amphicosm (Klein × S¹) reads **ollɘH** after one lap on the x-axis,
  restored after two; honest caveat that the flip is loop holonomy, not a
  localizable event (the §7 seam-slider thesis).
- **Rotation vs reflection**: turn-spaces give *cosmetic* (reorientable-away)
  rotations — sign comes back spun / upside-down / facing-away but you can turn to
  read it; only the non-orientable worlds give a genuine, un-fixable mirror, and
  even *which kind* of mirror is gauge. Good Tier-2 teaching pair.
- **"Room" / Escher questions**: keep the cube a furnished room but with
  **portal faces, not walls**; default to a transported free-frame (no global
  "up"), with imposed-gravity as an opt-in that doubles as the Escher
  ceiling-disagreement demo in worlds that can't carry a consistent vertical;
  each face shows the deck-translate of the cell under that face's isometry; a
  zoom-out third-person **cover view** (lattice of tinted cubes + mirror twins)
  reuses `coverModel.ts`. Precedent surveyed (Control/Manifold Garden/Antichamber
  for *feel*; Jeff Weeks' *Curved Spaces* / *Torus Games* / *The Shape of Space*,
  *Not Knot*, Segerman–Hart non-Euclidean VR for *substance*).

### 🟣 decision · 23:51 — Attribution policy: scope and shape (pending author confirmation on placement)
**Why:** The user articulated a clear values position and corrected the framing
twice; capturing the agreed wording so it survives context loss.

Agreed principles (the user's corrections folded in):

- **AI collaborators** (plural).
- The phrase is **"possible sources"** (not "sources and near-analogues").
- **Not about priority** ("who got there first"). It is about **bringing
  clarity and informing the approach for others to seek out** — attribution as
  *wayfinding*, a path for others to find more, **as well as** credit.
- Independent rediscovery is honored *and* named: distinguish the reasoning that
  reached an idea from the existing work it lands near, and record both. (Worked
  example: the author reasoned to the **Clifford torus** via (r,θ) maps + the
  single-radius constraint; it has a name and already lives in the codebase as
  the Hopf/Torus projection in Complex Particles.)
- **Honesty guardrail**: name people/works we can stand behind; **flag
  uncertainty, never fabricate** a citation/DOI/date.

Proposed implementation (the "best way to add it to the workflow"):

1. **`ATTRIBUTION.md`** at repo root — the public, up-front policy statement.
2. **A standing instruction in `CLAUDE.md`** ("identifying possible sources is
   part of building every app") so future sessions actually *do* it — this is
   what makes it a workflow, not a one-off doc.
3. **A per-app convention**: each EXPLAINER/guide ends with a short
   **"Possible sources & where to go further"** block (annotated pointers, not
   priority claims). Retrofit Polygon Worlds (credit *Torus Games* as its 2D
   ancestor) as the first instance.
4. Tie-in to the existing
   [`[docs] !high Productionize the signals/to-do system`](../../TODO.md) item
   and `BUILDING_AN_APP.md` so the lineage block becomes a build step.

**Open for the author:** exact placement (standalone `ATTRIBUTION.md` + CLAUDE.md
pointer is the recommendation) before writing anything to disk.
