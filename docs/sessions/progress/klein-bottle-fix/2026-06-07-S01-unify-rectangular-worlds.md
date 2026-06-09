---
kind: progress
session: 2026-06-07-S01
date: 2026-06-07
title: Unify the two rectangular worlds (flat ⇄ spherical)
branch: claude/klein-bottle-fix
slug: klein-bottle-fix
status: in-progress
build: passing
followup: null
pr: 186
---

# Unify the two rectangular worlds (flat ⇄ spherical)

## Session purpose

Unify the parallel square-domain presentation code shared by the flat (torus / Klein) and spherical (sphere / ℝP²) engines into one shared surface-presentation layer: a shared glass-opacity helper, a first-class "the other side" abstraction (the seam the future normal-flip rides), one parameterised square-domain mini-map, and consolidated UI gating. Designed with roadmap §4.1 (normal-flip) in mind but *without* building the flip this session.

## Previous session

S01 (2026-06-05, [handoff](../../handoff/klein-bottle-fix/2026-06-05-S01-klein-bottle-fix.html)) made the flat Klein flip legible, added the whole spherical engine + ℝP² inner shell, and shipped the cohesive-picture defaults — but built the spherical engine as a near-parallel copy of the flat one. Nothing was eyeballed in a running app (no headless WebGL). This session pays the unification debt that handoff explicitly flagged.

## Working notes

### 🟡 milestone · — — Visually verified in-app (software WebGL) — HIGH debt discharged
**Why:** merged `origin/main` which now carries the headless software-WebGL harness (#188, SwiftShader + `npm run shoot`), so the refactor could finally be eyeballed.

Drove the real app (puppeteer) across all four surfaces. Confirmed: Klein (columns⇄trees parity + red-flip mini-map), torus (columns everywhere + opposite-skin underside through glass + teal-straight mini-map), sphere (planet + inner-shell twins through 35% glass + equirect chart), ℝP² (antipodal beacons + red/purple-flip mini-map). The unified glass slider, "see the other side" label, and per-family mini-map labels all render; the single `drawSquareMap` draws all three square cases correctly. No regression vs the pre-merge build.

### 🟡 milestone · — — Unification complete — build green, awaiting in-app walkthrough
**Why:** the parallel square-domain code is now folded into one shared presentation layer; `npm run build` passed after every step. Net ~161 lines removed from TopologyWalk.tsx.

Three new modules + a seam + UI consolidation, all behaviour-preserving pure extraction (verified by hand against the originals; the glass arithmetic and spherical `applyInnerShell` map 1:1, the mini-map marker/chevron/label geometry coincides).

### 🟢 code · — — Step 4 — `isRect` UI consolidation (TopologyWalk.tsx)
**Why:** the flat-only vs spherical-only control gating was duplicated.

One `isRect = isFlat || isSpherical` drives the mini-map checkbox and a single shared "Glass floor opacity" slider (was two: flat "Floor opacity" + spherical "Planet glass"). Gating preserved exactly (flat always shows it; spherical iff the inner-shell toggle is on). "see the underside" → "see the other side".

### 🟢 code · — — Step 3 — one parameterised square mini-map (`squareMap.ts`)
**Why:** `drawFlatMap` and `drawRP2Square` were ~70-line near-duplicates.

`drawSquareMap(ctx, size, spec)` takes an edge-glue spec (torus = both straight, Klein = one flip, ℝP² = both flip) + marker + dots + label; chevron direction derives from `glue`. `rp2Square()` moved into the module; local `flatSquareSpec()`/`rp2SquareSpec()` adapters feed it. The equirectangular `drawSphereMap` stays separate.

### 🟢 code · — — Step 2 — "the other side" seam (`otherSide.ts` + engine.ts)
**Why:** item #2 of the goal + the roadmap normal-flip (§4.1) must ride one shared concept.

The two mirror transforms (flat per-cell `scale(1,-1,-1)` vs spherical radial inner shell) are different geometry and stay per-engine; what unifies is the *contract*: an `OtherSide` interface + `Side` type, plus optional `flipSide?()`/`isFlipped?()`/`getOtherSide?()` on `WorldEngine`. Spherical exposes its inner-shell group handle; flat returns `null` (per-cell collection). The flip itself is **deferred** — only the seam is built.

### 🟢 code · — — Step 1 — shared glass helper (`glassSurface.ts`)
**Why:** both engines duplicated the opacity → visible/depthWrite/showUnder arithmetic.

`glassState(opacity, spec)` (pure) + `applyGlass()`. The `showUnder` thresholds stay per-engine constants (`FLAT_GLASS` 0.95, `SPHERE_GLASS` 0.97) so each world's feel is byte-for-byte preserved — only the arithmetic is shared.

### 🟡 milestone · — — Session set up: branch + baseline
**Why:** the harness designated an empty branch (`claude/klein-bottle-fix-UbJOc`); the actual work + PR #186 live on `claude/klein-bottle-fix`. Checked that out (user-confirmed) so the refactor lands where the work is.

Read all of engine.ts / flatEngine.ts / sphericalEngine.ts / TopologyWalk.tsx / the roadmap; settled the plan; reconciled a Plan agent's refinements (keep per-engine glass thresholds, three-module split, OtherSide as interface).

### 🟣 decision · — — Scope decisions settled with the user
**Why:** four open questions gated the design.

Branch = `claude/klein-bottle-fix`; keep one shared 35% glass opacity; cover-cell tint stays OFF by default; **flip = seam only**, defer the animated somersault (the flip's value is felt motion that `npm run build` can't validate, and the branch is still visually unverified).

> [!NOTE]
> **Resolved** The S01 HIGH verification debt is cleared: after merging main's headless software-WebGL harness (#188), the refactor was driven and screenshotted across all four surfaces (Klein / torus / sphere / ℝP²) and reads correctly. The animated normal-flip remains future work (seam only this session).
