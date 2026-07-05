<!-- docs/sessions/TODO.md — the project backlog / to-do list.

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

-->

# Backlog · animath

- [ ] [docs] !high Build the **Number Planes** choice-driven educational page.
  Narrative-first teaching page about the three number planes (complex/dual/split as
  Spin/Shear/Squeeze over j²), in the `public/*-guide.html` family but JS-driven and
  navigated as a curiosity-driven web. Full story + plan + open questions:
  `docs/sessions/progress/argand-plane-review-51egvz/2026-06-24-S01-plan-number-planes-page.md`.
  Engine ready: `src/animations/Argand/numberPlanes.ts` (dormant, 50 tests). First
  consumer would be a `#/embed/number-planes` applet (j² dial · rails · change-of-basis
  morph). Converge the plan's open questions with Dan before drafting.

- [ ] [argand] !high Decide the Argand / Number-Plane final unified format (blocks the two items below).
  From the 2026-07-02 deep review (`clean-up-loose-ends-8b0wqp/2026-07-02-S02`): Argand
  and the "Number Plane" idea are two unmerged realizations of one concept — the
  shipping app runs on `complexOps.ts`; the "Number Plane" is the dormant, tested
  `numberPlanes.ts` engine + a planning doc (never its own app; nothing was buried).
  A separate **notebook thread** is working out what that artifact should ultimately
  be. Until it lands, the two apps are **clustered at the END of the gallery** (Plane
  Transform · Argand; Complex Particles stays the flagship — see `src/apps.ts` header).
  Dan 2026-07-02: "needs a cleaner idea of what it's aiming for." Converge with Dan +
  the notebook before merging engines or restyling.

- [ ] [argand] !med Wire Argand's visualization onto theme tokens (it's currently theme-blind).
  From the 2026-07-02 review (convention-drift): `ArgandPlane.tsx` hardcodes a 7-color
  role palette (`Z_COL`/`A0..2_COL`/`F_COL`/`FIX_COL`/`CRIT_COL`) + inline scene hex and
  imports **no** theme hook, so its picture ignores skin × mode — the only app that
  fully does. Map the roles onto `--data-1..7` via `useThemeTokens`, re-read on
  `themeId`+`themeMode`. Mechanical, but entangled with the format question above — do
  it once the artifact's direction is settled, not before.

- [ ] [argand] !med `complexOps.ts` (the live Argand math) has no tests — two engines, one job.
  The tested `numberPlanes.ts` (50 assertions) is dead; the shipping app runs on the
  untested `complexOps.ts` — the two re-implement the same p=j² algebra and can silently
  drift (2026-07-02 review T4). Cheapest fix once the format lands: make `numberPlanes`
  the core and have `complexOps` thin-wrap it (delete the duplicated primitives), which
  puts the live math under the existing suite. Do NOT do this before the format decision.

- [ ] [argand] !med Argand plane-app: open five-hat review Tier-1 items.
  From `2026-06-24-S01-expert-synthesis.md`: the one real correctness bug = fabricated
  dual/split *quadratic* fixed points (drawn as confident gold dots — flag/hide +
  disclose); the centered hint pill; the clipped "Re" label. Plus consider splitting
  PR #237 (review docs vs the narrative/engine work). Number-line/tour experiments were
  shelved this session (history only) — do NOT resurrect without a fresh formulation.

- [ ] [chrome] !high Theming v2 — light/dark-paired themes (decouple identity from mode).
  Full spec: `docs/sessions/progress/youthful-cray-7m6z9d/2026-06-24-S02-plan-light-dark-theming.md`
  (status: proposed; execute next session). Every theme gets a light AND dark palette under
  shared token names (via CSS `light-dark()`); a feature that *requires* a mode (glowing-particle
  / star scenes → dark; printout → light) forces it on its own subtree, so scene objects use the
  normal tokens at the theme's dark values — no bespoke per-app scene palette. The `data-scheme`
  attribute (PR #238) is the switch; dark variants are theme-tinted (Observatory blue-black,
  Mirage plum), so a forced-dark star field keeps the theme's character. Folds in the per-app viz
  unification (Trinary scene/data, Complex Particles, Plane Transform, Fractals, Correspondence,
  Trees, Argand), Agentic Sorting's deferred discrete-colormap adoption, and the Worlds' **day/
  night skies** (mode = time of day). Decisions locked (in the plan): outcomes → divergent
  colormap sampled by goodness; stars → discrete `--data` identity; planet → neutral; `--accent`
  is UI-only; Phosphor's light analog = the 1980s beige case. Prereq is the shared engine
  (Phase 0); most DOM/SVG apps then "just work," the WebGL apps need a force-mode wrapper +
  token-reading. Dan 2026-06-24: "the correct move gives every theme a light/dark palette."

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

- [ ] [trees-and-nets] !high Write the per-tab teaching explainers (document-first).
  Trees and Nets is now a tabbed app of independent transforms (Matrix→Tree · Tree→Matrix
  · Matrix→Net · Circular sums · Run); each tab ships only a STARTER explainer string.
  Flesh each into a real teaching module (the agreed "explainer missions"). Tabs live in
  `src/animations/TreesAndNets/tabs/`; the shared atom is a weighted split system. Handoff:
  `docs/sessions/handoff/pensive-pasteur-ewpdqb/2026-06-25-S01-quantum-tree-port-scoping.md`.

- [ ] [trees-and-nets] !med Add the two missing DAG cells: Tree→Net ("fatten") + Net→Matrix.
  The transform DAG currently has D→T, T→D, D→N, D→v; the empty cells are T→N (fatten a tree
  into a net — engine already built + tested in `lib/fattenTree.ts`) and N→D (read a net's
  distances). Adding them closes the graph and is the natural place to make the "weighted
  split system" atom a literal shared type instead of a conceptual one.

- [ ] [trees-and-nets] !low Phone-verify the new Trees-and-Nets tabs (≤740px).
  ValuePlot bars, CircleTour, EdgeSliders, and the per-tab matrices were only checked headless
  at 1280×800. Confirm the phone re-chrome (stacked cards + dock) reads for each tab.

- [ ] [trees-and-nets] !low Decide the fate of the dormant Fibers / associahedron code.
  `lib/{associahedron,mosaic}.ts` are intact but unreferenced (`buildAssociahedron` has no
  callers); the `DiskView`/`Graph3D` renderers live only in git `325afd8`. Either restore them
  as a `tabs/FibersTab.tsx` or delete the dormant files. Dan 2026-06-26: "leave it parked."

- [x] [docs] !high Productionize the signals/to-do system — teach agents to author it.
  DONE 2026-06-24 (repo-priorities-review). The authoring discipline is now enforced
  end-to-end: REPORT_STYLE.md + `_template-handoff.md` mark `signals:`/`next:`
  **required at handoff** (write `null` if none); the handoff skill requires them,
  tells agents to consult + append this backlog, and to run `sessions:lint` before
  finishing; start-session already reads TODO.md. The linter gained `stopped` as a
  status and a **frozen-record** rule (shelved `status: stopped` reports are exempt
  from the evolving kind/build/section contract), which cleared the corpus to **0
  errors**. CI gating is live: `deploy.yml` runs `sessions:lint --strict` as a hard
  gate on main, and a new `sessions-lint.yml` shifts it left to PR time. Remaining
  polish (separate, low): drive the ~130 advisory warnings down (mostly
  `build: passing`/`complete` wording and non-canonical Follow-up lines).

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

- [ ] [general] !low Screenshot tour — wire into CI as a regression aid (baseline + visual diff).
  `scripts/tour.mjs` (`npm run tour`; docs/SCREENSHOTS.md) ships `workflow_dispatch`-only
  today. Next: commit a baseline set and post a visual diff (or the contact sheet) on PRs
  that touch `src/chrome` or an app, so chrome/app regressions get caught. Complements the
  deep-link / headless-mobile-smoke harness item above (shares the headless-WebGL setup).

- [ ] [general] !low Screenshot tour — capture transient/interaction + theme states.
  The tour captures settled *default* frames only. Add the "?" explainer modal, a
  fullscreen view, and mid-animation / fractal-trace states; consider switching skins via
  a live `SkinPicker` click (faster than the current reload-per-skin) for non-gallery
  routes. Caveat to keep in mind: rendering is software WebGL (SwiftShader), not a real
  GPU — colors/AA differ subtly from production, so shots aren't pixel-true.

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

- [ ] [chrome] !low Make in-app canvases consistently theme-driven (gallery previews DONE).
  DONE 2026-06-24 (PR #238): rolled the `SkellamPreview` getComputedStyle pattern across
  **all** gallery previews via a shared `themeInk(light)` helper in `chrome/previews.tsx` —
  every card now reads `--viz-bg`/`--accent`/`--accent-2`/`--data-*` live, so it tracks the
  *specific* skin (verified across Phosphor/Neon/Mirage/Daylight), keeping the rainbow hue
  art on the complex-domain previews (Particles/Plane/Fractal/Julia) where hue encodes the
  argument. Caveat: JuliaPreview's cached Mandelbrot inset captures the skin at first paint
  and only re-tints on reload (the Julia pane + marker track live). Remaining (!low): a
  systematic sweep of each app's in-app canvases/HUDs so every skin renders faithfully — many
  were tokenized in the design-hardening pass, but deciding which 3D scene colors follow the
  skin vs stay semantic is still open. Dan 2026-06-23: neat idea, not urgent.

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

- [ ] [complex-particles] !med Mark inside/outside the unit circle (`|z| = 1`) in the 4D graph.
  Dan (2026-06-17) has been "missing" a way to *see* `|z| < 1` vs `|z| ≥ 1` — the circle
  is where Möbius/Blaschke maps swap inside↔outside, Joukowski folds it to a slit, and
  roots of unity sit. A **shader/color change** (per-particle `|z|` is in the shader; no
  DOM-overlay path for 80k points), deliberately kept out of #222. Design forks: (a) two
  colormaps split at `|z|=1` (Dan's instinct); (b) a diverging palette centered on
  `|z|=1` (circle as visible zero-crossing — most honest); (c) outside dimmed/desaturated;
  (d) a literal drawn `|z|=1` ring. Open: domain `|z|` vs image `|f|`; new "Color by"
  option vs a modifier on Domain/Range coloring. Honors hue-never-encodes-identity (colors
  by a geometric region of `z`). See the plan's Phase-2 section. Pairs with the next item.

- [ ] [complex-particles] !low Graph-native correspondence tie-line overlay (Step 2, Phase-2).
  The "lift line" from the domain point `(x,y,0,0)` to its graph point `(x,y,Re f,Im f)`,
  drawn through the same projection + 4D rotation (domain plane below, each point lifted
  to its graph height). Engine-adjacent: new `LineSegments` geometry + projection plumbing,
  plus undecided density/picking (sparse subset and/or tapped-point ray — never all 80k).
  A domain-legibility twin of the unit-circle item above; could be one PR.

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

- [ ] [general] !med Real-device mobile pass using `docs/MOBILE_CHECKLIST.md`.
  Discharges the 5 standing `phone-needed` signals (Argand ×2, complex-particles
  guides, headless ×2). The 2026-06-24 smoke is PASS 17/17 @ 390×844 but that's a
  crash/blank baseline in software WebGL, not a device check — layout, touch gestures,
  dock/sheet behavior and real-GPU rendering still need a phone. Work the checklist,
  tick boxes, and clear each app's `phone-needed` signal as its section passes.

- [ ] [docs] !low Drive the ~130 advisory `sessions:lint` warnings toward zero.
  Mostly `build: passing`/`status: complete` legacy wording and non-canonical
  `**Follow-up value:**` lines (non-ASCII hyphen / bold-wrapped level). The corpus is
  at 0 *errors* (CI-gated via `deploy.yml` + the new `sessions-lint.yml`); this is the
  warning cleanup. Once quiet, consider promoting the PR `sessions-lint` check and the
  mobile smoke from advisory to hard gates (drop `continue-on-error`).

- [ ] [chrome] !low Adopt the discrete colormap registry in Agentic Sorting (theme --data palette for agent identity).
  The 2026-06-24 design-hardening session shipped `src/lib/colormapRegistry.ts` +
  `<ColormapPicker>` and adopted it in Stable Matching (divergent, default RdBu). Agentic
  Sorting's Okabe-Ito agent palette (`arena.ts:13-25`) is the canonical *discrete* target but
  was deferred: it feeds 3 surfaces (canvas `colorFor`, DOM swatches in `AgenticSorting.tsx`,
  `LabResults` `barColor`) that must convert atomically, plus a `useThemeId()` subscription +
  a per-frame ref refresh for the canvas; the existing palette is already colorblind-safe. Do
  it as one pass with cross-skin visual verification. The same pattern fits Trinary Lab's
  census outcome colors.

- [ ] [chrome] !low Tokenize residual DOM color on the compliance-clean apps (polish, no visible break).
  From the 2026-06-24 audit: Polygon/Solid Worlds HUD overlays (~12-14 hex each), Trinary's
  preset/active buttons (hardcoded blue), PlaneTransform's split-pane bg `#0c0c10` + SVG
  `stroke="#ffffff"`, TreesAndNets' `C_FLIP`/`C_CROSS`/`#ffd54a` SVG constants. NONE break on
  light skins today (verified Trees + Plane in Daylight this session) — pure polish, so weigh
  against regression risk on already-compliant apps. Leave 3D scene/material color + semantic
  state markers alone (engine color, not chrome).

- [ ] [chrome] !low Complex Particles: reflow/fade the pan-zoom hint when the 4D-Rotation panel covers it.
  Design-doc 03 minor item; the hint lives on the shared view-overlay hint layer. Polish, not
  a contract violation.

- [ ] [chrome] !low Full 8-skin × all-apps tour sweep as a visual-regression baseline.
  `npm run tour -- --skins all` now spans 8 skins (Daylight/Primary/Mirage added 2026-06-24).
  The hardening session verified the changed apps in representative skins (dark/daylight/
  phosphor) but not the full 8×14 matrix. Capture a baseline contact sheet; pairs with the
  existing "wire the tour into CI" TODO above.

- [ ] [chrome] !low Revisit --font-scale Option B (rem migration) if Phosphor still reads large.
  2026-06-24 shipped Option A — a scoped `[data-theme="phosphor"] .am-app/.am-gallery-app
  { zoom: var(--font-scale) }` (=0.9), screenshot-verified gap-free at gallery + app level.
  Option B (migrate chrome px→rem + a type-root `calc()` multiplier) is the cleaner long-term
  fix if A proves insufficient; bigger diff, deferred per the design doc.
