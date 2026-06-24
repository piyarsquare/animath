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

### 🟢 code · 14:05 — Phase 1 done: semantic/data tokens on all skins + 3 new skins, verified
**Why:** Pure-addition foundation that unblocks every color task; ship and eyeball
it before building on it (R1 — verify visual changes with my eyes).

Additive edits to `theme.css` + `skins.tsx` (+ a `previews.tsx` source fix):
- **Semantic/elevation/data/font tokens on all 5 existing skins:** `--danger(-soft)`,
  `--success(-soft)`, `--shadow-1/2/3`, `--data-1…7`, `--font-scale` — values
  tuned per skin from the doc. Counts verified: 8× each across skins, `--font-scale`
  9× (8 skins + `:root` default).
- **3 new skins** appended: **Daylight** (cool white · blue), **Primary** (Bauhaus
  primaries), **Mirage** (plum dusk · peach + lavender). Registered in `skins.tsx`
  (doc comment "five"→"eight").
- **`--font-scale` consumer = Option A** (doc's recommendation): a scoped
  `[data-theme="phosphor"] .am-app/.am-gallery-app { zoom: var(--font-scale) }`.
  **Verified by screenshot** the zoom does NOT create a layout gap at gallery or
  app level (the worry with `zoom` on a full-bleed root) — Phosphor type now sits
  right-sized.
- **New light-skin fix (from the audit):** the *only* hard-coded `skin === 'light'`
  test lived at `previews.tsx:890` — it rendered Daylight/Primary gallery cards as
  dark. Fixed at the source: added a `light?` flag to the `Skin` descriptor +
  `isLightSkin(id)` helper in `skins.tsx`; `previews.tsx` now calls it. Re-shot the
  Daylight gallery — preview cards now render light. (No app engine has this test;
  it was isolated to that one chrome file.)
- Docs: DESIGN-SPEC §5 token list + skin table + the light/dark note updated (additive).

**Checks:** `npm run build` ✓, `npm run lint` ✓ 0 errors (60 baseline warnings),
`npm test` ✓ 78/78. Visual: gallery in daylight/primary/mirage/phosphor + Stable
Matching in phosphor & daylight all render cleanly (screenshots in scratch).

### 🟣 decision · 13:50 — Execution plan locked; both flags resolved by Dan
**Why:** Dan approved both flagged calls and directed: execute the package, fan
out subagents per app to apply the rules, but have one coherent single pass do
the compliance checking.

- **Flag 1 (retired):** Stable Marriage stays retired — its `02-COLORMAPS.md` row
  redirects to **Stable Matching**; the deleted app is not resurrected.
- **Flag 2 (rename):** Resolve the Trinary "Observatory" skin/mode clash by
  renaming the **mode** (not the skin). Going with **Sandbox ⇄ Lab** to match
  Agentic Sorting's existing single-instance⇄batch naming (doc 03 §B suggestion).

Plan:
1. **Phase 1 (me, serial):** additive tokens on all 5 skins + 3 new skins
   (Daylight/Primary/Mirage) + `--font-scale` (Option A: Phosphor `zoom`). Shared
   files `theme.css`/`skins.tsx` — must be exact, not delegated.
2. **Phase 2 (me, serial):** `colormapRegistry.ts` + `<ColormapPicker>` + vitest;
   doc notes in DESIGN-SPEC/IN-PROGRESS. Net-new shared infra.
3. **Compliance audit (single read-only agent, launched now, background):** the
   "someone goes through singly" pass — confirm doc-03 hypotheses against source
   for all apps, produce the authoritative per-app task list. Concurrent with
   Phase 1/2 (read-only → safe).
4. **Per-app fixes:** Stable Matching first (the reference others copy), then fan
   out subagents for the remaining offenders, each scoped to its own
   `src/animations/<App>/` folder (disjoint → conflict-free).
5. **Final single compliance re-check + skin tour;** build/lint/test; update report.

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
