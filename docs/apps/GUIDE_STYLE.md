---
kind: app-guide-style
app: docs
title: App Guide Style Spec
status: stable
updated: 2026-06-21
---

# App guide style spec

The style spec for the per-app developer/agent guides in `docs/apps/`. Like the
session reports' [`REPORT_STYLE.md`](../sessions/REPORT_STYLE.md), it is written in
the style it specifies — what it looks like rendered on GitHub is what every app
guide should look like. It reuses the session system's conventions (YAML
frontmatter, GitHub-alert callouts, emoji status badges, the `app`/`signals`
controlled vocabularies in [`categories.mjs`](../sessions/categories.mjs)) so the
two doc families read as one.

One guide per app: `docs/apps/<slug>.md`. See [`README.md`](README.md) for what
this doc type is *for*; this file is *how to build and maintain it*.

## 1 · Frontmatter (the metadata schema)

Every guide opens with a YAML frontmatter block. Keep values **flat**
(`key: value`) so it renders as a table on GitHub and a parser can read it.

```yaml
---
kind: app-guide            # always app-guide (app-guide-style for this spec)
app: solid-worlds          # route slug — matches src/apps.ts + categories.mjs (provenance)
route: /solid-worlds       # hash route
name: Solid Worlds         # display name, from src/apps.ts
title: Solid Worlds — developer guide   # the H1
status: active             # active | stable | retiring | unlisted
build: passed              # passed | failed | unknown (latest known)
entry: src/animations/SolidWorlds/SolidWorlds.tsx   # main component
updated: 2026-06-21        # YYYY-MM-DD — bump on every meaningful edit
signals: null              # optional — SIGNALS vocab for the app's live state
next: null                 # optional — one-line most-useful next action
---
```

| Field | Required | Notes |
|---|:--:|---|
| `kind` | ✓ | always `app-guide` |
| `app` | ✓ | the route slug (hash without `/`); **must** match `src/apps.ts` and `categories.mjs` — this is provenance and the join key for any future indexing |
| `route` | ✓ | the hash route (`/slug`) |
| `name` / `title` | ✓ | `name` from `src/apps.ts`; `title` is the H1 (`Name — developer guide`) |
| `status` | ✓ | app lifecycle — see §3a |
| `build` | ✓ | `passed` / `failed` / `unknown` (latest known on the working branch) |
| `entry` | ✓ | the main component file |
| `updated` | ✓ | last meaningful edit, `YYYY-MM-DD` |
| `signals` | – | the `SIGNALS` closed vocab from `categories.mjs` (`needs-dan`, `phone-needed`, `visual-unverified`, `not-live`) describing the app's **current** state; `null` when none |
| `next` | – | one short line: the single most useful next action |

> [!NOTE]
> `app` and `signals` draw from the **same controlled vocabularies as the session
> reports** (`docs/sessions/categories.mjs`). When `src/apps.ts` gains an app, add
> its slug there too — that one taxonomy serves both doc families.

## 2 · Section structure

Use `##` for sections (GitHub auto-anchors them). The order is **fixed** so every
guide is scannable the same way:

1. **Status** — route, stability, entry, build/tests. At-a-glance orientation.
2. **Active / Resolved** — the per-app control center (§3c). Hand-maintained.
3. **What it does** — the feature inventory (modes, panels + archetypes, views, controls).
4. **How the code works** — architecture narrative + data flow (the shell↔engine split, the update/render loop, state ownership).
5. **Key files** — a `path → role` table with clickable relative links.
6. **Invariants & gotchas** — the "don't break this" list for whoever edits it.
7. **Testing & verification** — unit tests, headless screenshots, what to check by eye.
8. **History & sources** — links to the session reports that built it + a pointer to the EXPLAINER's "Possible sources" (don't restate teaching).

Keep the H1 (`# Name — developer guide`) for standalone readability even though
`title` is in frontmatter. A thin app produces a short guide — mark empty sections
`_(none yet)_` rather than deleting them, so the shape stays uniform.

## 3 · Elements

### 3a · Status badges

`status` encodes the app's lifecycle with a leading emoji + word (CVD-safe):

- ✅ `active` — under active development
- 🟢 `stable` — works, low churn, no active work
- 🟡 `retiring` — being superseded / removed (e.g. Topology Walk)
- ⚪ `unlisted` — routable but not in the gallery (e.g. `#/fractals-cpu`)

Build state reuses the session badges: ✅ `passed` · ❌ `failed` · ⚠️ `unknown`.

### 3b · Callouts → GitHub alerts

Same mapping as the reports: `> [!NOTE]` / `> [!TIP]` / `> [!IMPORTANT]`
(decision) / `> [!WARNING]` / `> [!CAUTION]` (gotcha). Lead with a bold label.

> [!CAUTION]
> **Gotcha** — the Invariants section is the natural home for these: the fragile
> assumptions an edit must not break.

### 3c · The Active / Resolved registry

The per-app control center. **Hand-maintained** — no tooling derives it. It mirrors
the `docs/sessions/TODO.md` format so the two are interchangeable.

- **Active** — open/planned work, as a GitHub task list:
  `- [ ] !priority Title.` + an optional indented note (the why/where).
  Priority is `!high` / `!med` / `!low` (default `!med`). Status tags in the title
  are allowed: `(shelved)`, `(product)`, `(blocked)`.
- **Resolved** — landed work, **newest first**, as checked items carrying a date +
  branch: `- [x] YYYY-MM-DD (branch) — what landed.` Link the handoff where useful.

```text
### Active
- [ ] !low Make the Rooms ceiling duct world-specific.
  Would tie decor to `spec` (currently spec-independent) — see Invariants.

### Resolved
- [x] 2026-06-20 (3d-manifold-worlds-imwmal) — screw bug fixed; all 8 worlds dual-verified.
```

> [!IMPORTANT]
> **Decision** — when a backlog item in `docs/sessions/TODO.md` is specific to one
> app, it should also appear in that app's Active list, so the guide is a true
> single-stop view. Move it to Resolved here when it lands, and check it off in
> `TODO.md` too.

### 3d · Tables, code, collapsible detail

Use native Markdown tables (the Key files table is required), fenced code blocks
with a language, and `<details>`/`<summary>` for long secondary material — exactly
as in `REPORT_STYLE.md` §3d–3f.

## 4 · Building a new guide

1. **Copy the template:** `docs/apps/_template-app-guide.md` → `docs/apps/<slug>.md`.
   The `<slug>` is the route hash without `/` and **must** match `src/apps.ts` /
   `categories.mjs`.
2. **Fill the frontmatter** (§1) — all required fields, controlled vocabularies.
3. **Fill the 8 sections** in order. Pull durable architecture/feature content from
   the app's `CLAUDE.md` block, any deep design docs, and its session reports.
   Mark inapplicable sections `_(none yet)_`.
4. **Keep teaching content out** — link `EXPLAINER.md`, don't restate the math.
5. **Add the row** to the index table in `README.md`.

## 5 · Updating a guide

- **Update the guide in the same change that alters the app's behavior or
  structure** — treat it like `EXPLAINER.md`: a behavior/architecture change isn't
  done until its guide reflects it.
- **Bump `updated:`**, and set `status` / `build` accurately.
- **Work the registry:** move items Active → Resolved (with date + branch) when they
  land; add newly discovered work to Active. Keep Resolved newest-first.
- **Cross-link** the session report/handoff that drove the change.

## 6 · Relationship to the other docs

| Doc | Question it answers |
|---|---|
| **This guide** | how the app is built, its state, what's active vs resolved |
| `src/animations/<App>/EXPLAINER.md` | what am I looking at? (teaching/math) |
| `docs/sessions/**` | what happened in one session? (history, append-only) |
| `CLAUDE.md` | how is the whole repo laid out? |

Rendering today: GitHub blob view only (these are not ingested by the control
center or deployed). The schema is parser-ready, so a future build step could index
`docs/apps/` and link each control-center App-map card to its guide — a deliberate
follow-up, not done here.
