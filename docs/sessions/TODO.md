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

- [ ] [chrome] !low Decide Stable Marriage's final fate — keep as unlisted route or fully delete.
  Its gallery card was retired in favor of Stable Matching (PR #220): `META` entry
  dropped in `src/chrome/catalog.ts`, but `#/stable-marriage` still routes and the
  `src/animations/StableMarriage/` folder + `apps.ts` entry remain (reversible, like
  `#/fractals-cpu`). If it's truly dead, follow up by deleting the folder, the route
  in `index.tsx`, the `apps.ts` entry, and the now-unused `marriage` `PreviewKind`.

- [ ] [engine] !high Solid Worlds — fix the cell-engine screw bug to graduate the 2 experimental worlds.
  `lib/homology.ts` has an orientation-sign / vertex-link error on rotated/reflected
  staggered (screw) gluings: the didicosm (Hantzsche–Wendt) matches H₁=ℤ/4⊕ℤ/4 and
  χ=0 but its link cert returns false; the second amphidicosm gets χ=1. Both ship
  *experimental* (Γᵃᵇ-only, correct via `lib/freeness.ts`). Fixing the cell bug
  makes `analyzeSolid(...).verified` true for both → dual-verified, drops the HUD
  "experimental" badge. Cross-check harness pattern is in `__tests__/gab.test.ts`.

- [ ] [engine] !med Solid Worlds — confirm second amphidicosm (−a2) = ℤ⊕ℤ/4 vs Conway–Rossetti.
  Derived by elimination (Γᵃᵇ + cell agree on the value); confirm the name↔invariant
  pairing against *Describing the Platycosms* (arXiv:math/0311476), Table 6. Also an
  open naming question for the app itself ("Solid Worlds" vs *Manifold Walk*).

- [x] [chrome] App-map view in the control center — per-app rollup (latest · risk · open · next).

- [x] [docs] Split the two heavy complex guides into Part 1 / Part 2; cut applet weight.

- [x] [docs] Add a `docs` category + `trees-and-nets` to the session taxonomy.
