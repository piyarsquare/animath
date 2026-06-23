<!-- docs/sessions/TODO.md — the project backlog / to-do list.
================================================================================
HAND-EDITED. This is Dan's durable to-do list: items that should inform future
sessions. The session control center (build-sessions.mjs → control-center.html)
parses this file and renders it as the "To-do" panel at the top, alongside the
auto-derived "Start here" digest. /start-session reads it for orientation; agents
append new items here at handoff.

FORMAT — one GitHub task-list item per todo (renders natively on GitHub too):

  - [ ] [category] !priority Title of the thing to do.
    An optional indented note (any number of lines) with context, links, or the
    reasoning that should inform whoever picks this up.

  • [ ] open · [x] done (done items drop to the bottom, dimmed).
  • [category] (optional) — a key from categories.mjs (complex-particles, chrome,
    docs, engine, …). Drives the chip + lets you filter the to-do list by app.
  • !priority (optional) — !high / !med / !low (default !med). Sorts the list.
  • Everything after the tags is the title. Indented lines below it are the note.

Keep titles short; put the "why / how / where" in the note — that's the part that
informs future rounds. Delete or check off items as they land.
================================================================================
-->

# Backlog · animath

- [ ] [counting-the-ways] !med The Lab should show cumulative results, not one-off rows.
  Today each *Run & log* draws an independent sample and appends a row with its own
  method-of-moments μ̂ — no accumulation. Make the catalog **cumulative**: a pooled /
  running μ̂ that tightens as runs accumulate, a convergence trace (estimate vs. total
  samples), and the spread of μ̂ across runs (does the estimator concentrate on the
  truth?). The point of the Lab is to *feel* the estimator converge, which one-off
  rows don't convey. Engine is `skellam.ts` (sampler + `momentFit`); UI is the Lab
  view/sections in `CountingTheWays.tsx`. Dan 2026-06-23: "the lab needs work, showing
  cumulative results."

- [ ] [general] !low Plane / particles unification — one "which plane am I looking at" convention across the viewers and their guides.
  Surfaced while splitting the complex guides: we show the bare x,y plane with a
  linear Complex Particles plot, but Plane Transform also shows "a plane." Decide a
  single mental model (and which viewer owns which job) so the guides stop being
  ambiguous. Affects functions guide §1 and the Plane Transform guide.
  Dan 2026-06-22: not a pressing issue — likely resolves on its own as we play
  through the complex/dual/split-complex variants in Argand. Recategorized to
  general (not particular to any single app) and demoted from !high.

- [ ] [docs] !high Productionize the signals/to-do system — teach agents to author it.
  Update REPORT_STYLE.md, the progress/handoff templates, and the handoff +
  start-session skills so every session declares `signals:`/`next:` and consults +
  appends this backlog. Without that, the dashboard only stays rich by inference.
  2026-06-22 (process-audit): partly enacted. `npm run sessions:lint` now validates
  the contract (signals/app tokens, scraped level, timeline types) and warns when a
  "headless" handoff declares no `visual-unverified`/`phone-needed` signal; the
  self-reflection protocol gained Q7 (declare verification method + set the matching
  signal). Still open: requiring `signals:`/`next:` at handoff (templates + skills)
  and gating the linter in CI once the corpus is clean (140 advisory warnings remain).

- [x] [docs] Build the deep-link debug-pose harness + headless mobile smoke (L1 in RECURRING_LESSONS.md).
  DONE 2026-06-23 (`headless-mode-plan` branch). (a) The debug-pose deep link +
  opt-in dev HUD: `src/lib/debugPose.ts` (URL → world/look/camera/pose) +
  `src/components/DebugPoseHUD.tsx` (determinant · cell · nearest-marker · an
  independent ink witness on Polygon Worlds), adopted by **Polygon Worlds** and
  **Solid Worlds** (`setPose` added to each engine). (b) `npm run smoke`
  (`scripts/smoke.mjs`): all routes at 390×844 — `pageerror`/`webglcontextlost`
  load-bearing, `console.error` advisory, dead-frame = low screenshot variance;
  PASS 17/17, non-blocking CI in `.github/workflows/smoke.yml`. L1 → 🟢; documented
  in `docs/HEADLESS_WEBGL.md`. Remaining follow-up (filed separately): a genuine
  independent witness for Solid Worlds.

- [x] [docs] Add `package.json` to the append-only protected-file list.
  DONE 2026-06-23. Added `package.json` (scripts/deps appended, not reordered) to the
  append-only note in CLAUDE.md's Parallel-branches callout and BUILDING_AN_APP.md §8.
  From the process audit (Tier-4 rec 10); the one real conflict-marker near-miss in
  50 PRs had landed there.

- [ ] [docs] !low One "sandbox gotchas" doc for the remote-execution environment.
  Wrong default branch on clone, container reset to an old commit mid-session, 403s
  on deploy-trigger / branch-delete / primary-source PDF fetch, `npm ci` cold-start
  failure — each rediscovered per session. Some live in CLAUDE.md; the
  branch-checkout one doesn't. Process audit Tier-4 rec 9 (the one recommendation
  not yet filed anywhere — caught by this session's own self-reflection).

- [ ] [complex-particles] !med Argand: make the scrubber pay its way (or drop it) — the *arc* is the payload, not the slider.
  Dan on Phase 1: the position-scrubber adds little on its own; the static parametric
  path (spiral / parallelogram) is what teaches. A bare `t`-slider only earns its place
  when coupled to a **live changing equation/readout** (scrub → `a·bᵗ`'s value, modulus
  and angle update so you watch the algebra move). Either wire that live readout, or
  de-emphasize the slider and foreground the always-on arc. Revisit alongside the
  plane-morph chapter, where a changing readout makes scrubbing genuinely useful.

- [ ] [chrome] !med Make the App-map richer — open it from a chip, maybe roll trends over time.
  The base App-map view ships (per-app latest · risk · open · next, sorted
  worst-risk-first) and consumes the per-app guides (`docs/apps/*.md`: lifecycle
  status, `guide ›` link, Active-registry count). 2026-06-22: added a **registry
  self-audit** — the build now reads `src/apps.ts` and reconciles registry ↔ guides,
  flagging drift on each card (⚠ no guide / ⚠ retired) with a top "registry drift"
  callout; and the "N backlog" count now links to the filtered To-do (`#cat=`).
  Remaining polish: open the map from an app chip, and trend lines over time.

- [ ] [docs] !med Slim the per-app prose blocks in CLAUDE.md to pointers.
  Every app now has a living guide under `docs/apps/<slug>.md` (PR #229). The long
  paragraphs in CLAUDE.md's Repository Layout can shrink to a one-line "see
  docs/apps/<slug>.md" so there's a single architecture home. Touches the shared
  append-only CLAUDE.md — do it as its own pass to avoid parallel-branch conflicts.

- [ ] [chrome] !med Make graphics consistently theme-driven — gallery previews + per-app canvases.
  Counting the Ways' gallery preview now reads the live theme tokens (`--accent` /
  `--accent-2` / `--bg` via `getComputedStyle(document.documentElement)`) so the card
  tracks the active skin, not just light/dark — `SkellamPreview` in
  `chrome/previews.tsx` is the **model**. The other previews still hardcode a
  light/dark pair, and apps don't all respect the theme the same way. Future pass:
  roll the getComputedStyle pattern across `previews.tsx` and audit in-app canvases so
  every skin renders faithfully. Dan 2026-06-23: neat idea, not urgent — work toward it
  once each app's theming is known to be consistent.

- [x] [agentic-sorting] EXPLAINER/README no longer describe the removed Replicate panel.
  DONE 2026-06-22. Removed the stale Replicate-panel copy from both the AgenticSorting
  EXPLAINER and README so the in-app help matches the shipped UI.

- [x] [docs] Add the "Possible sources" attribution block to the EXPLAINERs that lack it.
  DONE 2026-06-22 (scope B). Appended a tailored "Possible sources & where to go
  further" block to **9 EXPLAINERs**: ComplexParticles, PlaneTransform, Correspondence,
  TreesAndNets, AgenticSorting, FractalsGPU, StableMatching, TopologyWalk, TrinaryStars.
  Sourced from each app's `docs/apps/*.md` guide; the obscurer citations were
  web-verified (Tricorn = Crowe–Hasson–Rippon–Strain-Clark, *Nonlinearity* 1989;
  Burning Ship = Michelitsch & Rössler 1992; Teo–Sethuraman 1998; Irving–Leather–
  Gusfield 1987). Argand/PolygonWorlds/SolidWorlds already had blocks; legacy
  Fractals has no EXPLAINER (deferred).

- [ ] [docs] !low Consistency editing pass over the 10 agent-written app guides.
  Written by four parallel agents grouped by family (PR #229); depth and voice vary
  slightly between families. A light copy-edit would even them out. Optionally add a
  snapshot/assert test for the new `build-sessions.mjs` guide path (today it's
  verified by running, not asserted).

- [ ] [complex-particles] !low Split the rendering guide 2+2 for consistency.
  It is the only guide page still at 4 live applets (Points/Sheet/Tiles/Net).
  Acceptable, but splitting it matches the functions/projections treatment.

- [ ] [docs] !med Real-device mobile pass on the guide pages.
  All guides are verified on desktop only; iframes are pinned to 400px and the body
  to 720px. Confirm small-screen layout and that 2–3 live WebGL contexts are OK on a
  phone.

- [ ] [engine] !low Revisit `not-live` precision once feature branches squash-merge.
  Today "not live" = the report's path is absent from main. When a branch is
  squash-merged and deleted its reports land on main and correctly flip to landed —
  confirm that on the next real merge.

- [ ] [solid-worlds] !low Make the Rooms ceiling duct world-specific.
  The steel ceiling duct (decor/rooms.ts) is drawn on every world; in plain
  (non-inverting) worlds it's a redundant high vent leading to the same neighbor as
  the arch. It earns its keep only where a gluing flips vertical↔horizontal (half-turn,
  Hantzsche–Wendt, the amphi-worlds), carrying the duct down to floor level. Cut it
  conditionally on the world's point group — would tie decor to `spec` (currently
  spec-independent). Also worth a side-by-side screenshot proving the duct lands low in
  a true top↔bottom-flip neighbor (argued by construction this session, not pinned).

- [ ] [solid-worlds] !low Punch the engine floor plane through at the trapdoor.
  The Rooms decor floor has a trapdoor hole + rim, but the engine's separate whole
  floor plane still shows under it unless "Floor plane" is off. Make the trapdoor read
  as a real hole.

- [x] [chrome] Decide Stable Marriage's final fate — DONE: fully eliminated.
  Dan 2026-06-22: retired in favor of Stable Matching. Deleted the
  `src/animations/StableMarriage/` folder, the `#/stable-marriage` route + lazy
  import in `index.tsx`, the `apps.ts` entry, and the now-unused `marriage`
  `PreviewKind` + `MarriagePreview` in `chrome/previews.tsx`; cleaned the stale
  README/CLAUDE/catalog references, and the now-stale `docs/apps/stable-marriage.md`
  guide itself (older design docs are left as historical record). Going forward, the
  `build-sessions.mjs` registry self-audit flags any guide for a non-registered app as
  drift, so a stale guide can't quietly resurface as a "live" App-map card.

- [ ] [solid-worlds] !med Add the last two platycosms (the two needing a hexagonal-prism fundamental solid).
  The cube-based catalog is complete at 8 of the 10 platycosms; the remaining two
  require a *different* fundamental solid — a **hexagonal prism**, not a cube — so they
  are a separate build (a new gluing-presenter for the hex prism), not another entry
  in the existing cube engine. Reference saved locally: Conway–Rossetti, "Describing
  the Platycosms" → `docs/papers/describing-the-platycosms.pdf`.

- [ ] [solid-worlds] !med Give Solid Worlds a genuine independent debug witness (like PolygonWorlds' ink probe).
  The debug-pose HUD (`?hud`, from the headless-mode harness) shows SolidWorlds'
  determinant/cell/pos, but — unlike PolygonWorlds, which carries an *independent*
  geometric witness (`debugProbe`: the rendered ink's handedness, a different code path
  that cross-checks the chart's flip bookkeeping) — SolidWorlds has **no independent
  witness yet**. That was the three-hats pedagogy lens's revision #2 (a HUD reading the
  same state the probe reads is an echo, not a check). Deferred in Phase 3 rather than
  faked, because building it right is its own task and risks the exact L3
  "green-check-that-wasn't": e.g. the per-step developing determinant is legitimately
  −1 on a glide-reflection wrap, not +1 (an L7 handedness subtlety). SolidWorlds'
  determinant is already the dual-verified, screw-safe invariant, so the echo risk is
  milder than the ink case — but a real independent witness (a geometric probe measured
  off the *rendered* scene, or a wrap-aware per-frame continuity/jump value) would make
  the headless verification honest end-to-end and is what would catch a teleporting-world
  regression. Plumb it into the existing `DebugState.witness` field
  (`src/lib/debugPose.ts`) the HUD already renders.

- [ ] [complex-particles] !low HDR env map fails to load — `THREE.RGBELoader: Unsupported type: 1009`.
  Surfaced by the new mobile-smoke pass (`npm run smoke`) as an advisory warning on
  `#/complex-particles` and `#/embed/complex-particles`: the RGBELoader is called with
  `.setDataType(THREE.UnsignedByteType)` (= 1009), which the current three@0.163
  RGBELoader rejects, so the HDR environment map silently fails and the viewer falls
  back to procedural/white lighting. Benign (no crash; the fallback works) but real —
  drop the `setDataType(UnsignedByteType)` call (or switch to `HalfFloatType`) in
  `src/lib/textures.ts` so the HDR actually loads. Verify headless with
  `node scripts/shoot.mjs '#/complex-particles' out.png`.

- [ ] [complex-particles] !med Argand: an explainer + tools for complex / dual / split-complex numbers.
  The app already runs the affine line through all three systems via the System
  slider p=j² (Complex p<0 · Dual p=0 · Split-complex p>0). Add an explainer that
  teaches what each space *does* — how multiplication acts (rotation / shear / boost),
  how polynomials behave — plus basic tools for thinking it through. Argand needs time
  to "get played" first. Naming note: "Argand plane" properly names only the complex
  case (p=−1); the dual plane is the **Galilean plane** (Yaglom; parabolic numbers)
  and the split-complex plane is the **Minkowski / pseudo-Euclidean plane** (a.k.a.
  Lorentzian; hyperbolic/perplex numbers). A neutral umbrella for the morphing object
  is the "generalized complex plane."

- [x] [engine] Solid Worlds — fix the cell-engine screw bug to graduate the 2 experimental worlds.
  DONE 2026-06-20 (branch `claude/3d-manifold-worlds-imwmal`). Was two distinct
  bugs: (A) the boundary gluing reduced a screwed face's straddling image to the
  *first* in-cube cell — the inverse-of-the-pairing bounce back to the source — a
  no-op self-gluing that left 4 faces unglued (χ=1 on the second amphidicosm);
  (B) the N=2 vertex link is too coarse and folds onto itself on screw worlds
  (pure subdivision artifact, fine at N=4). Fixed by gluing each cell to its whole
  in-cube deck orbit (`orbitInCube`) + a finer subdivision for screw worlds
  (`chooseN`), plus a guard rejecting fractional axial offsets. All 8 worlds now
  dual-verified; `analyzeSolid(...).verified` true throughout. Full write-up in
  `src/animations/SolidWorlds/SCREW_BUG.md`.

- [x] [engine] Solid Worlds — confirm second amphidicosm (−a2) = ℤ⊕ℤ/4 vs Conway–Rossetti.
  CONFIRMED 2026-06-20. The two amphidicosms (β₁=1, holonomy ℤ₂²; Bieberbach
  B₃/B₄) are uniquely fixed by their homology — H₁(B₃)=ℤ⊕(ℤ/2)² and H₁(B₄)=ℤ⊕ℤ/4
  in the literature — so −a2 (= second amphidicosm = B₄) = ℤ⊕ℤ/4 is the genuine
  name↔invariant pairing, not just elimination. Our app computes exactly these two
  values via *both* Γᵃᵇ and the (now dual-verified) cell complex. Caveat (now
  resolvable): the primary PDF (arXiv math/0311476 Table 6) was unreachable that
  session (network 403); it is now saved locally at
  `docs/papers/describing-the-platycosms.pdf`, so the Table-6 read can be confirmed
  directly. Naming question closed 2026-06-22 — Dan: leave "Solid Worlds" as-is.

- [x] [chrome] App-map view in the control center — per-app rollup (latest · risk · open · next).

- [x] [docs] Split the two heavy complex guides into Part 1 / Part 2; cut applet weight.

- [x] [docs] Add a `docs` category + `trees-and-nets` to the session taxonomy.
