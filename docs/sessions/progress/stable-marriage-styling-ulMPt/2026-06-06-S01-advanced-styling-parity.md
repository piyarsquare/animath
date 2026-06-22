---
kind: progress
session: 2026-06-06-S01
date: 2026-06-06
title: Stable Marriage advanced styling parity
branch: claude/stable-marriage-styling-ulMPt
slug: stable-marriage-styling-ulMPt
status: completed
build: passed
followup: medium
pr: https://github.com/piyarsquare/animath/pull/189
---

# Stable Marriage advanced styling parity

## Session purpose

The Stable Marriage application lacks many of the more advanced styling effects that exist in the other labs. Review the current status and plan how to bring its visual styling closer to the polish of the other applications.

## Previous session

This is the first tracked session on the `stable-marriage-styling-ulMPt` branch. No prior handoff exists for this topic. The most recent handoffs across other branches are unrelated (all completed, build passed): *rich HTML reports* (better-reports), *session skills setup* (menu-bar), and *particle viewer ideas triage* (particle-viewer-ideas-priority). Nothing pending carries over.

## Working notes

### 🟢 code · (06-08) — Synchronous round engine, Lego heatmaps, instability Lab, blackout fix
**Why:** Iterated the Stable Matching app heavily with the user toward "what we can learn
about the solution space."

- **Cells → Lego heatmaps on one BuRd scale**: square = A's rank of B, circle = B's rank of A;
  numbers drop out when many; **fit-to-screen** sizing; population cap raised 16→60.
- **Orderings**: by average attractiveness (default), settle round, and **match-diagonal**
  (partners on the diagonal); **live re-sort** (both axes migrate as pairs settle); a
  **parameter-driven story line** + per-round narration; **tight grid** toggle.
- **Cell views**: Both (Lego) / A→B / B→A / **Difference** (single-valued).
- **Engine rebuilt to synchronous rounds** (`runRounds`): a whole side proposes at once;
  Schedule = A / B / **Alternate** / **Random**. Finding (3000-sim sweep): synchronous
  two-sided (alt/random) is **unstable 70–92%** of the time with 2–3.5 blocking pairs —
  NOT a last-round fluke; one-sided is always stable. Glassy/assignment-problem kinship.
- **Lab surfaces**: **Unstable %** and **Avg blocking pairs** by schedule (purple), and
  **Ranks (A·B)** as **Lego** cells (square=A avg, circle=B avg) on RdBu.
- **Markers** recolored off red → purple (invisible on RdBu); realtime reject + "stole away"
  flashes; short-lived fading **failure trail**; market RNG decorrelated from generation.
- **Bug fixed**: blackout when changing the run while stepped to the end — clamp every read
  to `safeStep = min(step, total)` (the reset effect runs after render).

### 🟢 code · 21:10 — Redesign: matrix-centered, total-rank welfare, foreground the algorithm
**Why:** First build was "too obscure" — algorithm/preferences hidden, proposer-advantage
the wrong headline. User chose a **preference-matrix** center, **total rank** as the
metric, A/B labels for now, one-to-one (engine stays capacity-extensible).

Rebuilt the visualizer around an A×B matrix: each cell shows both ranks; matches/holds
light green, proposals ring gold, rejections flash, blocking pairs flag red. Headline is
total rank (welfare, lower=happier) + distribution. Ordering by global preference is the
default, so at high consensus the matches snap to the diagonal (best-with-best) and at low
consensus they scatter (better welfare). Lab reframed to welfare surfaces. Build passes;
screenshot-verified low- and full-consensus.

### 🟣 decision · 19:50 — Rebuild as a new app (`Stable Matching`, `#/stable-matching`)
**Why:** User chose to write a clean new version alongside the old app and switch on
completion, rather than repair in place. Locked: framework-native controls
(ShellSettings/ShellActions + ControlPanel), first pass = Engine + Visualizer + Lab.

Starting from the pure engine (`model.ts` common-preference generator +
`galeShapley.ts` one-sided/market + `extremalMatchings` for the right metric), per
the roadmap's P0.1 keystone.

### 🟡 milestone · 20:35 — Final status & roadmap report delivered
**Why:** User requested a final report on app status + prioritized next steps + forward proposals, after the last reviewer landed. Wrote [status-and-roadmap](2026-06-06-S01-status-and-roadmap.html), folding the three-hats findings together with the in-session design discussion.

Key outcomes captured: the app's real subject is a hidden *common preference* (consensus = its weight); the "right metric" is the extremal-stable-matching gap (collapses to zero at full consensus, tying metric + consensus + proposer-advantage into one story); decision **D1 resolved — "both, as a mode"** (one-sided GS default, market as advanced variant); salient reusable components identified (pure engine first). D2 (ShellActions vs DOM autonomy), D3 (scope), D4 (proposals) left open. No code changed.

### 🔵 finding · 20:20 — Three-hats review complete — correctness, not styling, is the headline
**Why:** User asked for an "ultracode" /three-hats code review. Dispatched three parallel reviewers (Maintainer, Architecture Consultant, Math-Viz & Pedagogy); each wrote a full HTML report and I synthesized a [Convergence Analysis](2026-06-06-S01-expert-synthesis.html).

All three converged: the CSS is actually the strongest part of the file; the real issues are (1) the Gale–Shapley engine implemented twice and already diverged, (2) a mixed-proposer model that contradicts the one-sided theorem the explainer teaches, and (3) statistically dishonest Lab heatmap (single-run cells). Recommended a correctness-first sequence with styling sequenced on top. Two scope decisions kicked to the user (one-sided vs market model; adopt ShellActions vs keep DOM autonomy).

### 🟡 milestone · 20:08 — Session initialized
**Why:** Established branch slug, confirmed a fresh branch with no prior handoff, and oriented on the StableMarriage app (752-line CSS, DOM/CSS lab) before any implementation.

Awaiting user direction on scope of styling work.
