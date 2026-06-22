---
app: [slug — the route key, e.g. solid-worlds]
route: [#/slug]
name: [Display Name]
status: [active | stable | retiring | unlisted]
entry: [src/animations/<App>/<App>.tsx]
updated: [YYYY-MM-DD]
---

# [Name] — developer guide

> [one-line description — reuse the blurb from `src/apps.ts`]

The living architecture + status doc for this app. See
[`docs/apps/README.md`](README.md) for what this doc type is. Teaching/math lives
in [`EXPLAINER.md`](../../src/animations/<App>/EXPLAINER.md), not here.

## Status

- **Route:** `#/slug` ([`src/index.tsx`](../../src/index.tsx) route map)
- **Stability:** [active / stable / retiring / unlisted — one line on where it sits]
- **Entry:** [main file] · [N ts/tsx files, ~LOC]
- **Build/tests:** [e.g. covered by `npm run build`; unit tests under `__tests__/` — or "no app-specific tests"]

## Active / Resolved

The per-app control center — **hand-maintained**. Move items from Active to
Resolved (with date + branch) as they land. Mirror priority tags from
`docs/sessions/TODO.md`.

### Active

<!-- - [ ] !priority Title — short note (link the TODO item / session if any). -->
- _(none yet)_

### Resolved

<!-- - YYYY-MM-DD (branch) — what landed. Link the handoff. -->
- _(none yet)_

## What it does

[Feature inventory — modes, the panels (with archetypes), the view window(s), the
key controls and what they do. This is the durable feature list.]

## How the code works

[Architecture narrative: the shell ↔ engine split, data flow, the render/update
loop, state ownership. How a change propagates from a control to the screen.]

## Key files

| File | Role |
|---|---|
| [`path`](../../path) | [what it does] |

## Invariants & gotchas

[The "don't break this" list: contracts an edit must preserve, subtle constraints,
traps that have bitten before. Cross-link any deep design docs.]

## Testing & verification

[How to confirm a change is sound: unit tests, headless screenshots
(`node scripts/shoot.mjs '#/slug' shot.png`), what to look for by eye.]

## History & sources

- **Built/iterated by:** [link the session reports / branches under `docs/sessions/`]
- **Possible sources:** see the EXPLAINER's "Possible sources & where to go further".
