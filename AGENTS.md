# AGENTS Instructions

This repository contains `animath`, a modular browser-based toolkit for
mathematical animations and generative art, built with TypeScript, React 18,
Three.js, and Vite. Each animation ("app") is a self-contained module that plugs
into a shared **AppShell** (top bar + slide-out drawer) and is registered in a
single catalog, `src/apps.ts`.

## Orientation — read these first

- **CLAUDE.md** — the detailed map of the codebase, the AppShell framework, the
  routing model, conventions, and current technical debt.
- **docs/BUILDING_AN_APP.md** — the step-by-step recipe for adding a new app that
  conforms to the framework. **Follow it when creating a module.**
- **README.md** — user-facing tour of the apps and interaction conventions.
- **ARCHITECTURE.md** — historical design proposal; background only, not the
  current layout.

## Development Quick Start

```bash
npm ci          # reproducible install (Node 20+, npm 10+)
npm run dev     # Vite dev server at http://localhost:5173/animath/
npm run build   # tsc && vite build → dist/   (the ONLY CI check)
npm run preview # preview the production build
```

## Creating a new app (summary)

The framework is hook-driven, not inheritance-driven. A new app:

1. Lives in `src/animations/<Name>/` with its main `.tsx`, a `README.md` (the
   in-app **About** text) and an `EXPLAINER.md` (the **?** popup), both imported
   with Vite's `?raw` suffix.
2. Is registered in **two** places: the `routes` map in `src/index.tsx`
   (`React.lazy` import) and the `apps` array in `src/apps.ts` (catalog entry
   that drives the drawer and the landing menu).
3. Integrates with the shell via hooks/components from
   `src/components/AppShell.tsx`: `useAppHeader`, `useAppExplainer`,
   (optionally `useAppFunctions`), and `<ShellSettings>` / `<ShellActions>`.
4. Builds its controls from the primitives in `src/components/ControlPanel.tsx`
   (`Section`, `Slider`, `Pills`, `Select`, `Checkbox`) for a consistent look.

For 3D work, wrap `src/components/Canvas3D.tsx`. For 4D particle viewers, build on
`ParticleViewerShell` + the `src/lib/particles` engine — copy `ComplexParticles`,
the canonical example. See `docs/BUILDING_AN_APP.md` for the full walkthrough.

GLSL is kept inline as template strings under each app's `shaders/` directory.

## Contribution Checks

Run `npm run build` before opening a pull request — it must pass. There are
currently no automated tests, linter, or formatter.

## Session Skills

Three manually-invoked Claude Code skills live in `.claude/skills/` (slash
commands; they never auto-invoke): **`/start-session`** (orient + open a progress
report), **`/handoff`** (distil the session, using `npm run build` for status), and
**`/three-hats`** (parallel design review from three lenses). Session notes are
committed as self-contained **HTML** (styled by `docs/sessions/report.css`) under
`docs/sessions/{progress,handoff}/<branch-slug>/` — one folder per branch (slug =
branch name, `claude/` stripped) so parallel branches don't collide. See CLAUDE.md →
"Agent session skills" for details.

---

These instructions apply repository-wide.
</content>
