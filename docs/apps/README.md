# App developer guides (`docs/apps/`)

A **per-app living developer/agent guide** for each app in animath. One file per
app: `docs/apps/<slug>.md`, where `<slug>` is the app's route key (the hash with
its leading `/` dropped — e.g. `solid-worlds`, `fractals`), matching the keys in
`src/apps.ts` and `docs/sessions/categories.mjs`.

## What this is (and what it is *not*)

This is the **architecture + status home** for an app — the document a programmer
or an agent reads first before working on it, and updates when they're done. It is
the app-scoped twin of the repo-wide `CLAUDE.md`, plus a per-app control center.

The format and the build/update rules are specified in
**[`GUIDE_STYLE.md`](GUIDE_STYLE.md)** (the style spec, mirroring the session
system's [`REPORT_STYLE.md`](../sessions/REPORT_STYLE.md)). Guides reuse the
session conventions — YAML frontmatter, GitHub-alert callouts, emoji status
badges, and the `app`/`signals` controlled vocabularies in
[`categories.mjs`](../sessions/categories.mjs) — so the two doc families read as one.

It deliberately overlaps with **none** of the existing docs, because each of those
answers a different question:

| Doc | Audience | Question it answers |
|---|---|---|
| **This guide** (`docs/apps/<slug>.md`) | developer / agent | *How is this app built, what's its state, what's active vs resolved?* |
| `src/animations/<App>/EXPLAINER.md` | end user (the **?** modal) | *What am I looking at?* (teaching / math) |
| `src/animations/<App>/README.md` | end user (About) | longer "about this app" prose |
| `docs/sessions/**` handoffs/progress | the next session | *What happened in this one session?* (history, append-only) |
| `CLAUDE.md` | any agent, repo-wide | *How is the whole repo laid out?* |

> [!NOTE]
> The complex-particles `public/*-guide.html` pages are **teaching** material
> (math pedagogy with live applets), not architecture. They are not this doc type
> and are not replaced by it.

## What each guide carries

1. **Status** — route, stability, entry file, build state — at-a-glance orientation.
2. **Active / Resolved registry** — the per-app control center. **Hand-maintained**
   (no tooling): *Active* lists open/planned work (priority-tagged, like
   `docs/sessions/TODO.md`); *Resolved* is a dated changelog of landed decisions and
   fixes. This is the per-app slice of the cross-app backlog + session outcomes.
3. **What it does** — the feature inventory: modes, panels, views, controls.
4. **How the code works** — the architecture narrative and data flow.
5. **Key files** — a `path → role` table.
6. **Invariants & gotchas** — the "don't break this" list for whoever edits it.
7. **Testing & verification** — how to confirm a change is sound.
8. **History & sources** — pointers to the session reports that built it and to the
   EXPLAINER's "Possible sources" (linked, not duplicated).

Copy [`_template-app-guide.md`](_template-app-guide.md) to start a new guide; fill
what applies, mark the rest `_(none yet)_`. A thin app should produce a short
guide — that's expected. Full rules: [`GUIDE_STYLE.md`](GUIDE_STYLE.md) §4.

## How to keep it current

See [`GUIDE_STYLE.md`](GUIDE_STYLE.md) §5 for the full rules. In short:

- **Update the guide in the same change that alters the app's behavior or
  structure** — like updating `EXPLAINER.md`. The registry is hand-edited: move an
  item from Active to Resolved (with the date + branch) when it lands.
- Set `updated:` (and keep `status` / `build`) accurate when you touch it.
- Keep teaching content *out* — link to `EXPLAINER.md`, don't restate it.

> [!TIP]
> Future consolidation (not done yet): once guides exist for an app, that app's
> long prose block in `CLAUDE.md` can shrink to a one-line pointer here, so there's
> a single home for the architecture. Until then the two coexist; this guide is the
> richer source.

## Files in this folder

- [`GUIDE_STYLE.md`](GUIDE_STYLE.md) — the style spec + build/update rules.
- [`_template-app-guide.md`](_template-app-guide.md) — the skeleton to copy.
- `<slug>.md` — one living guide per app (see the index below).

## Index

| App | Route | Guide |
|---|---|---|
| Solid Worlds | `#/solid-worlds` | [`solid-worlds.md`](solid-worlds.md) |
| Fractals | `#/fractals` | [`fractals.md`](fractals.md) |
| Complex Particles | `#/complex-particles` | [`complex-particles.md`](complex-particles.md) |
| Plane Transform | `#/plane-transform` | [`plane-transform.md`](plane-transform.md) |
| Mandelbrot ↔ Julia | `#/correspondence` | [`correspondence.md`](correspondence.md) |
| Trinary System | `#/trinary` | [`trinary.md`](trinary.md) |
| Stable Marriage | `#/stable-marriage` | [`stable-marriage.md`](stable-marriage.md) |
| Agentic Sorting | `#/agentic-sorting` | [`agentic-sorting.md`](agentic-sorting.md) |
| Stable Matching | `#/stable-matching` | [`stable-matching.md`](stable-matching.md) |
| Polygon Worlds | `#/polygon-worlds` | [`polygon-worlds.md`](polygon-worlds.md) |
| Trees and Nets | `#/trees-and-nets` | [`trees-and-nets.md`](trees-and-nets.md) |
| Topology Walk | `#/topology-walk` | [`topology-walk.md`](topology-walk.md) (retiring) |
