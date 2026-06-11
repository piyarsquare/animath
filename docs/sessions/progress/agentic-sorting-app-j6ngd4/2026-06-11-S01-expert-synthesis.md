---
kind: three-hats
session: 2026-06-11-S01
date: 2026-06-11
title: Convergence synthesis — Agentic Sorting legibility
branch: claude/agentic-sorting-app-j6ngd4
slug: agentic-sorting-app-j6ngd4
status: complete
build: unknown
---

# Convergence synthesis — Agentic Sorting legibility

## Plan under review

<details><summary>Original request</summary>

"This app is still something of a hot mess. can you please [review] to see what we
can do to improve the legibility?"

Context: the Agentic Sorting app grew feature-by-feature this session into a
**Sandbox** mode (live sim: arena + Trajectories + Metrics + Track + Replicate, 7
panels / 2 views) and a **Lab** mode (batch experiments: Strategies / Mixes /
Monte-Carlo / Sweep incl. a two-type blend, over 4 metrics; 5 panels / 1 view),
switched by top-bar pills. The main component is 857 lines. The user wants it more
legible.

</details>

Reports synthesized:
- [Framework Maintainer](2026-06-11-S01-expert-maintainer.md)
- [Architecture & Quality Consultant](2026-06-11-S01-expert-consultant.md)
- [Math-Viz & Pedagogy](2026-06-11-S01-expert-pedagogy.md)

## TL;DR

All three agree the **content and architecture are good** — the engine / metrics /
lab / arena pure layer is some of the cleanest sim code in the repo, and the prose
is unusually honest. **The "hot mess" is surface: first-contact, default layout,
labeling, and one duplicated panel — not structure.** So the fix is a focused
legibility pass, **not a rewrite**. The single highest-leverage addition (Pedagogy's
"*the* fix") is **one-click preset scenarios** that each demonstrate a competency;
the cheapest wins are **fixing the over-stuffed default** (which currently hides the
app's best visual) and **resolving the Replicate/Monte-Carlo duplication**.

## 1. Points of agreement (high confidence)

| # | Convergent finding | Maint. | Consult. | Pedag. |
|---|---|:--:|:--:|:--:|
| A1 | **Do not rewrite / do not restructure as the goal.** Pure layer is well-factored; the mess is surface | ✅ | ✅ | ✅ |
| A2 | **The default layout is the core UX problem** — it stacks tall panels on a static arena and *hides Trajectories*, the most distinctive visual. Lead with the moving picture + START | ✅ | ✅ | ✅ |
| A3 | **Replicate duplicates the Lab's Monte-Carlo** and reads as "two ways to do one thing" / "feels like two apps" | ✅ | ✅ | — |
| A4 | **Population mix panel is too heavy** (~500px; per-algotype blurbs duplicate the `?` table) — shrink / collapse | ✅ | ✅ | ✅ |
| A5 | **Cheap labeling/tagging fixes carry most of the win** (re-tag Track→readout; label Trajectories axes; shared-vs-local hints; relabel terms) | ✅ | ✅ | ✅ |
| A6 | **Keep the Sandbox/Lab mode split** (real panel+view divergence; not a layouts-only case like StableMatching) | ✅ | ✅ | ✅ |
| A7 | **None ran the app live** — every recommendation is from reading code/coords; verify visually | ✅ | ✅ | ✅ |

> [!IMPORTANT]
> **A2 is the load-bearing agreement.** The default `setup` layout opens Array +
> Run + the 500px Population mix in one column (~1000px tall) over a *static* arena,
> and sets `trajectories: { open: false }`. A first-time user meets a wall of
> sliders and no motion, and never sees the delayed-gratification plot. Fixing the
> default is the highest ratio of clarity-gained to lines-changed.

## 2. The one genuinely additive idea — preset scenarios (Pedagogy, HIGH)

The Pedagogy hat's headline: **all three competencies (clustering, robustness,
delayed gratification) are opt-in and undiscoverable**, and the "equal mix is slow
to fully sort" nuance lives only in docs. Proposed fix — **~5 one-click presets**,
each jumping to the right mode/layout/color/settings with a caption:

| Preset | Sets up | Reveals |
|---|---|---|
| Clustering | mixed pop, color = algotype, sandbox | like-with-like clustering (the Levin result) |
| Robustness | frozen 20%, Metrics open | sorts around defects; "best reachable" ceiling |
| Delayed gratification | frozen on, Trajectories open | warm rise-then-fall trajectories |
| Phase separation | split objective, color = objective | domains form, monotone-runs metric |
| Mix is slow | Lab → Strategies | pure beats the even mix to full sort |

This is **additive, not a refactor** — it sits on top of the existing structure and
directly answers "legibility = can a newcomer find the aha." Maintainer and
Consultant didn't propose it (their lens was code/layout) but it doesn't conflict
with anything they recommend.

## 3. Points of tension (decide before acting)

### T1 — Replicate: remove, or keep-but-differentiate?

- **Experts:** Maintainer (remove, but "check pedagogy first") and Consultant
  (pull out of Sandbox) both see it as confusing duplication of Lab Monte-Carlo.
- **Counter-weight:** *the user explicitly asked for it* earlier this session — "a
  multi run without the full lab… same parameters, different instances." Removing
  it would undo a requested feature.

> [!WARNING]
> This is a **user decision**, not an auto-apply. Options: (a) **remove** now that
> the Lab's Monte-Carlo covers it; (b) **keep but differentiate** — make Replicate
> visibly the "quick, in-Sandbox" version and Monte-Carlo the "full" one (distinct
> copy, maybe a shared component) so it stops reading as accidental duplication.

### T2 — How far to extract code

- **Consultant:** a staged, behavior-preserving extraction — rename `Lab.tsx` →
  `LabResults.tsx`, extract `<PopulationMix>` and `useCanvas2D`, then `useSandboxSim`
  / `useLab`, then split `<Sandbox>` / `<LabMode>` behind a ~60-line wrapper (the
  Trinary pattern). Result: ~5 files of 60–220 lines.
- **Maintainer:** the 857 lines are ~60% irreducible per-app JSX; `useSandboxSim`
  is "low value-per-churn — skip it." Fix the surface, leave the code.

Both agree on the *cheap* code wins (rename `Lab.tsx`; extract `PopulationMix` to
kill the objective/frozen duplication; `useCanvas2D` to dedupe two ResizeObserver
effects). They diverge only on the **deeper** hook/component split. Since the user
said "legibility" (primarily UX), treat the deep split as **optional** follow-up.

## 4. Blind spots

| # | Blind spot | Note |
|---|---|---|
| B1 | **Phone re-chrome (≤740px)** unreviewed | Maintainer flagged; presets + a trimmed default must also read on the phone stacked layout |
| B2 | **Preset mechanism** | No existing "scenario" affordance in the app; Trinary has a `Tour`. Decide: a small Scenarios panel, top-bar element, or gallery-style cards. Needs to set layout + several settings + possibly mode at once |
| B3 | **Metrics context-awareness** | Pedagogy wants metrics to signal *when* each matters (monotone-runs↔phase-sep, clustering↔mixed, ceiling↔frozen); none specced the exact UI |

## 5. Recommended action — a tiered legibility pass (no rewrite)

> [!TIP]
> Order by clarity-per-line. Each tier ends build-green and independently useful.

**Tier 1 — Surface (do now, ~low risk).**
Fix the default `setup` layout to lead with the arena + START foregrounded and
**Trajectories visible**; shrink Population mix (collapse the per-algotype blurbs —
the `?` table already has them); re-tag `Track agent` `arch:'lab'→'readout'`; add
the shared-vs-Lab-local hint (objective/frozen shared, wake/array-size not); relabel
for clarity (Positive/Negative → High/Low; unify "home"/"goal"; label the
Trajectories axes incl. a time axis; tag the phase-separation pill as
animath-original at the point of choice).

**Tier 2 — Presets (the high-leverage add).**
Add ~5 one-click preset scenarios (table in §2), each setting mode/layout/color/
settings + a one-line caption. This is the fix that most improves "can a newcomer
learn the ideas."

**Tier 3 — Cheap code legibility (optional, behavior-preserving).**
Rename `Lab.tsx`→`LabResults.tsx`; extract `<PopulationMix>` (removes the
objective/frozen duplication); extract `useCanvas2D`. Defer the deeper
`useSandboxSim`/`useLab` + `<Sandbox>`/`<LabMode>` split unless we want code-level
legibility too — and if we do, **capture a golden seeded-Lab result first** as a
regression oracle (no tests exist).

**Decision needed from the user:** T1 (Replicate) — remove, or keep-and-differentiate?

## Self-reflection

**Confident:** The three-way convergence is unusually tight — don't rewrite, fix the
default, dedupe Replicate, shrink the mix panel, relabel. Those are safe to act on.
Presets are the clear highest-leverage addition.

**Uncertain:** Every expert reviewed from *reading* the code — none ran the app, and
the phone layout is entirely unverified. The "default reads as a wall" claim rests on
`estHeight`/coordinates; a single live screenshot would confirm it (blocked this
session by the SIGTERM'd preview server). The preset mechanism (B2) needs a concrete
UI decision before building.

**Follow-up value:** MEDIUM — the plan is solid and low-risk, but the Replicate
decision (T1) is the user's, and a live visual pass should precede finalizing the
default-layout and phone changes.
