---
kind: plan
session: 2026-06-18-S01
date: 2026-06-18
title: "Plan: Solid Worlds — walking closed 3-manifolds (successor to Polygon Worlds)"
branch: claude/polygon-world-app-review-8dduma
slug: polygon-world-app-review-8dduma
status: in-progress
build: passing
followup: null
pr: null
app: solid-worlds
next: Tier 2 — full platycosm catalog, vertex-link manifold check + H₁ (Smith normal form), Schlegel mini-map; plus a 3D walk-the-loop chirality test (the flagged harness gap).
---

# Plan: Solid Worlds — walking closed 3-manifolds

A forward-looking implementation plan grounded in the *actual* `PolygonWorlds`
codebase (not the plan's idealized references), so a future session can pick it
up cold.

> [!NOTE]
> **Tier 1 is built** (S01, 2026-06-18) — `src/animations/SolidWorlds/`: flat
> 3-torus + amphicosm, the developing-map cover engine, the chiral footprint
> trail, and the chirality HUD. Route `#/solid-worlds`, build + lint green. Tiers
> 2–4 below remain. See the S01 progress report for the build notes.

> [!NOTE]
> This plan supersedes the uploaded draft where the draft and the real code
> disagree (the draft cites a promoted `lib/geometry/` kernel and a shared
> deck-group core that **do not exist yet** — the kernel is app-local). Reality
> checks are called out inline.

## The one idea, and the one thing that breaks

A closed surface is a **2n-gon with edges glued in pairs**; a closed 3-manifold is
a **polyhedron with faces glued in pairs**. Solid Worlds is Polygon Worlds one
dimension up: specify a face-pairing, derive the manifold and the geometry it is
forced to carry, then walk it in first person and read your own (now genuinely
3D) chiral trail.

The load-bearing 2D fact **does not survive the lift**, and the design is
organized around its absence:

- **In 2D, χ picks the geometry. In 3D, χ ≡ 0** (Poincaré duality) — it says
  nothing. Geometry is forced **locally, per edge**: after gluing, the dihedral
  angles around each edge-class must sum to 2π. A regular solid has fixed
  Euclidean dihedrals, so you tune curvature by realizing it in S³ (angles open)
  or H³ (angles shrink) until each edge closes. This is the genuine 3D heir of
  Gauss–Bonnet, derived per-edge instead of from one global integral.
- **Manifold-ness becomes a question.** A face-paired polyhedron is only a
  *pseudomanifold*; it's a genuine manifold **iff every vertex link is a
  2-sphere** (operational test: χ(link) = 2). The schema layer must *decide* this
  — a question the 2D layer never had to ask.

## The decision already made

**Build a separate sibling app — "Solid Worlds" — not a dimension knob on Polygon
Worlds.** Rationale settled this session:

- The governing contract differs: Polygon Worlds' teachable tagline ("one knob —
  the gluing — and χ forces the curvature") is *false* in 3D. Folding them muddies
  the exact sentence that makes the 2D app legible.
- Two signature 2D instruments have **no 3D analog**: the glass-floor "other side"
  (one-sidedness is codimension-1; a walker in a 3-manifold is codimension-0) and
  the embedding inset (no closed 3-manifold embeds in ℝ³). A folded app would hide
  half its UI in "3D mode."
- The 2D app's best moment is *stepping outside* the surface; the 3D app's spine
  is the opposite truth — **there is no outside**. That intrinsic-only spine
  deserves its own shell.

**Reuse the engine, not the app.** Share the math kernel; keep the app shell,
instruments, mini-map, and explainer distinct.

> [!TIP]
> Light discoverability without merging: a shared "Worlds" gallery framing so a
> visitor who walked the Klein bottle is one click from its 3-manifold cousins.

## What the real codebase gives us (reality check)

The uploaded draft assumes infrastructure that isn't there. Actual state:

| Draft assumes | Actually |
|---|---|
| shared `lib/geometry/cayleyKlein.ts` | **app-local** `src/animations/PolygonWorlds/lib/cayleyKlein.ts` (327 lines, `diag(κ,κ,1)` on (x,y,w), `det`-as-orientation, analytic κ→0) |
| promoted deck-group core | lives in `PolygonWorlds/coverModel.ts` + `lib/develop.ts` + `lib/invariants.ts` |
| `surfaceSchema.ts` reusable | exists (`PolygonWorlds/surfaceSchema.ts`, 180 lines) — **reuse it as the 3D vertex-link manifold-certifier** |
| `PolygonEngine` to mirror | `PolygonWorlds/engineTypes.ts` — clean interface to copy as `SolidEngine` |
| flat-world seamless tiling | `TopologyWalk` flat worlds + `coverModel.ts` — the κ=0 tiling to lift |
| scene "looks" | `PolygonWorlds/looks.ts` + `decor.ts` — reuse for room atmosphere |

**Kernel decision (draft §3): option B, but keep it app-local.** Add a 4×4 sibling
`cayleyKlein3d.ts` *inside the new app* (`src/animations/SolidWorlds/lib/`), sharing
the curvature-trig conventions with the 2D kernel by copy, **not** by promoting to
`src/lib/`. Promotion to a shared kernel is a later refactor once both apps are
green — it touches shipped 2D code and isn't worth destabilizing 2D for Tier 1
(which is κ=0 and needs no curved kernel at all).

## Design decisions reached this session

- **Footsteps are the headline instrument.** The 2D ink trail's det = −1 lived on
  the sheet and was absorbed by the normal ("you're looking at the back of your
  ink"). In 3D there's no normal to absorb it, so the reversal **lands on the
  body**: the footprint glyph becomes a genuine 3D chiral stamp, and your old trail
  returns mirror-imaged with no rotation matching it.
- **The opaque sign reads `ollɘH`.** Plant "Hello", walk the amphicosm's x-loop
  once → laterally mirror-reversed, right-side-up; restored after two laps. Opacity
  is no escape (the 2D glass see-through trick is gone; you read the front and the
  front is backwards). The honest caveat is the headline of the instrument design:
  the *apparent* flip location is a chart-seam artifact (the **seam slider** moves
  it); the *real* invariant is the closed-loop holonomy sign (w₁), compared against
  a stay-home twin.
- **Rotation vs reflection is a teaching pair.** Turn-spaces give *cosmetic*
  holonomies (det +1): the sign comes back spun / upside-down / facing-away, but
  you can reorient your body to read it. Only the non-orientable worlds give an
  un-fixable mirror — and even *which kind* of mirror (lateral / vertical /
  front-back) is gauge. The single invariant is "mirrored or not." Stage a
  turn-space beside the amphicosm so a viewer feels "I can fix this one, not that
  one."
- **The cube is a furnished room with portal faces, not walls.** Each face shows
  the deck-translate of the cell under that face's isometry (torus → identical
  copies receding; turn-space → rotated copies; amphicosm → a mirror room with your
  `ollɘH` sign). Default camera is a transported **free-frame** (no global "up" —
  matches the math); imposed gravity is an opt-in that *doubles as the Escher
  ceiling-disagreement demo* in the worlds that can't carry a consistent vertical.
- **Zoom-out cover view** (lift of `coverModel.ts`): a bounded lattice of tinted
  cubes + the trail threading through + **mirror-image avatar twins** across
  reversing generators.

## Build sequence (ordered to reuse most, break least)

### Tier 1 — flat cube, mirror-flip provable (smallest lift, biggest payoff)

The goal: stand in the 3-torus, then the amphicosm, and **exercise the genuine 3D
mirror-flip before writing any new rendering.**

- `src/animations/SolidWorlds/solidSchema.ts` — pure combinatorics: a cube + a
  face-pairing → edge-cycles, per-pairing isometry `det`, orientability. (Defer
  H₁ and vertex-link checks to Tier 2.)
- Cube face-pairing data for the **3-torus** (three straight translations, all
  det +1) and **one amphicosm = Klein-bottle × circle** (one glide-reflection
  `+X↔−X: reflect-Y then translate`, det −1; other two straight). See draft §13.
- `SolidEngine` interface (copy `engineTypes.ts` shape) + a κ=0 cover render
  reusing `TopologyWalk` flat-world machinery (third-person first; first-person
  can be Tier 2).
- **Chirality probe**: per-step incremental determinant (reads +1 the whole way —
  proof nothing local happened) + closed-loop sign (compare carried frame to
  start). This is the 3D analog of `inkTrail.ts`'s `chirality()`.
- 3D chiral footprint glyph (promote the 2D F/arrow to a solid with no mirror
  symmetry).

**Acceptance test (draft §13):** walk x in the amphicosm → world + trail return
mirrored; walk twice → restored; walk y or z → nothing flips; the 3-torus flips on
no axis. That contrast, running live, is Tier 1 done.

### Tier 2 — full flat catalog + matured schema kernel

- Vertex-link manifold check: **build each vertex link as a closed surface and run
  the existing `surfaceSchema.ts` on it** — `isManifold ⟺ all links are S²`. (The
  satisfying reuse: the 2D classifier becomes the 3D manifold-certifier.) Include a
  deliberate non-manifold (a vertex link that is a torus) and assert rejection.
- H₁ via Smith normal form of the boundary maps; catalog match (name iff it matches
  a curated entry, else "unnamed 3-manifold, H₁ = …, orientable = …" — **validate
  invariants, never claim a classification that doesn't exist**).
- All **ten platycosms** (6 orientable incl. the turn-spaces + Hantzsche–Wendt;
  4 non-orientable amphicosms).
- Polyhedron mini-map / **Schlegel diagram** widget (the natural flat depiction);
  first-person camera + seamless universal-cover tiling.

### Tier 3 — the 4×4 kernel + realize3d + curved render

- `SolidWorlds/lib/cayleyKlein3d.ts` (option B, app-local).
- `realize3d.ts` — the **dihedral solver**: find the solid size on the κ-shell so
  each edge-cycle's dihedral total is 2π. (Dodecahedron: Euclidean ≈116.57° → tune
  to 120° in S³, 3/edge → Poincaré sphere; → 72° in H³, 5/edge → Seifert–Weber.)
- **Projected-ball renderer**: stereographic S³ (κ>0) / Poincaré-ball H³ (κ<0),
  deck-translates shrinking + fogging toward the boundary — the 3D heir of the
  hyperbolic-disk worlds. *The real new graphics work.*
- Unlocks lens spaces L(p,q) (H₁ = ℤ/p), the Poincaré homology sphere (H₁ = 0),
  quaternionic space (ℤ/2 ⊕ ℤ/2), Seifert–Weber ((ℤ/5)³).

### Tier 4 — instruments & explainer

- The **seam slider** + full chirality HUD (per-step det, closed-loop sign,
  twin comparison); cover-cell tinting; `looks.ts` parity; a `public/*-guide.html`
  page; and — per this branch's new policy — a **"Possible sources & where to go
  further"** lineage block (Weeks' *Curved Spaces* / *The Shape of Space*; *Not
  Knot*; Segerman–Hart non-Euclidean VR).

## Validation strategy

Extend the existing harness rather than invent one:

- **Manifold-ness:** every catalog scheme → all vertex links S²; one deliberate
  non-manifold rejected.
- **Orientability / holonomy:** per-step incremental det ≡ +1 along any path; the
  closed-loop sign = w₁ on each generator (−1 exactly on glide-reflection gens).
- **H₁ golden values** (cross-checked against literature, not derived): 3-torus ℤ³;
  L(p,q) ℤ/p; Poincaré 0; quaternionic ℤ/2 ⊕ ℤ/2; Seifert–Weber (ℤ/5)³;
  Hantzsche–Wendt ℤ/4 ⊕ ℤ/4.
- **Geometry closure (Tier 3):** `realize3d` returns a solid size where every
  edge-cycle's dihedral total is 2π within tolerance.
- **Seam invariance:** sweeping the seam phase moves the apparent flip location but
  leaves the closed-loop holonomy sign unchanged.

> [!WARNING]
> **Harness gap.** `scripts/trail-chirality.mjs`, `verify-geometry.ts`, and
> `shoot.mjs` are 2D/surface-oriented. Tier 1's chirality acceptance test needs a
> **3D analog of `trail-chirality.mjs`** — non-trivial, and on the Tier 1 critical
> path. Budget for it.

## Risks & open questions

- **Curved-space render performance** (Tier 3): many fogged/shrinking
  deck-translates in S³/H³ is the heaviest piece; budget cover-depth tuning +
  mobile fallback. Tiers 1–2 sidestep it (flat = straight Euclidean draws).
- **Depth/occlusion across reversing pairings:** sorting mirror-image translates
  needs care (handedness in the depth sort).
- **Mini-map legibility:** a 3D fundamental-polyhedron widget is harder to read
  than a flat polygon; Schlegel is the likely answer but needs a UX pass.
- **Seam-slider intelligibility:** the conceptual heart, also the subtlest — must
  be paired with the twin-comparison readout so the invariant never hides behind
  the artifact.
- **Out of scope (declare it):** the κ-kernel covers only the **three isotropic**
  geometries (S³/E³/H³). The other five Thurston geometries (S²×ℝ, H²×ℝ, Nil, Sol,
  ~SL₂ℝ) are anisotropic and don't fit a single `diag` form. The entire §8 catalog
  lives inside the three isotropic geometries, so nothing planned needs them.

## Naming

**"Solid Worlds"** (recommended) — pairs cleanly with *Polygon Worlds* (polygon →
solid; the fundamental domain's shape names the app). Alternatives: *Manifold Walk*
(pairs with *Topology Walk*, verb-forward), *Space Worlds* (evocative, less
precise).

## Possible sources & where to go further

(Per this branch's new attribution policy — pointers, not priority claims, flagged
where uncertain.)

- **Jeff Weeks, *Curved Spaces*** — the direct ancestor: a free flight simulator
  for multiconnected universes (3-torus, lens spaces, Poincaré dodecahedral space,
  hyperbolic manifolds) showing the repeated cover. The closest prior art to this
  app's core.
- **Jeff Weeks, *The Shape of Space*** — canonical pedagogy for closed 3-manifolds
  as glued polyhedra; *Torus Games* is the 2D sibling (Polygon Worlds' ancestor).
- **Weeks / Luminet et al., Poincaré-dodecahedral-space cosmology** — the argument
  that the real universe might *be* the Tier-3 Poincaré sphere (WMAP data, early
  2000s; cross-check the date/authors before stating precisely).
- **"Not Knot"** (Geometry Center film) — flying through hyperbolic 3-space; the
  granddaddy of the curved-render look.
- **Segerman & Hart, non-Euclidean VR / "Hypernom"** — walking S³ (the 120-cell);
  essentially the Tier-3 spherical renderer in browser/VR form.
- **Games for *feel* (not math):** Control, Manifold Garden, Antichamber — scripted
  impossible architecture, not genuine quotients; useful as interaction reference.
