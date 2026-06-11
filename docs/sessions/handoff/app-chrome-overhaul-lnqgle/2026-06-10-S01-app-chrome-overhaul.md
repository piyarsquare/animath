---
kind: handoff
session: 2026-06-10-S01
date: 2026-06-11
title: Chrome overhaul — review, three hats, PRs A–D, main sync
branch: claude/app-chrome-overhaul-lnqgle
slug: app-chrome-overhaul-lnqgle
status: completed
build: passing
followup: null
pr: 208
app: chrome
---

# Chrome overhaul — review, three hats, PRs A–D, main sync

## Summary

A whole-scale chrome session that ran the full arc: a design review of every
app's chrome against three user-reported gaps (`docs/redesign/CHROME-REVIEW.md`,
findings F1–F11), a three-hats expert review of that plan (all endorsed, with
errata), then implementation of the entire agreed plan of record — **PR A**
(fullscreen control access + the unbounded-z bug), **PR B** (always-on action
strip), **PR C** (split views; Plane Transform became one window), **PR D**
(start hints + ungated Correspondence tap-to-pick) — followed by the
finalization merge of `origin/main` (Trees and Nets, Complex Particles fixes,
the AgenticSorting rewrite) and four new FUTURE_APPS entries. Everything rides
**draft PR #208**; build green at `524343a`; 20 vitest tests + 31 headless
probe checks green on the merged tree.

## What changed

- **Review + three hats** (`docs/redesign/CHROME-REVIEW.md` + four expert
  reports in this branch's progress folder): root cause of all three gaps —
  every control lived in a dismissible panel; no concept of permanent controls
  or inseparable view pairs. The experts verified the audit, corrected F9
  ("geometrically wrong" → *scale incommensurability*), found the unbounded
  persisted-z bug, and deferred P3 (HUD) / P4b (phone fullscreen dock).
  User decisions, all yes: ungate tap-to-pick · adopt vitest · embeds carry
  the strip (scoped: the embed `buttons=` row is its form).
- **PR A** (`862c0b4`): window z compacted to 1..n in `sanitize()` /
  `raiseWindow()`; layer scale named once (`workspace/layers.ts` ↔ `--z-*`
  tokens); panels re-base above fullscreen (`zBase`) so the rail works there;
  **staged Esc** via one shared layer stack (`useEscLayer` replaced five
  scattered keydown listeners; panels stay ✕-only); explainer portaled to
  `<body>` with a `?` on the fullscreen header (desktop + phone).
- **PR B** (`765d186`): `ActionDef` + `WorkspaceProps.actions` — buttons-only
  by type, ≤5, one `primary`, static labels, `sectionId` must project a
  Drive-tier panel (`validateActions`). Strip renders bottom-center (desktop)
  / labeled row above the dock (phone), persists through fullscreen. Wired:
  Stable Matching (contextual GS-run ↔ RVV-replay), Stable Marriage, Agentic
  Sorting, Trinary Observatory. Pause/step/finish added as utility icons.
- **PR C** (`a1acb89`): `ViewDef` became a discriminated `node | panes` union;
  `SplitPanes` = fixed equal split (no divider, by ruling), shared by
  ViewWindow / phone cards / the embed. Plane Transform: one window
  `z ↦ f(z)`, panes `z — domain` / `w = f(z) — image`, fresh id `plane`.
  Correspondence deliberately stays two windows.
- **PR D** (`68fc33e`): `ViewDef.hint` start invitations on a pass-through
  `.am-view-overlay` layer (the future P3 HUD home), per-session, gone on
  first pointer. Correspondence's Seed arm button removed — tap picks `c`
  directly.
- **Main sync** (`a16f3b9`): kept both new `WorkspaceProps` props (`actions` +
  main's `topExtra`); took main's rewritten AgenticSorting and re-wired the
  strip contextually (sandbox Start/Pause+Reset → `setIsRunning`/`regenerate`
  on `'run'`; lab "Run experiment" → `runLab` on `'labRun'`); nudged Trees and
  Nets' panel column `x:16 → 84` (panels opened under the floating rail).
- **FUTURE_APPS** (`524343a`): added **Fourier Analysis · Eigenvalues &
  Spectra · Heat Kernel · Clustering** (full template each) + a "spectral
  throughline" note: a shared `lib/spectral` eigensolver + spectrum-strip
  readout unifies 8–10, and spectral clustering ties 11 back in.

## Key files

| File | Role |
|---|---|
| [`docs/redesign/CHROME-REVIEW.md`](https://github.com/piyarsquare/animath/blob/524343a4d5b41817175dca84747ee46e7707f56e/docs/redesign/CHROME-REVIEW.md) | the review: F1–F11, P1–P5, plan of record with ✅ landed markers |
| [`src/chrome/workspace/layers.ts`](https://github.com/piyarsquare/animath/blob/524343a4d5b41817175dca84747ee46e7707f56e/src/chrome/workspace/layers.ts) | the named z-layer scale (mirrors `--z-*` in theme.css) |
| [`src/chrome/useEscLayer.ts`](https://github.com/piyarsquare/animath/blob/524343a4d5b41817175dca84747ee46e7707f56e/src/chrome/useEscLayer.ts) | single Esc owner (stack logic in `escStack.ts`, unit-tested) |
| [`src/chrome/workspace/ActionBar.tsx`](https://github.com/piyarsquare/animath/blob/524343a4d5b41817175dca84747ee46e7707f56e/src/chrome/workspace/ActionBar.tsx) | the action strip + `validateActions` |
| [`src/chrome/workspace/SplitPanes.tsx`](https://github.com/piyarsquare/animath/blob/524343a4d5b41817175dca84747ee46e7707f56e/src/chrome/workspace/SplitPanes.tsx) | the split-view body (window/phone/embed) |
| [`src/chrome/workspace/types.ts`](https://github.com/piyarsquare/animath/blob/524343a4d5b41817175dca84747ee46e7707f56e/src/chrome/workspace/types.ts) | `ActionDef`, `PaneDef`, the `node \| panes` union, `hint` |
| [`src/chrome/workspace/layouts.ts`](https://github.com/piyarsquare/animath/blob/524343a4d5b41817175dca84747ee46e7707f56e/src/chrome/workspace/layouts.ts) | `compactZ` / `raiseWindow` (the z-bug fix) |
| [`scripts/probe-{fullscreen,actionbar,split,hints}.mjs`](https://github.com/piyarsquare/animath/blob/524343a4d5b41817175dca84747ee46e7707f56e/scripts/probe-fullscreen.mjs) | 31 headless interaction checks (run after `npm run build` + preview) |
| [`docs/FUTURE_APPS.md`](https://github.com/piyarsquare/animath/blob/524343a4d5b41817175dca84747ee46e7707f56e/docs/FUTURE_APPS.md) | backlog incl. the new spectral wave (apps 8–11) |

## Open / not done

- **PR #208 is still a draft.** It is synced with main, conflict-free, and
  fully verified — flipping it ready-for-review is the next step when the user
  says so.
- **A real-device phone pass** on the strip, hints, and fullscreen panels —
  everything was verified headlessly (390×844 viewport), not on hardware.
- **Deferred by three-hats ruling** (in IN-PROGRESS): **P3** `ViewDef.hud` —
  design against TopologyWalk's *actual* overlay inventory (MovePad + mini-map
  + captions) before generalizing; **P4b** phone fullscreen dock access.
- Smaller follow-ups in the ledger: Plane Transform's hint could *arm* draw
  mode instead of naming the Curves panel; Correspondence zoom-lock; the
  archetype icon-collision question raised by Agentic Sorting.
- FUTURE_APPS spectral wave: `lib/spectral` (symmetric eigensolver +
  graph-Laplacian builders) is the shared investment to build first.

## Context

> [!IMPORTANT]
> The strip's constraints are **structural by ruling** (three hats, recorded in
> IN-PROGRESS "Deliberate removals"): buttons-only type, ≤5 enforced, static
> labels, `sectionId` projection of a Drive-tier panel. Don't loosen them —
> that's how the old PlaybackFloater comes back.

> [!CAUTION]
> `npm test` includes `vitest.config.ts` scoping to `src/**` because a legacy
> `sh-test/project.test.cjs` matches vitest's default glob and fails. Window z
> is auto-compacted on every sanitize/raise — don't reintroduce raw
> `topZ + 1` persistence.

- Probes need the preview server: `npm run build && (npm run preview &)` then
  `node scripts/probe-<name>.mjs` (env `BASE_URL`, `SHOTS=1` for PNGs).
- The Esc stack is capture-phase and consumes the event only when a layer is
  open; app-level key handlers are unaffected otherwise.
- Phone strip clearance: `.am-has-actions` pads `.am-phone-scroll` (148px);
  the strip sits at `bottom: 76px` above the dock.
- AgenticSorting renders one `<Workspace key={mode}>` per mode with different
  appIds — its strip is built per mode; lab's `labReady`/`labRunning` gate the
  Run action.
- The session progress report (same folder) has the full timeline with five
  verification screenshots.

## Self-reflection

1. **What would you do with another session?** Flip PR #208 to ready and merge
   after a hardware phone pass; then start P3 properly — inventory
   TopologyWalk/PolygonWorlds' real overlays and design `ViewDef.hud` against
   them, reusing the `.am-view-overlay` layer PR D already laid down.
2. **What would you change about what you produced?** The original review's
   F9 claim ("geometrically wrong") was rhetoric ahead of verification — all
   three experts caught it. Trace the code before writing the strongest
   sentence. Also, the AgenticSorting strip was wired twice (once pre-rewrite,
   once post-merge); checking main's in-flight branches first would have
   avoided the throwaway.
3. **What were you not asked that you think is important?** The deployed Pages
   site only updates on merge to main — none of this chrome work is live until
   #208 merges, and the longer it stays draft the more app rewrites (like
   AgenticSorting's) will need strip re-wiring on sync.
4. **What did we both overlook?** New apps keep landing with chrome-conformance
   nits (Trees and Nets' panels under the rail at `x:16`) because nothing
   validates authored layouts; a dev-time warning for panels intersecting the
   rail band would catch this class for free.
5. **What did you find difficult?** Reconciling the experts' P2/P3 ordering
   dispute — it dissolved only once "overlay layer" (infrastructure) was
   separated from "hud API" (contract); the synthesis hinged on that split.
6. **What would have made this task easier?** The probe pattern paid off
   exactly as the prior handoff predicted — but each probe re-implements
   launch/check boilerplate; a tiny shared `scripts/probe-lib.mjs` would cut
   each new probe to ~20 lines.
7. **Follow-up value:** **LOW** — the plan of record is fully landed, synced,
   and verified; what remains is a merge decision, a hardware pass, and
   deliberately deferred design work (P3/P4b).
