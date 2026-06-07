---
kind: progress
session: 2026-06-05-S01
date: 2026-06-05
title: Particle-viewer ideas triage + quick wins
branch: claude/particle-viewer-ideas-priority-UDZRe
slug: particle-viewer-ideas-priority-UDZRe
status: completed
build: passed
followup: low
pr: null
---

# Particle-viewer ideas triage + quick wins

## Session purpose

Triage the outstanding Complex Particles ideas in `IDEAS.md` by bang-for-the-buck (easiest + highest payoff first), then implement the top quick wins — verifying first that they aren't already shipped.

## Previous session

First tracked session on this branch. Latest handoff across branches is an unrelated topic — [better-reports · S01](../better-reports/2026-06-05-S01-rich-html-reports.html) (rich HTML session reports, PR #183, completed). Its "pending" list notes that the Hopf fiber-trace overlay and color-as-a-fourth-channel ideas remain queued.

## Bang-for-buck ranking (outstanding items)

Quick wins: (1) Hopf study mode + guide, (2) flexible "color by" quantity, (3) faithful Hopf — *already shipped*, (4) add functions + organize. Medium: explicit domain bounds, commit-on-blur number inputs, color-as-4th-channel, polar toggles. Large: generic quadratic / custom f, Hopf fiber overlay, unified channel-mapping matrix.

> [!IMPORTANT]
> **Decision** Implement the two remaining quick wins from the recommended cluster — **Hopf study mode** and **flexible color-by quantity** — since #3 (faithful Hopf) is already done. Both are self-contained to ComplexParticles + the particles engine and low-risk. *(The session then continued "all the way through" the rest of the list — see below.)*

## What shipped

Every item below is its own commit with a green `npm run build`, pushed to `claude/particle-viewer-ideas-priority-UDZRe`.

| Feature | Where | Commit |
| --- | --- | --- |
| Hopf study view + flexible color-by (Hue) | shader `calcColour`, ParticleViewerShell, controls | `fff360f` |
| Independent Brightness picker + torus-nesting doc | shader, types, state, shell, EXPLAINER | `302cb21` |
| cot / arcsin / arccos + grouped picker | `complexMath.ts`, shader, `Select` groups | `34d97ec` |
| Confirm guard on Reset settings | ParticleViewerShell | `3f1eb5c` |
| Torus soft pole-clamp + scaffold labels | `viewpoint.ts`, shader, `createHopfScaffold` | `6ac4492` |
| Domain bounds + ± lock; NumberInput | `ControlPanel`, geometry builders, state | `27d9a94` |
| Parameterized quadratic a·z²+b·z+c | `complexMath.ts`, shader, ComplexParticles | `ae98519` |
| Polar / log-polar input & output charts | shader `chartCoord`, `CoordMode`, shell | `073b314` |
| Hopf fiber-trace overlay | `createHopfFibers.ts`, state, shell | `93bb12d` |

> [!NOTE]
> **Note** The first commit (`302cb21` era) also marked the already-shipped faithful-Hopf entry in `IDEAS.md`; every implemented idea was annotated there with its status + open follow-ups.

## Outstanding / follow-ups

- **Unified channel-mapping matrix** — deferred as a dedicated effort (would re-architect 4-vector assembly; its cheaper slices are now all in place).
- **Color as a fourth channel** — judged already reachable via Drop-axis + Hue/Brightness pickers; no separate mode built (recorded in IDEAS).
- **Hopf fibers + Collapse slider** — fibers currently hide past the half-way collapse rather than shrinking circle→point with it; and an option to seed fibers from the function's own graph points.
- **Polar charts** — sampling the input on a true `(r, α)` grid (currently the Cartesian sample is replotted) and a phase-unwrap for the `arg` seam.
- **Custom-f** — the quadratic is the middle ground; a typed expression → GLSL compiler is still the big open stretch.
- **Visual review needed** — I can't see WebGL output here; the Hopf fibers, scaffold labels, and polar charts are most worth eyeballing live.

## Working notes

### 🟣 decision · 03:45 — PR review: fixed the zero-q note; deferred the Hopf-study one
**Why:** Two P2 review notes — keep the cheap correctness fix, batch the study-mode change into a future polish effort.

**Resolved:** `z^(p/q)` now coerces `q=0 → 1` in the NumberInput onChange, so the header/saved value can't claim `z^(p/0)` while the render silently uses 1 (negative q stays allowed). **Deferred:** the Hopf-study button still routes through the active drop axis (so a Drop projection isn't cleared before forcing Hopf) — a prototype fix in `useViewControls.enterHopfStudy` was written, then backed out and recorded in `IDEAS.md` ("Hopf study preset refinements") for a dedicated study-mode pass. Build green.

### 🟡 milestone · 03:25 — Session wrapped — 17 commits, build green, handoff written
**Why:** Worked the whole bang-for-buck list; only the two intentionally-big items (unified matrix, custom-f) remain.

Squared up the IDEAS.md status markers (domain bounds, NumberInput, generic quadratic, scaffold labels were shipped but unmarked). Remaining backlog: the unified channel-mapping matrix (deferred) and custom-f (needs an expr→GLSL compiler); plus small polish follow-ups (fiber-collapse animation, sampling annulus/density controls, phase-unwrap). See the handoff.

### 🟣 decision · 03:10 — Removed the Torus "Radius scale: Log" option (the fuzzy-circle culprit)
**Why:** User identified log-radius as what fuzzed the f=b·z circle, and judged it not useful — so we cut it.

Root cause (confirmed by rendering): log-radius applies `log(1+r)/r` separately to |z| and |f|, which is nonlinear and breaks the scale-invariance that collapses `f=b·z` to a single fiber circle — except at b=1 where |z|=|f| so both halves get the identical factor. Ripped out `logRadius` state, the `uLogRadius` uniform + shader remap, the sync effect, and both "Radius scale" Pills (Camera + Actions). Build green; docs updated. (I'd been wrong 3× — jitter, sampling, motion — before the user nailed it.)

### 🔵 finding · 02:30 — Diagnosed the "fuzzy Torus circle" + added domain sampling patterns
**Why:** User: with a=0 (f=b·z), b=1 gives an exact circle but b=2 is fuzzy even with jitter off.

Worked it out numerically: f=b·z is one Hopf fiber → the whole cloud is one circle; the fuzz is *uneven sampling* — the Torus projection stretches the loop near its pole (proximity = |f|/|z| = b), so a uniform Cartesian grid under-samples one side (~23% of the loop faint at b=2). Fix: a domain **Sampling** picker (`SamplePattern`: Grid / Polar / Rings / Spokes / Web / Squares / Random) in `createParticleGeometry.fillPattern`. **Polar** spreads points evenly in arg z → faint fraction 23% → 0% at b=2 (verified). (Corrected an earlier wrong guess that blamed jitter.)

### 🟢 code · 01:55 — Unlocked domain bounds → two-thumb range sliders; Uniform brightness
**Why:** User wanted the non-symmetric X/Y bounds as dual-ended sliders, and a flat-brightness option.

New shared `RangeSlider` (two overlapping native range inputs + rail/fill, keyboard/touch accessible, thumbs can't cross) replaces the X/Y min/max `NumberInput`s when unlocked. Added `ColourQuantity.Uniform` to the Brightness picker (val = 1, and the HSV magnitude-shimmer is skipped so it stays truly flat).

### 🟢 code · 01:35 — Branches → a sheet range in the Domain panel (dropped differentiation)
**Why:** User asked to move Branches into Domain, give up per-branch differentiation, and set it as a range.

Replaced the `branchCount` Select + per-sheet index inputs + "Differentiate by" with **Branch min / Branch max** `NumberInput`s (≤ `MAX_SHEETS`), rendered in the Domain section via a new `domainExtras` shell prop. Each particle set draws sheet `branchMin + i`; removed the hue/intensity/shape per-branch override effects (uniform styling now). Updated README.

### 🟣 decision · 01:10 — Deferred the unified channel-mapping matrix; folded "color as 4th channel"
**Why:** The matrix is a large refactor that would re-architect 4-vector assembly and conflict with the granular controls just shipped; "color as 4th channel" is already reachable via Drop-axis + Hue/Brightness pickers.

Both recorded in IDEAS with rationale; the matrix's cheaper slices are all now in place. (commit 589dc87)

### 🟢 code · 00:55 — Hopf fiber-trace overlay (the interlocking circles)
**Why:** Highest-payoff remaining item — the iconic picture the Torus chart could host but never showed.

New `createHopfFibers.ts` samples base points on S² (grid over latitude η, longitude ψ) and draws each one's full common-phase orbit `θ ↦ stereo(normalize(e^{iθ}(z₁,z₂)))` as a `LineLoop`, in the same normalized stereographic chart + SCALE as the particles/scaffold, coloured by base point. **Hopf fibers** toggle + **Fiber density** slider in the Camera section (Torus only). (commit 93bb12d)

### 🟢 code · 00:45 — Polar / log-polar input & output charts
**Why:** The natural charts for powers/roots/log/exp.

`Input chart` / `Output chart` pickers (`CoordMode`: Cartesian / Polar / Log-polar) replot each plane via a shader `chartCoord` (uniforms `uInCoord`/`uOutCoord`) before the 4-vector forms; colour keeps raw `z`/`f`. Log-polar output ⇒ `exp` is the identity; both log-polar ⇒ `zⁿ`/roots become linear shears. (commit 073b314)

### 🟢 code · 00:35 — Parameterized quadratic a·z²+b·z+c
**Why:** The pragmatic middle ground toward custom-f.

New `quadratic` function (index 22) with complex coefficients (Re/Im via `NumberInput`), wired through `uQuadA/B/C` + the adaptive-sampling CPU path; header shows the substituted formula. Defaults to z². (commit ae98519)

### 🟢 code · 00:25 — Explicit domain bounds + ± lock, on a new commit-on-blur NumberInput
**Why:** Off-centre windows like x∈[0,6]; and stop intermediate keystrokes breaking the render.

Added a shared `ControlPanel` **NumberInput** (commits on Enter/blur, clamps, reverts) and a `± symmetric bounds` lock to the Domain section. Geometry builders now take explicit `(xMin,xMax,yMin,yMax)`; the lock seeds the other representation so the view doesn't jump. Retrofit p/q to NumberInput. (commit 27d9a94)

### 🟢 code · 00:15 — Clifford-torus polish: soft pole-clamp + scaffold labels
**Why:** Pole points shot to infinity; the scaffold lines were unlabeled.

Soft floor `POLE_EPS` (in quadrature, shared by `viewpoint.ts` + shader) bounds the projection pole. Camera-facing sprite labels on the scaffold: sphere poles (`f→0`/`z→0`), `|z|=|f|` equator, torus cores + `arg z` direction. (commit 6ac4492)

### 🟣 decision · 00:10 — Confirm guard on "Reset settings to defaults"
**Why:** User flagged it lives in the Actions panel and is too easy to hit by accident (it wipes saved settings + reloads).

Wrapped the handler in `window.confirm`; applies to every particle viewer via the shell. (commit 3f1eb5c)

### 🟢 code · 00:05 — Added cot / arcsin / arccos + grouped the function picker
**Why:** Next quick win — cheap content + usability for the now-long function list.

Added `cot` (cos/sin) and the multivalued `arcsin`/ `arccos` (`−i·ln(...)`, branch on the ln) to both `complexMath.ts` and the shader, appended at indices 19–21 so persisted `functionIndex` values stay stable. Verified the JS against known values (arcsin(0.5)=π/6, arcsin(2)→complex, cot(π/4)=1, …). Added a `functionCategories` table + backward-compatible `groups` (optgroup) support to the shared `Select`, and the picker now shows five categories.

### 🟢 code · 23:20 — Brightness under independent control + confirmed torus orientation
**Why:** User asked to make brightness selectable too, and to confirm the Clifford-torus angle/nesting convention.

Renamed the hue picker to **Hue** and added a **Brightness** picker (both `ColourQuantity`): the value channel is now driven by phase/magnitude/real/imag independently of hue, via a new `uBrightnessQty` uniform. Defaults unchanged (hue=phase, brightness=magnitude). **Torus check:** a numerical script (`/tmp/torus_check.mjs`) confirms the projection — `arg z` traces constant-Z circles around the central axis (around the hole), `arg f` traces the tube cross-section, and large `|z|/|f|` → inner core / `|f|` dominant → outer donut. EXPLAINER now states the inner/outer rule.

### 🟡 milestone · 23:05 — Both quick wins implemented; `npm run build` passes
**Why:** Ship the two recommended quick wins the user greenlit.

**Flexible color-by:** new `ColourQuantity` enum + persisted `colourQuantity` state, `uColourQty` uniform, refactored `calcColour` to drive the colour wheel from a chosen scalar (phase / magnitude / real / imag), and a `Quantity` Select in the Color section. **Hopf study view:** a one-tap button in the Camera panel (Hopf/Torus) that forces Hopf, sets Motion → Fixed, stops spins, and resets the 4D orientation. EXPLAINER + IDEAS.md updated.

###  gotcha · 23:00 — Backticks in a GLSL comment broke the JS template literal
**Why:** The shader source is a JS backtick string; a stray backtick in a comment ended it early (TS1005).

Removed the backticks from the `param` comment. Also had to run `npm ci` — the sandbox had no `node_modules`, so the first build failed on missing `vite/client` types.

### 🔵 finding · 22:54 — Faithful Hopf map is already implemented (idea is stale)
**Why:** Avoid duplicating work the user explicitly asked me to check for.

Commit #178 already replaced the stylized quadratic with the normalized Hopf map in both `viewpoint.ts` (project mode Hopf) and the shader (`project` mode 2): `H = (2·Re(z·z̄′), 2·Im(z·z̄′), |z|²−|f|²)/|·|²`. The "Faithful Hopf" entry in `IDEAS.md` is therefore out of date.

### 🔵 finding · 22:54 — Clifford-torus, collapse slider, scaffold, log-radius all shipped
**Why:** Scope the remaining Hopf-related work accurately.

Torus view, `Collapse → Hopf` slider (`uProjAlpha`), reference scaffold, and a Torus log-radius toggle (`uLogRadius`) are in place. Missing Hopf piece is only the one-tap "study" preset that freezes the 4D orientation so the latitude/longitude reading holds.

### 🟣 decision · 22:50 — Ranked IDEAS.md by bang-for-buck and picked the quick-win cluster
**Why:** User asked for an effort-vs-payoff ordering, then to implement, after checking for duplicate work.

Read all of `IDEAS.md` + the ComplexParticles/particles source to gauge effort. Recommended cluster: Hopf study → faithful Hopf → flexible color-by → more functions.

### 🟡 milestone · 22:48 — Session started
**Why:** User invoked start-session to open the working log for this branch.

New branch, no prior handoff; orientation done against CLAUDE.md and the particle-viewer engine.
