---
kind: handoff
session: 2026-06-16-S01
date: 2026-06-17
title: "Complex Particles: postures, presets, captions + graph↔map handoff (PR #222)"
branch: claude/sleepy-bardeen-uk0cal
slug: sleepy-bardeen-uk0cal
status: completed
build: passing
followup: null
pr: 222
app: complex-particles, plane-transform, chrome
signals: needs-dan
next: Decide — merge #222 now (complete + green), or build a deferred domain-legibility follow-up (tie-line overlay / unit-circle marking); each needs a short design pass.
---

# Complex Particles: postures, presets, captions + graph↔map handoff (PR #222)

> [!NOTE]
> This session **shipped code** (PR #222) on top of a prior design session. It
> executed the [decomposition plan](https://github.com/piyarsquare/animath/blob/b834717/docs/sessions/progress/sleepy-bardeen-uk0cal/2026-06-16-S01-plan-tame-the-surface.md)
> ("tame the *surface*, not the *code*"), then re-scoped Phase-2 after a three-hats
> review. The branch is at a clean, green, mergeable checkpoint.

## Summary

PR #222 makes Complex Particles approachable without losing power, via **progressive
disclosure** (not an app split). It lands a calm default posture + five task-shaped
layout "postures" (**PR-0**), per-function recommended-view presets (**PR-1**), opt-in
posture plot-captions (**PR-2**), and a **graph ↔ map function handoff** linking
Complex Particles and Plane Transform (**Phase-2 MVP**). The originally-planned
"domain|image split *inside* Complex Particles" was **dropped** after a three-hats
review found it would duplicate Plane Transform / be mathematically false; the handoff
(a pure, tested URL codec + a top-bar link each way) replaces it. State: build green,
29/29 tests, lint at baseline (0 errors, 0 new warnings), both ends verified via
headless WebGL, Cloudflare previews green. **Nothing half-built.**

## What changed

- **PR-0 — calm default + five postures** (shipped earlier in the branch). Default
  layout is now `single` (Color only); the Layout menu reads as task-shaped postures
  (Single Function · Representations · Change of Basis · Hopf & Projection · z → f(z)).
  Mechanism is pure `LayoutDef[]` — no engine change.
- **PR-1 — per-function presets.** Picking a *different* function auto-snaps
  **domain/projection only** (units ×1/±2 for near-origin branch structure, Sphere/Hopf
  for poles & Möbius, full tinted Riemann-sheet set for multivalued). Appearance (color,
  size, render mode, motion) is never touched; the `z²` landing is byte-for-byte
  preserved (it's the initial load, never a "change").
- **PR-2 — posture plot-captions.** New **opt-in, off-by-default, desktop-only**
  `WorkspaceProps.layoutCaptions` renders the active layout's `sub` as a subtle caption
  under the plot; it fades once the user rearranges (layout → `custom`).
- **Phase-2 MVP — graph ↔ map handoff.** New pure lib `lib/functionHandoff.ts` (URL-query
  codec carrying **only** the function identity — name + `p`/`q` + quadratic `a`/`b`/`c`;
  unparseable → `{}`, never crashes). Both apps read a one-time seed from the URL on mount
  then strip the query (a reload uses the user's own saved choice; embed mode skipped). A
  top-bar link each way: **↗ plane map** / **↗ 4D graph**. No engine/shader/persistence
  change, no second renderer.
- **Today's final polish (2026-06-17).** README + CLAUDE routing rows now mention the
  handoff cross-link. The plan doc captures a new deferred follow-up: **marking
  inside/outside the unit circle** (`|z| = 1`) — see Open / not done.

## Key files

| File | Role |
|---|---|
| [`src/lib/functionHandoff.ts:25`](https://github.com/piyarsquare/animath/blob/b834717/src/lib/functionHandoff.ts#L25) | Pure URL-query codec — `encodeFunction` / `decodeFunction` (L45); function identity only |
| [`src/lib/__tests__/functionHandoff.test.ts`](https://github.com/piyarsquare/animath/blob/b834717/src/lib/__tests__/functionHandoff.test.ts) | Round-trip + malformed-input tests (part of the 29 green) |
| [`src/animations/ComplexParticles/ComplexParticles.tsx:826`](https://github.com/piyarsquare/animath/blob/b834717/src/animations/ComplexParticles/ComplexParticles.tsx#L826) | `applyFunctionPreset` (PR-1) + `selectFunction` (L844) + `topBarExtra` ↗ link (L904) |
| [`src/animations/ComplexParticles/ComplexParticles.tsx:130`](https://github.com/piyarsquare/animath/blob/b834717/src/animations/ComplexParticles/ComplexParticles.tsx#L130) | One-time handoff seed (carries its own `eslint-disable`); preset Sets at L46/L50 |
| [`src/animations/PlaneTransform/PlaneTransform.tsx:83`](https://github.com/piyarsquare/animath/blob/b834717/src/animations/PlaneTransform/PlaneTransform.tsx#L83) | Mirror seed-on-mount + ↗ 4D graph link (L585) |
| [`src/chrome/workspace/types.ts:148`](https://github.com/piyarsquare/animath/blob/b834717/src/chrome/workspace/types.ts#L148) | `layoutCaptions?: boolean` (PR-2 opt-in prop) |
| [`src/chrome/workspace/DesktopWorkspace.tsx:216`](https://github.com/piyarsquare/animath/blob/b834717/src/chrome/workspace/DesktopWorkspace.tsx#L216) | `captionSub` rendering (desktop only; fades on `custom`) |
| [`src/chrome/theme.css:283`](https://github.com/piyarsquare/animath/blob/b834717/src/chrome/theme.css#L283) | `.am-bar-link` / `.am-bar-extra` (L279) / caption styles — themed across all 5 skins |
| [`docs/sessions/progress/sleepy-bardeen-uk0cal/2026-06-16-S01-plan-tame-the-surface.md`](https://github.com/piyarsquare/animath/blob/b834717/docs/sessions/progress/sleepy-bardeen-uk0cal/2026-06-16-S01-plan-tame-the-surface.md) | The plan this PR executed; now carries both deferred follow-ups in its Phase-2 section |

## Open / not done

The PR is **complete and mergeable as-is**. Two follow-ups are deferred (each captured in
the plan doc's Phase-2 section, each wants its own short design pass):

1. **Tie-line correspondence overlay (Step 2).** Draw the graph-native "lift line" from
   the domain point `(x,y,0,0)` to its graph point `(x,y,Re f,Im f)`, through the same
   projection + 4D rotation. Meaningful (the domain plane sitting below, each point lifted
   to its graph height) but **engine-adjacent**: new `LineSegments` geometry + projection
   plumbing, plus undecided density/picking (a sparse subset and/or a tapped-point ray —
   never all 80k).
2. **Unit-circle inside/outside marking (`|z| = 1`)** — *requested by Dan, 2026-06-17.*
   Distinguish `|z| < 1` from `|z| ≥ 1` in the 4D graph (the circle is where Möbius/
   Blaschke maps swap inside↔outside, Joukowski folds it to a slit, roots of unity sit).
   **It's a shader/color change** — per-particle `|z|` is available in the shader, but
   there's no DOM-overlay path for an 80k point cloud — which is why it was kept *out* of
   #222 (scope: "no engine/shader change"). Design forks: (a) two colormaps split at
   `|z|=1` (Dan's instinct); (b) a diverging palette centered on `|z|=1` (the circle as
   visible zero-crossing — most mathematically honest); (c) a side treatment (outside
   dimmed/desaturated); (d) a literal drawn `|z|=1` ring. Open: domain `|z|` vs image
   `|f|`; new "Color by" option vs modifier on existing Domain/Range coloring.

> [!IMPORTANT]
> Both follow-ups are **domain-legibility** features and pair naturally — a future session
> could scope them as one PR. Both need a Dan design call (which mechanism) before coding.
> Neither blocks merging #222.

## Context

- **`appId` is the persistence root** — this is *why* the app wasn't split. A separate
  app would fork every saved setting (`animath:<v>:<appId>:<field>` + `ws:<appId>`). The
  handoff deliberately carries **only the function**, never view state: the two apps are
  two ways of seeing one function, not two persistence roots.
- **Returning users keep their saved arrangement** — saved `ws:complex-particles` layout
  overrides `defaultLayoutId`, so only *fresh* profiles see the new `single` default. To
  see PR-0's win in a screenshot, seed a fresh profile (`SEED_LS`); see the plan's note.
- **Binding constraint honored throughout:** *hue never encodes function/mode/posture
  identity* — color stays a function of `z` (Domain) or `f` (Range). The proposed
  unit-circle feature colors by a *geometric region of `z`*, which is allowed.
- **Verification harness:** headless WebGL via `node scripts/shoot.mjs '<route>' out.png`
  (SwiftShader; the RGBELoader/cert/404 console lines are pre-existing noise — the HDR env
  map can't decode under software WebGL). `npm run build` is the only CI gate; `npm test`
  (29) and `npm run lint` (0 errors, ~60 baseline warnings) are green by convention.
- **No `main` sync needed** — `origin/main` is fully contained in HEAD; `mergeable_state:
  clean`. If `main` advances before merge, re-sync keeping every app's append-only entries.

## Self-reflection

1. **What would you do with another session?** Run the design pass on the two deferred
   domain-legibility follow-ups (tie-line overlay + unit-circle marking) and, if Dan picks
   a mechanism, build the unit-circle feature — it's the one the user explicitly said they'd
   been "missing." I'd prototype option (b), the diverging palette centered on `|z|=1`,
   since it makes the circle a true visible isoline, and compare it against (a) two
   colormaps side by side in a fresh profile.
2. **What would you change about what you produced?** PR #222 bundles PR-0/1/2 + Phase-2
   MVP into one PR; the plan framed them as separable PRs. The single PR is well-sectioned
   and reviewable, but a stricter reading of the plan would have shipped PR-0 alone first.
   I judged the bundle acceptable because the later work (the "Rays"→"z → f(z)" rename, the
   handoff) builds on the earlier postures — but a reviewer who wanted small PRs could
   reasonably push back.
3. **What were you not asked that you think is important?** Whether returning users should
   ever be nudged toward the new `single` default (today they silently keep their old
   arrangement). Deliberately not done — don't stomp a user's setup — but worth a conscious
   decision rather than a side effect.
4. **What did we both overlook?** Nothing structural surfaced. The three-hats review caught
   the one real trap early (the in-app split would have duplicated Plane Transform / been
   mathematically false), which is exactly what saved the session from building the wrong
   thing.
5. **What did you find difficult?** Judging whether the unit-circle request "fit" this PR.
   The honest answer (it's a shader change that breaks the PR's "no engine change" safety
   story) was clear once stated, but the pull to satisfy an explicit user ask in-the-moment
   was real. Capturing it richly as a deferred follow-up was the right release valve.
6. **What would have made this task easier?** A lightweight per-particle "domain scalar"
   channel already plumbed into the color shader would make *both* the unit-circle marking
   and future "color by |z|"-style features a small change instead of a shader edit — worth
   considering as the substrate when the domain-legibility PR is scoped.
7. **Follow-up value:** LOW — PR #222 is complete, verified, and mergeable; the two
   follow-ups are net-new features/polish awaiting a Dan design call, not corrections to
   anything shipped.
