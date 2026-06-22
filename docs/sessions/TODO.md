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

- [ ] [complex-particles] !high Plane / particles unification — one "which plane am I looking at" convention across the viewers and their guides.
  Surfaced while splitting the complex guides: we show the bare x,y plane with a
  linear Complex Particles plot, but Plane Transform also shows "a plane." Decide a
  single mental model (and which viewer owns which job) so the guides stop being
  ambiguous. Affects functions guide §1 and the Plane Transform guide.

- [ ] [docs] !high Productionize the signals/to-do system — teach agents to author it.
  Update REPORT_STYLE.md, the progress/handoff templates, and the handoff +
  start-session skills so every session declares `signals:`/`next:` and consults +
  appends this backlog. Without that, the dashboard only stays rich by inference.

- [ ] [complex-particles] !med Argand: make the scrubber pay its way (or drop it) — the *arc* is the payload, not the slider.
  Dan on Phase 1: the position-scrubber adds little on its own; the static parametric
  path (spiral / parallelogram) is what teaches. A bare `t`-slider only earns its place
  when coupled to a **live changing equation/readout** (scrub → `a·bᵗ`'s value, modulus
  and angle update so you watch the algebra move). Either wire that live readout, or
  de-emphasize the slider and foreground the always-on arc. Revisit alongside the
  plane-morph chapter, where a changing readout makes scrubbing genuinely useful.

- [ ] [chrome] !med Make the App-map richer — open it from a chip, link "N backlog" to the filtered To-do, maybe roll trends over time.
  The base App-map view now ships (per-app latest · risk · open · next, sorted
  worst-risk-first); these are the polish follow-ups.

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

- [ ] [chrome] !low Decide Stable Marriage's final fate — keep as unlisted route or fully delete.
  Its gallery card was retired in favor of Stable Matching (PR #220): `META` entry
  dropped in `src/chrome/catalog.ts`, but `#/stable-marriage` still routes and the
  `src/animations/StableMarriage/` folder + `apps.ts` entry remain (reversible, like
  `#/fractals-cpu`). If it's truly dead, follow up by deleting the folder, the route
  in `index.tsx`, the `apps.ts` entry, and the now-unused `marriage` `PreviewKind`.

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
  values via *both* Γᵃᵇ and the (now dual-verified) cell complex. Caveat: the
  primary PDFs (arXiv math/0311476 Table 6, nLab) were unreachable this session
  (network 403); confirmation rests on search summaries quoting the literature's
  homology values + the two in-app computations agreeing with them. Still open: the
  app-naming question ("Solid Worlds" vs *Manifold Walk*) — a product call for Dan.

- [x] [chrome] App-map view in the control center — per-app rollup (latest · risk · open · next).

- [x] [docs] Split the two heavy complex guides into Part 1 / Part 2; cut applet weight.

- [x] [docs] Add a `docs` category + `trees-and-nets` to the session taxonomy.
