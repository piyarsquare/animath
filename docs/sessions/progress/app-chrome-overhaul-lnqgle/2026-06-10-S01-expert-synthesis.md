---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: Three hats — Convergence analysis on CHROME-REVIEW
branch: claude/app-chrome-overhaul-lnqgle
slug: app-chrome-overhaul-lnqgle
status: completed
build: unknown
---

# Three hats — Convergence analysis on CHROME-REVIEW

## Plan under review

<details><summary>Original request</summary>

> I would like you to run a design review of the Chrome for all of the
> different applications. something I think we did not address properly in the
> original design spec is that some spaces require buttons to be present.
> always on screen. for example, an app without a play button for things like
> stable matching generates an unsatisfying result. the user does not know
> where to begin. another issue I have found is that in full screen mode, I
> sometimes still want to access some controls. One other catch is treating
> the planer plots as two different windows in the complex plane plot code.

— followed by: "I think a three hats review of your plan and plan documents is
an excellent idea. please begin."

The full plan is `docs/redesign/CHROME-REVIEW.md` (findings F1–F11, proposals
P1–P5). Its recommended order of work, as reviewed:

| # | Item | Size | Fixes |
|---|---|---|---|
| 1 | P4a — panels above fullscreen + staged Esc (bug fix) | S | F5, F6 |
| 2 | P1 — action strip, desktop + phone (+ persists in fullscreen) | M | F1, F2, F7 |
| 3 | P5 — split-view primitive; migrate Plane Transform | M | F8–F10 |
| 4 | P2 — per-view start hints for the gesture apps | S | F4 |
| 5 | P3 — `ViewDef.hud`; migrate the MovePads | M | F3 |
| 6 | P4b — phone fullscreen dock/sheet access | S | F7 (phone) |

The three expert reports are in this folder:
`…-expert-maintainer.md` · `…-expert-consultant.md` · `…-expert-pedagogy.md`.

</details>

## 1. Points of agreement (high confidence)

All three experts **endorse the plan** and independently verified its audit
against the code. Specific unanimous points:

- **Root cause confirmed.** "Every control lives in a dismissible panel; no
  two views can be bound" is the correct diagnosis of all three reported gaps.
- **The vocabulary stays closed.** Treating the action strip and HUD as
  *placements*, not new archetypes, is exactly right; the surface taxonomy
  (strip = app transport · hint = gesture invitation · HUD = view manipulation
  · panes = metrically-linked pair) is clean and justified.
- **F9 is overstated and must be reworded** (all three, independently).
  Each Plane Transform pane is *internally* consistent at any size — the SVG
  curve overlay and the GPU points share the same inscribed-square transform.
  What mismatched panes break is **cross-pane commensurability** (same
  mathematical length, different pixels-per-unit), which silently invites
  false inferences about |f′| — and that comparison *is* the pedagogical
  content. The fix (P5) is equally justified under the precise wording;
  the imprecise wording would invite the wrong future fix.
- **P4a first, as a standalone bug-fix PR** — and it is bigger than the plan
  thought: maintainer and consultant **independently found the same missed
  bug**: the persisted raise counter (`raise → topZ + 1`, stored forever in
  `ws:<appId>`) grows without bound, so after enough raises a panel exceeds
  z 100 and floats above fullscreen *today*, making F5 nondeterministic.
  Both prescribe the same fix: **compact/normalize z in `sanitize()`**.
  Consultant adds: the plan's `z-index: 110 + z` CSS sketch cannot beat
  Panel's inline style — thread a `zBase` prop (and tokenize the layer scale).
- **Staged Esc: transient layers only.** Esc peels menus/sheets/fullscreen —
  **never** persistent panels (✕-only semantics) — and needs a single owner
  (one layer stack), not three competing keydown listeners.
- **P5 endorsed with the same three refinements**: a **discriminated
  `node | panes` union** (silent-ignore is a footgun); a **fresh id** for the
  merged window (reusing `input` would inherit a stale persisted 356×356
  rect); the **50/50 split is non-negotiable** — an unequal divider would
  re-break the very scale-commensurability the merge restores (huge |f(z)| is
  the shared *extent*'s job, and log-polar mode already handles it).
- **Correspondence stays two windows.** Linkage-by-parameter ≠
  linkage-by-scale; independent zoom is a feature (F11 confirmed).
- **P1 is honest and does not resurrect the deleted floaters** — *as
  specified*: fixed, chrome-owned, buttons-only, a projection of an existing
  drive/playback panel. Stable Matching's Play over a precomputed log is
  honest (rounds are the algorithm's semantics). But the constraints are
  currently prose: they must be **enforced structurally** (no ReactNode
  escape hatch, `sectionId` linkage, cap in code, dev warnings,
  `role="toolbar"`), and the ruling should be recorded against the
  IN-PROGRESS "Deliberate removals" ledger.

## 2. Points of tension (decided or needing decision)

| Tension | Positions | Resolution |
|---|---|---|
| **P3 (HUD): defer or build first?** | Maintainer: defer/cut — `ViewDef.hud` doesn't absorb what TopologyWalk actually renders (MovePad + mini-maps + captions); don't generalize from one consumer. Consultant: build P3's *overlay layer* before P2 so hint and hud share one implementation and one pointer-isolation fix. | Compatible once split: build a **minimal shared view-overlay layer** and implement **P2 hints on it now**; defer the full `hud` API and MovePad migration until designed against TopologyWalk's real overlay inventory. |
| **P2 hint copy for Correspondence** | Pedagogy: "click to pick c" is a **false affordance** — picking is gated behind the Seed panel's arm button (`Correspondence.tsx:38-42`). Preferred fix: remove the gate (tap/drag already disambiguated in `useViewportGestures`) so the hint becomes true. | Adopt **ungating tap-to-pick** as part of P2, pending user approval (it changes app behavior, not just chrome). |
| **P2 persistence** | Maintainer: per-session state only (don't persist hint dismissal). | Accepted; no counter-position. |
| **Strip contextuality** | Pedagogy: the strip must follow app mode context (Stable Matching's GS-run ↔ RVV-replay), Step is first-class beside Play, phone strips show labels. Consultant: no live text in strip labels (re-render + layout shift). | Compatible: contextual *action sets*, static *labels*. |

## 3. Blind spots (none of the three addressed)

- **Skins.** Nobody asked how the strip/overlay/split-divider render across
  the 5 skins — notably Phosphor's all-mono type and Paper's light palette.
  New chrome surfaces need the same token discipline + a screenshot sweep.
- **Embeds.** The embed routes have their own `buttons=` param; whether the
  action strip (or hints) should appear in `#/embed/*` — and whether the
  shared split-body component changes the embed DOM — is unspecified.
  (Consultant prescribed *sharing* the split component with the embed route
  but didn't address strip/hint leakage.)
- **Docs ripple.** `docs/BUILDING_AN_APP.md` and `CLAUDE.md` describe the
  Workspace contract; `actions`/`panes`/`hint` change the how-to-build-an-app
  story and must ride the same PRs (only the maintainer gestured at spec
  updates, and only for DESIGN-SPEC).
- **The ? explainer in fullscreen** got one sentence from one expert (the top
  bar is buried at z 30, so the explainer is unreachable in fullscreen too) —
  worth folding into P4a's scope decision.

## 4. Recommended action

1. **Amend CHROME-REVIEW.md now** (errata, no re-litigation): reword F9 to
   *incommensurability*; fix the audit rows (Correspondence pick-`c` is
   arm-gated; Plane Transform ships no morph); fold the unbounded-z finding
   into F5; note the staged-Esc scope (transient layers only) and the P3
   deferral; add the blind-spot items to the spec-delta list.
2. **Implementation order (revised, accepted by all three hats):**
   - **PR A — P4a+** (standalone bug fix): z-compaction in `sanitize()`,
     layer tokens, `zBase` threading for panels above fullscreen, staged Esc
     via a single layer owner, explainer reachable in fullscreen.
   - **PR B — P1**: hardened `ActionDef` (buttons-only by type, `sectionId`
     projection link, ≤5 enforced, contextual sets, Step first-class, labeled
     on phone, `role="toolbar"`), desktop strip + phone row, persists in
     fullscreen; skins + embeds decisions made explicitly; spec + ledger +
     BUILDING_AN_APP updates in the same PR.
   - **PR C — P5**: discriminated `node | panes`, fresh merged-window id
     (`plane`), shared split-body component with the embed route, titles
     `z ↦ f(z)` / panes `z — domain` · `w = f(z) — image`; first unit-test
     seam (vitest on `sanitize`/`applyLayout`) if the user agrees to add a
     test runner.
   - **PR D — P2 on a minimal shared overlay layer**: per-session hints,
     math-anchored copy; ungate Correspondence tap-to-pick (user call).
   - **Deferred:** P3 full HUD API (design against TopologyWalk's real
     overlay inventory first), P4b phone fullscreen dock access.
3. **Decision needed from the user:** (a) ungate Correspondence tap-to-pick?
   (b) adopt vitest for the chrome's pure geometry/persistence functions?
   (c) should embeds ever show the action strip?

## Self-reflection

1. **What would you do with another session?** Start PR A — the z bug is
   real, small, and unblocks everything else; then prototype the action strip
   on Stable Matching (the user's named pain) before generalizing.
2. **What would you change about what you produced?** The original
   CHROME-REVIEW should have traced `CurveSvg` before writing "geometrically
   wrong" — all three experts caught the same overreach, which means the
   review's strongest rhetorical claim was its weakest factual one.
3. **What were you not asked that you think is important?** Whether the
   chrome should grow its first unit tests now: three of the upcoming changes
   (z-compaction, layout sanitize, Esc layer stack) are pure functions begging
   for them, and the repo's only check is `tsc && vite build`.
4. **What did we both overlook?** Skins and embeds interplay with the new
   surfaces (blind spots §3) — and that the experts' "verify F1–F11" framing
   itself found two audit-table errors, suggesting future review docs should
   cite a line for every table cell, not just the findings.
5. **What did you find difficult?** Reconciling P2/P3 ordering: the experts'
   positions looked contradictory until split into "overlay layer"
   (infrastructure) vs "hud API" (contract) — the synthesis hinges on that
   decomposition.
6. **What would have made this task easier?** A z-index/layer inventory
   document in the chrome (the consultant had to reconstruct it from
   theme.css); PR A should leave one behind as tokens.
7. **Follow-up value:** **MEDIUM** — the synthesis is complete and the path
   is agreed, but three user decisions (§4.3) gate the most valuable next
   steps.
