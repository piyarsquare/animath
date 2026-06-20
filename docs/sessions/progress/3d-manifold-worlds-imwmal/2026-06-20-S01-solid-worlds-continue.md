---
kind: progress
session: 2026-06-20-S01
date: 2026-06-20
title: Solid Worlds — resume (graduate screw worlds / confirm −a2 naming)
branch: claude/3d-manifold-worlds-imwmal
slug: 3d-manifold-worlds-imwmal
status: in-progress
build: passing
followup: null
pr: null
app: solid-worlds
signals: needs-dan
next: Both Solid Worlds backlog items are done (screw fix + −a2 confirmed). Open product call for Dan: rename the app ("Solid Worlds" vs "Manifold Walk")?
---

# Solid Worlds — resume (graduate screw worlds / confirm −a2 naming)

## Session purpose

Resume work on the 3D manifold worlds (Solid Worlds). Review the last handoff
and orient on where things stand.

## Previous session

[`solid-worlds-review-bju3pc/2026-06-19-S01`](../solid-worlds-review-bju3pc/2026-06-19-S01-solid-worlds-continue.md)
— **completed**. Grew the catalog from 4→8 platycosms (incl. Hantzsche–Wendt)
via an independent, screw-safe Γᵃᵇ homology + free-action manifold test
(`lib/freeness.ts`); H₁ in the app now comes from Γᵃᵇ, the cube cell complex
(`lib/homology.ts`) is kept only as a cross-check. Added a solid FRONT/BACK
sign and fixed a verified-gate bug (didicosm was mislabeled dual-verified).
Build/lint/test green. That work is already on this branch (8-world catalog
present in `worlds.ts`).

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 18:35 — Confirmed −a2 (second amphidicosm) = ℤ⊕ℤ/4 against the literature
**Why:** Close the remaining backlog item; the value was previously only "by elimination."

Cross-checked the name↔invariant pairing. The four non-orientable platycosms
split by first Betti number: the **amphicosms** (β₁=2, holonomy ℤ/2) and the
**amphidicosms** (β₁=1, holonomy ℤ₂², = Bieberbach B₃/B₄). The literature pins
the two amphidicosms *uniquely* by homology — **H₁(B₃)=ℤ⊕(ℤ/2)²** and
**H₁(B₄)=ℤ⊕ℤ/4** — so −a2 (second amphidicosm = B₄) = **ℤ⊕ℤ/4** is the genuine
pairing, not just elimination. Our app computes exactly these two values via
*both* Γᵃᵇ and the now-dual-verified cell complex.

> [!NOTE]
> **Honesty caveat (per ATTRIBUTION):** the primary PDFs were unreachable this
> session — arXiv (math/0311476 Table 6), nLab, Wikipedia, ResearchGate all
> returned HTTP 403 to the fetch tool (network policy). The confirmation rests on
> WebSearch summaries quoting the literature's homology values plus the two
> independent in-app computations agreeing with them. Strong, but not a direct
> read of Conway–Rossetti's Table 6. Recorded the value, the source, and this
> limitation in `TODO.md` and the worlds.ts comment.

Updated `TODO.md` (both Solid Worlds items checked off; app-rename question left
open as a product call) and the `worlds.ts` screw-worlds comment. The
**"Solid Worlds" vs *Manifold Walk*** naming remains open for Dan.

### 🟡 milestone · 18:12 — All 8 worlds dual-verified; screw bug fixed + documented
**Why:** Both defects fixed, the two experimental worlds graduate, gates green.

Implemented both fixes in `lib/homology.ts` and confirmed every catalog world is
now dual-verified (cell engine agrees with Γᵃᵇ on H₁, χ=0, and the vertex-link
S² cert passes — including the second amphidicosm and the Hantzsche–Wendt
didicosm).

- **Fix A — glue by the whole in-cube orbit.** Replaced the "apply pairing →
  reduce to first in-cube cell → union" pass with `orbitInCube(cell)`, which
  collects *all* in-cube orbit members (signs carried) so the bounce-to-source
  can't hide the true partner. χ on the second amphidicosm → 0.
- **Fix B — finer subdivision for screw worlds.** `chooseN` now returns 2×N₀ for
  screw worlds (N=4 for the half-cube screws), separating the folded vertex link
  into a clean sphere. H₁/χ are subdivision-invariant, so values are untouched.
- **Bonus guard.** A stress input (`hw-pseudo`) turned out to use *axial*
  offsets, making the cube a non-fundamental-domain (χ came out −48). The engine
  now **throws** on a fractional axial offset rather than returning a wrong χ; the
  old test's premise (it claimed that spec was non-free) was also wrong per the
  freeness oracle, so I replaced it.

Docs/tests updated: new **`SolidWorlds/SCREW_BUG.md`** (the requested deep +
accessible write-up), homology.ts header, `solidSchema.ts` comments, CLAUDE.md.
`gab.test.ts` + `solidSchema.test.ts` rewritten (screw worlds now dual-verified;
cell-engine tests broadened to all 8; added the second-amphidicosm "no leftover
boundary" regression and the axial-offset rejection). **Gates:** `npm run build`
passing · full vitest **53/53** · lint **0 errors** (60-warning baseline). App
renders headless without crashing.

### 🔵 finding · 18:05 — Root-caused the screw bug: two independent defects, not one
**Why:** The handoff called it "an orientation-sign / vertex-link error"; instrumenting the engine shows it is actually *two* separate bugs with different fixes.

Instrumented `computeHomology` (cell counts, per-vertex link χ, face-class
sizes) and ran all 8 worlds plus N-sweeps. Findings:

- **Bug A — the gluing bounce (the χ error).** `second-amphidicosm` reports
  **χ=1** (should be 0): 4 boundary faces in the screw region are left
  **unglued** (face-class size 1 on the boundary). Cause: `reduceToCube` does a
  BFS over the deck generators and returns the *first* in-cube cell it finds.
  For a screwed face whose image lands outside the cube, the BFS tries the
  *inverse of the gluing generator* (`inv_y`, which simply undoes the step we
  just took) **before** the generator that would wrap it correctly (`inv_z`), so
  it "reduces" the image back to its own **source** face → `union(c, c)` is a
  no-op → the face never glues to its true partner. This is an **algorithmic bug,
  present at every N** (confirmed: χ=1 at both N=2 and N=4).
- **Bug B — the vertex-link is too coarse at N=2 (the manifold-cert error).**
  Both screw worlds fail the vertex-link S² certificate at N=2 (link χ=5, not 2;
  the link collapses to 5 vertices / 8 edges with incidence-4 edges — a pinched,
  non-simplicial link). But at **N=4 the link is a clean sphere and the cert
  passes** for both. So this half is pure **subdivision coarseness**, not a real
  defect: the screw offset is exactly half the N=2 grid, folding the link onto
  itself; doubling the subdivision separates it.

**The fix is therefore two-part:** (1) correct the gluing so the screwed faces
reach their true partners (fixes χ); (2) choose a finer subdivision for screw
worlds so the link certificate is non-degenerate. H₁ is subdivision-invariant,
so neither touches the (already-correct) homology values.

### 🔵 finding · 17:42 — Branch is fresh off main and already carries the 8-world catalog
**Why:** Confirm the starting point so this session builds on the right base.

New branch `claude/3d-manifold-worlds-imwmal` (no prior reports here; first
tracked session). Forked from main; `worlds.ts` already lists all 8 worlds
(3-torus, half/quarter-turn, both amphicosms, both amphidicosms, didicosm), so
the prior Solid Worlds session's work has landed. The two open items from that
handoff and the backlog are the live targets:

1. **[engine !high]** Fix the cell-engine screw bug in `lib/homology.ts`
   (orientation-sign / vertex-link error on rotated/reflected staggered
   gluings) so the **didicosm** and **second amphidicosm** graduate from
   *experimental (Γᵃᵇ-only)* to **dual-verified** and drop the HUD badge.
2. **[engine !med]** Confirm **second amphidicosm (−a2) = ℤ⊕ℤ/4** against
   Conway–Rossetti, *Describing the Platycosms* (arXiv:math/0311476), Table 6
   (currently derived by elimination). Also the open app-naming question
   ("Solid Worlds" vs *Manifold Walk*).

Awaiting Dan's direction on which to take.
