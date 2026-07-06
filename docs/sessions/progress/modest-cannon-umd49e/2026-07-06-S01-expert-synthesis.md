---
kind: three-hats
session: 2026-07-06-S01
date: 2026-07-06
title: "Division Bells — three-hats convergence synthesis"
branch: claude/modest-cannon-umd49e
slug: modest-cannon-umd49e
status: complete
build: n/a
---

# Division Bells — three-hats convergence synthesis

## Plan under review

<details><summary>Original request</summary>

> Design review for a new animath app "Division Bells" that teaches Mahalanobis
> separation and Kullback–Leibler divergence as two lenses on the same pair of
> 2-D Gaussians. See the design summary in
> docs/sessions/progress/modest-cannon-umd49e/2026-07-06-S01-mahalanobis-kl-divergence-app.md.

The full design brief (engine `gaussian2d.ts`, one immersive SVG+Canvas plane
view, draggable means + rotatable/scalable σ-ellipses, whitening toggle, signed
KL-integrand heat, an Analyze Breakdown decomposing `KL = ½[Mahalanobis² +
covariance-mismatch]`, theme-token driven) is quoted in full in the three expert
reports linked below.

</details>

Three independent reviews:
- [Framework Maintainer](2026-07-06-S01-expert-maintainer.md) — chrome/parallel-branch/tech-debt fit
- [Architecture & Quality Consultant](2026-07-06-S01-expert-consultant.md) — structure, patterns, performance, verification
- [Math-Viz & Pedagogy](2026-07-06-S01-expert-pedagogy.md) — mathematical fidelity + teaching

> [!IMPORTANT]
> **Unanimous verdict: build it.** All three hats endorse. The
> `KL = ½·d_M²`-when-covariances-match unification is **real and exact** (the
> Pedagogy hat re-derived the Gaussian-KL closed form and Monte-Carlo-checked it:
> closed form 1.5952 vs MC 1.5939; the Σ₁=Σ₂ collapse verified exact, both
> directions). It is the earned reason to put both concepts in one app — not
> scope overload.

## Points of agreement (high confidence)

| # | All three agree | Consequence for the build |
|---|-----------------|---------------------------|
| A1 | **Build it, engine-first.** ~90% is assembly of proven in-repo pieces (Argand's draggable-handle SVG plane, Counting-the-Ways/`skellam.ts` engine+tests structure, `readouts.tsx`, `<Workspace>`). No new chrome, legal archetypes. | Start with `gaussian2d.ts`. |
| A2 | **The pure engine + its unit tests are the only real correctness guard** (CI runs `tsc` only; `npm test` is green-by-convention). | Tests land in the *same commit* as the engine (RECIPE R4), including an **integral-vs-closed-form agreement check** (the skellam "both ways" trick) and the Σ₁=Σ₂ collapse. |
| A3 | **The (θ, σ₁, σ₂) ellipse parametrization is the load-bearing good call.** Σ is born diagonalized → inverse, det, and `Σ^(−1/2)` are two-line closed forms, PSD by construction, with exactly one failure mode (σ→0). | Represent covariance as (angle, σ₁, σ₂), not raw matrix entries. Clamp σ ≥ floor. |
| A4 | **Degenerate/near-singular covariance must be handled honestly** (KL→∞, whitening undefined). | Eigenvalue floor + a committed degenerate-case test; disclose in the explainer. |
| A5 | **Stage the scope; MVP delivers the payload first.** Engine+tests + draggable means + σ-ellipses + the KL **Breakdown collapsing to ½·d_M²**. Defer heat, whitening, 1-D slice, Bhattacharyya, drag-handle polish. | Ship the "aha" (matching shapes ⇒ KL = ½ d_M²) before any heatmap. |
| A6 | **Theme-token driven; P/Q as blue/orange `--data-*`** (CVD-safe, theming-v2-correct — more correct than Counting-the-Ways, which bends the accent-is-never-data rule). | No hardcoded scene colors; canvas reads resolved tokens via `useThemeTokens`/`readThemeTokens`, depends on `themeId`+`themeMode`. |

## Points of tension (decide before/while building)

### T1 — Which Mahalanobis convention is the "hero"? (math correctness, not UI taste)
The brief silently blends **three** distinct "Mahalanobis between two
distributions" (they give different numbers away from the collapse):
directed-in-Q's-metric `(μ₂−μ₁)ᵀΣ₂⁻¹(μ₂−μ₁)`, pooled-Σ `(Σ₁+Σ₂)/2`, and
shared-Σ. **Pedagogy is firm:** the term inside the KL breakdown *must* be the
**directed, in-Q's-metric** one (that is literally the KL mean-shift term); any
pooled/symmetric number is a *separate* readout, clearly labeled, and **never
called "the" Mahalanobis distance**.
→ **Resolution: hero = directed-in-Q's-metric** (bridges to KL). Pooled-symmetric
shown as a labeled secondary stat, if at all.

### T2 — How to render the KL Breakdown (primitive limitation + sign safety)
- **Consultant:** `readouts.tsx#Breakdown` takes `pct ∈ [0,100]` and **cannot**
  render the decomposition as authored — `−k` and the log-det are signed. Use a
  **two-row Breakdown of the two non-negative top-level pieces** (mean-shift vs
  covariance-mismatch); put signed sub-terms in a `StatGrid`.
- **Pedagogy:** render the covariance-mismatch term as **½·Σ(λ − 1 − ln λ)** over
  the eigenvalues λ of `Σ₂⁻¹Σ₁` — manifestly ≥ 0, per-axis, sign-safe — **not**
  the brief's fragile "trace + log-det − k" (Pedagogy made exactly that sign slip
  mid-derivation; it's a trap).

These are **complementary**: the eigenvalue form makes the covariance term a sum
of non-negative per-axis pieces, which is exactly what a two-row/stacked
Breakdown bar wants. → **Resolution: adopt both** — `KL = ½·d_M²(in Q) +
½·Σ(λ−1−lnλ)`, two non-negative bars, eigenvalue sub-terms in a StatGrid.

### T3 — `immersive` vs a second (1-D slice) view
**Maintainer:** `<Workspace immersive>` **silently no-ops the moment a second
view exists** — so "one immersive plane" and "optional slice view" conflict.
→ **Resolution:** MVP = single **immersive** plane. If the 1-D slice is built, it
is either (a) a second non-immersive `ViewDef` (drop `immersive`), or (b) an
**inset** drawn inside the plane view. Decide at that point, not now.

### T4 — How much to engineer the canvas heat
- **Maintainer:** the density/integrand heat is *the* real engineering risk (no
  full-window in-app 2-D-density precedent; naive per-pixel jank on 390×844).
  Use the fractal-preview **offscreen-downsample-and-upscale** trick + throttle
  recompute to pointer-up; or defer for MVP.
- **Consultant:** it's **3–4 orders of magnitude cheaper** than BasinMap's n-body
  field; the real risk is *over*-engineering. Measure at ≤ 200² before decoupling
  μ/Σ from React state.

Not a real disagreement once heat is deferred from the MVP (A5). → **Resolution:**
build heat *after* the payload, at ≤ 200² offscreen + rAF-coalesced, and
**measure before** adding a React-state bypass.

### T5 — The KL integrand is a *field*; KL is its *integral*
Both Consultant and Pedagogy flag it. The signed `p·log(p/q)` heat must be
computed **in log-space** — `p·(logP − logQ)` from an exposed `logPdf` — or it
underflows to NaN in the tails; and the view must ship a running **"∫ = KL"
total** so learners don't conflate the colored field with the scalar divergence.
→ **Resolution: hard requirement** — `logPdf` in the engine; running integral
shown wherever the heat is.

## Blind spots (none of the three fully covered)

| Blind spot | Note |
|------------|------|
| **The album-cover gallery tile** | Added to scope *after* the reviewers were dispatched, so none saw it. Maintainer independently flagged that `src/chrome/previews.tsx` (`PreviewKind` closed union + draw fn + switch case) is a **missing shared-file edit** — the tile lives exactly there. `Category` is also closed; `'Algorithm'` is the nearest fit. |
| **Touch drag on 390×844** | Draggable *ellipse handles* (rotate + two axis scales + mean) are fiddly on a phone. MVP leans on **sliders** for σ/θ (Maintainer's MVP) — keep handles as a desktop enhancement, sliders as the always-works path. |
| **Persistence surface** | Persist *settings* (means, θ/σ params, layer toggles) via `usePersistentState`; **not** transient view state. Lightly covered; decide the field list when wiring. |
| **Visual verification** | No CI visual gate — RECIPE R1 headless shots (`scripts/shoot.mjs '#/division-bells'`) are the only eyes on the render; the smoke test guards the mobile route. |
| **Explainer attribution** | Pedagogy supplied honest pointers (Mahalanobis 1936; Kullback & Leibler 1951; the Gaussian-KL closed form; Bhattacharyya; information geometry / Amari; the mode-covering vs mode-seeking folklore) — no fabricated DOIs. |

## Recommended action

**Proceed. Build engine-first, MVP-staged.** Concrete order:

1. **`gaussian2d.ts` (pure) + `__tests__/gaussian2d.test.ts` (same commit).**
   (θ, σ₁, σ₂) covariance; closed-form inverse/det/`Σ^(−1/2)` (symmetric sqrt);
   `pdf` **and** `logPdf`; Mahalanobis (directed-in-Q **and** pooled, labeled);
   `klDivergence` closed form; `klDecompose` → `{ meanShift: ½·d_M²(inQ),
   covMismatch: ½·Σ(λ−1−lnλ), perAxis: λ[] }`; eigenvalue floor. **Tests:**
   integral-vs-closed-form agreement, Σ₁=Σ₂ ⇒ KL = ½·d_M² collapse (both
   directions), asymmetry, degenerate floor.
2. **Immersive plane view (SVG):** draggable means + 1σ/2σ ellipses (Argand-style
   handles, sliders as the robust fallback), mean-difference vector. **Analyze:**
   two-row Breakdown (mean-shift vs covariance-mismatch) + StatGrid (KL both
   directions in nats+bits, asymmetry called out, Mahalanobis in σ-units).
   **Presets:** "Match shapes" (⇒ collapse) and "Concentric" (d_M = 0 yet KL > 0)
   as the teaching anchors.
3. **Then** the canvas density + signed log-space KL-integrand heat (≤ 200²
   offscreen, rAF-coalesced, running ∫ = KL), and the **whitening** toggle
   (whiten *into Q's metric* → Q = unit circle, P = residual ellipse whose axes
   *are* the mismatch — name the target, symmetric sqrt, never call KL a
   "distance"). Optionally the 1-D slice (resolve T3 then).
4. **Wire the app:** route `#/division-bells`, `apps.ts`, `catalog.ts` META
   (`Category: 'Algorithm'`), **`previews.tsx`** album-cover tile, README + CLAUDE
   rows — all append-only. EXPLAINER with the attribution block.
5. **Verify:** `npm run build` + `npm test` green; R1 headless shot + `npm run
   smoke` for the mobile route.

**Locked decisions to carry into the build:** hero Mahalanobis = directed-in-Q
(T1); KL Breakdown = two non-negative bars with eigenvalue form (T2); MVP = single
immersive plane, no heat/whitening/slice (A5, T3); `logPdf` + running ∫ = KL when
heat lands (T5); σ-sliders are the always-works control, handles a desktop
enhancement.

## Follow-up: should Division Bells include more divergence measures?

Dan asked whether to add **Bayes error, total-variation (TV), Hellinger,
Bhattacharyya**. All three hats were resumed with their review context intact; the
full arguments are in the `## Follow-up: additional divergence measures` section of
each per-hat report. Convergence:

### Unanimous
| # | All three agree |
|---|-----------------|
| F1 | **Keep KL + Mahalanobis as the MVP spine.** The family is *not* in the first cut. |
| F2 | **Bhattacharyya earns inclusion** — it's the **symmetric sibling of KL** (same mean-term + covariance-term structure), closed-form, and its `⅛·d_M²(pooled)` term bridges to KL's `½·d_M²`. Most on-theme addition. |
| F3 | **Progressive disclosure, not a dashboard.** A wall of eight simultaneous numbers is the anti-payload; reveal the family behind a toggle/tier. |
| F4 | **Correctness catch — the premise was half-wrong.** Bhattacharyya & Hellinger have Gaussian **closed forms**; **TV and Bayes error do NOT for unequal Σ** (the decision boundary is a conic → numeric overlap integral). They are the *costliest*, not the cheapest, and must be labeled **numeric / "≈"** in the UI — a silently-only-right-for-equal-Σ "TV" is a fabricated-precision trap. |

### The reframe (Pedagogy + Maintainer, endorsed)
**Make Bayes error the operational anchor.** Every measure is estimating one thing —
*how often the best classifier must confuse P and Q* — and Bayes error **is** that
number (`P_e = ½(1 − TV)` at equal priors). This opens the app from
"Mahalanobis + KL" to **"how far apart are two distributions, by every honest
yardstick, and why they agree,"** with an honest hierarchy: a **bounded stack**
(TV, Hellinger, Bhattacharyya-coefficient, Bayes error — all in [0,1]) with **KL as
the unbounded outlier**, tied together by **Pinsker** (`TV ≤ √(KL/2)`) and the
**Bhattacharyya bound** (`P_e ≤ ½·BC`). All six relationships numerically verified
by the Pedagogy hat.

### Minor tensions → resolutions
| Item | Maintainer | Pedagogy | Consultant | Resolution |
|------|-----------|----------|------------|------------|
| **Hellinger** | EXPLAINER "see also" (rescaling of BC) | Include — the true *bounded metric* foil to KL | Include (free with BC: `H² = 1−BC`) | **Include** — one line off BC, gives the bounded-metric contrast |
| **TV** | See-also (`= 1−2·P_e`) | Show via **overlap shading**, not a tile | Wave 3, gated on the decision boundary | **Include with Bayes error** (same object), shown via overlap shading, numeric-labeled |
| **Registry** | fits `readout` panel, no new chrome | — | **Yes, scoped**: ~15-line stateless `measures.ts` `{id,label,symmetric,bounded,method,compute}`; math stays in tested `gaussian2d.ts`; KL+Mahalanobis stay **bespoke** (they emit decompositions + canvas layers, not a scalar) | **Adopt** the scoped presentation registry |

### Staging (consensus)
- **Wave 1 / MVP:** KL + Mahalanobis + the exact `½·d_M²` unification. Engine-first + tests.
- **Wave 2:** Bhattacharyya + Hellinger (one computation — BC — yields both; closed-form, both-ways integral test). Bhattacharyya's own `Breakdown` beside KL's = the symmetric-vs-asymmetric contrast.
- **Wave 3:** Bayes error + TV, gated on drawing the **decision-boundary / overlap conic** + a prior control; labeled numeric, guarded by equal-Σ closed form + analytic brackets (Pinsker, Chernoff) + the `P_e = ½(1−TV)` invariant.

**Engine note:** since I'm writing `gaussian2d.ts` anyway, put the *whole family* in
the engine with tests up front (cheap; TV/Bayes get a numeric overlap integrator +
`method: 'numeric'` flag). Scope discipline is enforced in the **UI disclosure**,
not by leaving math unwritten.

## Self-reflection

**Q1 — Did I do what was asked?** Yes: dispatched three independent expert
reviews of the Division Bells design, each writing a self-contained report, then
synthesized convergence/tension/blind-spots into an actionable plan.

**Q2 — What's the risk in this synthesis?** That I over-weighted the reviewers'
condensed chat summaries relative to the full report bodies. The three verdicts,
the math verification, and the specific concerns (Breakdown `pct` limit,
log-space integrand, `immersive` no-op, eigenvalue form) are all quoted from the
agents' own returns, so the load-bearing claims are grounded — but a reader
should treat the per-report links as the authority.

**Q3 — What surprised me?** The genuine math tension in T1/T2: "which Mahalanobis"
and "trace+log-det−k vs ½Σ(λ−1−lnλ)" look like presentation choices but are
correctness choices, and the Pedagogy hat *demonstrated* the sign trap by falling
into it mid-derivation. That reframes the covariance term's rendering from a UI
decision to an engine-API decision (return eigenvalues, not raw trace/log-det).

**Q4 — What would I check next?** That the two-row Breakdown reads honestly when
one bar dwarfs the other (huge mean shift, tiny covariance mismatch or vice
versa) — a stacked bar can hide a small-but-conceptually-central term.

**Follow-up value:** HIGH
