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
