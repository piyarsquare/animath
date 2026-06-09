---
kind: handoff
session: 2026-06-09-S05
date: 2026-06-09
title: Polygon Worlds — trail/path demonstration is being reset (clean-slate next session)
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: completed
build: passed
followup: high
pr: null
app: PolygonWorlds
---

# Polygon Worlds — the path/direction-arrow demonstration is being reset

> [!IMPORTANT]
> **Do NOT extend the existing footprint/trail code.** The user reviewed it and judged
> the **path** and **the way it is demonstrated** to be *not correct*. The next session
> redesigns the on-ground direction-arrow / path **from first principles**. Everything
> else in Polygon Worlds — the Cayley–Klein kernel, the three presenters' camera/tiling,
> the decor/lighting/glass — is fine and stays as-is. Only the "path" layer is in scope.
>
> **Start by reading the questionnaire at the bottom and getting the user's answers
> before writing any code.** A ready-to-paste starting prompt is included.

## Summary

This session worked the footprint **trail / direction arrow** on the closed surfaces and,
in doing so, also added a player-confinement ("fold the player back into the fundamental
polygon") and a chirality test harness. The orientation-cue work is *internally* green (an
exact geometry test passes on all four worlds), but the **user's holistic verdict is that
the path demonstration is wrong** — so the whole footprint/trail approach is being scrapped
and rebuilt cleanly next session. This handoff captures what exists (so it can be removed or
replaced deliberately), *why* the current approach went sideways, and a first-principles
restart prompt + questionnaire.

## What we built this session (all on `claude/polygon-worlds-spherical-p2-qgExR`, pushed)

Newest first; SHAs pin the links.

| Commit | What | Verdict |
|---|---|---|
| `0fcef35` | Euclidean footprints **wrap within** the fundamental cell (removed the per-fold rigid trail shift that made them "live in infinite space"). | superseded by the reset |
| `0c0e416` | Orientation flip made **relative to the viewer's side** (`mirror = print.side XOR current side`) so a *fresh* print reads correct in the character's frame. | superseded by the reset |
| `4a98d8b` | **Chirality test** (`scripts/trail-chirality.mjs`) + `?polydebug` bridge + `debugProbe`/`lastChirality`. | keep (useful), but re-scope |
| `83a0cd6` | Progress-report doc of the trail design contract. | doc only |
| `79d60b1` | **Fold-back**: confine the player to the fundamental polygon; teleport on edge crossing (fixed a hyperbolic instability). | keep the *idea*; revisit |

## Why the current approach went sideways (read before redesigning)

The footprint tried to be **three different things at once**, and they have different natural
behaviours, which is the root of the mess:

1. **A breadcrumb path** — "where have I walked." Wants to be *fixed to the ground* and
   (now that the player is confined) *wrap within the fundamental polygon*.
2. **A travel-direction arrow** — "which way am I facing/going right now." Wants to be a
   *single, live* indicator at the player, not a history.
3. **A non-orientability cue** — "I came back mirror-reversed." Wants a *chirality* signal
   that is consistent between the avatar and the trail.

Forcing all three into one chiral footprint glyph produced contradictions:

- The **avatar is never mirrored** (it is placed by a proper rotation), but the trail was
  mirrored, so "the F reads backwards to the character itself" on the flip side. We fixed
  that by making the flip *relative*, but it is a band-aid over a representation that
  conflates the three jobs.
- The **confinement model changed mid-stream.** The fold-back confines the player to the
  fundamental polygon, but the trail was originally designed for a free-roaming player.
  Reconciling them (shift vs. wrap vs. periodic copies) is where the "infinite space" bug
  and the per-presenter divergence came from.
- The **three presenters solved it three different ways** and never unified:
  - **Spherical / ℝP²** — lays the trail *un-mirrored* once and shows the reversal via a
    real `det<0` **twin mesh**. This is the geometrically honest one and the user said the
    projective plane "looks right."
  - **Euclidean** — baked buffer + a per-print `mirror` flag + rebuild-on-side-change.
  - **Hyperbolic** — cover-coordinate trail re-projected every frame + per-print `mirror`.

**Takeaway for the redesign:** decide *separately* what the path is, what the direction
arrow is, and how non-orientability is shown — then pick **one** mechanism (the ℝP² "draw
the real thing, let a real orientation-reversing transform mirror it" philosophy is the
strongest candidate to generalise). Don't reuse `footprints.ts` as-is.

## Key files (current implementation — to be replaced/retired)

| File | Role |
|---|---|
| [`footprints.ts`](https://github.com/piyarsquare/animath/blob/0fcef35/src/animations/PolygonWorlds/footprints.ts) | The footprint **arrow geometry** + chiral F + cyan/magenta texture; `append(pos,fwd,up,mirror)`; `lastChirality()` test probe. This is the "direction arrow" today. |
| [`presenters/euclidean.ts`](https://github.com/piyarsquare/animath/blob/0fcef35/src/animations/PolygonWorlds/presenters/euclidean.ts) | `trail[]` list, fold-back block, `rebuildTrail()`, incremental `append`. |
| [`presenters/hyperbolic.ts`](https://github.com/piyarsquare/animath/blob/0fcef35/src/animations/PolygonWorlds/presenters/hyperbolic.ts) | `covTrail` (cover coords) + per-frame `rebuildTrail()` with relative mirror. |
| [`presenters/spherical.ts`](https://github.com/piyarsquare/animath/blob/0fcef35/src/animations/PolygonWorlds/presenters/spherical.ts) | The **twin-mesh** approach (`twinM4`, `det<0`) — the "looks right" reference. |
| [`PolygonWorlds.tsx`](https://github.com/piyarsquare/animath/blob/0fcef35/src/animations/PolygonWorlds/PolygonWorlds.tsx) | `?polydebug` test bridge (`window.__poly`: `map` / `probe` / `setYaw`). Debug-only, query-guarded. |
| [`scripts/trail-chirality.mjs`](https://github.com/piyarsquare/animath/blob/0fcef35/scripts/trail-chirality.mjs) | Headless chirality test (walks both faces, exact geometry probe). Keep, but re-target to whatever the new design needs to prove. |
| [`coverModel.ts`](https://github.com/piyarsquare/animath/blob/0fcef35/src/animations/PolygonWorlds/coverModel.ts) / [`engineTypes.ts`](https://github.com/piyarsquare/animath/blob/0fcef35/src/animations/PolygonWorlds/engineTypes.ts) | `debugProbe?()` plumbing for the test bridge. |

## Open / not done

- **Redesign the path / direction arrow from first principles** (the whole point of next
  session). Get questionnaire answers first.
- **Separate, pre-existing bug — not the path:** the third-person camera backs into decor
  and the camera-mounted **headlamp blows a tree cone to white** at point-blank range (a
  raycast confirmed a `ConeGeometry` ~0.65 u from the camera). Fix later by fading/culling
  decor near the camera or clamping the headlamp range.
- Decide whether to **delete** `footprints.ts` + the trail code or keep it parked behind the
  new design. Recommendation: build the new path layer alongside, then remove the old.

## Context

- Build is the only CI check (`npm run build`); it passes. `npm run verify` (kernel) was
  never touched this session.
- To see the current behaviour: `npm run preview`, open `#/polygon-worlds`, pick *flat Klein
  bottle*, third-person, and walk — note the trail behaviour and the chiral F.
- The chirality test is a good template for a headless "does it read right on both faces"
  check; it drives the app via the `?polydebug` bridge and reads geometry, not pixels.

---

## ▶ Starting text for the NEXT session (paste this to begin)

> **Polygon Worlds — redesign the path / direction-arrow from first principles.**
>
> Do **not** reuse or extend the existing footprint/trail implementation
> (`footprints.ts` and the `trail`/`covTrail` code in the three presenters). Read the
> handoff `docs/sessions/handoff/polygon-worlds-spherical-p2-qgExR/2026-06-09-S05-trail-and-path-reset.md`
> for context on *why* the previous approach was rejected — but treat the path layer as a
> blank slate.
>
> Before writing any code, **ask me the questionnaire at the bottom of that handoff** (one
> question at a time or as a short list) and wait for my answers. The previous attempt
> failed because it conflated three jobs — a breadcrumb path, a live direction arrow, and a
> non-orientability cue — into one chiral footprint. I want us to decide explicitly what
> we're demonstrating and how, *then* implement one coherent mechanism.
>
> Once I've answered, propose a short design (a paragraph + the mechanism per world type,
> noting where they can share code) and get my sign-off before coding. Keep the geometry
> kernel and the existing camera/tiling/decor untouched. The spherical/ℝP² "draw the real
> trail once and let a genuine orientation-reversing transform mirror it" approach is the
> one I felt looked right — use it as a reference point, not a constraint.

### Desired-outcomes questionnaire (answer these to set direction)

1. **Purpose** — what should the on-ground arrow/path primarily do? *(choose any)*
   a) show the path I've walked (history) · b) show my current heading (a single live
   pointer) · c) demonstrate orientation / non-orientability (return mirror-reversed) ·
   d) just a "you are here" marker.

2. **Confinement** — where does the path live?
   a) wraps **within** the fundamental polygon (I'm confined there) · b) tiles across the
   **visible neighbour cells** too (periodic copies, seamless) · c) a **short trail behind**
   me only · d) **no persistent path** — only a live direction arrow.

3. **Crossing an edge** — how should it look?
   a) seamless (periodic copies, no jump) · b) clean teleport, a small visual jump is fine ·
   c) N/A (no persistent path).

4. **Non-orientability cue** — how do you want "I came back mirror-reversed" shown? *(choose any)*
   a) via the **trail** (old prints read reversed once I'm on the other side) · b) via the
   **avatar** (the character itself looks mirror-reversed on the far side) · c) a **dedicated
   indicator** (HUD flag / a colour that flips) · d) don't put it on the path — the
   trees↔columns swap already signals the flip.

5. **Form of the "direction arrow"** —
   a) a trail of footprint arrows (old style) · b) a single arrow at/ahead of the character ·
   c) a screen-space compass/HUD (not on the ground) · d) a line/ribbon with an arrowhead at
   me.

6. **Consistency across worlds** —
   a) identical mechanism on flat / sphere / hyperbolic (even if harder) · b) per-world is
   fine as long as it *reads* the same to me.

7. **Camera modes** — must it work in a) both first- and third-person · b) third-person
   mainly · c) first-person mainly.

8. **Visual language** — the chiral **F** + cyan/magenta: a) keep it · b) open to a cleaner
   glyph · c) no opinion.

9. **Anything else** you picture when you imagine "the path is demonstrated correctly"
   (free text — a sketch, a game reference, "like a snake trail," etc.).

## Self-reflection

1. **What would you do with another session?** Get the questionnaire answered, then build
   the path layer once, cleanly, with a single mechanism (likely the ℝP² "real transform"
   approach generalised), and a headless test that proves the *agreed* behaviour — not the
   behaviour I assumed.
2. **What would you change about what you produced?** I optimised a local metric (the
   chirality probe went green) without confirming the *holistic* read with the user. The
   fresh-print-reads-correct fix was right in isolation but didn't make the whole
   demonstration feel correct.
3. **What were you not asked that's important?** What the path is *for*. I never pinned
   whether it's a breadcrumb, a heading arrow, or an orientation cue — it's all three in the
   code, which is the core problem.
4. **What did we both overlook?** That confining the player (fold-back) silently changed the
   requirements for the trail, and that the avatar/trail mirror consistency is a design
   decision, not a bug to patch.
5. **What did you find difficult?** Diagnosing transient visual artifacts headlessly (the
   "white triangle" turned out to be camera-into-tree headlamp blow-out, a red herring that
   cost time).
6. **What would have made this task easier?** Agreeing the desired outcome up front via a
   questionnaire — which is exactly what this handoff now sets up.
7. **Follow-up value: HIGH** — the path demonstration must be redesigned; the current
   implementation should not be trusted to be "correct" in the user's sense.
