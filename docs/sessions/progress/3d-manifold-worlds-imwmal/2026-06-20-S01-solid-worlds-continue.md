---
kind: progress
session: 2026-06-20-S01
date: 2026-06-20
title: Solid Worlds — resume (graduate screw worlds / confirm −a2 naming)
branch: claude/3d-manifold-worlds-imwmal
slug: 3d-manifold-worlds-imwmal
status: in-progress
build: unknown
followup: null
pr: null
app: solid-worlds
signals: needs-dan
next: Pick the target — fix the cell-engine screw bug (lib/homology.ts) to dual-verify the didicosm + second amphidicosm, or confirm −a2 = ℤ⊕ℤ/4 against Conway–Rossetti Table 6.
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
