---
kind: progress
session: 2026-06-10-S01
date: 2026-06-10
title: Agentic Sorting — divergent objectives + Levin competencies
branch: claude/agentic-sorting-app-j6ngd4
slug: agentic-sorting-app-j6ngd4
status: in-progress
build: unknown
followup: null
pr: null
app: agentic-sorting
---

# Agentic Sorting — divergent objectives + Levin competencies

## Session purpose

Expand the Agentic Sorting app along two axes the user wants restored/added:
(1) **divergent objectives** — bring back the lost intermediate where agents
optimize genuinely *different* functions (not just a division of labor toward one
global sort), and (2) **Levin's competencies** — frozen/defective cells,
delayed-gratification routing around defects, and clustering instrumentation for
chimeric arrays. Identify the source idea, then run `/three-hats` to scope how the
app can be improved and developed.

## Previous session

First tracked session on this branch. (Latest handoff across branches is the
polygon-worlds spherical work — unrelated; nothing pending there for this app.)

## Source idea (identified)

The app's impetus is **Michael Levin** (Tufts), on **Lex Fridman Podcast #486**.
The paper: Taining Zhang, Adam Goldstein, Michael Levin, *"Classical Sorting
Algorithms as a Model of Morphogenesis: self-sorting arrays reveal unexpected
competencies in a minimal model of basal intelligence"* (Adaptive Behavior, 2025;
arXiv:2401.05375). Each array **element is an agent** running its own sorting rule
and pursuing its own correct position. Observed unprogrammed competencies:
**delayed gratification** (move away from goal to route around a defect),
**robustness** to frozen/broken cells (sorts more reliably than top-down), and
**clustering by algotype** in *chimeric* arrays (cells running different
algorithms cluster like-with-like). That last point is the "agents not optimizing
the same function" intermediate the user remembered.

## Working notes

<!-- Newest entry first. -->

### 🟣 decision · 21:47 — Dispatched /three-hats review (3 parallel experts)
**Why:** User asked to run three-hats on how the app can be improved/expanded
before building.

Launched the three reviewers in parallel against the "divergent objectives +
Levin competencies" plan: Framework Maintainer, Architecture Consultant, Math-Viz
& Pedagogy. Each writes a full report to
`docs/sessions/progress/agentic-sorting-app-j6ngd4/2026-06-10-S01-expert-*.md`.
Synthesis to follow once all three return.

### 🟣 decision · 21:46 — Scope set: both objectives + competencies
**Why:** User chose "Both — objectives + competencies" and asked to identify the
source and run /three-hats before building.

Direction confirmed. Read the current implementation
(`src/animations/AgenticSorting/AgenticSorting.tsx`): five strategies (Standard,
Blind Date, Nomadic, Patrolling, Perfectionist) mixed by population weights, all
pulling toward one global ascending sort; CSS/DOM arena with bars/dots display,
StatGrid metrics (cycles/wakeups/swaps). The heterogeneity today is a *division of
labor*, not divergent objectives — that gap is the core of the work.

### 🔵 finding · 21:46 — Source confirmed as Michael Levin's self-sorting arrays
**Why:** User asked me to identify the half-remembered podcast/researcher.

Web search confirmed Levin / Lex Fridman #486 / arXiv:2401.05375 (see *Source
idea* above). The paper's competencies map directly onto the two requested work
axes.

### 🟡 milestone · 21:46 — Session opened
**Why:** Start of tracked work on the agentic-sorting branch.

Progress report created; next: run `/three-hats` to scope improvements/expansion,
then plan implementation.
