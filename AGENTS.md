# AGENTS Instructions

This repository contains `animath`, a modular browser-based toolkit for
mathematical animations and generative art, built with TypeScript, React 18,
Three.js, and Vite. Each animation ("app") is a self-contained module that plugs
into the shared **workspace chrome** (`src/chrome/` — a landing gallery, then a
per-app workspace of draggable panel/view windows opened from an icon rail) and
is registered in a single catalog, `src/apps.ts`.

## Orientation — read these first

- **CLAUDE.md** — the detailed map of the codebase, the workspace framework, the
  routing model, conventions, and current technical debt.
- **docs/BUILDING_AN_APP.md** — the step-by-step recipe for adding a new app that
  conforms to the framework. **Follow it when creating a module.**
- **README.md** — user-facing tour of the apps and interaction conventions.
- **PLAN.md** — the prioritized roadmap of outstanding work.
- **ARCHITECTURE.md** — historical design proposal; background only, not the
  current layout.

## Development Quick Start

```bash
npm ci          # reproducible install (Node 20+, npm 10+)
npm run dev     # Vite dev server at http://localhost:5173/animath/
npm run build   # tsc && vite build → dist/   (the ONLY CI check)
npm test        # vitest unit tests (chrome workspace pure logic)
npm run lint    # eslint over src/ (keep it green)
npm run preview # preview the production build
```

## Creating a new app (summary)

The framework is hook-driven, not inheritance-driven. A new app:

1. Lives in `src/animations/<Name>/` with its main `.tsx`, a `README.md` (the
   in-app **About** text) and an `EXPLAINER.md` (the **?** popup), both imported
   with Vite's `?raw` suffix.
2. Is registered in **three** places: the `routes` map in `src/index.tsx`
   (`React.lazy` import), the `apps` array in `src/apps.ts`, and the gallery
   metadata in `src/chrome/catalog.ts`. These shared files are **append-only** —
   add at the end, never reorder (parallel app branches rely on it).
3. Integrates with the chrome by rendering **one component**: `<Workspace appId
   title sections views … />` from `src/chrome/workspace/` — its panels
   (`SectionDef[]`, archetypes from the closed 11-icon vocabulary) and view
   window(s) (`ViewDef[]`).
4. Builds its controls from the primitives in `src/components/ControlPanel.tsx`
   (`Slider`, `Pills`, `Select`, `Checkbox`, `RangeSlider`, `NumberInput`) for a
   consistent look.

For 3D work, wrap `src/components/Canvas3D.tsx`. For 4D particle viewers, build on
`ParticleViewerShell` + the `src/lib/particles` engine — copy `ComplexParticles`,
the canonical example. See `docs/BUILDING_AN_APP.md` for the full walkthrough.

GLSL is kept inline as template strings under each app's `shaders/` directory.

## Contribution Checks

Run `npm run build` before opening a pull request — it must pass (it is the only
CI check). Also keep `npm test` (vitest, chrome workspace logic) and
`npm run lint` green. There is no formatter — and **do not introduce one**: a
repo-wide reformat would conflict with every in-flight parallel branch.

## Session Skills

Three Claude Code skills live in `.claude/skills/` — invokable both by a human
(slash command) and by an agent (via the Skill tool), on explicit request rather
than auto-triggered: **`/start-session`** (orient + open a progress report),
**`/handoff`** (distill the session, using `npm run build` for status), and
**`/three-hats`** (parallel design review from three lenses). Session reports are
committed as **Markdown + YAML frontmatter** under
`docs/sessions/{progress,handoff}/<branch-slug>/` — one folder per branch (slug =
branch name, `claude/` stripped, `/`→`-`) so parallel branches don't collide.
`npm run sessions` renders them into the rich HTML view and the cross-branch
control center (`docs/sessions/control-center.html`). The format is specified by
`docs/sessions/REPORT_STYLE.md`. See CLAUDE.md → "Agent session skills" for
details.

---

These instructions apply repository-wide.
