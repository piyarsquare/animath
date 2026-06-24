---
kind: progress
session: 2026-06-24-S01
date: 2026-06-24
title: Chrome design cleanup — execute the Claude Design hardening handoff
branch: claude/youthful-cray-7m6z9d
slug: youthful-cray-7m6z9d
status: in-progress
build: passed
followup: null
pr: null
app: chrome
next: Optional Phase-5 polish (all tracked in TODO.md): adopt the discrete colormap in Agentic Sorting; tokenize residual DOM color on the compliant apps; Complex Particles hint occlusion; full 8-skin tour sweep.
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

### 🔵 finding · 14:55 — Phase 5 spot-check: the "compliant" apps hold on light skins
**Why:** Before tokenizing the audit's "minor color" notes on the ✓ apps, verify
whether they actually break on a light skin (R1) — don't fix what isn't broken,
and don't risk regressions on already-compliant apps for invisible gains.

Screenshot-checked Trees and Nets + Plane Transform in **Daylight**: both render
cleanly — light panels, light view windows, semantic mark colors legible. Neither
has Stable Matching's old hard-dark-stage breakage (SM was the outlier — a fully
hardcoded `#0c0c10` DOM stage). So the residual DOM-color tokenization on the
compliant apps (Polygon/Solid HUDs, Trinary preset buttons, the SVG mark constants)
is genuine **low-value polish** — no visible skin breakage — now captured in
`TODO.md` rather than risked this session.

**Status:** the package's core (the audit's needs-fix apps + the missing tokens,
skins, and colormap registry) is complete and verified. Remaining items are
optional polish, all tracked.

### 🟡 milestone · 14:45 — Phase 4 complete: all 5 fan-out apps fixed, centrally verified
**Why:** The orchestrator is the single verification pass — agents didn't build/commit,
so I run one central build/lint/test and screenshot every app (R1) before committing.

Central gate green: **build ✓, lint ✓ 0 errors, test ✓ 88/88**. Screenshot-verified
each app (default skin):
- **Agentic Sorting** — Run panel = Step-interval + Wake-rate only; Start/Reset strip-only. ✓
- **Trinary** — mode pill now **"Explore | Lab"**, transport (Pause/Reset) strip-only. ✓
- **Counting the Ways** — Build-it panel = Speed only; Play/Next/Reset strip-only. ✓
- **Argand** — bottom HUD has only the t/j² scrubbers + System pills; feed mode lives
  solely in the top-bar Point/Shape/Grid pills. ✓
- **Correspondence** — Draw path / Play / Clear path now on the always-on strip
  (it previously had none); Seed panel clean. ✓

> [!WARNING]
> **Caught two bugs by verifying (code + pixels, not just the agent's word).** The
> Trinary agent renamed the mode to "Sandbox" — which (a) collided with Trinary's
> *existing layout* named "Sandbox", and (b) it missed `TrinaryLab.tsx`'s mode pill
> (still "Observatory") and the tour copy, so the two views disagreed. Fixed by
> renaming the mode to **"Explore"** (clash-free with the skin *and* every layout
> name) consistently across both views + the tour copy. Lesson: a rename's target
> must be checked against *all* sibling namespaces (skins · layouts · modes), and
> a fan-out agent's single-file edit needs a whole-app consistency sweep.

**Deferred (tracked):** Agentic Sorting's Okabe-Ito agent palette → discrete registry
(feeds 3 surfaces, needs an atomic cross-skin pass; already colorblind-safe).

### 🟢 code · 14:40 — Phase 4: fanned out 5 per-app fixer subagents (4 returned, 1 running)
**Why:** Dan asked to deploy subagents to apply the rules across apps; the apps are
self-contained folders (disjoint → conflict-free), so one agent each, scoped to its
folder, no git/build (I verify centrally), referencing the Stable Matching pattern.

Results so far (each constrained to `src/animations/<App>/`, returns a change summary):
- **Counting the Ways** ✓ — transport dedup only (Play tutorial/Next/Reset + Run&log/Clear
  removed from panels; now strip-only). Confirmed zero color changes (already token-clean).
- **Agentic Sorting** ✓ — transport dedup (sandbox START/PAUSE/Reset + lab Run removed from
  panels) + dead-CSS-rule cleanup. **Deferred** the discrete-colormap swap with a clear
  rationale (the Okabe-Ito palette feeds 3 independent surfaces — canvas, DOM swatches,
  LabResults — that must convert atomically; it's already colorblind-safe; needs a focused
  pass with cross-skin visual verification). Good conservative call → tracked as follow-up.
- **Argand** ✓ — removed the duplicate Point/Shape/Grid switcher from the bottom HUD, kept the
  framework-native top-bar mode pills (verified the immersive layout still shows them). Left
  the semantic `_COL` mark constants. (Noted a 3rd feed surface — the Input panel Pills —
  left as a tolerated panel-mirrors-mode pattern.)
- **Trinary System** ✓ — Observatory transport dedup; **renamed the mode label "Observatory"
  → "Sandbox"** (kept the persisted id) to clear the skin-name clash; **projected the Lab's
  transport to a strip via a proper Drive-tier panel** (avoiding the Analyze-tier ActionBar
  warning — careful, correct); tokenized HUD chrome colors, left scene/outcome semantics.
- **Correspondence** ⏳ — projecting path transport (Draw/Play/Clear) to an `actions:` strip;
  running.

Pattern held across all: transport verbs land once (in `actions:`), params stay in panels,
semantic/scene colors left alone, shared infra (registry/picker/useThemeId) reused. Next:
central build+lint+test, screenshot-verify each, then commit.

### 🟢 code · 14:25 — Phase 3 done: Stable Matching, the reference compliance fix (verified)
**Why:** The doc's worked example the other apps copy — so it must be done by
hand and screenshot-verified to calibrate the pattern.

Applied all relevant checks end-to-end:
- **C1 transport dedup:** removed Play/Step/Finish/Reset (and the RVV Back-to-run)
  from the Playback panel — they now live only in the always-on action strip. The
  panel keeps the round readout + *params* (Speed, one-shot Stabilize, jump-to).
- **Colormap adoption:** replaced the hard-coded `BURD` array with the registry
  (divergent family, default RdBu) via a `<ColormapPicker>` in a new **Color**
  panel. The legend swatch is driven by the active map (`--sm-scale`) and its text
  made color-agnostic ("best #1 → worst"), so it stays honest on any divergent map.
- **CSS tokenized:** stage/card backgrounds, borders, body+dim text, buttons,
  tooltip/inspect surfaces → theme tokens (the matrix pane was hard-dark `#0c0c10`
  and broke on light skins). Semantic state markers (gold/purple/green/teal/red)
  deliberately kept — they're meaningful encodings, like 3D scene color.
- **Shared infra:** added `useThemeId()` to `skins.tsx` (reactive current-skin via
  MutationObserver) so the picker re-curates when the skin changes.

**Verified by screenshot** (daylight + dark): matrix pane now follows the skin,
transport is strip-only, Color panel in the rail, matrix renders, dark unregressed.
Build/lint/test green (88 tests, 0 lint errors). This is the template the fan-out copies.

### 🟢 code · 14:10 — Phase 2 done: typed per-theme colormap registry + `<ColormapPicker>` + tests
**Why:** DOM/2D apps each hard-code their own ramp because `lib/colormaps.ts` is
GLSL-only (uncallable from JS). This is the shared resource that lets them stop.

- **`src/lib/colormapRegistry.ts`** (new): colormaps typed by *family* — sequential /
  divergent / discrete / cyclic — where **discrete = the skin's `--data-1…7` tokens**,
  read live via `discreteStops()`. `THEME_MAPS` gives per-skin recommendations (all 8
  skins keyed); `themeMapsFor` falls back to the whole family for an unknown skin;
  `mapStops`/`gradientCss`/`sampleStops` (the last buckets a ramp into N classes —
  what the DOM adopters need). Shader apps stay on `lib/colormaps.ts`; the shared
  names (Viridis/Magma/…) match on both sides.
- **`<ColormapPicker>`** added to `components/ControlPanel.tsx` (the `color`-tier
  control): family header + recommended-swatch grid + "Other families (advanced)"
  disclosure (incl. Discrete = theme palette) + optional Reverse; re-curates when
  `themeId` changes. Styled with new `cp-cmap-*` classes on the `--cp-*` tokens.
- **Tests:** `src/lib/__tests__/colormapRegistry.test.ts` — 10 cases covering the
  `themeMapsFor` fallback and `discreteStops` parsing (stubbed `getComputedStyle`),
  per R4 (test extractable pure logic on write).
- Recorded the registry decision in `docs/redesign/IN-PROGRESS.md` (additive).

No app consumes it yet (that's Phase 3+). **Checks:** build ✓, `npm test` ✓ 88/88
(+10), lint ✓ 0 errors.

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
