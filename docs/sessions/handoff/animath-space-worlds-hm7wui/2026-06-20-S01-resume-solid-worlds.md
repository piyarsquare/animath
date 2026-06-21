---
kind: handoff
session: 2026-06-20-S01
date: 2026-06-21
title: Solid Worlds Rooms decor — controls, openings, furniture
branch: claude/animath-space-worlds-hm7wui
slug: animath-space-worlds-hm7wui
status: completed
build: passing
followup: null
pr: 228
app: solid-worlds
next: Optional — make the ceiling duct world-specific (only where the gluing inverts) so plain worlds don't show a redundant vent.
---

# Solid Worlds Rooms decor — controls, openings, furniture

> [!NOTE]
> Continuation of the Rooms-decor work on `#/solid-worlds`. All changes are in the
> **visual/decor + view-control layer** — no topology-engine math changed. Build,
> lint (0 errors), and 53/53 tests pass; PR #228 CI is green.

## Summary

This session polished the **Rooms** decor mode of Solid Worlds (the furnished
fundamental cube you leave through archways) into a finished state, driven by Dan's
live feedback. Walls became solid-but-faintly-translucent with a **Wall opacity**
slider; the third-person cutaway became a **Cutaway** slider; arches got moldings;
each wall gained a steel-framed **ceiling duct** (runs to the ceiling) that gives a
foot-level transit opening in worlds that flip the room top↔bottom; the bare back
walls were furnished (open-front bookshelf with books + plant + glass Klein bottle,
plus a wardrobe); and the mantel sign reads **Hello**. A separate Cloudflare Pages CI
hang was unstuck with a re-trigger commit. Everything is verified visually and pushed.

## What changed

All in `src/animations/SolidWorlds/`:

- **Wall translucency + opacity slider.** Walls are `MeshStandardMaterial` with
  `transparent`, `depthWrite: true` (so tiled panels don't flicker), default opacity
  **0.84**. Live **Wall opacity** slider (Rooms decor only) — the engine keeps refs to
  the wall materials (`wallMats`) and updates `opacity`/`transparent` in place, no
  cover rebuild.
- **Cutaway slider.** The third-person clip plane sits at `len * cutFrac` of the
  camera→walker distance (clamped < 0.95), replacing the old fixed `U*0.2`. Slider
  default **0.3**, persisted.
- **Arch moldings + duct.** Each wall arch gets an extruded casing (jambs + arched
  header); the floor trapdoor a torus rim. Each wall also has a **square steel duct**
  that runs **up to the ceiling** (open at the top edge, mirroring how the arch is
  open at the floor). Because the duct rides the same cover transport as the arch, a
  top↔bottom flip carries it down to floor level → a visible foot-level crossing.
- **Furnished back walls.** The +x/+z walls were bare. Added an **open-front
  bookshelf** (colored book spines on every shelf, a potted plant, and a small glass
  **Klein bottle** — `kleinBottleGeometry`, the classic immersion) and a **wardrobe**.
  Each decor mesh is one `InstancedMesh` over the cover, so cost is depth-independent.
- **Bookshelf placement fix.** First built as a solid block (books buried inside) →
  rebuilt as an open case. Then, in final review, moved **bookshelf → +x side wall**
  and **wardrobe → +z wall**: the default third-person camera spawns behind the walker
  near +z, so a +z bookshelf made the glass Klein bottle loom in the lens.
- **WELCOME → Hello** on the mantel sign.
- **CI:** the `Cloudflare Pages` check had hung `in_progress` ~3.5h (Cloudflare-side,
  not our Actions). Pushed an empty re-trigger commit → fresh build → **green**.

## Key files

| File | Role |
|---|---|
| [`decor/rooms.ts:56`](https://github.com/piyarsquare/animath/blob/8fe41e49b014762cd6790ecb3e22ba3c2c74125b/src/animations/SolidWorlds/decor/rooms.ts#L56) | `kleinBottleGeometry` — classic Klein-bottle immersion, normalized to unit size |
| [`decor/rooms.ts:117`](https://github.com/piyarsquare/animath/blob/8fe41e49b014762cd6790ecb3e22ba3c2c74125b/src/animations/SolidWorlds/decor/rooms.ts#L117) | `DUCT` def + `ductHole`/`ductCasingGeo` — ceiling-reaching transit duct |
| [`decor/rooms.ts:153`](https://github.com/piyarsquare/animath/blob/8fe41e49b014762cd6790ecb3e22ba3c2c74125b/src/animations/SolidWorlds/decor/rooms.ts#L153) | `wallMat` — translucent wall material (opacity from slider) |
| [`decor/rooms.ts:288`](https://github.com/piyarsquare/animath/blob/8fe41e49b014762cd6790ecb3e22ba3c2c74125b/src/animations/SolidWorlds/decor/rooms.ts#L288) | Open-front bookshelf (+x wall) + plant + Klein bottle |
| [`decor/rooms.ts:342`](https://github.com/piyarsquare/animath/blob/8fe41e49b014762cd6790ecb3e22ba3c2c74125b/src/animations/SolidWorlds/decor/rooms.ts#L342) | Wardrobe (+z wall) |
| [`coverEngine.ts:710`](https://github.com/piyarsquare/animath/blob/8fe41e49b014762cd6790ecb3e22ba3c2c74125b/src/animations/SolidWorlds/coverEngine.ts#L710) | `setCutFrac` / `setWallOpacity` engine setters (+ `wallMats` at L57) |
| [`coverEngine.ts:690`](https://github.com/piyarsquare/animath/blob/8fe41e49b014762cd6790ecb3e22ba3c2c74125b/src/animations/SolidWorlds/coverEngine.ts#L690) | cutaway plane = `len * cutFrac` |
| [`SolidWorlds.tsx:284`](https://github.com/piyarsquare/animath/blob/8fe41e49b014762cd6790ecb3e22ba3c2c74125b/src/animations/SolidWorlds/SolidWorlds.tsx#L284) | Cutaway + Wall opacity sliders (View panel, state at L39–40) |

## Open / not done

- **Ceiling duct is world-agnostic.** It's drawn on every world, so plain
  (non-inverting) worlds get a redundant high vent leading to the same neighbor as the
  arch. Dan was OK with this; the natural follow-up is to make it conditional on the
  world's point group (only where a gluing inverts vertical↔horizontal). Would tie
  decor to `spec` (it's currently spec-independent).
- **No wall collision.** You walk through face planes freely — the openings are
  *visual* cues of where the gluing connects, not gates. The duct's value is making
  the crossing *look* right in flip worlds.
- **Engine floor plane vs. trapdoor.** The decor floor has a trapdoor hole, but the
  engine's separate whole floor plane still shows under it unless "Floor plane" is off.
  Not addressed.

## Context

- **Verify the room** with `decorMode=rooms` in localStorage (`animath:v1:solid-worlds:decorMode` = `"rooms"`).
  The headless harness is `scripts/shoot.mjs` (swiftshader); first-person camera aiming
  is imprecise — third-person orbit + `clip` crops were more reliable for close-ups.
- **Furnishings are NOT world-specific** — `buildRoomsDecor` receives `spec` but never
  reads it. Same upright room in every world; only the gluing transports the copies.
- **Why bookshelf on a side wall:** the default 3rd-person camera (`camDistance` 6 in an
  11-unit room) sits right at the +z wall; bulky/bright furniture there pokes past the
  cutaway plane and looms. Side walls (+x) are seen at a grazing angle — safe.

> [!IMPORTANT]
> Default `coverDepth` is **1** (a calm single room) and is intentionally **session-only,
> not persisted** — a stale stored value would hide the hall-of-mirrors depth. Don't
> "fix" it to persist.

## Self-reflection

1. **What would you do with another session?** Make the ceiling duct world-specific
   (only cut it where the gluing actually inverts vertical↔horizontal), so plain worlds
   aren't cluttered with a redundant vent — and verify a true top↔bottom-flip world
   (half-turn / Hantzsche–Wendt) shows the duct landing at floor level in the neighbor
   copy, which I argued by construction but didn't pin in a side-by-side screenshot.
2. **What would you change about what you produced?** The decor in `rooms.ts` is now a
   long single function (~340 lines); it would read better split per-piece
   (walls/openings/furniture). Absolute sizes are large (a book is ~1.6 units in an
   11-unit room) — consistent, but it's why objects loom up close.
3. **What were you not asked that you think is important?** Whether the Rooms mode
   should ever adapt furniture per world (e.g., the fireplace/trapdoor landing sensibly
   in turn/flip worlds) rather than always the same upright room — currently inverting
   worlds show furniture rotated onto walls, which is honest but can look odd.
4. **What did we both overlook?** The default-third-person looming was only caught in
   the final pass — it should have been obvious when first placing furniture on the +z
   wall (the camera's home wall). Worth a standing check: "what's directly behind the
   default camera?"
5. **What did you find difficult?** Precise headless camera framing — first-person WASD
   aiming overshot repeatedly; third-person orbit + cropped screenshots were the only
   reliable way to inspect small shelf items.
6. **What would have made this task easier?** A debug URL param to set
   camera/yaw/pitch/world directly (deep-link a view), so screenshots could target an
   exact angle instead of scripted drags.
7. **Follow-up value:** LOW — the work is complete, builds, tests pass, CI is green, and
   it's verified visually; the open items are polish/scope choices, not correctness.
