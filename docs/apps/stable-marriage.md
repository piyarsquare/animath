---
kind: app-guide
app: stable-marriage
route: "#/stable-marriage"
name: Stable Marriage
title: Stable Marriage — developer guide
status: stable
build: passed
entry: src/animations/StableMarriage/StableMarriage.tsx
updated: 2026-06-22
signals: null
next: Decide its final fate — keep as an unlisted route or fully delete (its gallery card was retired in favor of Stable Matching).
---

# Stable Marriage — developer guide

> Step through the Gale–Shapley algorithm and probe the stability of its matchings.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
Teaching/math lives in
[`EXPLAINER.md`](../../src/animations/StableMarriage/EXPLAINER.md), not here.

## Status

- **Route:** `#/stable-marriage` → `StableMarriage` ([`src/index.tsx`](../../src/index.tsx) route map).
- **Stability:** 🟢 **stable**, low churn. Its **gallery card was retired** in
  favor of the rebuilt [Stable Matching](stable-matching.md) (PR #220): the `META`
  entry was dropped from [`src/chrome/catalog.ts`](../../src/chrome/catalog.ts), but
  the route, the `apps.ts` entry, and this folder all still exist (reversible, like
  `#/fractals-cpu`). Effectively the **predecessor** of Stable Matching.
- **Entry:** `StableMarriage.tsx` · 1 tsx + 1 css, ~1.2k LOC of TSX (everything —
  engine, components, panels — is in the one file). A long design backlog lives in
  [`EXTENSIONS.md`](../../src/animations/StableMarriage/EXTENSIONS.md).
- **Build/tests:** covered by `npm run build`; **no app-specific unit tests**.

## Active / Resolved

The per-app control center — hand-maintained ([`GUIDE_STYLE.md`](GUIDE_STYLE.md) §3c).

### Active

- [ ] **!low** Decide its final fate — keep as an unlisted route or fully delete.
  From [`docs/sessions/TODO.md`](../sessions/TODO.md). If it's truly dead, follow up
  by deleting the folder, the route in [`index.tsx`](../../src/index.tsx), the
  `apps.ts` entry, and the now-unused `marriage` `PreviewKind`.
- [ ] **!low (product)** Build any of the eight ideas in
  [`EXTENSIONS.md`](../../src/animations/StableMarriage/EXTENSIONS.md) (strategic
  manipulation, truncated preference lists, price of stability, entrants). Most want
  a *pure one-sided* mode (lock Proposer bias to 0/100%) the current mixed-proposer
  engine lacks. Largely superseded by the Stable Matching rebuild.

### Resolved

<!-- newest first -->
- [x] **2026-06-10** (`gale-shapley-strategy`) — Wrote the extensions backlog
  ([`EXTENSIONS.md`](../../src/animations/StableMarriage/EXTENSIONS.md)) — eight
  explorable incentive/welfare features; design only, no code.
  [Handoff.](../sessions/handoff/gale-shapley-strategy/2026-06-10-S01-manipulation-and-extensions.md)
- [x] **2026-06-08** (`stable-marriage-styling-ulMPt`) — The solution-space build
  graduated into the **separate** [Stable Matching](stable-matching.md) app rather
  than this one; this app was left untouched.
  [Handoff.](../sessions/handoff/stable-marriage-styling-ulMPt/2026-06-08-S01-solution-space-tiers.md)
- [x] **earlier** — Migrated onto the workspace chrome: the old Visualizer | Lab
  toggle became the **Setup** / **Analysis** layouts (`views[id].open`).

## What it does

A two-view Gale–Shapley sandbox with a mixed-proposer model and a headless welfare
lab. Two built-in **layouts** swap the views: **Setup** (the Matching view) and
**Analysis** (the Welfare surface).

- **Preferences panel** (`subject`) — Population (4–100), **Men/Women Consensus**
  sliders (0% = random taste, 100% = everyone shares one ranking).
- **Proposing panel** (`domain`) — **Proposer Bias** (the share of proposals coming
  from the men's side).
- **Display panel** (`marks`) — Sort by popularity (order each column by latent
  quality).
- **Playback panel** (`playback`) — Play/Pause, Step, Finish (run to completion),
  Reset, a Speed slider, and a proposals/status readout. Projected onto the
  always-on action strip.
- **Results panel** (`readout`) — an in-panel tab strip: **Summary** (per-side and
  asker/asked average ranks), **Distribution** (a stacked rank histogram for men vs
  women), and **Stability** (blocking-pair count after a completed run).
- **Welfare lab panel** (`lab`) — Population, Proposer Bias, Resolution; **Run Lab**
  sweeps the consensus plane headlessly.
- **Matching view** — two columns (Men / Women) of `PersonRow`s; active proposals
  highlight gold, receivers purple, with rank badges and asker/asked role badges.
- **Welfare surface view** — four heatmaps over the men × women consensus plane:
  Men avg rank, Women avg rank, and two diverging surfaces (Men − Women, Asker −
  Asked). Cells hover/pin to read their four averages.

## How the code works

Everything lives in `StableMarriage.tsx` — the engine is **not** factored into
helper modules (the newer Stable Matching app is the refactored successor).

- **Preferences** (`generatePreferences`) — each person's latent `quality` is drawn
  uniformly; a list blends `consensus · quality + (1 − consensus) · noise`, then
  sorts. So Consensus is literally the weight on the shared desirability order.
- **Live stepping** — `stepSimulation` does one proposal per call. The proposing
  side is chosen by the Proposer-Bias coin (forced when only one side has eligible
  proposers). State lives in `useState` **mirrored to refs** (`matchesRef`,
  `nextProposalRef`, `statusRef`, `dataRef`) so the `setInterval` auto-run loop and
  `runToCompletion` read fresh values without re-subscribing. Speed maps to the
  interval (`Math.max(20, 400 − speed·3.5)`).
- **Completion + stability** — when no proposer can advance, `completeSimulation`
  runs `verifyStability` (an O(n²) blocking-pair count) and sets the banner.
- **Welfare lab** — `runHeadlessSimulation` is a self-contained, **non-animated**
  copy of the same algorithm that returns per-side and asker/asked averages.
  `runLabSimulation` sweeps a `resolution × resolution` consensus grid in batches of
  25 via `setTimeout(…, 0)` so the progress bar paints; results feed the `Heatmap`
  components.
- **Workspace assembly** — `sections` (the panels), `views` (Matching / Welfare
  surface), `layouts` (Setup / Analysis toggle which view is `open`), and `actions`
  (the play/step/finish/reset strip) are passed to one `<Workspace>`.

## Key files

| File | Role |
|---|---|
| [`StableMarriage.tsx`](../../src/animations/StableMarriage/StableMarriage.tsx) | Everything: engine (`generatePreferences`, `stepSimulation`, `runHeadlessSimulation`, `verifyStability`, `rankStats`), the `PersonRow` / `Heatmap` / `DistributionChart` components, panels, views, layouts |
| [`stableMarriage.css`](../../src/animations/StableMarriage/stableMarriage.css) | All `sm-*` styling (rows, badges, heatmap grid, distribution bars) |
| [`EXPLAINER.md`](../../src/animations/StableMarriage/EXPLAINER.md) · [`README.md`](../../src/animations/StableMarriage/README.md) | The **?** modal text (explainer + README joined) |
| [`EXTENSIONS.md`](../../src/animations/StableMarriage/EXTENSIONS.md) | Design backlog of eight unbuilt incentive/welfare features |

## Invariants & gotchas

> [!CAUTION]
> **Gotcha** — the live `stepSimulation` and the headless `runHeadlessSimulation`
> are **two separate copies** of the same algorithm (the live one drives React
> state; the headless one is a tight loop for the lab). A change to the proposal /
> acceptance rule must be made in **both** or the lab will disagree with the
> visualizer.

- **State is mirrored to refs.** The interval loop and `runToCompletion` read
  `matchesRef` / `nextProposalRef` / `statusRef` / `dataRef`, not the React state
  directly. Update both sides or the auto-run goes stale.
- **Person keys are stringly typed** (`m${id}` / `w${id}`); IDs are recovered with
  `parseInt(key.substring(1), 10)`. Don't change the prefix scheme casually.
- **Rank badges are hidden for n > 30** (`PersonRow`) so large populations stay
  legible; the matching still runs at any size up to 100.
- The mixed-proposer model means the result is **a** stable matching but not the
  canonical proposer-optimal one of the textbook theorem — see the note at the top
  of [`EXTENSIONS.md`](../../src/animations/StableMarriage/EXTENSIONS.md).
- Card-level chrome is gone, but the **route persists**; deleting this app means
  cleaning up the route, the `apps.ts` entry, and the unused `marriage` preview kind
  together (see the Active item).

## Testing & verification

- `npm run build` — the only CI gate; must pass.
- No unit tests exist for this app (`npm test` covers the chrome, not this engine).
- Headless screenshot: `node scripts/shoot.mjs '#/stable-marriage' shot.png`.
- By eye: Step/Play fill the columns with paired (gold→matched) rows; **Finish**
  then the **Stability** tab reports "No blocking pairs detected" for a completed
  run; switching to the **Analysis** layout and **Run Lab** fills the four heatmaps,
  with the diverging surfaces showing the proposer advantage shift as Bias changes.

## History & sources

- **Built/iterated by:** `stable-marriage-styling-ulMPt` (whose solution-space work
  became the separate Stable Matching app) and `gale-shapley-strategy` (the
  extensions backlog) — under [`docs/sessions/`](../sessions/).
- **Possible sources:** see the EXPLAINER's account (Gale & Shapley, 1962;
  proposer-optimality / blocking pairs).
</content>
</invoke>
