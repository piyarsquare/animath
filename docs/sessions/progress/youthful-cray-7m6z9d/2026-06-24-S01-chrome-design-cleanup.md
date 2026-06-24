---
kind: progress
session: 2026-06-24-S01
date: 2026-06-24
title: Chrome design cleanup — execute the Claude Design hardening handoff
branch: claude/youthful-cray-7m6z9d
slug: youthful-cray-7m6z9d
status: in-progress
build: unknown
followup: null
pr: null
app: chrome
next: With Dan's go-ahead, start Phase 1 (additive tokens + 3 skins in theme.css/skins.tsx) — pure addition, unblocks everything; then the colormap registry.
---

# Chrome design cleanup — execute the Claude Design hardening handoff

## Session purpose

Reinforce and improve a coherent **design contract across apps**. We have been
working with **Claude Design** to get a cleaner, more consistent UI; this session
reviews the attached design-hardening handoff package and (pending Dan's
direction) executes it. The package is explicitly an **enforcement + four
genuinely-missing-pieces** effort, *not* a redesign — the chrome is already sound.

## Previous session

**First tracked session on this branch** (`youthful-cray-7m6z9d`). The most recent
handoff across all branches is
[`repo-priorities-review-1kse64` S01 (2026-06-23)](../../handoff/repo-priorities-review-1kse64/2026-06-23-S01-repo-priorities-review.md)
— a docs/process/triage session (shelved the quaternion PR #223, merged Complex
Particles #230, productionized the signals/to-do system). Build green, no open
PRs. **Unrelated topic**, but it left the repo clean and flagged the relevant
`[chrome]` backlog items (theme-driven graphics, App-map richness) and the
Stable-Marriage→Stable-Matching retirement that this design work builds on.

## The handoff package (attached zip)

A `handoff/` work order authored by Claude Design from the screenshot tour +
repo docs (`DESIGN-SPEC.md`, `PARAM-MAP.md`, `theme.css`, `skins.tsx`,
`archetypes.ts`, `colormaps.ts`). Four docs + two reference HTML prototypes:

| Doc | Scope |
|---|---|
| `README.md` | Framing: most of a "design contract" is **already built** (ActionBar transport, 11-archetype rail, layouts-not-tabs, skins-by-attribute). Don't rebuild — enforce + add the missing pieces. |
| `01-TOKENS.md` | **Phase 1.** Additive semantic/elevation/data/font tokens (`--danger`, `--success`, `--shadow-1/2/3`, `--data-1…7`, `--font-scale`) on all 5 skins + **3 new skins** (Daylight, Primary, Mirage). |
| `02-COLORMAPS.md` | **Phase 2.** New typed, per-theme `src/lib/colormapRegistry.ts` + `<ColormapPicker>` for DOM/2D apps (shader apps stay on `lib/colormaps.ts`). |
| `03-EXECUTION.md` | **Phases 3–5.** Per-app compliance: dedupe transport into `actions:`, kill hard-coded color, group rails, fix Compact-layout overlaps. Per-app claims are screenshot-derived **hypotheses to confirm against source**. |

The two `reference/*.html` files (Control Contract, Stable Matching reference) are
**visual prototypes only** — encode intended behavior, do not port literally.

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 13:42 — Session oriented; design package reviewed and premises verified
**Why:** Start-session requires reading the latest handoff, the backlog, and the
session focus before any work — and the package itself asks that its premises be
verified against source before trusting them.

Read all four handoff markdown docs + confirmed the reference HTML files are
prototypes. Ground-checked the package's foundational (non-per-app) premises
against the live repo — all hold:

- **`src/chrome/workspace/ActionBar.tsx` exists** (+ a vitest) — the always-on
  transport strip the package treats as the single home for Play/Step/Run is
  real, so the "dedupe transport into `actions:`" tasks have a real target.
- **Exactly 5 skins today** in `skins.tsx`: `dark` (Observatory), `light`
  (Paper), `neon` (Spectrum), `blueprint` (Blueprint), `phosphor` (Phosphor) —
  matches the package; the 3 new skins are genuinely additive.
- **The semantic/data tokens are genuinely absent** in `theme.css`: `--danger`,
  `--success`, `--shadow-1/2/3`, `--data-1…7`, `--font-scale` all return **0
  occurrences**; only a single `--shadow` exists (5 uses) — exactly the "one
  shadow, no danger/success, no data ramp" gap the package describes.
- **`colormapRegistry.ts` and `<ColormapPicker>` do not exist yet** — Phase 2 is
  net-new, not a rebuild.

Conclusion: the package's scope is accurate and its "additive, enforce-don't-rebuild"
framing matches reality. Ready to execute on Dan's go-ahead, starting with the
pure-addition Phase 1.

### 🔵 finding · 13:42 — Package dovetails with three open `[chrome]` backlog items
**Why:** Worth noting so the work isn't duplicated and the backlog stays the
source of truth.

- `[chrome] !med Make graphics consistently theme-driven` — the colormap registry
  (Phase 2) + `--data-*` tokens are the mechanism this item asked for; the
  `SkellamPreview` getComputedStyle pattern is the model the registry generalizes.
- `[chrome] Decide Stable Marriage's final fate — DONE (eliminated)` — the package
  still lists a "Stable Marriage" heatmap app in the 02 colormap table; that app
  is **retired** (folded into Stable Matching). Note for execution: skip/redirect
  that row to Stable Matching, don't resurrect the dead app.
- The Trinary **"Observatory" naming clash** (skin name vs. mode name) the package
  flags is a real copy collision worth Dan's call (rename the *mode*, not the skin).
