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
kind: progress            # progress | handoff | three-hats
session: 2026-06-07-S01   # YYYY-MM-DD-SNN
date: 2026-06-07
title: Short human title
branch: claude/<branch>
slug: <branch-slug>       # provenance — must match the folder name
status: in-progress       # in-progress | completed | design-only | investigation-only
build: unknown            # passed | failed | unknown
followup: null            # null | low | medium | high
pr: null                  # null | a PR URL
app: StableMarriage       # optional — the src/animations/<App> this concerns
---
```

| Field | Required | Notes |
|------|:--:|------|
| `kind` | ✓ | drives the icon/section template |
| `session` | ✓ | the unit the control center groups by |
| `slug` | ✓ | **provenance**; must equal the folder name |
| `status` / `build` | ✓ | drive the status badges |
| `title` | ✓ | shown in the index and as the `#` H1 |
| `followup` / `pr` / `app` | – | optional; `null` when absent |

## 2 · Section structure

Use `##` for sections (GitHub auto-anchors them and offers an outline TOC). Order:

- **progress** — `Purpose` → `Previous session` → `Working notes` (timeline) → content sections.
- **handoff** — `Summary` → `What changed` → `Verification` → `Open / next` → `Self-reflection`.
- **three-hats** — `Executive summary` → numbered findings → `Verdict` → `Self-reflection`.

Keep the H1 (`# title`) for standalone readability even though `title` is in frontmatter.

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
then optional detail. The emoji stands in for the coloured dot:

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
