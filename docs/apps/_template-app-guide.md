---
kind: app-guide
app: [slug — route hash without "/", matching src/apps.ts + categories.mjs]
route: [/slug]
name: [Display Name]
title: [Display Name] — developer guide
status: [active | stable | retiring | unlisted]
build: [passed | failed | unknown]
entry: [src/animations/<App>/<App>.tsx]
updated: [YYYY-MM-DD]
signals: [null | needs-dan, visual-unverified, … — SIGNALS vocab in categories.mjs]
next: [null | one-line most-useful next action]
---

# [Display Name] — developer guide

> [one-line description — reuse the blurb from `src/apps.ts`]

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
Teaching/math lives in
[`EXPLAINER.md`](../../src/animations/<App>/EXPLAINER.md), not here.

## Status

- **Route:** `#/slug` ([`src/index.tsx`](../../src/index.tsx) route map)
- **Stability:** [✅ active / 🟢 stable / 🟡 retiring / ⚪ unlisted — one line on where it sits]
- **Entry:** [main file] · [N ts/tsx files, ~LOC]
- **Build/tests:** [covered by `npm run build`; tests under `__tests__/` — or "no app-specific tests"]

## Active / Resolved

The per-app control center — **hand-maintained** ([`GUIDE_STYLE.md`](GUIDE_STYLE.md) §3c).

### Active

<!-- - [ ] !priority Title. — short note (link the TODO item / session if any). -->
- _(none yet)_

### Resolved

<!-- newest first -->
<!-- - [x] YYYY-MM-DD (branch) — what landed. (link the handoff) -->
- _(none yet)_

## What it does

[Feature inventory — modes, the panels (with archetypes), the view window(s), the
key controls and what they do.]

## How the code works

[Architecture narrative: the shell ↔ engine split, data flow, the render/update
loop, state ownership. How a change propagates from a control to the screen.]

## Key files

| File | Role |
|---|---|
| [`path`](../../path) | [what it does] |

## Invariants & gotchas

[The "don't break this" list: contracts an edit must preserve, subtle constraints,
traps that have bitten before. Use `> [!CAUTION]` for the sharpest ones.]

## Testing & verification

[How to confirm a change is sound: unit tests, headless screenshots
(`node scripts/shoot.mjs '#/slug' shot.png`), what to look for by eye.]

## History & sources

- **Built/iterated by:** [link the session reports / branches under `docs/sessions/`]
- **Possible sources:** see the EXPLAINER's "Possible sources & where to go further".
