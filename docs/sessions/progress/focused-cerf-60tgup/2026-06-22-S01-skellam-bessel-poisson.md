---
kind: progress
session: 2026-06-22-S01
date: 2026-06-22
title: New app — why a Bessel function gives the Skellam (Poisson-difference) conditionals
branch: claude/focused-cerf-60tgup
slug: focused-cerf-60tgup
status: in-progress
build: passed
followup: null
pr: null
app: general
signals: not-live
next: Dan testing the reworked app; optional polish (bespoke gallery preview, persist the Lab catalog); then /handoff.
---

# New app — why a Bessel function gives the Skellam (Poisson-difference) conditionals

## Session purpose

Build a new animath app that **explains why a (modified) Bessel function gives
the conditional probabilities of the underlying Poisson distributions in a
Skellam difference** — i.e. why `I_{|k|}` shows up when you take the difference
of two independent Poisson counts, told as geometry rather than as a formula.

## Previous session

First tracked session on this branch. The most recent handoff repo-wide is
[`solid-worlds-decor-refactor/2026-06-21-S01`](../../handoff/solid-worlds-decor-refactor/2026-06-21-S01-rooms-decor-refactor.md)
(per-app developer guides shipped, PR #229 awaiting merge) — **unrelated** to
this topic; noted only so nothing is lost.

## The idea (math sketch — to be confirmed with Dan)

If `X ~ Poisson(μ₁)` and `Y ~ Poisson(μ₂)` are independent, then `K = X − Y`
is **Skellam**:

```
P(K = k) = e^{−(μ₁+μ₂)} · (μ₁/μ₂)^{k/2} · I_{|k|}( 2√(μ₁μ₂) )
```

The Bessel function is not bolted on — it *is* the sum down a diagonal of the
joint lattice. On the `(X, Y)` grid of `Poisson(μ₁) × Poisson(μ₂)` joint
probabilities, fixing the difference `X − Y = k` picks out one diagonal "ladder"
of cells `(n+k, n)`. Summing those cells gives `P(K = k)`, and term-by-term the
ladder matches the modified-Bessel series

```
I_k(z) = Σ_{n≥0} (z/2)^{2n+k} / ( n! (n+k)! ),   z = 2√(μ₁μ₂)
```

So **each rung of the diagonal is one term of the Bessel series**, and the
*conditional* distribution of the underlying counts given `K = k` is that series
normalized by `I_{|k|}` (a "Bessel distribution" over the rung index `n`). That
diagonal-sum picture is the candidate central visual.

> [!NOTE]
> This is the session's working understanding of the connection, written to frame
> the build — **not yet confirmed as the angle Dan wants**. The exact "conditional
> probabilities of the Poisson distributions" framing is the first thing to pin
> down (see Open questions).

## Orientation notes

- **No existing app to extend.** A repo grep for `skellam` / `bessel` finds
  nothing in `src/` or `docs/`; `docs/FUTURE_APPS.md` scoped CA, firefly sync,
  murmurations, ant colonies, glassy networks, Trees and Nets, GAS — no
  probability/statistics app. This would be the collection's **first** stats app
  and a new category.
- **Likely a 2D canvas/SVG + DOM app** (the `(X,Y)` lattice heatmap + a couple of
  distribution strips), closer to StableMatching / AgenticSorting than to the
  WebGL particle viewers. Build path: `docs/BUILDING_AN_APP.md`.
- **Shared files are append-only** (`src/index.tsx`, `src/apps.ts`, `CLAUDE.md`,
  `README.md`, `src/chrome/catalog.ts`) — add entries at the end, never reorder.
- Did **not** pull/merge `main` (fresh clone is current; per CLAUDE.md branch-sync
  rule). No code written this session yet.

## Open questions (for Dan)

1. **Framing of "conditional probabilities."** Is the payload the conditional law
   of the *rung* `n` (equivalently of `(X, Y)` given `K = k`) — the Bessel
   distribution — or something else (e.g. `P(X = x | K = k)`)? They're the same
   object indexed differently; which story leads?
2. **Central visual.** Is the `(X, Y)` joint lattice with a sweepable diagonal the
   right hero picture, or do you picture it differently (two random-walk-like
   Poisson streams racing, a difference meter, …)?
3. **Scope/feel.** A focused single-view explainer (lattice + diagonal + Bessel
   readout), or a fuller lab with `μ₁, μ₂, k` sliders, a sampler, and a
   convergence readout?

## Working notes

<!-- Newest entry first. One ### per state transition. -->

### 🟢 code · 22:20 — P2 fix: sum the whole diagonal; synced main (Stable Marriage retired upstream)
**Why:** A review flagged that the walk clamps to the visible grid, so high rates /
large |k| stopped the sum early while the formula showed the full pmf. Dan also
flagged merge conflicts with main.

- **Diagonal-sum fix:** dropped the `N − |k| + 1` (grid-fit) clamp in `rungCount`
  and `rungCountOf` — the sum now runs over all significant rungs (the real,
  possibly-infinite tail). Verified the worst case (μ₁=μ₂=14, k=10): the running
  total now lands on `P(K=10)=0.0125` instead of ~34% of it. Added a small
  "diagonal runs past the grid edge →" arrow + caption when mass extends beyond the
  visible window, so off-grid accumulation reads honestly.
- **Merged `origin/main` (#231):** conflicts in `README.md` (app list) and
  `previews.tsx` (the `PreviewKind` union). Main fully **retired Stable Marriage**
  (route, lazy import, `apps.ts` descriptor, the `'marriage'` preview + component,
  README line); resolved by honoring that retirement and keeping our additions
  (Counting the Ways → list item 13; `'skellam'` preview kind). Build green · lint
  0/60 · 7/7 tests after the merge; PR #233 now conflict-free with main.

### 🟢 code · 21:45 — Phone-friendly distributions; Skellam (marginal) vs Bessel (conditional) to the fore
**Why:** Dan's phone screenshot — the lattice ate the screen, you couldn't see both
distributions at once, and the bar x-labels staggered across multiple rows. He also
wanted the marginal/conditional distinction we'd worked out brought forward.

- Replaced the two stacked DOM bar strips with one `MiniDist` SVG chart used twice,
  shown **side by side** (auto-fit grid, so they sit together on phone and desktop):
  **Skellam — the difference K** (marginal · sum a diagonal) and
  **Bessel — given K=k** (conditional · rung n). A caption states plainly they're two
  distributions sharing the same diagonal sum (`Iₖ`).
- **Single clean baseline** for x-labels (sparse: every 5 on the Skellam axis, each n
  on the Bessel) — no more multi-level staggering.
- Capped the lattice at `min(420px, 42vh)` so it shares the screen with the formula
  and the distributions instead of dominating on phone.
- Dropped the now-redundant "show conditional" toggle (both always shown).

Verified on a 390px phone viewport and desktop: both distributions visible together,
labels on one line, lattice compact. Build green · lint 0/60.

### 🟢 code · 21:10 — Tutorial polish: caption stays in its box; Play builds the whole distribution
**Why:** Dan: the tutorial text sometimes escaped its box, and Play should fill the
*whole* Skellam distribution, not just one difference value.

- **Caption fix.** The narration is now its own flex child (`.ctw-tut-text`,
  `flex:1; min-width:0`) inside `.ctw-tutorial` (no more `flex-wrap`/`baseline`),
  so long text wraps inside the bordered box instead of spilling out.
- **Sweep the whole distribution.** The Explain tutorial's final stage changed from
  summing the one selected diagonal to **sweeping every diagonal, k = −span → +span**
  (bottom to top). The highlighted lattice diagonal, the factored formula, and the
  conditional readout all track the swept `k` (`activeK`), and each Skellam bar fills
  as its diagonal is summed — so the whole distribution builds up bar by bar. Stages
  are now margins → fill → sweep (3 steps); `Next step` rests on each.

Verified green (build · lint 0/60 · tsc) and by screenshots: caption inside the box,
and the strip filling left-to-right (paused at k=−3, bars ≤ −3 filled, rest empty).

### 🟡 milestone · 20:40 — Reworked into an explainer: Play-tutorial, length law, cataloged Lab
**Why:** Dan reviewed the live app and asked for a more explainer-like build —
fold in the rate law, make Play build the whole matrix with narration, and turn
the weak Sample/Fit into a useful cataloged simulator.

Three changes, all verified green (build · lint 0 errors · **7/7 tests**, +softplus/law):

- **Softplus length-law rate source.** `skellam.ts` gains `softplus` + `lawRate`;
  the model panel adds a *Rates from: Direct μ | Length law* switch. In law mode,
  `μ₁,μ₂` are read off `f(L)=softplus(a+bL)` for two arms at a chosen length `L`,
  with a live mini-curve plot of both arms and the current `L` marked.
- **Play builds the whole matrix, narrated.** The Explain mode is now a four-stage
  tutorial driven by one `frame`: (1) reveal the two Poisson margins, (2) fill
  every cell as a product (anti-diagonal wipe), (3) light the k-diagonal, (4) sum
  it rung by rung onto P(K=k). A caption box narrates each step; *Next step* rests
  on each stage; frame 0 / done show the complete static picture so the app is
  useful before pressing Play.
- **Sample + Fit → one cataloged Lab.** Each *Run & log* draws a fresh sample,
  recovers μ̂ by method-of-moments, and appends a row to a results table
  (rates · N · mean · var · μ̂₁ · μ̂₂ · |μ̂−μ|); click a row to see its histogram
  with the fitted + true Skellam overlaid. Auto-increments the seed so repeated
  runs show the recovery wobble. Modes are now just **Explain · Lab**.

Headless screenshots confirm all four: static full picture, law mode (curve +
a/b/L sliders), the tutorial highlight stage (narrated, diagonal lit), and the
Lab catalog with the selected run's histogram.

### 🟡 milestone · 19:05 — App built, verified across all three modes; build + tests green
**Why:** The new app is complete and conforms to the framework; this is the
session's deliverable, captured before handoff.

Built `src/animations/CountingTheWays/` (`skellam.ts` engine, `CountingTheWays.tsx`,
`countingTheWays.css`, `EXPLAINER.md`, `README.md`, `__tests__/skellam.test.ts`)
and registered it in the five append-only files. **`npm run build` passes**,
**`npm run lint` is 0 errors / 60 warnings** (the documented baseline — none from
the new files), and **6/6 unit tests pass** (the core identity *diagonal sum =
`e^{−(μ₁+μ₂)}·(μ₁/μ₂)^{k/2}·I_{|k|}`*, normalization, the conditional law, and
the moment-fit recovery).

Headless screenshots verified all three modes render correctly
(`scripts/shoot.mjs` + a click-through):

- **Explain** — joint heatmap (bright at μ₁=4, μ₂=2.5), teal Poisson margins, the
  dashed k=+2 diagonal; scrolled down: the color-linked factored formula with the
  partial walk (`Σ joint 0.1496 → 0.1545`, `Bessel part 62.176 of 64.236`, 5/11
  rungs), the Skellam strip with k=2 lit, and the conditional bars peaking at the
  (4 gained, 2 lost) rung.
- **Sample** — 4,000 draws converging to the Skellam curve; sample mean 1.50
  (≈μ₁−μ₂=1.5), variance 6.47 (≈μ₁+μ₂=6.5).
- **Fit** — 600 synthetic points; recovered μ̂₁=4.34, μ̂₂=2.62 (true 4.0, 2.5),
  fitted and true curves overlapping.

One cosmetic fix applied during review: the formula's tiny normalizer was rounding
to `0.002`, so the product didn't read true — now shown to 4 decimals / scientific.

> [!NOTE]
> The titular question is answered directly on screen: the **conditional bars** in
> Explain are `P(rung n | K=k)` = one Bessel-series term ÷ the Bessel sum — i.e.
> "the Bessel function gives the conditional probabilities."

### 🟢 code · 18:55 — Read the framework; building the app
**Why:** Confirmed the exact wiring before writing, so the new app conforms on the
first pass (no rework against the chrome contract).

Read `BUILDING_AN_APP.md`, `workspace/types.ts`, `ControlPanel.tsx`,
`readouts.tsx`, `archetypes.ts`, `apps.ts` / `index.tsx` / `catalog.ts`, the theme
tokens, and **`StableMatching.tsx` in full** as the canonical DOM-app template
(modes/layouts, `SectionDef`/`ViewDef`/`LayoutDef`/`ActionDef`, the `<Workspace>`
assembly, action-strip projection). Plan:

- **`skellam.ts`** — Poisson pmf (log-space), modified Bessel `I_k` (series, with a
  per-term accessor for the live accumulation), the Skellam pmf as the **honest
  diagonal sum** (cross-checked against the `e^{−(μ₁+μ₂)}·(μ₁/μ₂)^{k/2}·I_{|k|}`
  form), the conditional-over-rungs law, a seeded Poisson sampler, and a
  method-of-moments fit (`μ̂₁=(s²+m)/2`, `μ̂₂=(s²−m)/2` — the interpretable estimator).
- **`CountingTheWays.tsx`** — top-bar **modes** *Explain · Sample · Fit* (app holds
  `mode`; each builds its own sections/view/actions, `μ₁,μ₂` shared). Explain = the
  joint lattice + swept k-diagonal + rung-by-rung accumulation landing on the Bessel
  value + color-linked formula + conditional readout. Sample = Monte-Carlo
  difference histogram converging to the Skellam curve. Fit = synthetic data →
  recover μ̂ → overlay fitted Skellam.
- `countingTheWays.css`, `EXPLAINER.md`, `README.md`; register in the five
  append-only files (+ CLAUDE.md/README tree).

### 🟣 decision · 18:40 — Design locked: "Counting the Ways," explainer + sampler + fit
**Why:** Dan answered the three scoping questions; the app shape is fixed, so I can
scaffold and build.

- **Name / route:** *Counting the Ways* → `#/counting-the-ways`.
- **Model:** stepwise-mutation framing — up-mutations (gains) `~ Poisson(μ₁)`,
  down-mutations (losses) `~ Poisson(μ₂)`, net change `K = gains − losses` — with a
  **toggle to a generic `X, Y`** labeling. One engine, two label sets.
- **Scope (v1 = all three, layered):**
  1. **Explainer** — the joint (gains, losses) lattice, the swept `k`-diagonal, the
     rung-by-rung accumulating sum that lands on the Bessel value, and the
     color-linked Skellam formula.
  2. **Sampler** — Monte-Carlo draws of (gains, losses); the difference histogram
     converges to the Skellam curve.
  3. **Fit** — generate *synthetic* difference data (explicitly **not** Dan's real
     data) from chosen μ's, recover `μ₁, μ₂` by MLE, overlay the fitted Skellam —
     shows the fit working end to end.
- Maps to workspace tiers: Explainer = Define/View; Sampler + Fit = Analyze/lab,
  presented as layouts.

### 🔵 finding · 18:30 — The real "why": demystify a scary fit, not teach a formula
**Why:** Dan shared the motivation, which reframes the whole app from "explain a
distribution" to "make a scary word feel understandable" — the design must serve
the emotional goal.

**Context (from Dan):** They have code modeling **microsatellites as the
difference of two Poisson distributions**. Fitting it surfaces **Bessel functions**,
and the unfamiliar words feel intimidating. The app's job: *visualize what is
actually happening* so the Bessel function stops being scary and becomes
understandable — so they trust what they're computing.

**Design consequence:** Lead with the demystifying reveal, not the formula. The
modified Bessel function `I_{|k|}` is literally **the running total of every way
the two Poisson processes can produce the same net difference `k`** — i.e. the
sum down one diagonal of the joint `(X, Y)` lattice. The hero interaction is
*watch that sum accumulate, rung by rung, until it equals the Bessel value*, with
the "scary formula" on screen, each piece color-linked to what it counts. The
microsatellite vocabulary should be visible (it's *their* problem), with the
abstract Poisson view alongside. This makes the lattice-diagonal picture (Open
question 2) the confirmed hero — pending only the exact model framing + scope.

### 🟡 milestone · 18:20 — Session started; oriented for a new stats app
**Why:** First session on a fresh branch with a brand-new topic; capture the
orientation and the math framing before any build decisions.

Resolved branch slug `focused-cerf-60tgup` (first tracked session here). Read the
most recent repo-wide handoff (solid-worlds decor/guides, PR #229) and confirmed
it's unrelated. Read `TODO.md` and the future-apps scoping handoff — no Skellam /
Bessel / probability app was previously scoped, and a grep finds no existing code,
so this is a new app and a new category. Sketched the diagonal-sum ↔ Bessel-series
connection above to frame the build, and listed the open questions that gate
scope. Stopping here per `/start-session` — awaiting Dan's direction before any
implementation.
