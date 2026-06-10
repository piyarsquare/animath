---
kind: progress
session: 2026-06-10-S01
date: 2026-06-10
title: Future-app scoping — emergence, CA, ports
branch: claude/future-apps-scoping
slug: future-apps-scoping
status: in-progress
build: not-run
followup: null
pr: null
app: general
---

# Future-app scoping — emergence, CA, ports

## Session purpose

Capture the next wave of candidate animath apps and the **baseline reference
material** to draw on later when fleshing each into a real app. Areas named by
the user:

- **Cellular automata** (new area).
- **Emergent / collective agent behavior** — firefly flash synchronization,
  starling murmurations (flocking/boids); ant colonies as "a different order"
  (stigmergy).
- **Quantum tree project** — *port* from a separate GitHub repo (location TBD).
- **GAS — "gene advocate system"** (exact term/source to confirm) — port/build.
- **Glassy networks** — spin-glass / disordered-network flavored (scope TBD).

## Previous session

Continues directly from the merged skills work
([agent-invokable-skills S01](../../handoff/agent-invokable-skills-mr5k24/),
PR #206, merged at `8badeda`) — that made the session skills agent-invokable.
This is a **new topic** (forward-looking scoping), not a continuation of that
fix; new branch `claude/future-apps-scoping` forked from `main`.

## Working notes

<!-- Newest entry first. -->

### 🟢 code · 22:40 — Filled the Quantum Tree baseline from the uploaded source
**Why:** User couldn't grant repo access (private; `*.github.io` not on the
network allowlist; no `add_repo` tool this session) but uploaded a **zip** of
the source — enough to write a real baseline instead of a stub.

Inspected `quantum-tree-main/`: a **dependency-free vanilla-JS** browser app
(SVG views + a little canvas 2D, no framework/build/CDN) for **phylogenetic
tree-building from distance data via quartet evidence**, with a deferred
**quantum reinterpretation** (one-hot registers, Gibbs/thermal states, later
cost-phase/mixer QAOA layer). Three pages (`index`/`map`, `four`, `five`) + a
LaTeX working paper (BHV tree space, associahedra/Devadoss, NeighborNet).
Rewrote `FUTURE_APPS.md` §6 with concept, math (four-point, evidence plane,
assembly operators, the two tree-score routes, quantum layer), animath mapping
(CSS/DOM+SVG like StableMatching; each SVG → its own `ViewDef`; Analyze-tier
readouts), and a **port strategy** (recommend porting math to TS modules +
rebuilding views in React/SVG over wrapping the ~216 KB ID-coupled `map.js`).

> [!NOTE]
> The uploaded source lives at `/tmp/qt-unzip/quantum-tree-main/` (this session
> only — not committed into animath). The repo is private; relicensing/attribution
> is an open question before any code is ported in.

### 🟢 code · 22:20 — Wrote `docs/FUTURE_APPS.md` + IDEAS.md pointer
**Why:** Capture the baseline reference for all five researchable areas now;
stub the two ports so the structure is ready when their repos arrive.

`docs/FUTURE_APPS.md`: a section per app (concept → model/math → key phenomena →
prior art → animath framework mapping → open questions), an at-a-glance table, a
shared-engine note (stateful GPU grid; agent + order-parameter readout), and a
non-binding sequencing suggestion. Filled CA, firefly sync (Kuramoto +
pulse-coupled), murmurations (boids + Vicsek), ant colonies (stigmergy/ACO),
glassy networks (spin glass / Ising / annealing). Stubbed Quantum Tree and GAS
with "what I need to write the baseline." Appended a pointer section to the
append-only `IDEAS.md`. Docs only — no `src/`, build surface untouched.

### 🟣 decision · 22:15 — Consolidated baseline doc as the deliverable
**Why:** User delegated the depth call ("discuss / suggest / recommend"). A
single `docs/FUTURE_APPS.md` with a modular section per topic reads as one
navigable reference, is substantial enough to draw on later, and each section
splits cleanly into its own design doc when we commit to building it.

Chose: one `docs/FUTURE_APPS.md` (concept → canonical model/math → key
phenomena → prior art → animath framework mapping → open questions, per topic).
Draft the five researchable areas (CA, firefly sync, murmurations, ant colonies,
glassy networks) from knowledge now; stub the two port projects (quantum tree,
GAS) pending their repos. `IDEAS.md`/`docs/` are the established homes for this
kind of design/idea capture (e.g. Stable Marriage extensions doc, PR #201).

### 🟢 code · 22:14 — New branch for the scoping work
**Why:** The skills branch is merged; user chose a new branch. Keeps this its
own PR and keeps the merged branch clean.

`git checkout -b claude/future-apps-scoping origin/main`.

### 🟣 decision · 22:13 — Pivot to future-app scoping
**Why:** PR #206 merged; user redirected to the next order of business.

Recorded the captured brief (above). Open clarifications carried forward: exact
meaning/source of **GAS**, the **quantum-tree repo URL + access**, the intended
**glassy-networks scope** (spin glass vs other), and how deep "baseline" should
go (resolved → consolidated doc).

## Open / not done

- **Two port projects need their sources** — quantum tree (separate repo) and
  GAS. I can't scope a port without the repo; stubbed in the doc, asked the user.
- **GAS term unconfirmed** — "gene advocate system" may be a transcription of a
  named project; placeholder until confirmed.
- **Glassy networks scope** — baseline written around spin glasses / disordered
  networks; confirm that's the intended sense.
- **Not a commitment** — this is a backlog/reference, not a build plan. Build
  order and which app is first are still open.
