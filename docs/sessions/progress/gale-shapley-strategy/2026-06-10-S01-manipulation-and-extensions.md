---
kind: progress
session: 2026-06-10-S01
date: 2026-06-10
title: Gale–Shapley manipulation, welfare, and an extensions backlog
branch: claude/gale-shapley-strategy-hqyndf
slug: gale-shapley-strategy
status: completed
build: unknown
followup: medium
pr: https://github.com/piyarsquare/animath/pull/201
app: stable-marriage
---

# Gale–Shapley manipulation, welfare, and an extensions backlog

## Session purpose

A long discussion of strategy and welfare in the stable-matching app — how an
agent who knows the full preference profile can manipulate Gale–Shapley, how much
stability costs total happiness, and what perturbations do — distilled into a
written backlog of explorable features.

## Previous session

First tracked session on this branch (the StableMarriage app itself predates it;
see the `stable-marriage-styling` reports).

## Working notes

<!-- Newest entry first. -->

### 🟢 code · 14:00 — Logged the session into the control center
**Why:** the work was a design artifact (no app code), but it should still be
discoverable from the cross-branch hub.

This progress + handoff pair was authored as part of the follow-on
`session-control-center` work, tagged `app: stable-marriage`.

### 🟣 decision · 13:25 — Corrected the welfare-optimal rank scaling
**Why:** an automated reviewer (Codex) flagged a real error on PR #201.

The min-total-rank (Hungarian) matching does **not** give constant average rank
per side: a low *combined*-rank edge must be good for both endpoints, so
mutually-top-k partners are scarce until k ≳ √n. Fixed the price-of-stability
table to balance both sides at ≈ √n, and noted that welfare maximization pulls
the *proposing* side down from its near-optimal ≈ ln n. Pushed `b2ed369`.

### 🟢 code · 13:00 — Shipped EXTENSIONS.md (eight explorable directions)
**Why:** capture the discussion as an actionable backlog so a future session can
pick any idea up with the math, a worked example, and concrete engine hooks.

`src/animations/StableMarriage/EXTENSIONS.md`: truncation manipulation, the
rotation/lattice explorer, price of stability, near-stable matchings (trading one
"frustration" for welfare), entrant externalities, hot newcomers, continuous-time
matching, and the cost of missing a round (order-independence). Merged via #201.

### 🔵 finding · 12:30 — The three results worth visualizing
**Why:** they're counterintuitive and map cleanly onto the existing engine.

(1) Only the *receiving* side can manipulate, via truncation, reaching its best
stable partner. (2) Coalitional truncation can steer the result to *any* node of
the stable-matching lattice (rotations = the "frustration cycles"). (3) Two hot
adversarial newcomers can only actually break ≈ 2 couples — the rest suffer mere
"rank inflation" — because each newcomer fills one slot and stability shields the
incumbents.
