---
kind: handoff
session: 2026-06-05-S01
date: 2026-06-05
title: Klein Bottle Fix
branch: claude/klein-bottle-fix
slug: klein-bottle-fix
status: in-progress
build: passed
followup: high
pr: null
---

# Klein Bottle Fix

## What changed

The session started from a presentation bug (the flat Klein bottle is intrinsically flat, so crossing the glue edge produced no felt event) and grew into a broad closed-surface tour. In commit order, grouped:

- **Flat Klein made legible** — each universal-cover cell carries a `trees` and a `columns` group toggled by red-crossing parity (Klein only; torus shows columns everywhere). Glass floor + a real mirrored **underside world** (`under` group, `scale(1,−1,−1)`) wearing the *opposite* skin; footprint trail rebuilt to one print per step on the side you walk, returning reversed-and-face-down under the glass after a twist. Avatar can project into every cell with the correct 2L-twist / L-roll period.
- **Mini-map** of the square fundamental domain with identification arrows (single chevrons on the roll pair, opposed double chevrons for the Klein flip), driven by a per-frame `FlatMapState`.
- **New spherical engine** (`sphericalEngine.ts`) — walk great circles on a fixed planet; ℝP² = antipodal identification with a mirror-reversed twin trail. Registered `sphere` / `rp2` surfaces (family `spherical`), a third "Curved (sphere)" pill, mini-map, planet-radius slider, markers, per-cover-cell colouring.
- **ℝP² inner shell** — the spherical analogue of the flat glass underside: a radial-mirror inner surface (rebuilt to match the Klein floor's construction after two earlier attempts) wearing the opposite skin (column under tree), revealed by the shared glass-opacity knob.
- **Cohesive-picture defaults (final commit)** — glass floor + tree/column pairing now **on by default** in both rectangular worlds at **35%** opacity; fixed the glass floor doing nothing on the default sphere surface. Corridor (Möbius) left untouched.

> [!CAUTION]
> **Gotcha** Nothing here was verified in a running WebGL context — there is no headless GL in this environment. Every milestone's geometry/transform logic was checked by hand (coordinate traces), but the walk feel, strafe handedness, the flat trees⇄columns flip across the red edge, the underside reading at 35%, and the ℝP² inner-shell / antipodal-trail reversal all still need a human eye in the app. Treat the branch as *logically complete, visually unverified*.

## Key files

| File | Role |
| --- | --- |
| [`TopologyWalk.tsx:45`](https://github.com/piyarsquare/animath/blob/3c32618/src/animations/TopologyWalk/TopologyWalk.tsx#L45) | Default state: spawns on `klein`, `floorOpacity=0.35` (L57), `colorCells=false` (L58), `innerShell=true` = the "Glass floor — see the underside" toggle (L60), `projectAvatar=true` (L56). Family gating for flat-only vs spherical-only controls. |
| [`flatEngine.ts:191`](https://github.com/piyarsquare/animath/blob/3c32618/src/animations/TopologyWalk/flatEngine.ts#L191) | Flat torus/Klein engine. Per-cell `under` group (`scale(1,−1,−1)`, L205) = the mirrored underside world with opposite skin; trees/columns parity toggle; glass floor + footprint trail. ~549 lines. |
| [`sphericalEngine.ts:273`](https://github.com/piyarsquare/animath/blob/3c32618/src/animations/TopologyWalk/sphericalEngine.ts#L273) | Spherical sphere/ℝP² engine. `applyInnerShell()` (L321) + `setFloorOpacity` (L364) drive the radial-mirror inner shell / glass; `glassOpacity` is shared with the flat floor-opacity knob (L155-157). ~500 lines (new this session). |
| [`engine.ts:30`](https://github.com/piyarsquare/animath/blob/3c32618/src/animations/TopologyWalk/engine.ts#L30) | `SURFACES` registry (3 families: corridor / flat / spherical) + `EngineOptions` (shared knobs: `miniMap`, `projectAvatar`, `floorOpacity`, …) + the `WorldEngine` interface with optional family-specific setters. |
| [`docs/topology-walk-surface-tour.md`](https://github.com/piyarsquare/animath/blob/3c32618/docs/topology-walk-surface-tour.md) | Roadmap: polygon+gluing organising idea, Gauss–Bonnet, the polygon ladder, three-engine architecture, status checklist, open questions (immersion inset, hyperbolic projection, how far to push). |
| [`…/progress/…/S01-klein-bottle-fix.html`](../../progress/klein-bottle-fix/2026-06-05-S01-klein-bottle-fix.html) | Full session timeline (every milestone) + the "Next session — unify the framework" section this handoff distills. |

Code links are pinned to commit `3c32618` so they don't rot.

## Pending / not done — next session: unify the two rectangular worlds

The flat family (torus/Klein) and the spherical family (sphere/ℝP²) both glue a **square fundamental domain** and now do conceptually the same thing (glass/opacity, trees⇄columns cover skins, the mirror-to-the-other-side move, the square mini-map, per-cell colouring) through largely parallel-but-separate code. The explicit goal for the next session is to **unify that into one surface-presentation framework**:

- Fold the duplicated presentation logic + the two sets of UI gating in `TopologyWalk.tsx` into a common layer rather than per-family paths.
- Make the "mirror to the glued other side" a single shared concept — flat glass underside ⇄ ℝP² inner shell are *both already built as radial mirrors*; name/factor them identically. (Note: the `innerShell` state already doubles as the flat "glass floor" toggle — partial unification is in place; finish it.)
- One square-fundamental-domain mini-map renderer parameterised by the edge-identification rule (torus / Klein / ℝP²).
- **Decision pending:** the shared 35% opacity default is one value for both flat floor and planet glass — confirm with the user whether to keep it shared or split into separate defaults. Likewise the flat "Colour each cover cell" tint defaults off — ask whether to default it on too.
- **Verification debt:** the in-app walk-through listed in the Gotcha above. This should happen before any PR.

## Context

- First (and so far only) tracked session on this branch; no prior handoff under `docs/sessions/handoff/klein-bottle-fix/`. The most recent cross-branch handoff ([better-reports · S01](../../handoff/better-reports/2026-06-05-S01-rich-html-reports.html), PR [#183](https://github.com/piyarsquare/animath/pull/183)) was the docs/report tooling and is unrelated.
- **Shared-file overlap:** all changes are confined to `src/animations/TopologyWalk/` + the roadmap doc + session reports — no edits to the append-only shared files (`index.tsx`, `apps.ts`, `README.md`, `CLAUDE.md`), so a `git merge origin/main` before any PR should be clean. TopologyWalk was already a registered route.
- **Persisted settings:** TopologyWalk uses local `useState` (not `usePersistentState`), so the new defaults take effect immediately for everyone — no stale localStorage to clear.
- Not started (roadmap stretch): the cross-cap / Roman / Boy's-surface immersion inset, the hexagonal flat torus, and a hyperbolic engine for genus-2.

## Self-reflection

1. **What would you do with another session?** Exactly the stated next step: unify the flat and spherical square-domain code into one presentation framework, then do the in-app walk-through to convert the whole branch from "logically complete" to "verified."
2. **What would you change about what you produced?** I built the spherical engine as a near-parallel copy of the flat one rather than factoring the shared surface-presentation concept up front — which is precisely the debt the next session has to pay. Earlier abstraction would have avoided the three-attempt iteration on the ℝP² inner shell.
3. **What were you not asked that you think is important?** Whether the flat floor and planet glass should really share one opacity value, and whether the cover-cell tint should default on — both flagged for the user.
4. **What did we both overlook?** No in-app verification was ever possible here, yet a lot of subtle chirality/handedness logic was shipped on hand-traced confidence. A screenshot or recorded walk from the user at any checkpoint would have de-risked it.
5. **What did you find difficult?** Reasoning about orientation-reversing transforms (the under-group `scale(1,−1,−1)`, the antipodal twin, the radial-mirror inner shell) correctly without being able to see the result — easy to get a sign or a face-cull wrong silently.
6. **What would have made this task easier?** Headless WebGL (or an agreed screenshot loop) so transform/lighting/handedness could be checked per commit instead of accumulating verification debt.
7. **Follow-up value:** HIGH — the branch is unverified visually and the unification refactor is explicitly the next session's job; output may be visually wrong in ways the build can't catch.
