---
kind: progress
session: 2026-07-06-S01
date: 2026-07-06
title: High-dimensional spheres — do the math, gain the intuition (pre-app exploration)
branch: claude/high-dim-sphere-surface-oyo8ko
slug: high-dim-sphere-surface-oyo8ko
status: in-progress
build: unknown
followup: null
pr: null
app: general
signals: needs-dan
next: Converge with Dan on the exploration path (math-first notebook + tiny probes vs the full /explore-concept room) before building anything.
---

# High-dimensional spheres — do the math, gain the intuition (pre-app exploration)

## Session purpose

Explore the observation Dan read in Richard Hamming's book (*The Art of Doing
Science and Engineering*, ch. 9, "n-Dimensional Space"): **at high dimension,
almost all of a sphere's volume lies at its surface** (and, relatedly, near any
equator). Dan has always meant to do the math and gain the intuition, and wants
to try the idea out *before* committing to a real app — this session is
explicitly exploratory: plan how to work through the math together, identify
the rails the repo already has for pre-app concept exploration, and decide the
path. **No implementation this session until the path is chosen.**

## Previous session

New topic — first tracked session on this branch. For continuity: the latest
handoff repo-wide is
[clean-up-loose-ends 2026-07-02-S01](../../handoff/clean-up-loose-ends-8b0wqp/2026-07-02-S01-clean-up-loose-ends.md)
(accidental-complexity audit + cleanup, PR #247, status completed, follow-up
LOW — unrelated to this session's focus). The nearest precedents for *this
kind* of session are the
[future-apps-scoping handoff](../../handoff/future-apps-scoping/2026-06-10-S01-future-app-scoping.md)
(scoping candidate apps into a reference doc before building) and the
quaternion-exploration branch (the `/explore-concept` skill's first run — and
its cautionary hard-fail reflection).

## Working notes

### 🟢 code · 15:30 (Jul 7) — Added a log-N variant of the shell-stack chart
**Why:** Dan asked to see the chart with N log-scaled too.

Refactored `shell-stack.mjs` into a `build({logX, NMAX, file})` function that
emits both `shell-stack.svg` (linear N, 1–150, the notebook's figure) and
`shell-stack-logN.svg` (log N, 1–10000, decade ticks). Trade-off shown
directly: log-N gives the full sweep to N = 10⁴, but panel B's peel lines stop
being straight — `(1−ε)ⁿ` bends into a curved cliff (a semi-log plot needs
linear N for the straight-line property). Panel A (linear Y) reads especially
well on log-N — the flood becomes a smooth S-curve across the whole range.
Fixed two text-overflow bugs found on render (top caption run-off, panel-B
title/subtitle collision). **Notebook still embeds the linear version**; the
log-N file is an alternate pending Dan's preference.

### 🟢 code · 15:12 (Jul 7) — Fixed the missing N axis on the shell-stack chart
**Why:** Dan couldn't read N off the plot and asked if N was log-scaled. It wasn't — I had drawn no X tick labels at all.

N is **linear** (1→150), kept linear on purpose so panel B's peel lines stay
straight (log-N would bend `(1−ε)ⁿ` back into a curve). The bug was purely the
missing axis: added tick labels at 1/25/50/75/100/125/150 and faint translucent
gridlines on both panels so N is readable and traceable up into the fan.

### 🟡 milestone · 14:57 (Jul 7) — Dan's call: keep old + add new figure; static plot only, no app yet
**Why:** Dan chose "keep old + add new" for the §1 figure and said "this does not need an interactive app yet. for now, I just want to see a plot."

Folded `shell-stack.svg` into the notebook's §1 as a *second* figure (the
original three-curve `shell-fraction.svg` stays), with a short paragraph
explaining the two panels (linear sums-to-1 vs the log fan). **Phase 2 (any
interactive probe) is explicitly deferred** — the deliverable stays a static
notebook for now.

### 🟢 code · 14:49 (Jul 7) — Redesigned the shell chart per Dan's spec: ε-shell stack, both ε and N in one picture
**Why:** Dan wants the §1 shell fact shown "as a function of both ε and N" — a filled-polygon plot, N on X, Y summing to 1, log scale, ε shading proportionately. Built it as a cheap reversible probe (R2) to react to, not folded into the notebook yet.

`assets/shell-stack.mjs` → `assets/shell-stack.svg`: the unit ball partitioned
into ε = 0.02 radial shells; Y = cumulative fraction of volume within radius r
(partitions [0,1] exactly ⇒ "sums to 1"); color = shell radius (surface dark,
core light) so **ε is the shading dimension**; N on X. Two shared-decomposition
panels resolve the "sums to 1 **and** log" tension Dan flagged:
- **A · linear Y** — the honest "sums to 1"; the dark skin shell floods the
  panel as N grows.
- **B · log Y** — the same axis, log-scaled: the shell boundaries `(1−kε)ᴺ`
  become **straight, plunging lines** (semi-log turns exponentials into lines),
  so Dan's favored framing "(1−ε)ᴺ shrinks quickly to zero" is a fan of rays;
  thicker peel ⇒ steeper plunge. The three classic peels ε = 1%/5%/10% drawn
  heavy + labeled, tying back to the notebook's original three-curve chart.

Built on the dataviz method (sequential single-hue ramp for the radius
magnitude; reference chrome inks; self-contained light surface). Verified by
eye across three render rounds — fixed an inverted log axis (1 was at the
bottom), colliding peel labels (now labeled only in panel B), colorbar label
overlap, and floor "teeth" (monotone `r^N` lets each band stop cleanly at the
floor; panel background painted core-shade so sub-floor gaps read as core).
**Not yet folded into the notebook** — presented to Dan to pick the direction
(replace §1's line chart, keep both, or push toward an interactive phase-2
version). Also a strong phase-2 app candidate: this picture with a live N-cursor
or ε-slider is nearly the whole story in one interaction.

### 🔵 finding · 00:01 (Jul 7) — Dan opened a discussion on §2: unpack the Γ-function volume formula
**Why:** The notebook quotes V_n = π^(n/2)/Γ(n/2+1) but only derives the 2π/n recursion; Dan asked for the formula itself to be explained.

Explained in chat via the **Gaussian trick** (∫e^(−|x|²) computed Cartesian vs
polar: π^(n/2) = n one-dimensional Gaussians; Γ(n/2)/2 = the radial integral
under t = r²), with Γ read as the smooth factorial ((n/2)! with seed
Γ(1/2) = √π — itself the Gaussian integral), small-n sanity checks, the
recursion recovered as Γ's functional equation, Stirling for the collapse
rate, and the Σ V_even = e^π delight. Candidate appendix for the notebook if
Dan wants it kept in the record.

### 🟢 code · 21:32 — Phase 1 delivered: the notebook + reproducible probes + four validated figures
**Why:** The math-first notebook is the phase-1 deliverable; landing it moves the session to "present the intuition to Dan, then decide phase 2."

Landed in this folder:
- **`2026-07-06-S01-hamming-sphere-notebook.md`** — the notebook: the shell
  fact (`1 − (1−ε)^n`), the 2π/n volume recursion (peak at n = 5), the equator
  squeeze (coordinate density `(1−x²)^((n−3)/2)`, σ = 1/√n, Archimedes flat at
  n = 3), near-orthogonality (σ(cos θ) = 1/√n → exponentially many
  almost-orthogonal directions — Hamming's coding punchline), the corner-sphere
  box (√n − 1: escapes at n = 10, outgrows the box at n = 1206), the
  LLN-unification (§6), an intuition digest (§7), Monte Carlo cross-checks
  (§8), app seeds for phase 2 (§9), and the attribution block.
- **`assets/probe.mjs`** — deterministic numeric probes (seeded MC): every
  table in the notebook, reproducible with one command. All five MC checks
  landed on theory to 3–4 digits (e.g. outer-1%-shell at n = 100: 63.40%
  theory, 63.40% sampled).
- **`assets/charts.mjs`** → four SVG figures (vn-vs-n, radial-cdf,
  shell-fraction, coordinate-density). Built per the dataviz skill: ordinal
  blue ramps (dimension is ordered) validated with the skill's palette
  script (all PASS), reference chrome inks, self-contained light surface so
  GitHub dark mode stays legible. Eyeballed via puppeteer screenshots (two
  label-collision rounds fixed: chart-2 right corner, chart-3 ε labels,
  chart-4 clipped Archimedes note).

One probe bug caught and fixed during verification: at n = 3 the
1.96/√n integration window exceeded the coordinate's [−1, 1] range (and JS's
`0^0 = 1` silently inflated the integrand), reporting a nonsense 113% — the
window is now clamped. Also pinned the folklore corner-sphere number by direct
computation: the inner sphere's volume passes the box at exactly **n = 1206**.

### 🟣 decision · 21:19 — Dan approved the three-phase plan; phase 1 (math notebook) begins
**Why:** The path needed Dan's call; he chose the recommended route ("I think that is an excellent idea. let's begin.").

Plan of record: **(1)** math-first notebook — derivations + numeric probes for
the shell fact and its siblings, committed as a research-style report;
**(2)** one small throwaway visual probe (no registry edits) to test whether
interaction adds anything; **(3)** decide — graduate to an app
(`kind: plan` + `/three-hats`) or park with the intuition banked. The
`/explore-concept` room is reserved for after phase 1, if at all. Notebook
lands as `2026-07-06-S01-hamming-sphere-notebook.md` (`kind: progress`,
`status: investigation-only` — the linter's KINDS has no `research`), with a
committed probe script + SVG charts under `assets/` (per R4: no throwaway
`/tmp` verification).

### 🔵 finding · 20:40 — The rails: what the repo already has for "try the idea before the app"
**Why:** Dan suspected "there might be additional rails to help start the process" — confirmed; inventoried them before proposing a plan.

- **`/explore-concept <concept>`** — the divergent gathering pipeline
  (deep-research foundation → an authored/live dialogue "room" → friction atlas
  → candidate-app plan → `/three-hats`). **Provisional**: its one real run
  (quaternions → the shelved "Belt") produced a plausible-but-hollow artifact;
  its own SKILL.md carries that caution. Heavy, but designed exactly for this
  moment (before designing a new app).
- **`deep-research` skill** — cited, fact-checked foundation on its own,
  without the room.
- **`/three-hats <plan>`** — the multi-lens review once a plan exists.
- **`kind: plan` progress reports** — the convention for forward-looking app
  plans (`status: proposed`), surfaced by the control center.
- **RECIPES R2 (exploring vs guessing)** — this session is the *legitimate
  exploratory* case: neither of us knows what the result should look like, so
  small, cheap, reversible probes are the sanctioned method; Dan's own caveat
  recorded there ("lots of planning can get us nowhere; the target is often
  only discoverable by building").
- **Precedent**: `docs/FUTURE_APPS.md` (the future-apps-scoping session) shows
  the "scope on paper first, build later" pattern working.

### 🟡 milestone · 20:38 — Session started; branch + focus oriented
**Why:** `/start-session` on a fresh branch with a stated focus — record the starting state.

Branch `claude/high-dim-sphere-surface-oyo8ko` (new; no prior reports —
folders created). Focus: Hamming's high-dimensional sphere concentration.
The core math targets, for the record:

- **Shell concentration** — the fraction of an n-ball's volume within the
  outer shell of thickness εr is `1 − (1−ε)^n → 1`: at high n, essentially
  *all* the volume hugs the surface. (The one-line proof is the seed; the
  intuition is the goal.)
- **Neighboring facts from the same chapter** that make the intuition click
  (candidates for the exploration): the n-ball volume
  `V_n(r) = π^(n/2) r^n / Γ(n/2+1)` peaking and then collapsing toward 0 as n
  grows; concentration near any **equator**; random vectors becoming nearly
  **orthogonal**; the inner sphere nestled among corner spheres in a box
  eventually poking *outside* the box.

Backlog scan: no TODO.md items touch this topic — it's genuinely new ground.
Next: present the plan options to Dan and wait for direction.
