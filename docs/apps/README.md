# App developer guides (`docs/apps/`)

A **per-app living developer/agent guide** for each app in animath. One file per
app: `docs/apps/<slug>.md`, where `<slug>` is the app's route key (the hash with
its leading `/` dropped — e.g. `solid-worlds`, `fractals`), matching the keys in
`src/apps.ts` and `docs/sessions/categories.mjs`.

## What this is (and what it is *not*)

This is the **architecture + status home** for an app — the document a programmer
or an agent reads first before working on it, and updates when they're done. It is
the app-scoped twin of the repo-wide `CLAUDE.md`, plus a per-app control center.

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

Copy `_TEMPLATE.md` to start a new guide; fill what applies, mark the rest
"(none yet)". A thin app should produce a short guide — that's expected.

## How to keep it current

- **Update the guide in the same change that alters the app's behavior or
  structure** — like updating `EXPLAINER.md`. The registry is hand-edited: move an
  item from Active to Resolved (with the date + branch) when it lands.
- Set `updated:` in the frontmatter when you touch it.
- Keep teaching content *out* — link to `EXPLAINER.md`, don't restate it.

> [!TIP]
> Future consolidation (not done yet): once guides exist for an app, that app's
> long prose block in `CLAUDE.md` can shrink to a one-line pointer here, so there's
> a single home for the architecture. Until then the two coexist; this guide is the
> richer source.

## Index

| App | Route | Guide |
|---|---|---|
| Solid Worlds | `#/solid-worlds` | [`solid-worlds.md`](solid-worlds.md) ✅ pilot |
| Fractals | `#/fractals` | [`fractals.md`](fractals.md) ✅ pilot |
| Complex Particles | `#/complex-particles` | _pending_ |
| Plane Transform | `#/plane-transform` | _pending_ |
| Mandelbrot ↔ Julia | `#/correspondence` | _pending_ |
| Trinary System | `#/trinary` | _pending_ |
| Stable Marriage | `#/stable-marriage` | _pending_ |
| Agentic Sorting | `#/agentic-sorting` | _pending_ |
| Stable Matching | `#/stable-matching` | _pending_ |
| Polygon Worlds | `#/polygon-worlds` | _pending_ |
| Trees and Nets | `#/trees-and-nets` | _pending_ |
| Topology Walk | `#/topology-walk` | _pending_ (retiring) |
