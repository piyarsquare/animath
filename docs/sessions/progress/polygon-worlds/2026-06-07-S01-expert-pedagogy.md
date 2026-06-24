---
kind: three-hats
session: 2026-06-07-S01
date: 2026-06-07
title: Polygon Worlds plan — mathematician-educator review
branch: claude/polygon-worlds
slug: polygon-worlds
status: completed
build: n/a
followup: HIGH
pr: null
---

# Polygon Worlds plan — mathematician-educator review

## Bottom line up front

The organizing idea is *right* and rare: "every closed surface is a polygon glued by edge-isometries; curvature is forced by the corner-angle budget; the universal cover is the deck group you literally walk." Built honestly, this is the most visceral path I know to Uniformization, covering spaces, and Gauss–Bonnet in one app. The verified `surfaceSchema.ts` base layer is exactly the right foundation — it computes χ, orientability and the vertex identifications from the edge word with no per-surface special cases, which is the hard part done right.

> [!WARNING]
> **But** the plan's single most load-bearing geometric claim — "**realize the polygon as a *regular* geodesic 2n-gon whose corner angle makes the gluing smooth**" — is **false for several of the headline surfaces**, including the two spherical cases the user already flagged (sphere, ℝP²). A regular polygon with one tuned corner angle only works when *all* corners fall into *one* vertex class. For `abab` (ℝP²), `aa⁻¹bb⁻¹` (sphere on a square) and the bigons, they don't. The smooth-gluing story **hides cone points and degenerate vertices**. This must be fixed in the model before P2/P3, or the app will teach a falsehood with great production values.

## The deck-group / develop model — is it the right thing to teach?

Yes, emphatically, and it is the app's deepest asset. Three reasons it is the correct mental model rather than a convenience:

- **It makes the universal cover *perceptual*, not symbolic.** "Look into the distance → the hall of mirrors" literally renders \(\widetilde S \to S\): each self-image is a deck transformation \(\gamma\in\Gamma\), and the lattice of images *is* the \(\Gamma\)-orbit. For the flat torus this is the integer lattice; for the octagon it is a Fuchsian group acting on \(\mathbb H^2\). A student who has *walked between two of their own images* has held a generator of \(\pi_1\) in their hand. That is the right intuition.
- **Deck transformations = edge-pairing isometries.** The plan's "isometryFromEdgePair" is precisely the generator of \(\Gamma\) attached to that gluing. Walking across edge `a` and seeing the neighbour tile is applying that isometry. This is the honest definition of the covering action, not a metaphor.
- **Holonomy falls out of the same machinery.** "Walk a loop, come back rotated/mirrored" is the developing map's holonomy \(\rho:\pi_1\to\mathrm{Isom}\). Same pipeline, no new concept.

> [!NOTE]
> **Watch** The hall of mirrors can *confuse* if it is presented as "rooms" with walls. The whole point is that there are **no walls** — the copies are the same room seen along closed geodesics. Render the images as *continuations of the same floor* (the flat engine already slides one tiled plane under the player — keep that framing literally everywhere). If a learner reads the tiles as separate rooms, you have taught a quotient of disconnected pieces, which is the opposite of a cover.

## Fidelity crisis: "regular polygon, tune the corner angle" is not general

The plan leans on Gauss–Bonnet at a vertex: for a smooth point the corner angles meeting there must sum to \(2\pi\). The plan then says: pick the regular 2n-gon whose single corner angle \(\theta\) satisfies \(2n\cdot\theta = 2\pi\) at "the vertex" and solve for κ. **This silently assumes all 2n corners are identified to ONE vertex class.** That is true for the standard \(4g\)-gon words but *false* for several surfaces the plan promises. I ran the verified schema's vertex union-find on the headline words:

| Edge word | Surface | χ | V (vertex classes) | Corners / class | Regular smooth gluing? |
| --- | --- | --- | --- | --- | --- |
| `a b a⁻¹ b⁻¹` | Torus | 0 | 1 | 4 | Yes 4×90°=360°, flat square |
| `a b a b⁻¹` | Klein bottle | 0 | 1 | 4 | Yes flat square |
| `a a b b` | Klein (cross-cap form) | 0 | 1 | 4 | Yes flat square |
| `a b a⁻¹ b⁻¹ c d c⁻¹ d⁻¹` | Genus-2 | −2 | 1 | 8 | Yes 8×45°=360°, hyperbolic octagon |
| `a b a b` | ℝP² | 1 | **2** | 2 each | No would need 2×θ=360° ⇒ θ=180°, a degenerate "polygon" |
| `a a⁻¹` | Sphere (bigon) | 2 | 2 | 1 each | No a vertex with ONE corner can't sum to 2π unless θ=2π |
| `a a` | ℝP² (bigon) | 1 | 1 | 2 | Special 2θ=2π ⇒ θ=π: the corners are *antipodal poles*, not a generic corner |
| `a a⁻¹ b b⁻¹` | Sphere (square) | 2 | **3** | mixed (1,1,2) | No three different cone-angle conditions on one regular square |

The pattern: **the "one regular polygon, one corner angle" recipe is only valid when V = 1** (all corners coincide). That holds for the torus, Klein bottle, the cross-cap forms, and the genus-\(g\) \(4g\)-gons — i.e. exactly the canonical flat and hyperbolic cases. It *fails* for the spherical cases the user already called out, and for any presentation with a non-canonical vertex pattern (e.g. words with cancelling `cc⁻¹` pairs the schema explicitly admits).

> [!CAUTION]
> **Why this misleads** If the engine just solves \(2n\theta=2\pi\) and renders a regular polygon for *every* word, then for `abab` it will produce a square whose two vertex classes have **cone angles of 360°+excess** — i.e. it will silently insert **cone points** (curvature concentrated at vertices) while telling the student the surface is smoothly curved. A learner measuring the triangle-angle-sum near that vertex would get a *wrong, location-dependent* answer and conclude ℝP² has variable curvature. It does not. This is the difference between a *true* constant-curvature model and a flat-polygon-with-cone-points cheat.

### What the model must actually do

- **Spherical cases need adjacent gluing, not opposite/parallel.** The user is right. The round sphere is two triangles, or a bigon (lune) \(aa^{-1}\) glued along *adjacent* edges meeting at the two poles; ℝP² is the lune \(aa\) (antipodal lune) or the round hemisphere with antipodal boundary identification. There is no "regular square with tuned corners" sphere. The honest spherical fundamental domains are *lunes/triangles*, and the corner angles are the lune's apex angles, not a free parameter. The plan's square-centric framing must **branch for κ > 0**.
- **ℝP² is not a regular square.** The canonical model is the round hemisphere / antipodal sphere, or the lune `aa`. If you insist on a square picture for the mini-map, fine — the existing `rp2Square` chart in `squareMap.ts` is an honest *chart* for the diagram — but the *walked geometry* must be the round metric (antipodal \(S^2\), which the spherical engine already does), **not** a flat square with corner cones.
- **General V > 1 words:** either (a) restrict the regular-polygon realizer to the V = 1 canonical ladder and present other words only as *diagrams* (schema + mini-map) without a walkable smooth geometry, or (b) implement the genuinely correct construction — a polygon whose *per-vertex* angle conditions are solved simultaneously, which for constant curvature generally forces a *non-regular* polygon or a different domain. Option (a) is the honest, shippable choice; option (b) is a research-grade feature. Do not let the engine pretend (b) by faking (a).

> [!IMPORTANT]
> **Recommendation** Add a `realizable` predicate to the geometry layer: *"this word admits a regular constant-curvature polygon"* ⇔ V = 1 (plus the bigon/lune special cases handled explicitly). When false, the app should **say so** ("this presentation has 2 vertex classes; the regular flat square would have cone points — here is the honest round model instead") and fall back to the correct domain. The plan's free-word entry (P4) makes this mandatory: users *will* type words with V > 1.

## The hyperbolic octagon — get the defect honest

The genus-2 octagon is the one case where the "tune the angle" story shines and is fully correct: V = 1, eight 45° corners, 360° total. The teaching opportunity is the **angle defect**: a Euclidean regular octagon has 135° corners (1080° total, way over 360° — eight of them overlap), so the surface *must* buy back \(1080°-360° = 720°\) of angle by curving negatively. Gauss–Bonnet says \(\int K = 2\pi\chi = -4\pi\), and the octagon's area in \(\mathbb H^2\) is exactly \(-2\pi\chi/|K| = 4\pi\) (with \(K=-1\)) — area equals total turning. **Show this number.** The single most convincing hyperbolic "aha" is: "I shrank the corners from 135° to 45° purely by making the polygon bigger in \(\mathbb H^2\); area and angle defect are the same thing." Put the live corner angle (135°→45° as κ is solved) on screen.

> [!NOTE]
> **Projection** Poincaré (conformal: angles true, the 45° corners *look* 45°) is the right default for the hall-of-mirrors tiling — the famous octagon tiling reads correctly. But for *first-person geodesic walking*, Beltrami–Klein (geodesics are straight chords) is far easier to reason about and to render a straight-ahead ray. Consider Poincaré for the god's-eye mini-map, Klein for the walk. Disclose the distortion either way: "straight lines look curved here because the picture is conformal, not the world."

## Euler's instruments — are they diagnostic, and well-founded?

| Instrument | Sound? | Caveat / what it actually needs |
| --- | --- | --- |
| Walk-a-geodesic & return (holonomy class) | Yes | Genuinely diagnostic: same / rotated / mirror-flipped distinguishes torus vs sphere vs Klein. This is the strongest single instrument — feature it. |
| Drop-a-trail, mirror-reversed return | Yes | The canonical orientability test. The chiral footprint decal already in `decor.ts` is the right encoding. Make sure the trail's handedness, not just its position, is what returns flipped. |
| Triangle angle-sum | Conditional | **Must be a geodesic triangle.** If the player walks "straight, turn, straight, turn" the edges must be true geodesics of the κ-metric, or the excess is meaningless. On a cone-point fake (see above) the answer is wrong. Snap the triangle's sides to `geodesicStep`, and forbid it near vertices in any cone-point fallback. |
| Circle circumference vs radius | Yes | Honest and complementary to the triangle (the metric view of the same curvature). Needs the geodesic circle (locus at fixed geodesic distance), not a coordinate circle. |
| Parallel-transport compass | Conditional | **Requires a connection the engine actually integrates.** On a constant-curvature surface this is exact and cheap (transport = rotate by the enclosed area × K), but only if the engine computes holonomy from the developing isometries, not from an ad-hoc heuristic. If you fake it, you teach a false connection. Tie it to the same isometry composition as the develop step — then it is free and correct. |
| Hall-of-mirrors = deck group | Yes | The conceptual jewel (see above). Cheapest in the flat engine, hardest but most rewarding in \(\mathbb H^2\). |

> [!CAUTION]
> **Coupling** The two conditional instruments (triangle, compass) are only diagnostic if the geometry layer is *genuinely* constant-curvature, i.e. exactly the part the "regular polygon" shortcut endangers. Fixing the fidelity crisis above is a prerequisite for these instruments being honest. They are a built-in correctness test: if the triangle excess is location-dependent, your model has cone points it shouldn't.

## Intrinsic vs extrinsic — the headline lesson, and it's placed too late

The design note (§3) nails the deepest idea in the whole tour: cross-cap, Roman, and Boy's surface are the *same* ℝP² — **"same walk, wildly different shape."** This is the lesson that separates topology from "looking at a weird shape." The plan, however, files the embedding insets under "optional" in P4. **That is a pedagogical mistake.** The intrinsic/extrinsic split is not a nice-to-have; it is the conceptual payload of the non-orientable surfaces and the cure for the most common student misconception (that a Klein bottle *is* its self-intersecting glass model). At minimum, ship the inset *with* the spherical phase (P2), when ℝP² first appears, not bolted on at the end.

> [!IMPORTANT]
> **Recommendation** Promote the embedding inset to land alongside the first non-orientable surface. The "switch the immersion while the first-person view doesn't flinch" demo is the app's thesis statement. Build it as the second WebGL viewport with scissor (per the open question in §7) so the immersion is rotatable with a live you-are-here dot — a static image loses the "same walk" punch.

## Defaults & first views — is the opening illuminating?

- **Torus (P1):** default to looking *down a geodesic toward your own image*, with the hall-of-mirrors faintly visible, so the first thing the player sees is "the world repeats." Do not open on a featureless floor. The mini-map (square + identification chevrons) must be visible from frame one — it is the Rosetta stone.
- **Klein bottle:** the default should make the orientation-flip discoverable within ~10 seconds. Open near an orientation-reversing edge with a numbered landmark just across it, so the mirror-reversed copy is in view. The chirality of the decal is the cue — make it large and unambiguous.
- **Sphere / ℝP²:** open *outside-looking* briefly (the planet) then drop in, so the player knows it's a sphere before walking. For ℝP² the default must set up the "walk to the antipode and arrive flipped" loop as the headline, not bury it.
- **Octagon:** open on the Poincaré tiling (the famous picture) with the corner angle annotated, then enter first-person. The tiling *is* the wow.

## Skin / colour legibility — trees vs columns as the two orientation classes

Encoding the two sides by *shape* (column vs tree) rather than colour is a genuinely good, **CVD-robust** choice — shape is the most accessible channel and survives any colour-vision deficiency. The per-landmark hue in `decor.ts` is decorative identity, not load-bearing, which is correct. Two refinements:

- **Is "column vs tree" a faithful encoding of orientation?** Mostly yes, but be careful about *what* it encodes. On the *orientable* torus the two faces (top sheet / under sheet) are *extrinsically* two surfaces but *intrinsically the same orientation class*. On the *non-orientable* Klein/ℝP² there is genuinely one side. If columns-vs-trees means "which extrinsic face," that's honest for the torus but risks implying the Klein bottle has two orientation classes when it has one. The truly faithful orientation cue is the **chirality of the decal** (it returns mirror-reversed) — keep that as the canonical orientation signal and treat tree/column as the secondary "which sheet" decoration. The note's §4.1 framing ("walk an orientation-reversing loop and return on the starting side") is the correct mental model; make sure the skin doesn't contradict it.
- **The number+arrow decal must be the orientation arbiter and must be CVD-legible:** it already uses a black stroke under the coloured glyph (good contrast), and the arrow's handedness is the chirality cue. Ensure the arrow is asymmetric enough to read reversed at a glance — a chevron that looks similar mirrored would kill the lesson.

## Semantic hygiene — name things as mathematicians do

- Call the edge-pairing maps **deck transformations / generators of \(\Gamma\)** in the UI, not just "neighbour rules." The whole app earns the right to use the real word.
- "Develop" is the correct term (developing map) — keep it, but gloss it once for learners ("unroll the surface into its universal cover").
- Distinguish **cross-cap count** (\(N_k\)) from **genus** consistently; the schema already does. Don't say "genus" for non-orientable surfaces.
- The hexagon torus: label it explicitly "*same torus, different fundamental domain*" — the lesson is non-uniqueness of the polygon, and naming it wrong (as a new surface) would be a real error.
- Reserve "smooth gluing" for V = 1 realizable cases; for cone-point or spherical cases use the honest term ("cone point", "lune / spherical triangle", "antipodal identification").

## Phasing — does P1-only already teach?

Finding Yes — P1 (Euclidean: torus + Klein) is a complete, shippable lesson on its own: \(\pi_1\), the universal cover as the tiled plane, orientability via the mirror-reversed trail, and the deck group as translations + glide-reflections. It already teaches covering spaces and orientability without any curvature. That is a healthy first increment and the flat engine is largely built. Good plan-bones.

> [!WARNING]
> **Re-order request** Two changes to the phasing: (1) **Move the intrinsic/extrinsic inset earlier** — it is the thesis, not a P4 garnish; ship it when ℝP²/Klein first appear. (2) **Front-load the realizability check** (V = 1 predicate + honest fallback) into P1's geometry interface, because P2's sphere and P4's free-word entry both depend on it. Doing it late means rebuilding the geometry contract. The spherical phase (P2) should be planned as *lunes/antipodal-\(S^2\)* from the start, not "the square engine with κ > 0."

## The one "aha" to protect

If the app protects exactly one idea, protect this:

> [!IMPORTANT]
> **The thesis** **The shape of a surface (extrinsic) and the experience of living on it (intrinsic) are different things — and topology is the study of the experience.** Walking the torus and the Klein bottle feels different (orientation flips); walking the cross-cap, Roman, and Boy's surface feels *identical* (it's all ℝP²). The mini-map and embedding inset are the god's-eye cheats; the instruments are how Euler tells worlds apart from inside. Every design decision should serve "*same walk, different shape*" and its dual "*same square, different inside*." The biggest threat to this aha is the fidelity bug: a cone-point fake makes the *intrinsic* experience wrong, which corrupts the very thing the app exists to teach.

## Where this could mislead a learner — checklist

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Regular polygon with hidden cone points presented as smooth constant curvature (ℝP² `abab`, sphere `aa⁻¹bb⁻¹`) | HIGH | V = 1 realizability gate + honest fallback to lune / antipodal model; never fake-render a cone surface as smooth. |
| Sphere built from opposite/parallel gluing instead of adjacent (user-flagged) | HIGH | Spherical phase uses lunes/triangles with adjacent edges; reuse the working antipodal-\(S^2\) walk engine. |
| Hall of mirrors read as separate rooms, not a cover | MED | Render images as continuations of one floor; no walls; gloss "these are all the same room." |
| Conformal hyperbolic view read as "the world is curvy" | MED | Disclose the projection; offer Klein for straight geodesics. |
| Triangle/compass instruments on a non-constant-curvature fake → location-dependent answers | HIGH | Depends on the fidelity fix; tie parallel transport to the develop isometries. |
| Tree/column implying Klein bottle has two orientation classes | MED | Canonical orientation cue = chiral decal returning reversed; skin is "which sheet," secondary. |
| Embedding inset too late → students conflate Klein bottle with its glass model | MED | Ship inset with the first non-orientable surface. |

## Verdict

**Approve the vision; block the geometry shortcut.** The develop/universal-cover/deck-group model is the right way — arguably the *best* way — to teach covering spaces, holonomy and Uniformization, and the verified `surfaceSchema.ts` foundation is excellent. The instruments are mostly well-founded and the skin's shape-based orientation encoding is CVD-robust and faithful (with the chiral-decal caveat).

The plan is **not safe to build as written** because its central geometric realizer — "every word becomes a regular 2n-gon with one tuned corner angle" — is mathematically false precisely for the spherical surfaces the user already flagged and for any V > 1 presentation, and it hides cone points while claiming smooth constant curvature. That is the one thing this audience will never forgive, because it corrupts the intrinsic experience the app exists to teach.

**Three required changes before P2/P3:**

1. Add a **realizability gate** (regular constant-curvature polygon ⇔ V = 1; bigons/lunes handled explicitly) with an **honest fallback** for everything else. Never render a cone surface as smooth.
2. Plan the **spherical phase as lunes / antipodal \(S^2\)** (adjacent gluing), reusing the working spherical walk engine — not "the square engine at κ > 0."
3. Promote the **intrinsic/extrinsic embedding inset** to ship with the first non-orientable surface; it is the thesis, not a P4 extra.

With those, P1 already ships a real lesson, the octagon finale is fully honest, and the app becomes the topology toy I'd actually teach from. Verdict: CONDITIONAL GO — green light on the idea and P1, hard gate on the geometry-realizer fidelity before curved phases.

## Self-reflection

1. **What would you do with another session?** Work out the *honest* spherical fundamental domains concretely (lune apex angles, adjacent-edge isometries) and a precise spec for the V = 1 realizability gate, so the geometry interface contract is pinned down before code. I'd also draft the exact corner-angle-vs-κ solve for each rung of the ladder.
2. **What would you change about what you produced?** I'd verify the cone-angle excess numbers for `abab` by hand-deriving them rather than arguing from V alone; the qualitative claim is solid but the quantitative defect would strengthen it.
3. **What were you not asked that you think is important?** Whether the app should ever *teach the cone-point surfaces deliberately* (cone manifolds / orbifolds are a real and beautiful topic) rather than only treating them as errors to suppress. A "cone point lab" could be a feature, not a bug — but only if labelled honestly.
4. **What did we both overlook?** The bigon cases (`aa⁻¹`, `aa`) sit at the very bottom of the ladder and are the *first* thing a curious user clicks; they are the most degenerate and least "regular-polygon-able". The plan's complexity ladder starts with its hardest-to-realize honestly cases.
5. **What did you find difficult?** Distinguishing "the plan is wrong" from "the plan is underspecified" — the regular-polygon claim could be read charitably as shorthand for "the canonical ladder." I chose to flag it hard because P4's free-word entry removes that charity.
6. **What would have made this task easier?** A draft of the `Geometry` interface signatures (geodesicStep, isometryFromEdgePair, develop) would have let me check the parallel-transport/holonomy claims against the actual computation rather than inferring.
7. **Follow-up value:** HIGH — the central fidelity issue could invalidate the curved phases if built as written; the spherical-domain spec and realizability gate need concrete design before P2.
