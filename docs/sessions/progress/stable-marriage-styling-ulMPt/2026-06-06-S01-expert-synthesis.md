---
kind: three-hats
session: 2026-06-06-S01
date: 2026-06-06
title: Three Hats — Convergence Analysis (Stable Marriage)
branch: claude/stable-marriage-styling-ulMPt
slug: stable-marriage-styling-ulMPt
status: completed
build: unknown
followup: null
pr: null
---

# Three Hats — Convergence Analysis (Stable Marriage)

## Executive summary

Three independent reviewers examined the Stable Marriage app expecting to confirm a *styling* deficit. They converged instead on a more consequential conclusion: **the CSS is the strongest part of the file, and the real problems are correctness, model-vs-claim mismatch, and structural duplication.** The headline framing of this branch ("lacks advanced styling effects") is only partly right — the visual gap is real but shallow and partly a side-effect of opting out of the AppShell Actions floater. The deeper issues are mathematical and architectural.

> [!IMPORTANT]
> **Headline** Do **not** ship a styling-only PR. The high-leverage first move is to extract a single pure `galeShapley.ts` engine and reconcile the visualization's mixed-proposer model with the one-sided theorem it claims to teach. Styling polish should ride on top of those fixes.

## 1 · Points of agreement (high confidence)

| Finding | M | C | P | Severity |
| --- | --- | --- | --- | --- |
| **Gale–Shapley engine is implemented twice and has diverged.** `stepSimulation` (≈:593) and `runHeadlessSimulation` (≈:134) duplicate the algorithm; their termination logic already differs. | ✓ | ✓ | — | High |
| **Model ≠ claim.** The engine runs a *mixed-proposer, two-sided* market (per-step coin flip weighted by `bias`, default 50), but the EXPLAINER teaches classic one-sided GS and its proposer-optimality / receiver-pessimality theorem — which does not hold at the default. | ✓ (minor) | ✓ | ✓ (central) | High |
| **The CSS is good.** Tokenised, responsive, theme-aligned, 752 lines. The "styling gap" is shallow: no `backdrop-filter` glass/floater treatment the peer labs use, flat private palette, some hard-coded hexes — not a missing foundation. | ✓ | ✓ (strongest part) | ~ (CVD only) | Med |
| **AppShell opt-out is permitted, not a regression.** No `ShellSettings`/`ShellActions`/`ControlPanel`, no `usePersistentState` — but `AgenticSorting` sets the same precedent for DOM apps. | ✓ | ✓ | — | Low–Med |
| **Empty Population input → `NaN` → `Array(NaN)` crash.** The existing `NumberInput` primitive already solves this and isn't used. | ✓ | ✓ | — | Med |
| **Stability itself is sound.** `verifyStability` is correct and the two-sided process genuinely still produces a stable matching — the stability story holds even though the optimality story doesn't. | — | ~ | ✓ | Reassuring |
| **Extract a pure engine.** The codebase convention (`physics.ts`, `lib/nbody/`, `presets.ts`) calls for a logic module; all reviewers who touched structure endorse a `galeShapley.ts` extraction as the unlock. | ✓ | ✓ (top rec) | — | Action |

M = Maintainer, C = Consultant, P = Pedagogy. ✓ raised it, ~ partial/related, — not addressed.

## 2 · Points of tension (need a decision)

### 2.1 Is there even a "styling gap" worth a session?

The branch premise says the app "lacks advanced styling effects." The **Consultant** pushes back hardest: the CSS is the file's strongest asset and a styling-only PR would be low value. The **Maintainer** agrees the CSS is clean but identifies a concrete, real gap — the flat palette and the absence of the glass/`backdrop-filter` floater chrome the peer labs share — and attributes it to the Actions-floater opt-out. The **Pedagogy** reviewer reframes "styling" as a *legibility* problem (CVD-hostile green↔red and near-white diverging heatmap ramps). **Tension:** the user's stated goal is styling; two of three reviewers think the highest-value work is elsewhere. Resolution below folds styling into a correctness-first sequence rather than discarding it.

### 3.2 Adopt the AppShell control surface, or keep DOM-app autonomy?

Moving the transport/controls into `ShellActions` + `ControlPanel` would (a) light up the dim ▶ Actions button, (b) inherit the glass floater styling "for free," and (c) align with the headline framework model — addressing the Maintainer's styling-gap and conformance notes at once. But the Consultant notes the DOM-app opt-out is legitimate and `AgenticSorting` does the same, so this is a *choice*, not a bug fix. Doing it is the cleanest way to get "advanced styling" honestly; not doing it keeps the app self-contained.

### 2.3 How far to chase model-vs-claim?

All three agree it's wrong, but the fix differs: Pedagogy suggests defaulting `bias = 100` (true one-sided GS, theorem holds) *or* relabeling the whole thing as a "matching market"; the Consultant treats the variant's stability as a hypothesis worth a runtime check. The scope of the relabel (UI strings, EXPLAINER, the "Asker avg rank" metric, the Stability tab) is non-trivial and is a product decision, not purely technical.

## 3 · Blind spots (none of the three covered)

- **No build was run.** Every report is static analysis; the only CI gate (`npm run build` = `tsc && vite build`) has not been exercised on the current tree.
- **Runtime verification of two hypotheses.** The Consultant's `runToCompletion` ref-timing concern and the variant-stability claim both need a quick runtime check to confirm/deny.
- **Performance at `MAX_POPULATION = 100`** was flagged as a re-render concern but never measured (frame cost, layout thrash from DOM animation, heatmap lab compute time).
- **Accessibility beyond color:** keyboard navigation, ARIA roles, and `prefers-reduced-motion` handling for the animated transitions went unexamined.
- **Mobile / responsive behavior** of the visualizer and the heatmap Lab specifically (the CSS is "responsive" in general, but the dense two-column matching view at small widths wasn't assessed).

## 4 · Recommended action

Synthesis of the three lenses into a correctness-first sequence. Styling is not dropped — it is sequenced *after* the foundation so the polish lands on honest, deduplicated code.

| # | Step | Why / unlocks | Effort |
| --- | --- | --- | --- |
| 1 | **Extract `galeShapley.ts`** — one pure engine; `stepSimulation` and the headless runner both call it. | Kills the divergence hazard; makes the algorithm testable; de-risks every later change. Unanimous unlock. | M |
| 2 | **Reconcile model vs claim** — pick: default `bias=100` (true one-sided GS) *or* relabel as a two-sided market and move the honest "mixed-proposer" note into the EXPLAINER; fix the "Asker avg rank" framing. | The app currently teaches a theorem it doesn't demonstrate. Product decision — confirm with user. | Decision + M |
| 3 | **Pedagogy fixes** — visualize rejections and the preference lists; replicate Lab heatmap cells (currently single-run noise sold as a surface); swap CVD-hostile ramps. | Makes the *why* of stability visible and the Lab statistically honest. | M–L |
| 4 | **Styling parity** — either adopt `ShellActions`+`ControlPanel` (inherits glass floater chrome, lights the ▶ button) or layer `backdrop-filter`/palette polish into the existing CSS; consolidate the three parallel button systems and hard-coded hexes onto shell tokens. | The session's stated goal — now on solid footing. | M |
| 5 | **Hardening** — use `NumberInput` for Population (NaN crash); adopt `usePersistentState`; render the shipped-but-unused `README.md`. | Closes small, agreed-upon gaps. | S |
| 6 | **Verify** — `npm run build`; quick runtime check of the run-to-completion timing and variant stability. | Only CI gate; settles the two open hypotheses. | S |

> [!WARNING]
> **Decision needed** Step 2 is a product/pedagogy call (one-sided vs market) and Step 4 is a framework call (adopt ShellActions vs keep autonomy). Both should be confirmed with the user before implementation — they change scope materially. The user framed this session as *styling*; the reviewers recommend a broader correctness-first scope. That gap is the key thing to resolve next.

## Self-Reflection

**Confidence.** High on the convergent findings (engine duplication, model-vs-claim, CSS quality) — three independent lenses reached them separately, which is the strongest signal this format produces. Medium on the exact line numbers: they come from the sub-agents' summaries and a couple are approximate (≈:134, ≈:593) — verify against source before acting.

**What could be wrong.** The synthesis inherits any shared misread by the sub-agents (e.g. if the `bias` semantics were misunderstood, all three and this synthesis would be wrong together — common context isn't independence). The "variant is still stable" reassurance and the run-to-completion timing concern are explicitly *hypotheses* pending a runtime check; I have not run the app.

**Bias to flag.** This synthesis actively reframes the user's stated goal (styling) toward correctness. That is the honest reading of the evidence, but the user may have sound reasons to want a styling-only pass (e.g. a quick visual win) — I've surfaced the tension rather than silently overriding it, and left Steps 2 and 4 as explicit user decisions.

**Not verified.** No build run; no runtime observation; line citations not re-checked against the file; performance/a11y/mobile blind spots remain open.
