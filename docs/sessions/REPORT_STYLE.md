---
kind: progress
session: 2026-06-07-S01
date: 2026-06-07
title: Session Report Style Guide
branch: claude/session-control-center
slug: session-control-center
status: in-progress
build: unknown
followup: null
pr: null
app: null
---

# Session Report Style Guide

This file **is** the style spec: it is written in the proposed Markdown + YAML
report style, so whatever it looks like rendered on GitHub is what every report
will look like. One source, two render targets:

- **GitHub native** (the blob view) — the floor: always readable, no build step.
- **Generated renderer** (control center / `report.css`) — the ceiling: full
  HTML richness from the same Markdown source.

> [!NOTE]
> GitHub strips custom CSS, so the native view can't reproduce timeline dots,
> scroll-spy, or sortable tables. The style approximates those with GitHub-native
> features; the rich versions come from the generated renderer.

## 1 · Frontmatter (the metadata schema)

Every report opens with a YAML frontmatter block. GitHub renders it as a table at
the top of the file, and our generator parses it for the cross-branch index — so
it is both human- and machine-readable. Keep values **flat** (the parser reads
`key: value`).

```yaml
---
kind: progress            # progress | handoff | three-hats | plan
session: 2026-06-07-S01   # YYYY-MM-DD-SNN
date: 2026-06-07
title: Short human title
branch: claude/<branch>
slug: <branch-slug>       # provenance — must match the folder name
status: in-progress       # in-progress | completed | design-only | investigation-only | proposed (plans)
build: unknown            # passed | failed | unknown
followup: null            # null | low | medium | high
pr: null                  # null | a PR URL
app: stable-marriage      # category label(s) — see below; null ⇒ inferred from slug
signals: phone-needed, not-live   # optional — dashboard "Start here" signals (see below)
next: Real-device pass on the new controls.  # optional — one-line next action
thumbnail: assets/foo.png # optional — lead screenshot for the control-center card
---
```

| Field | Required | Notes |
|------|:--:|------|
| `kind` | ✓ | drives the icon/section template. `plan` = a forward-looking, app-specific implementation plan (stored in the branch's `progress/` folder; `status: proposed` until a session executes it, which flips status and fills `pr`) |
| `session` | ✓ | the unit the control center groups by |
| `slug` | ✓ | **provenance**; must equal the folder name |
| `status` / `build` | ✓ | drive the status badges |
| `title` | ✓ | shown in the index and as the `#` H1 |
| `app` | – | category label(s) — drives the control-center chips, grouping, and timeline color (see below) |
| `followup` / `pr` | – | optional; `null` when absent |
| `signals` / `next` | – | optional; feed the control center's **"Start here"** digest (see §1.2) |
| `thumbnail` | – | optional; a local image ref used as the session's control-center thumbnail (else the first image in the body) |

### The `app` category label

`app` tags a report with the part of the project it concerns, so the control
center can show colored chips and **group by app** / **sort by app** / build a
**global timeline**. It accepts one or several comma-separated values:

- an **app slug** from `src/apps.ts` (the route hash without the `/`): e.g.
  `complex-particles`, `plane-transform`, `fractals`, `correspondence`,
  `topology-walk`, `trinary`, `stable-marriage`, `stable-matching`,
  `agentic-sorting`, `polygon-worlds`, `trees-and-nets`. App *names* (`Stable
  Marriage`) also resolve.
- a **cross-cutting token** for work that isn't one app: `chrome` (AppShell /
  global framework), `engine` (shared `src/lib` code), `docs` (explainer/guide
  pages, instructional writing), or `general` (sessions infra, build tooling, chores).

Examples: `app: stable-marriage` · `app: topology-walk, polygon-worlds` ·
`app: chrome`. When `app` is `null`/omitted, the builder **infers** a default
from the branch slug (`docs/sessions/categories.mjs`), so old reports still get a
sensible chip — but setting it explicitly is preferred. The canonical taxonomy and
slug-inference live in `categories.mjs`; add new apps there when `src/apps.ts` grows.

### 1.2 · Dashboard signals (`signals:` / `next:`)

The control center's top **"Start here"** digest surfaces what needs attention.
Two optional flat fields feed it:

- **`signals:`** — a comma/space list from the *closed* vocabulary in
  `categories.mjs` (`SIGNALS`): `needs-dan` (a decision/input is on Dan),
  `phone-needed` / `visual-unverified` (needs a real-device or visual check),
  `not-live` (branch-only, not yet on main). Unknown tokens are ignored, so a typo
  never invents a phantom badge. Declare the ones that are genuinely true — these
  are trusted over inference.
- **`next:`** — one short line: the single most useful next action. Shown under the
  session in the digest and on its card.

The builder also **derives** a few signals from structure so old reports populate
without editing: `high-followup` from a HIGH/CRITICAL Self-reflection level,
`needs-dan` from a `proposed` plan, and `not-live` from a report being absent on
main. Declared signals always win; never infer the consequential ones from prose.

The durable, hand-curated backlog lives in **`docs/sessions/TODO.md`** (rendered as
the top **"To-do"** panel). At **handoff**, append any carry-over work there with a
`[category]`, a `!priority`, and a note that will inform the next round; at **session
start**, read it for orientation. See that file's header for the one-line format.

## 2 · Section structure

Use `##` for sections (GitHub auto-anchors them and offers an outline TOC). Order:

- **progress** — `Purpose` → `Previous session` → `Working notes` (timeline) → content sections.
- **handoff** — `Summary` → `What changed` → `Verification` → `Open / next` → `Self-reflection`.
- **three-hats** — `Executive summary` → numbered findings → `Verdict` → `Self-reflection`.

Keep the H1 (`# title`) for standalone readability even though `title` is in frontmatter.

The closing **`## Self-reflection`** section (verbatim from
`.claude/prompts/self-reflection.md`) is not just prose: the control center's
**Reflections** view scrapes that heading and the final
`**Follow-up value:** <LEVEL> — …` line (LEVEL ∈ CRITICAL/HIGH/MEDIUM/LOW/NONE) to
build its exit-interview digest, severity-sorted with a color-coded badge. Keep the
heading and that line exact so the digest picks the report up. (Run
`npm run sessions:lint` to confirm your report parses — it validates the frontmatter
enums, the scraped level, and the timeline against this guide.)

The Reflections digest only *surfaces* recurring lessons; the
**[recurring-lessons ledger](RECURRING_LESSONS.md)** is where a lesson seen in ≥3
reflections gets *enacted* — promoted to a durable rule + check and retired from the
recurring list. If your self-reflection repeats a lesson already in that ledger as
🟡/🟢 Promoted, the rule isn't landing — say so (it's a sign to reopen the entry),
don't just re-log it.

## 3 · Elements

### 3a · Status & badges

Encode status with a leading emoji + word (redundant, CVD-safe):

- ✅ `completed` · 🟡 `in-progress` · ⚪ `design-only`
- Build: ✅ `passed` · ❌ `failed` · ⚠️ `not run`

### 3b · Callouts → GitHub alerts

Map the four HTML callout types onto GitHub's five alert blockquotes:

| Report callout | GitHub alert |
|---|---|
| note | `> [!NOTE]` |
| (tip) | `> [!TIP]` |
| decision | `> [!IMPORTANT]` |
| warn | `> [!WARNING]` |
| gotcha | `> [!CAUTION]` |

> [!IMPORTANT]
> **Decision** — this is how a decision callout renders. Lead with a bold label
> so the intent is clear even where alert styling is unavailable.

> [!CAUTION]
> **Gotcha** — use this for the traps and fragile assumptions.

### 3c · Timeline (working notes)

The HTML timeline becomes a list of dated entries, **newest first**. Each entry:
an `###` heading with `emoji · type · HH:MM — what`, then a bold **Why:** line,
then optional detail. The emoji stands in for the colored dot:

🟣 decision · 🟢 code · 🔵 finding · 🔴 blocker · 🟡 milestone

#### 🟡 milestone · 20:35 — Final status & roadmap delivered
**Why:** user asked for a prioritized plan after the review landed.
Folded the three-hats findings together with the design discussion; recorded the
"both, as a mode" decision.

#### 🔵 finding · 20:20 — Correctness, not styling, is the headline
**Why:** the review converged on engine/model issues, not CSS.
The CSS is the strongest part of the file; the real work is the duplicated engine
and the model-vs-claim mismatch.

### 3d · Tables

Native Markdown tables render cleanly on GitHub and carry most of what the HTML
`<table>` did:

| Area | State | Note |
|---|---|---|
| Stability check | ✅ correct | `verifyStability` is sound |
| The metric | ❌ wrong question | no baseline for "advantage" |

### 3e · Collapsible detail

Long or secondary material uses `<details>` (GitHub supports it) to keep reports
scannable — the "layered" reading the explorer also wants:

<details>
<summary>Raw blocking-pair scan notes</summary>

For every unmatched (m, w), check whether both strictly prefer each other to their
current partner; unmatched ⇒ rank +∞. O(n³) via nested `indexOf`; fine at n ≤ 100.

</details>

### 3f · Code

Fenced blocks with a language for highlighting:

```ts
galeShapley(prefs, { proposingSide: 'men' | 'women' | 'market', bias? })
  → { matching, log }
```

### 3g · Screenshots

Include a screenshot **when the state is something you can only judge visually** —
a render, a UI before/after, a chart, a diff that a sentence can't carry. Skip them
for purely textual or numeric results.

Store images next to the report in an `assets/` folder and reference them with a
**relative** path and a caption:

```text
docs/sessions/<kind>/<slug>/assets/<session>-<name>.png
![A short caption that says what to look at](assets/2026-06-08-S01-torus.png)
```

That same relative path renders inline on GitHub **and** as a captioned `<figure>`
in the generated HTML (the build mirrors `assets/` into the rendered tree). Set
`thumbnail:` in the frontmatter to choose the lead image shown on the control
center; otherwise the first image is used.

> [!TIP]
> Capture headless shots with `scripts/shoot.mjs` (software-WebGL) and write them
> straight into the report's `assets/`. Keep shots reasonably sized — the build
> prints a total screenshot-bytes budget, and `prune-assets.mjs` trims old ones.

![Example: a captured app view renders as a captioned figure](assets/topology-walk.png)

## 4 · Element mapping (HTML → Markdown)

| Current HTML | Markdown equivalent | GitHub-native? |
|---|---|---|
| `report-meta` JSON island | YAML frontmatter | ✓ (renders as table) |
| `<section><h2>` + auto-TOC | `##` headings + outline button | ✓ |
| `.timeline` `li.tl[data-type]` | `###` entry + emoji + **Why:** | ✓ (approximated) |
| `.callout-*` | `> [!NOTE/IMPORTANT/WARNING/CAUTION]` | ✓ |
| `.badge-ok/warn/bad` | ✅ / 🟡 / ❌ emoji + word | ✓ |
| `<table>` (sortable) | Markdown table | ✓ (not sortable) |
| collapsible sections | `<details>` / `<summary>` | ✓ |
| `<pre><code>` | fenced code block | ✓ |
| `<figure>` + caption | `![caption](assets/…)` standalone line | ✓ |
| scroll-spy / sticky TOC | — | ✗ (generated view only) |

## 5 · Rendering targets

- **GitHub blob** — `https://github.com/<owner>/<repo>/blob/<branch>/<path>` renders
  this natively. This is the everyday read.
- **Generated control center** — the cross-branch generator parses this same
  frontmatter/body and can emit the rich `report.css` view (timeline dots,
  scroll-spy) for parity with the old HTML.

> [!NOTE]
> Open this file on GitHub (not githack — githack serves raw `.md` unrendered) to
> judge the native rendering.
