# A Conversation on Complex Analysis, Trig, and the Number Systems of the Plane

*A conversation exploring why trig functions feel unnatural, Euler's formula, conformal maps, the Jacobian, Möbius transformations, the three 2D number systems, and their connection to conic sections.*

---

## Why do trig functions feel unnatural compared to polynomials, exponentials, etc.?

The feeling reports something real, but it pays to locate where it lives. "Naturalness" doesn't reside in the functions; it names a relation between a function and whichever operations you've licensed as primitive. Swap the primitives and the ranking reshuffles. If your primitives amount to the field operations (+, ×, ÷) plus limits, polynomials and rational functions come out native and *everything* transcendental — exp included — looks imported. If your one primitive becomes "solve y′ = y," then exp turns native and trig still drags in an extra ingredient. And if you take the complex exponential as primitive, exp and trig collapse into a single object and the gap between them becomes an artifact of looking along the real axis. So the "etc." in your list already encodes a choice about what counts as cheap, and trig loses on that scoring — not through some intrinsic defect.

Here's the structural version that does the most work. Strip the geometry away and the exponential amounts to *the* homomorphism carrying the additive reals onto the multiplicative positive reals: e^(a+b) = e^a · e^b — addition in, multiplication out, one clean rule. The pair (cos, sin) does the analogous job, but its target sits on the unit *circle* (rotations) rather than on a line (scalings): t ↦ (cos t, sin t) carries the additive reals onto the circle group. Nearly everything that feels foreign about trig falls out of that one swap of target — a line for a circle.

The line stretches forever and has no holes; the circle closes up and wraps. So:

- **Periodicity** comes from the circle closing: travel far enough and you return, hence cos(t) = cos(t + 2π). And merely to *state* the period you have to name π, a transcendental constant with no finite algebraic provenance — it gets imported from the circle itself. Exp never forces such a constant on you.

- You get **two entangled functions** instead of one because you're now tracking a 2-D position (a point on the circle), not a 1-D magnitude. Under differentiation they rotate into each other — sin′ = cos, cos′ = −sin — cycling with period four. Neither closes under d/dx alone; only the pair does. That rotation-under-differentiation is precisely the factor of i you'll meet in a moment.

- The **addition law** looks messy — sin(a+b) = sin a cos b + cos a sin b — for the same reason: it states the rule for *composing rotations*, which reads as one clean operation inside the group but splinters into cross-terms once written in (cos, sin) coordinates. Exp's addition law stays a one-liner because composing scalings is just multiplying.

- The **inverses** misbehave because the circle has a hole. t ↦ (cos t, sin t) wraps the line around the circle infinitely often. Running that backwards — arcsin, arccos — means inverting a many-to-one wrap, so you inherit branch choices and the +2πn ambiguity. ln has none of this, because exp wraps nothing.

Now the dissolution: over the complex numbers the foreignness largely evaporates, because e^(ix) = cos x + i·sin x. The trig functions *are* exponentials — exponentials evaluated along the imaginary axis. exp(real argument) grows; exp(imaginary argument) rotates; one function, different direction of travel in the plane.

A large share of the residual "unnaturalness" is the curriculum's ordering fossilized into intuition. We didn't *derive* these functions from the exponential; we *inherited* them, geometry-first, from roughly two millennia of astronomy and triangle-solving — Hipparchus (~150 BCE), Ptolemy (~150 CE), Aryabhata (~499 CE). The exponential unification only arrived with Euler in the 1740s.

---

## Help me see why Euler's formula has to be that way.

*(No response recorded — question was followed by the next prompt.)*

---

## How did he get there?

Euler's actual route — laid out in the *Introductio in analysin infinitorum* (1748) — didn't begin with the series substitution textbooks now show. It began with de Moivre and a piece of controlled recklessness about infinities.

He had, straight from the angle-addition formulas, de Moivre's relation:

> (cos θ + i sin θ)^n = cos nθ + i sin nθ

Fix a finite angle v and cut it into n equal pieces, θ = v/n:

> cos v + i sin v = (cos(v/n) + i sin(v/n))^n

Now let n grow without bound, so the slice v/n shrinks toward nothing. For an infinitesimal angle the small-angle facts become exact — cos(v/n) → 1 and sin(v/n) → v/n — so the bracket collapses to 1 + i·(v/n), leaving:

> cos v + i sin v = lim_n (1 + iv/n)^n

He had already *defined* the exponential by that very limit:

> e^z = lim_n (1 + z/n)^n, hence e^(iv) = lim_n (1 + iv/n)^n

The two right-hand sides coincide symbol for symbol. So e^(iv) = cos v + i sin v.

**The one-line gloss on why it had to land there:** rotating the point (1, 0) by an infinitesimal angle dθ moves it by i·dθ — perpendicular, scaled by the angle — so multiplication-by-i functions as the generator of rotation. Compounding n such tiny rotations is literally (1 + i·dθ)^n, and "raise (1 + small/n) to the n" *is* the exponential. exp turns a generator into the flow it produces; the generator of rotation happens to be i; therefore the flow reads cos + i sin.

A word on lineage: Roger Cotes had essentially the identity by 1714 (in logarithmic dress — iφ = ln(cos φ + i sin φ)), but it stayed buried because he died at 33. De Moivre (~1707–1722) supplied the power relation but never the compact exponential form; that compaction belongs to Euler.

---

## I can see how de Moivre's formula is useful. But this was because of an interest in complex numbers or angle identities? Was the same learning pain true here?

Neither, really. De Moivre was chasing the **theory of equations**: factoring binomials like xⁿ − 1, locating roots of unity, and the old problem of cutting an arc into n equal parts. The angle identities were machinery he passed *through*; complex numbers were a computational convenience he used but wasn't curious about as objects.

De Moivre's engine wasn't a list of trig identities — it was one algebraic trick. Set x = cos θ + i sin θ and notice:

> x + 1/x = 2 cos θ,  x^n + 1/x^n = 2 cos nθ

From that single substitution every multiple-angle relation falls out as a *consequence* of expanding a power, not as a fact to be drilled.

Two different pains, worth indexing apart. De Moivre's labor (pain₁) was real but *generative*: heroic hand-computation with clumsy notation, results dribbling out across thirty-odd years. Your labor (pain₂) was *consuming his outputs without his engine*: handed the finished identities as a flat catalogue, motivated by triangle-solving, with the generative source amputated.

The territory was never painful. The map you were issued in school just happened to be the one drawn before — or as though no one had ever found — the generative shortcut.

---

## Exp(z) takes exp(x + iy) to exp(x)*exp(iy), so horizontal lines map to rays from the origin and vertical lines wrap in circles of constant radius.

Exactly right — and the asymmetry hiding in how you phrased it is worth keeping. Each horizontal line *lays down* its ray exactly once: e^x runs bijectively over (0, ∞), so the ray gets painted a single time, origin excluded. Each vertical line *winds* its circle infinitely often: e^(iy) comes back every time y advances by 2π. Two different behaviors:

- Horizontals → rays **bijectively**
- Verticals → circles **∞-to-1**

Put the families together: exp carries the whole rectangular grid of the z-plane onto the whole polar grid of the w-plane — Cartesian coordinates becoming polar coordinates, with x reading off as ln r and y as the angle. And this isn't coincidence: horizontal and vertical lines cross at right angles; rays and circles also cross at right angles. Exp keeps those right angles because it stays **conformal everywhere** — (e^z)′ = e^z never vanishes.

Two consequences:

1. **The puncture:** e^x is never 0, so the origin is the one point no ray and no circle ever reaches. This is exactly why log has nothing to say at 0.

2. **The strips:** because e^(z+2πi) = e^z, a single horizontal strip of height 2π already paints every ray and every circle once. Stack the next strip and it paints the same plane again, infinitely. So log isn't multivalued through some defect; it's multivalued because exp folded infinitely many height-2π strips down onto one punctured plane.

---

## You took the right angle part as an "of course." Also, this seems to beg questions — why is the circle and ray privileged? What about other topologies? Higher dimensional maps? Other differential equations?

**The right angles:** Near any z₀ where f′(z₀) ≠ 0, the map looks like w ≈ f(z₀) + f′(z₀)·(z − z₀) — every little vector sticking out of z₀ gets *multiplied by the single fixed complex number* f′(z₀). Write that number as ρe^(iα); multiplying by it rotates every direction by the same α and scales every length by the same ρ. A transformation that rotates everything equally and scales everything equally is a similarity, and a similarity can't touch angles.

A generic smooth map ℝ²→ℝ² has a Jacobian that's an arbitrary 2×2 matrix — four free numbers — free to stretch one axis more than the other and to shear, mangling angles. Complex-differentiability demands the Jacobian wear the special form [[a, −b],[b, a]] — a scaled rotation, two numbers. That is the Cauchy–Riemann equations seen geometrically. And in ℝⁿ for n ≥ 3 the conformal maps collapse to rigid Möbius transformations (Liouville's theorem) — going up, you *lose* this richness rather than extending it.

**Why circle and ray:** The multiplicative group ℂ\{0} factors as ℝ₊ × S¹, modulus times phase. The ray is the orbit of the scaling part (non-compact — you can scale forever), the circle is the orbit of the rotation part (compact — rotations close up after 2π). The circle holds no deep privilege; it's merely *the* compact connected one-dimensional group, surfacing because ℂ*'s phase direction happens to be compact. Topologically ℂ* is a cylinder, and "circle and ray" are its compact cross-section and its non-compact axis.

**Higher dimensions:** The quaternions ℍ give the next rung. The unit quaternions form S³, a three-sphere, and they double-cover the rotations of 3-space — Hurwitz (1898) showed the normed division algebras have dimension 1, 2, 4, 8 only (ℝ, ℂ, ℍ, 𝕆), then it stops. The umbrella is Lie theory, where exp: 𝔤 → G carries a flat vector space onto a curved group.

**Other differential equations:** The functions live or die by their ODE, and a single sign sets the whole character:

- y″ = −y gives cos/sin, the circle x²+y² = 1, the compact group SO(2)
- y″ = +y gives cosh/sinh, the *hyperbola* x²−y² = 1, the non-compact SO(1,1) — the Lorentz boost of special relativity
- y′ = (a cubic in y) gives **elliptic functions** — *doubly* periodic, living on a **torus**, ℂ/Λ

The torus appears the instant you ask for the next differential equation. Your four questions sit closer to one question than they look: the circle was the genus-zero, single-period, compact-rank-one corner of a much larger room, and exp is just the door you happened to walk in through.

---

## You did that too compactedly. C-star, the Jacobian, why that is the definition of differentiable — fill in the picture.

**ℂ\*:** The nonzero complex numbers under *multiplication* form a group. Write each nonzero z in polar form, z = r·e^(iθ). Multiplication splits cleanly: |zw| = |z||w| while arg(zw) = arg z + arg w — moduli multiply, arguments add. So ℂ* factors as ℝ₊ × S¹ — an infinite cylinder. Exp rolls the flat plane onto it, wrapping the imaginary axis around the circle with period 2πi.

**The Jacobian:** Take f: ℂ → ℂ, written in real terms as f = u(x,y) + i·v(x,y). As a plain map of the plane ℝ²→ℝ², "differentiable" means it owns a Jacobian

> J = [ u_x  u_y ; v_x  v_y ]

four independent numbers. Complex differentiability demands that

> f′(z) = lim_{h→0} [f(z+h) − f(z)] / h

exist with the same value no matter which direction h arrives from. On the real line h sidles up from two sides; in the plane it can come along infinitely many directions, even spiraling in.

If the quotient settles on one value c = f′(z), then to first order f(z+h) ≈ f(z) + c·h — the linear part of f *is* multiplication by the one fixed complex number c. Ask what "multiply by c = a + bi" looks like as a real 2×2 matrix:

> (a + bi)(dx + i·dy) = (a·dx − b·dy) + i(b·dx + a·dy)

yielding the matrix [ a, −b; b, a ]. Match against the general Jacobian and you're forced into:

> u_x = v_y  and  u_y = −v_x — **the Cauchy–Riemann equations**

**Your conjugation hunch:** Change coordinates to (z, z̄), treating z = x+iy and z̄ = x−iy as independent inputs. Any smooth f splits:

> df = (∂f/∂z) dz + (∂f/∂z̄) dz̄

The whole condition compresses to:

> f holomorphic ⟺ ∂f/∂z̄ = 0

Holomorphic means *no z̄ anywhere in it.* The prototype of the forbidden ingredient is conjugation itself. For f(z) = z̄:

> [f(z+h) − f(z)] / h = h̄ / h

h̄/h keeps modulus 1 but carries argument −2·arg(h) — coming in along the reals it equals 1, along the imaginaries −1, along the diagonal −i. No common limit. Conjugation is exactly the ingredient whose presence breaks complex-differentiability. **Holomorphic = honestly a function of z, with no secret dependence on z̄.**

---

## What if you just allow conjugation in addition to the other conformal maps — what is the closure?

Closure under *composition*: a holomorphic f is a function of z alone; conjugation flips you between "function of z" and "function of z̄." Every composite lands in exactly one of two bins:

> holomorphic ⊔ antiholomorphic

a system carrying a ℤ/2 grading. The grading *is* orientation: holomorphic maps preserve angles and handedness, antiholomorphic ones preserve angles but flip handedness. Composition can flip parity but can never *mix.* Adjoining conjugation simply adjoins the mirror of everything you already had.

In Jacobian language: the holomorphic maps have Jacobian in ℝ₊·SO(2) — the [a, −b; b, a] matrices, determinant a²+b² > 0. Conjugation contributes a scaled *reflection*, determinant −(a²+b²) < 0. Close those under composition and the derivatives fill out ℝ₊·O(2), the full linear conformal group — every plane similarity, rotations and reflections alike.

At the level of bijections of the sphere: the conformal automorphisms of the Riemann sphere are exactly the Möbius transformations z ↦ (az+b)/(cz+d), the group PSL(2,ℂ). Throw in conjugation and the composition-closure becomes PSL(2,ℂ) ⋊ ℤ/2 — each map a product of inversions in circles, with the parity of inversions reading off the orientation. This extended group coincides with the isometry group of hyperbolic 3-space.

---

## Möbius transformations are orientation preserving?

Yes — every one of them, globally on the Riemann sphere. The reason: z ↦ (az+b)/(cz+d) is a rational function of z with no z̄ anywhere, so it's holomorphic, and for any holomorphic map the real Jacobian determinant equals |f′(z)|² — a modulus squared, hence never negative. Since f′(z) = (ad−bc)/(cz+d)² never vanishes, the determinant stays strictly positive.

What's probably nagging: every Möbius map is a product of inversions in circles, and inversions reverse orientation. Both true; the escape is *parity.* Each inversion flips orientation, so an *even* number of them flips it back: the Möbius transformations are precisely the even products (orientation-preserving), the anti-Möbius maps the odd ones (orientation-reversing).

There's also a terminology trap. Geometric inversion in the unit circle is z ↦ 1/z̄ — it carries a z̄, so it's antiholomorphic and orientation-*reversing*, and it isn't a Möbius transformation. The Möbius z ↦ 1/z (no bar) is holomorphic and orientation-preserving — it factors as circle-inversion followed by reflection across the real axis, two flips that cancel.

---

## What are other "natural" choices for ℝ² → ℝ² functions beyond Jacobian constraints?

"Natural" needs an operational definition. A pointwise Jacobian constraint amounts to choosing a set S ⊆ M₂(ℝ) of permitted matrices and demanding J(p) ∈ S at every point. Here are three honest meanings of "natural," in rising order of how much they ask.

### Natural₁: Matrices you can do arithmetic with

At each point a map does some linear thing to a tiny neighborhood. Demanding that the derivative form a closed number system — of the shape "real part plus something times a special element K" — yields exactly three options, governed by what K² equals.

**K² = −1: Complex numbers.** The special element is a quarter-turn; squaring it lands you at −1 because two quarter-turns reverse you. The "unit circle" is the actual circle, its rotations are ordinary rotations, and this is the one case that forms a genuine *field* — every nonzero element has a reciprocal. That total absence of degenerate elements underwrites all the miracles (a function constrained this way is rigid: pin it on a tiny patch and it's forced everywhere).

**K² = +1: Split-complex numbers (j² = +1).** The special element is a *flip* across a diagonal — flip twice and you're back. Its "circle" is a hyperbola, its "rotations" are Lorentz boosts, and its analogues of sine and cosine are cosh and sinh — precisely the y″ = +y world. But it has a fatal softness: certain nonzero elements multiply to zero along two special diagonal lines, and where that happens rigidity collapses. A function constrained this way splits into two completely independent one-variable functions — one riding each diagonal — which you can wiggle separately without consequence. (Physicists meet exactly this as "left-movers and right-movers" on a string.)

**K² = 0: Dual numbers (ε² = 0).** A nonzero thing that squares to zero. Its "rotations" are *shears* — slide each row sideways in proportion to its height — the way velocities add in pre-relativity physics (Galileo's universe). And a number a + εb automatically drags its own derivative along in the ε-slot, so computing with these numbers computes derivatives *for free.* This is **automatic differentiation** — the thing every machine-learning framework runs on to get gradients.

**The unifying punchline:** The determinant of each number-system's matrix comes out a² + b², a² − b², or a² — definite, indefinite, degenerate — the same three-way split that classifies every equation of this type into **elliptic, hyperbolic, parabolic.** Complex-analytic sits in the elliptic seat, the only one that's rigid, the only field.

### Natural₂: Matrices that preserve some quantity

- *Keep angles* (allow growth and rotation, forbid shear) → complex-analytic
- *Keep area* (forbid net growth) → maps governing frictionless mechanics, Hamiltonian phase flows
- *Keep the "no swirl" property* (force the matrix symmetric) → maps that are the gradient of some landscape, the mathematics of **optimal transport**
- *No swirl and no compression at once* → these matrices are exactly the antiholomorphic Jacobians — "the mirror world" and "smooth incompressible swirl-free fluid flow" are the same constraint, which is why complex analysis solves 2D fluid flow and electrostatics
- *Keep a chosen direction's family of lines intact* (triangular matrices) → **normalizing flows** in machine learning, chosen because triangular makes the determinant cheap to compute
- *Keep angles AND lengths, no growth* → the theory freezes into only rigid motions. The lesson: it was the freedom to *grow* that kept angle-preservation alive as a rich theory

**Is this list endless?** No — there's a census. Early-1900s work (Élie Cartan, completed in the 1960s) classified all the natural infinite families on the plane. The complete list: all smooth maps; area-preserving maps; angle-preserving (complex-analytic) maps; and their mirror. Full stop. Everything else preserves a family of lines — and "preserves a family of lines" is precisely why those theories went floppy and decomposed into one-variable pieces.

### Natural₃: Don't forbid distortion, just cap it

The strict theories are knife-edges — *exactly* angle-preserving. Loosen to *nearly:* let infinitesimal circles become ellipses, but with bounded eccentricity. This is **quasiconformality** — the full space of controlled deformations of the rigid theory. A remarkable result (Measurable Riemann Mapping Theorem, Ahlfors–Bers 1960) says *any* prescribed field of ellipse-shapes (so long as none flatten completely) can be realized by a real map.

---

## Why are we not talking about functions where the constraints are on the second derivatives?

The honest answer: we'd quietly committed to a *classification* question, and classification only crystallizes at first order.

**First, why classification needs first order.** The chain rule says the Jacobian of f∘g is the product of the two Jacobians, and matrices multiplying is exactly what let us speak of clubs "closed under composition" and classify them. Second derivatives extend no such courtesy — the chain rule for them tangles the orders together. Constrain the second derivative and the question stops being "list the closed clubs" (algebra) and turns into "solve the equation" (analysis).

**Second, in the plane the marquee second-order theory is secretly the shadow of the first-order one.** The conjugation-detecting operator (∂/∂z̄), composed with its mirror twin, rebuilds the Laplacian (∂²/∂x² + ∂²/∂y²) exactly — the first-order condition is a *square root* of the second-order one. By paying the cheap first-order price we'd already bagged the headline second-order theory for free.

**Make the second derivative primary and you walk into most of geometry and physics:**

- *The same three words in their native home.* The natural linear second-order constraints sort by a single sign into elliptic (Laplace), hyperbolic (wave equation), parabolic (heat equation). Those names were *coined* for these second-order operators; when I pinned them on the three algebras earlier, I was borrowing downward.

- *The same determinant, one floor up.* Take the determinant of the *second*-derivative matrix and you land on the Monge–Ampère equation, which governs surfaces of prescribed curvature and optimal transport. The first-order "gradient map" description was the shadow; the second-order one is the substance.

- *Curvature and physics are irreducibly second-order.* Curvature simply *is* a second derivative. And the rule that selects the "best" shape — least-area soap film, least-action path, field at equilibrium — is, whenever the cost depends on slopes, a second-order equation. That's why nearly every law of physics is second order.

The connection between floors: the rigid first-order theories sit *underneath* the second-order ones as their square roots and building blocks — complex-analytic under harmonic, and every least-area soap film can be *written down* from a pair of complex-analytic functions.

---

## Explain sin(ix) — difference of exponentials?

Yes. Take sin(z) = (e^(iz) − e^(−iz))/(2i) and feed it z = ix:

> e^(i·ix) = e^(−x)  and  e^(−i·ix) = e^(x)

So:

> sin(ix) = (e^(−x) − e^(x))/(2i) = −(e^x − e^(−x))/(2i) = i·sinh(x)

The even twin: cos(ix) = (e^(−x) + e^(x))/2 = cosh(x) — no leftover i, because cos is even and swallows the input rotation whole.

**Why:** Feed sine an *imaginary* argument and circular sine turns into hyperbolic sinh. Watch the two i's do the work: rotate the *input* by 90° (the i inside) and the *output* then lands rotated 90° as well (the i out front). Cos, being even, swallows the input rotation whole and returns on the real axis as cosh; sin, being odd, keeps one i and returns on the imaginary axis.

**The payoff:** Real sine's famous boundedness — never escaping [−1, 1] — is an artifact of looking only along the real axis. Step off it in the perpendicular direction and the very same function grows like sinh, without bound. So complex sine is *unbounded.* The circle and the hyperbola were never two functions; they're two cross-sections of one complex object.

---

## Why does "mapping the complex plane" and "mapping to the unit circle" connect?

A complex number z has been doing two different jobs this whole time. Pull them apart:

A complex number is, in one role, a *place* — a point on the page, x across and y up. You combine places by **adding**, which slides the page around. That's "mapping the complex plane": a flat sheet of addresses.

But a complex number is also an *action* — multiply by it and the whole plane *rotates and zooms.* Among all those actions, the ones that rotate *without* zooming — the pure turns — are exactly the complex numbers of size one. **The unit circle is the rotations of the plane.** Measuring "how much has this been turned" *is* mapping it onto the circle.

What links the two faces is exp, with e^(a+b) = e^a·e^b. It takes the *additive* plane (addresses) and turns it into the *multiplicative* group (actions). Feed it the imaginary direction — addresses straight up the y-axis — and it produces pure rotations: e^(iθ) lands on the unit circle. Feed it the real direction and it produces pure zooms: e^x runs out along the ray.

The two perpendicular axes of the page map onto the two factors of the action-group:

- Real axis → ray (zooming) → cosh, sinh  
- Imaginary axis → circle (turning) → cos, sin

That last line is the whole reason sin(ix) = i·sinh(x): swapping which axis you feed swaps circle for ray, circular functions for hyperbolic.

And here's where it closes the loop with the Jacobian: every analytic map, up close at any point, does exactly one thing — multiply by its derivative, which in size-and-angle form is ρ·e^(iθ): a zoom ρ times a turn e^(iθ), a point of the unit circle. **Conformality was the unit circle all along** — the local action is an honest rotation, the same turn in every direction.

---

## Why do we treat sin and cos as two different functions when they are "offsets" of each other?

Because "two functions or one?" is the wrong split. They're the two *coordinates* of a single thing — a point going around a circle — and the offset is exactly the fingerprint proving they come from the *same* rotation, not evidence that one is redundant.

Cos and sin do share a *shape*: each is the shadow that uniform circular motion casts on an axis. But same shape is not same information. Cos is the shadow on the x-axis, sin the shadow on the y-axis, and you can't recover a point's location in the plane from one shadow — you need both. The rotation lives in two dimensions; one real number can't track it.

The π/2 offset, far from making them redundant, is precisely what *locks* them as coordinates of one rotation — for two reasons:

1. **Differentiation cycles between them:** sin′ = cos, cos′ = −sin. Differentiating *is* shifting phase by a quarter turn. So "cos is sin offset by π/2" and "cos is the derivative of sin" are the *same sentence.* Neither function is closed under d/dx alone; only the pair is.

2. **They answer two genuinely different initial conditions.** At the start, cos begins at full height with zero speed (a pendulum pulled aside and released); sin begins at zero with full speed (a pendulum struck from rest). A second-order system has exactly two independent pieces of starting data, and cos and sin are the canonical responses to each.

You *can* fuse them — into e^(iθ), one function. But e^(iθ) is valued in 2D, so the pair just becomes the two real parts of one complex number. The solution space is two-dimensional, full stop. Cos and sin are the cleanest, perpendicular pair to carry those two dimensions, and the offset is the statement that they ride in quadrature: two perpendicular shadows of one turning point.

---

## So if multiplying by i is a quarter-turn rotation, is sin(iz) = cos(z)?

No — sin(iz) = i·sinh(z), the same result we got for real x.

Two different "quarter turns" can act on the *argument*, and they aren't the same move:

- **Add π/2 to the argument** (z → z + π/2): a **slide** of the input along the axis. This is the one that turns sin into cos — sin(z + π/2) = cos(z).

- **Multiply the argument by i** (z → iz): a **spin** of the input point 90° about the origin, swinging z off the real axis onto the imaginary one. Swinging the input into the imaginary direction is what trades a circular function for a hyperbolic one.

Sliding by π/2 and spinning by i are different things to do to the input, so they give different outputs.

**But your instinct wasn't empty.** Multiplying by i *does* produce the cos↔sin shift, when it rotates the **output** instead of the input. Multiply the rotating value e^(iθ) by i: i·e^(iθ) = e^(i(θ+π/2)) — phase advanced a quarter turn, cos and sin swapped. For the exponential, "add π/2 to the argument" and "multiply the value by i" are the *same* move, which is exactly why the offset and the i-quarter-turn felt linked.

So it's two roles of i, sharpened: **i on the value advances the phase (cos ↔ sin); i on the argument spins the input (circular ↔ hyperbolic).** You reached for the first and wrote down the second.

---

## Trace out the reasoning of this conversation and connect it to conic sections.

### What we built

We started from an observation — trig feels "unnatural" next to exp, polynomials, inverses — and the first move was dissolving the question itself. "Natural" doesn't name a property sitting inside a function; it names a *relation* between a function and whichever operations you've taken as primitive. Shift the primitives and the ranking reshuffles.

That collapse is Euler: e^(iθ) = cos θ + i sin θ, arriving from de Moivre's limit argument. The i sitting in the exponent and the i that means "quarter-turn rotation" aren't two different things wearing the same symbol; they name the same operation reached by two routes.

From exp(z) = exp(x)·exp(iy) the plane's two directions separate cleanly. The real direction produces scaling — non-compact, never returning. The imaginary direction produces rotation — compact, returning every 2π. The 2πi periodicity isn't a property exp happens to have — it expresses that the rotation group of the plane closes up.

The right-angle preservation at every point came from unpacking the derivative: demanding a direction-independent limit forces the Jacobian into the form [a, −b; b, a] — a scaled rotation. Equivalently: ∂f/∂z̄ = 0 — no conjugate anywhere in the formula.

Adding conjugation produced a ℤ/2 extension: holomorphic (orientation-preserving) and antiholomorphic (orientation-reversing), the Jacobian determinant positive or negative accordingly.

The Jacobian-constraint question yielded a clean trichotomy governed entirely by K²: −1 (complex numbers), 0 (dual numbers), +1 (split-complex numbers). These correlated with PDE type: elliptic, parabolic, hyperbolic. And from ODE: y″ = −y produces circular sin/cos; y″ = +y produces hyperbolic sinh/cosh; y″ = 0 produces linear drift and automatic differentiation.

Sin and cos: not redundant offsets but two independent coordinates of one 2-dimensional rotation. The solution space of y″ = −y has dimension 2; cos and sin are the canonical responses to each initial condition, offset by π/2 because they ride in quadrature.

Sin(ix) = i·sinh(x) expressed the whole unification concretely: multiplying the argument by i spins the input onto the imaginary axis, converting circular functions to hyperbolic ones. Not the same move as adding π/2, which stays in the circular world.

### Where conics enter

The level set "norm = 1" in each algebra:

| Algebra | K² | Unit set |
|---|---|---|
| Complex numbers | −1 | **Circle**: a² + b² = 1 |
| Split-complex | +1 | **Hyperbola**: a² − b² = 1 |
| Dual numbers | 0 | **Two parallel lines**: a² = 1 (the parabola's degenerate limit) |

These aren't decorative coincidences. The norm in each algebra is a quadratic form in (a, b), and a quadratic form in two variables classifies by its discriminant — negative (definite), positive (indefinite), zero (degenerate) — into exactly those three types. "Discriminant" here is the same discriminant that distinguishes conic sections when you cut a cone with a plane.

The phase portrait of y″ = c·y makes this literally visible. In state space (y, y′):

- c = −1: the trajectory (cos t, −sin t) traces a **circle**
- c = +1: the trajectory (cosh t, sinh t) traces a **hyperbola**
- c = 0: the trajectory (1, t) traces a **line** — the parabola's degenerate limit

The conic sections function here not merely as the "unit circles" of the three algebras, but as the *phase-space trajectories* of the canonical motions in each geometry.

**The "why circles and rays" question** — which earlier we answered multiplicatively from ℂ* = ℝ₊ × S¹ — now receives a second answer from the conic side. A circle is the compact conic: it closes up, which forces periodicity in exp(iθ). A ray lives in the degenerate-conic territory, and the non-compactness means no wrapping, no period. Circle and ray are distinguished by one operational fact: does the trajectory close? That's the compactness question, and compactness is conic-type in geometric language.

### The deepest layer

Over ℂ, no non-degenerate conic is different from any other. A projective transformation can convert any of them into any other, because they all pass through the same two "circular points at infinity" in the complex projective plane.

And sin(ix) = i·sinh(x) is exactly that transformation in function-theoretic language. The circular functions and hyperbolic functions aren't two objects — they're one complex function observed along two perpendicular lines through the domain. The circle-trajectory and hyperbola-trajectory in state space are cross-sections of one complex curve. **The real-axis cut gives the circle; the imaginary-axis cut gives the hyperbola; the complex function *is* the cone before cutting.**

The three algebras, the three PDE types, and the three conic sections all index the same underlying trichotomy — the three-way split that elliptic/hyperbolic/parabolic names, wherever you happen to meet it. That split appears so persistently not because mathematicians keep rediscovering the same curiosity, but because it reflects a feature of how quadratic structure on a 2-dimensional space can behave. Whether you approach it through number systems, Jacobian constraints, the geometry of cones and planes, phase portraits, or the signature of a quadratic form — the map changes, the territory doesn't.

---

*Conversation conducted July 2026.*
