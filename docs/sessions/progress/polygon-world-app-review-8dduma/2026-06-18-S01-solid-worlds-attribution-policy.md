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
next: Commit + push the attribution-policy changes; then return to the Solid Worlds plan (Tier 1 build vs. a kind:plan report).
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
