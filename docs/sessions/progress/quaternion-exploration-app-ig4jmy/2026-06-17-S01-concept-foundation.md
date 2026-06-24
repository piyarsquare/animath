---
kind: research
session: 2026-06-17-S01
date: 2026-06-17
title: Quaternions — foundation research
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: stopped
build: n/a
---

# Quaternions — Foundation Research for an Interactive Visualization App

A cited, fact-checked foundation document on quaternions, written to inform the
design of an educational, browser-based interactive visualization (an animath
app). Citations are inline as URLs; a consolidated list is in **Sources**.

> **Verification note.** Historical dates, named theorems, and applied claims
> were confirmed against the web sources listed below (Wikipedia's *History of
> quaternions*, *Quaternion*, *Cayley–Dickson construction*, *Frobenius
> theorem*, *Hurwitz theorem*, *Quaternions and spatial rotation*; Shoemake
> 1985; eater.net/quaternions; 3Blue1Brown; reedbeta double-cover post). Several
> Wikipedia pages returned HTTP 403 to the fetch tool, so a few standard
> definitional facts and all of the closed-form **formulas** in the reference
> section are stated from established mathematical knowledge and corroborated by
> the search summaries rather than quoted from a fetched page. These are
> textbook-stable results (the Hamilton product, conjugate, norm, inverse,
> sandwich product, axis–angle map, and SLERP) and are not in dispute, but they
> are flagged here for transparency.

---

## 1. History & originator

**William Rowan Hamilton** (1805–1865), Irish mathematician and Royal
Astronomer of Ireland, discovered quaternions in a now-legendary **flash of
insight on 16 October 1843** while walking with his wife along the Royal Canal
toward Dublin, at **Broom Bridge** (Brougham Bridge). Unable to record the idea
on paper, he carved the fundamental multiplication rule into the stone of the
bridge with a knife:

$$ i^2 = j^2 = k^2 = ijk = -1 $$

This single relation encodes the entire algebra. A plaque on Broom Bridge now
commemorates the moment, and an annual "Hamilton Walk" retraces it.
([History of quaternions — Wikipedia](https://en.wikipedia.org/wiki/History_of_quaternions);
[Quaternion — Wikipedia](https://en.wikipedia.org/wiki/Quaternion))

**The years of struggle with triplets.** For roughly a decade before 1843,
Hamilton tried to build a *three-dimensional* number system — "triplets" — that
would do for 3D space what complex numbers do for the 2D plane: a system you can
add, subtract, multiply, **and divide**. He could define addition easily but
could never make multiplication of triples close consistently (famously, his
children would ask at breakfast, "Papa, can you multiply triplets yet?" and he
could only answer that he could add and subtract them). The breakthrough was the
counter-intuitive leap to a **fourth** dimension and the abandonment of
**commutativity** ($ij = k$ but $ji = -k$). ([Hamilton's Quaternions, or, The
Trouble with Triples](https://mathenchant.wordpress.com/2023/05/17/hamiltons-quaternions-or-the-trouble-with-triples/);
[History of quaternions](https://en.wikipedia.org/wiki/History_of_quaternions))

**Olinde Rodrigues (1840).** Three years *before* Hamilton, the French
mathematician **Olinde Rodrigues** (1840) used spherical trigonometry to derive
the composition law for two rotations — effectively the quaternion
multiplication rule and the axis–angle rotation formula that now bears his name
(the **Rodrigues rotation formula**) — without recognizing it as a number
system. Hamilton almost certainly never read Rodrigues's paper, and few
contemporaries did; the connection was recognized only later. ([History of
quaternions](https://en.wikipedia.org/wiki/History_of_quaternions); search
summary on Rodrigues 1840.)

**Cayley.** **Arthur Cayley** worked extensively with quaternions shortly after
their discovery, gave an early formula for rotations via quaternions, and his
name attaches to the **Cayley–Dickson construction** (with Leonard Dickson)
that generalizes the real → complex → quaternion → octonion ladder.
([Cayley–Dickson construction](https://en.wikipedia.org/wiki/Cayley%E2%80%93Dickson_construction))

**The Gibbs/Heaviside eclipse.** Through the later 19th century a fierce
notational debate played out. **Josiah Willard Gibbs** and **Oliver Heaviside**
(building on Hermann Grassmann, and with Helmholtz) split the quaternion's
scalar and vector parts into the now-ubiquitous **dot product** and **cross
product** of three-dimensional **vector calculus**. For most physics and
engineering this was simpler and more practical, and vector calculus "won":
quaternions fell out of mainstream use for nearly a century. ([History of
quaternions](https://en.wikipedia.org/wiki/History_of_quaternions);
[The Tragic Downfall and Peculiar Revival of Quaternions](https://www.preprints.org/manuscript/202412.1922);
[Back to the Roots of Vector and Tensor Calculus — Heaviside versus Gibbs](https://arxiv.org/pdf/2010.09679))

**The 20th-century revival.** Quaternions came roaring back with **computer
graphics, animation, robotics, and aerospace**, where they are the compact,
numerically stable, gimbal-lock-free way to represent and interpolate 3D
orientation. The pivotal moment was **Ken Shoemake's 1985 SIGGRAPH paper
"Animating Rotation with Quaternion Curves,"** which introduced **SLERP**
(spherical linear interpolation) and made quaternions standard in animation.
([Slerp / Shoemake 1985 — Grokipedia](https://grokipedia.com/page/Slerp);
[The Tragic Downfall and Peculiar Revival of Quaternions](https://www.preprints.org/manuscript/202412.1922))

---

## 2. Genetic origin — where quaternions *come from*

The minimal conceptual chain is the **dimension-doubling ladder**
$\mathbb{R} \to \mathbb{C} \to \mathbb{H} \to \mathbb{O}$, with dimensions
**1, 2, 4, 8**.

- **$\mathbb{R}$ (1D):** the real line — scalings of a line.
- **$\mathbb{C}$ (2D):** a complex number $a+bi$ is a point in the plane;
  multiplying by $\cos\theta + i\sin\theta$ is a **rotation** of the plane by
  $\theta$. So $\mathbb{C}$ *is* the algebra of 2D rotations-and-scalings.
- **$\mathbb{H}$ (4D):** Hamilton's quaternions $a + bi + cj + dk$ — the
  "two complex numbers" level of the ladder, and the algebra that encodes
  **3D rotations**.
- **$\mathbb{O}$ (8D):** the octonions — one level further, used in some
  theoretical physics, but **non-associative**.

**Cayley–Dickson construction.** Each level is built mechanically from the
previous one by treating a number as a *pair* of the lower kind with a twisted
multiplication and a conjugation: a complex number is a pair of reals, a
**quaternion is a pair of complex numbers**, an octonion is a pair of
quaternions. Each doubling **costs an algebraic property**: from
$\mathbb{R}\to\mathbb{C}$ you lose the natural ordering; $\mathbb{C}\to\mathbb{H}$
loses **commutativity** ($pq \neq qp$); $\mathbb{H}\to\mathbb{O}$ loses
**associativity**.
([Cayley–Dickson construction — Wikipedia](https://en.wikipedia.org/wiki/Cayley%E2%80%93Dickson_construction);
[Normed division algebras — nLab](https://ncatlab.org/nlab/show/normed+division+algebra))

**Why ℝ³ cannot be a division algebra (the deep "why 4, not 3").** Hamilton's
decade of failure was not a lack of cleverness — it is **provably impossible**
to make $\mathbb{R}^3$ into a division algebra (a consistent multiply-and-divide
system) in which the norm is multiplicative. Two theorems pin this down:

- **Frobenius theorem (Ferdinand Georg Frobenius, 1877):** the *only*
  finite-dimensional **associative division algebras** over $\mathbb{R}$ are
  $\mathbb{R}$, $\mathbb{C}$, and $\mathbb{H}$ — dimensions **1, 2, 4**. There is
  no 3-dimensional one.
  ([Frobenius theorem — Wikipedia](https://en.wikipedia.org/wiki/Frobenius_theorem_(real_division_algebras)))
- **Hurwitz's theorem (Adolf Hurwitz, 1898, publ. 1923):** the *only*
  finite-dimensional **normed division algebras** over $\mathbb{R}$ are
  $\mathbb{R}$, $\mathbb{C}$, $\mathbb{H}$, $\mathbb{O}$ — dimensions
  **1, 2, 4, 8**. (Octonions are normed but not associative, which is why they
  appear here but not in Frobenius.)
  ([Hurwitz theorem and parallelizable spheres](https://arxiv.org/pdf/hep-th/0005184);
  [Normed division algebras — nLab](https://ncatlab.org/nlab/show/normed+division+algebra))

So the jump from 3 to 4 dimensions is forced by mathematics, not chosen by
taste. **3D space has no consistent number-multiplication; 4D does, and that 4D
algebra is exactly what governs 3D rotation.** This is a *strong* pedagogical
hook: the "wasted decade" had to fail.

---

## 3. Natural & applied appearances

**3D rotation in graphics, games, and animation.** Unit quaternions are the
default internal representation of orientation in engines such as **Unity** and
**Unreal**. They are compact (4 numbers vs. a 9-number matrix), renormalize
cheaply, compose by multiplication, and — crucially — **interpolate smoothly**
via **SLERP** (constant angular velocity along the great-circle arc on the unit
sphere), avoiding the wobble and singularities of interpolating Euler angles.
([Slerp — Grokipedia](https://grokipedia.com/page/Slerp);
[MATLAB slerp reference](https://www.mathworks.com/help/nav/ref/quaternion.slerp.html);
[3D Rotation: Quaternions, Euler Angles, Rotation Matrices](https://www.compu-tools.com/blog/2026-01-31-3d-rotation/))

**Spacecraft & robotics attitude control — avoiding gimbal lock.** Euler-angle
representations suffer **gimbal lock**: at certain orientations two rotation
axes align and a degree of freedom is lost. Quaternions have no such
singularity, so NASA, the **International Space Station**, satellites, drones,
and robot arms use quaternion-based attitude representation and control for
stable, continuous orientation tracking.
([CompuTools — gimbal lock guide](https://www.compu-tools.com/blog/2026-03-07-gimbal-lock/);
[A quaternionic approach to teaching 3D rotations and the resolution of gimbal lock](https://arxiv.org/pdf/2511.04452))

**The deep physics link: SU(2) → SO(3) double cover and spin-½.** The unit
quaternions form the group **SU(2)**, which is a **two-to-one (double) cover**
of the rotation group **SO(3)**: every 3D rotation corresponds to *two* unit
quaternions, $q$ and $-q$. Because SU(2) is the 3-sphere $S^3$ (simply
connected) while SO(3) is not, **spin-½ particles** (electrons) transform under
SU(2), not SO(3): a full **360° rotation flips the sign** of the spinor state
($U(2\pi,\mathbf{n}) = -1$) and only a **720° rotation** returns it to itself
($U(4\pi,\mathbf{n}) = +1$). This is made tangible by the **Dirac belt trick /
plate trick**: a belt or a hand holding a plate, twisted 360°, stays tangled,
but after 720° the tangle can be undone without rotating the object further.
This "orientation entanglement" is arguably the single most visceral, surprising
demo in the whole subject.
([Spinor — Grokipedia](https://grokipedia.com/page/Spinor);
[Orientation entanglement — Wikipedia](https://en.wikipedia.org/wiki/Orientation_entanglement);
[Representation theory of SU(2)](https://en.wikipedia.org/wiki/Representation_theory_of_SU(2)))

**Crystallography / EBSD.** Materials science represents crystal **orientation
and misorientation** with quaternions: the first component is the cosine of half
the misorientation angle, the remaining three give the rotation axis — the
axis–angle form below. This is standard in **EBSD** (electron backscatter
diffraction) texture analysis.
([Q-RBSA EBSD / npj Computational Materials](https://www.nature.com/articles/s41524-024-01209-6);
[Quaternions and spatial rotation — Wikipedia](https://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation))

**Molecular modeling & rigid-body dynamics.** Quaternions describe the
configuration of molecules, protein structures, and biopolymers, and are used in
molecular-dynamics integrators, robot trajectory planning, flight dynamics, and
orbital mechanics — anywhere a rigid body's orientation must be tracked without
singularities.
([Quaternions in molecular modeling](https://arxiv.org/pdf/physics/0506177);
[The Quaternions with Applications to Rigid Body Dynamics](https://www.researchgate.net/publication/237253907_The_Quaternions_with_Applications_to_Rigid_Body_Dynamics))

---

## 4. Standard visual representations used to teach quaternions

What follows is a survey of the standard pictures and which structure each one
**reveals** vs. **obscures** — directly relevant to choosing what the app draws.

- **Axis–angle picture of a unit quaternion.** A unit quaternion is
  $q = \cos(\tfrac{\theta}{2}) + \sin(\tfrac{\theta}{2})\,(x\,i + y\,j + z\,k)$,
  read as **"rotate by angle $\theta$ about the unit axis $(x,y,z)$."** Note the
  explicit **half-angle $\theta/2$** — this is the one factor every learner trips
  over (see §5). *Reveals:* the direct geometric meaning (axis + amount).
  *Obscures:* the 4D structure and the double cover.
  ([Quaternions and spatial rotation — Wikipedia](https://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation))

- **Unit quaternions as the 3-sphere $S^3$.** All unit quaternions
  ($a^2+b^2+c^2+d^2=1$) form the unit **3-sphere $S^3$ in 4D**, which is exactly
  **SU(2)**. *Reveals:* the group/topology (why it's simply connected, the home
  of the double cover). *Obscures:* itself — $S^3$ lives in 4D and cannot be seen
  directly, motivating projection.

- **Stereographic projection of $S^3 \to \mathbb{R}^3$.** Project the 3-sphere
  into ordinary 3D space from a pole. This is the centerpiece of the
  **Ben Eater & Grant Sanderson "Visualizing quaternions"** interactive at
  **[eater.net/quaternions](https://eater.net/quaternions)** and the companion
  **3Blue1Brown** video *"Visualizing quaternions (4d numbers) with
  stereographic projection."* Stereographic projection's key virtue: **circles
  map to circles** with no cuts or discontinuities, so the continuous rotations
  of quaternion multiplication stay legible. *Reveals:* a concrete, navigable
  picture of the 4D unit quaternions and how multiplication moves them.
  *Obscures:* metric distortion near the projection pole.
  ([eater.net/quaternions](https://eater.net/quaternions);
  [3Blue1Brown — Quaternions and 3d rotation](https://www.3blue1brown.com/lessons/quaternions-and-3d-rotation/);
  [3B1B video](https://www.youtube.com/watch?v=d4EgbgTm0Bg))

- **The Hopf fibration.** $S^3$ fibers over $S^2$ with $S^1$ (circle) fibers:
  the famous nested-rings picture. It connects unit quaternions to the 2-sphere
  of axes/directions and is the natural "deep structure" visual, also tied to
  spin. *Reveals:* the bundle structure linking $S^3$ to ordinary directions.
  *Obscures:* it is abstract and easy to admire without understanding —
  best as an "advanced view," not the entry point.

- **Rotating a live 3D object.** Bind a quaternion to a tangible mesh (a
  teapot/airplane/hand) and let the user spin it. *Reveals:* that the quaternion
  *is* an orientation; makes the sandwich product's effect concrete.
  *Obscures:* the algebra (it can feel like "just another rotation widget").

- **Comparison with Euler angles and rotation matrices.** Showing the same
  rotation three ways — Euler triple (with its gimbal-lock failure mode), 3×3
  matrix, and quaternion — motivates *why* quaternions are used. *Reveals:* the
  practical payoff and gimbal lock. *Obscures:* nothing — this is a strong
  pedagogical scaffold.
  ([CompuTools — 3D rotation](https://www.compu-tools.com/blog/2026-01-31-3d-rotation/))

- **The sandwich (conjugation) product $q\,v\,q^{-1}$.** A 3-vector $v$ is
  embedded as a **pure quaternion** $0 + v_x i + v_y j + v_z k$ and rotated by
  the **sandwich** $v' = q\,v\,q^{-1}$. Visualizing the *two-sided* action (apply
  $q$ on the left and $q^{-1}$ on the right) is the cleanest way to make the
  **half-angle** inevitable: the rotation effectively happens **twice**, so each
  side carries $\theta/2$.
  ([Quaternions and spatial rotation — Wikipedia](https://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation);
  [Why Do Quaternions Double-Cover? — Nathan Reed](https://www.reedbeta.com/blog/why-quaternions-double-cover/))

**Design takeaway:** the eater.net/3B1B **stereographic-projection-of-$S^3$**
approach is the field's gold standard for *seeing* quaternion multiplication;
pairing it with a **live 3D object + axis–angle readout + Euler/gimbal-lock
comparison** covers both "what it is" and "why it's used." The Hopf fibration
and the belt/plate trick are high-impact *optional depth*.

---

## 5. Canonical learner confusions / pitfalls

These are the predictable failure points; each is an opportunity for an
interaction that *defuses* it.

1. **The double cover: $q$ and $-q$ give the *same* rotation.** Because the
   rotation is the *quadratic* sandwich $q v q^{-1}$, the sign of $q$ cancels —
   so two quaternions map to every rotation. Learners expect a 1-to-1
   correspondence and are unsettled that "the orientation didn't change but the
   quaternion flipped sign." *Visualize:* highlight $q$ and $-q$ as antipodal
   points on $S^3$ projecting to the identical object pose.
   ([Why Do Quaternions Double-Cover? — Nathan Reed](https://www.reedbeta.com/blog/why-quaternions-double-cover/);
   [Why Do the Unit Quaternions Double-Cover the Space of Rotations? — Bickford](https://www.gathering4gardner.org/g4g13gift/math/BickfordNeil-GiftExchange-WhyDoTheUnitQuaternionsDoubleCoverTheSpaceOfRotations-G4G13.pdf))

2. **720° vs 360° (spinor weirdness).** Tracking the *quaternion path* (not just
   the object), a 360° turn flips $q \to -q$; you need **720°** to return $q$ to
   itself. This is the belt/plate trick. Learners conflate "the object looks the
   same after 360°" with "everything is the same" — the hidden sign is the
   point.
   ([Orientation entanglement — Wikipedia](https://en.wikipedia.org/wiki/Orientation_entanglement);
   [Spinor — Grokipedia](https://grokipedia.com/page/Spinor))

3. **Why the half-angle $\theta/2$.** The single most common "huh?". The clean
   answer: the sandwich applies $q$ *twice* (left and right), so to net a
   rotation of $\theta$ each factor must carry $\theta/2$; the unwanted component
   cancels and the wanted one doubles. *Visualize:* a slider where the
   **object** turns at $\theta$ while the **quaternion's internal angle** turns
   at $\theta/2$, side by side.
   ([Why Do Quaternions Double-Cover? — Nathan Reed](https://www.reedbeta.com/blog/why-quaternions-double-cover/);
   [Maths — Quaternion half-angle, EuclideanSpace](https://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/transforms/halfAngle.htm))

4. **Non-commutativity $pq \neq qp$ — and what it *means*.** Since $ij = k$ but
   $ji = -k$, quaternion multiplication doesn't commute. Geometrically this is
   simply that **rotation composition order matters**: rotating about X then Y is
   not the same as Y then X. *Visualize:* the same two rotations applied in both
   orders, ending in different poses.
   ([Quaternion — Wikipedia](https://en.wikipedia.org/wiki/Quaternion))

5. **Confusing the unit quaternion with the rotation it encodes.** The
   quaternion is a *point in 4D / on $S^3$*; the rotation is its *action on 3D
   space*. Keeping the two representations visually distinct (the $S^3$ point vs.
   the moving object) prevents this conflation.

6. **The sandwich $q v q^{-1}$ vs. "just multiplying."** New learners try
   $q \cdot v$ (one-sided) and get a non-rotation (it leaves $S^3$ / changes
   length oddly). Emphasize that rotating a vector is the **two-sided**
   conjugation, and that $v$ must be embedded as a *pure* quaternion first.

7. **"4D is unvisualizable" anxiety.** The honest framing (per 3B1B/eater): you
   never have to see raw 4D — restricting to **unit** quaternions and using
   **stereographic projection** gives a faithful, navigable 3D picture. Name the
   fear and immediately hand the learner the tool that dissolves it.
   ([3Blue1Brown — Quaternions](https://www.3blue1brown.com/lessons/quaternions-and-3d-rotation/);
   [eater.net/quaternions](https://eater.net/quaternions))

8. **Pure vs. unit vs. general quaternions.** Three overlapping subsets get
   muddled: **general** $a+bi+cj+dk$ (any 4 reals); **pure** (scalar part
   $a=0$ — these *are* 3-vectors, the things you rotate); **unit** (norm 1 —
   these *are* the rotations, $S^3 = $ SU(2)). A clear taxonomy panel /
   color-coding heads this off.

9. **Quaternion as scalar + vector.** It helps to read $q = (s, \mathbf{v})$ =
   scalar part + vector part — the very decomposition Gibbs/Heaviside split into
   dot and cross products. This bridges to vectors students already know.
   ([History of quaternions — Wikipedia](https://en.wikipedia.org/wiki/History_of_quaternions))

---

## Formula reference

Let $q = a + b\,i + c\,j + d\,k = (s,\mathbf{v})$ with scalar $s=a$ and vector
part $\mathbf{v}=(b,c,d)$. (These are standard textbook formulas, corroborated by
the sources above; stated from established mathematical knowledge.)

**Fundamental relations (Hamilton, Broom Bridge):**
$$ i^2 = j^2 = k^2 = ijk = -1, \qquad ij=k,\; jk=i,\; ki=j, \qquad ji=-k,\; kj=-i,\; ik=-j $$

**Hamilton product** ($q_1 = (s_1,\mathbf{v}_1)$, $q_2 = (s_2,\mathbf{v}_2)$):
$$ q_1 q_2 = \big(s_1 s_2 - \mathbf{v}_1\!\cdot\!\mathbf{v}_2,\;\; s_1\mathbf{v}_2 + s_2\mathbf{v}_1 + \mathbf{v}_1\times\mathbf{v}_2\big) $$
(The $\times$ term is why it is non-commutative.)

**Conjugate:** $\quad q^{*} = a - b\,i - c\,j - d\,k = (s, -\mathbf{v})$

**Norm:** $\quad \lVert q \rVert = \sqrt{q\,q^{*}} = \sqrt{a^2+b^2+c^2+d^2}$

**Inverse:** $\quad q^{-1} = \dfrac{q^{*}}{\lVert q \rVert^{2}}$;
for a **unit** quaternion ($\lVert q \rVert = 1$), $q^{-1} = q^{*}$.

**Rotation (sandwich / conjugation) product.** Embed $v\in\mathbb{R}^3$ as the
pure quaternion $v = (0,\mathbf{v})$. The rotated vector is
$$ v' = q\,v\,q^{-1} \quad\Longrightarrow\quad v' = q\,v\,q^{*} \ \text{ for unit } q. $$

**Axis–angle ↔ quaternion.** Rotation by angle $\theta$ about unit axis
$\mathbf{u}=(x,y,z)$:
$$ q = \cos\!\frac{\theta}{2} + \sin\!\frac{\theta}{2}\,(x\,i + y\,j + z\,k)
   = \Big(\cos\tfrac{\theta}{2},\; \sin\tfrac{\theta}{2}\,\mathbf{u}\Big). $$
Inverse extraction: $\theta = 2\arccos(a)$, and
$\mathbf{u} = (b,c,d)/\sin(\theta/2)$ (for $\theta \neq 0$). Note the
**half-angle**, and that $q$ and $-q$ encode the same rotation (double cover).

**SLERP (spherical linear interpolation)** between unit quaternions $q_0,q_1$,
with $\cos\Omega = q_0\!\cdot\!q_1$ (4D dot product) and parameter $t\in[0,1]$:
$$ \mathrm{Slerp}(q_0,q_1;t) = \frac{\sin\big((1-t)\Omega\big)}{\sin\Omega}\,q_0 \;+\; \frac{\sin\big(t\,\Omega\big)}{\sin\Omega}\,q_1. $$
This traces the great-circle arc on $S^3$ at constant angular speed (Shoemake
1985). In practice one first ensures the short way by negating $q_1$ if
$q_0\!\cdot\!q_1 < 0$ (double-cover bookkeeping), and falls back to linear
interpolation when $\Omega \to 0$.
([Slerp — Grokipedia](https://grokipedia.com/page/Slerp);
[MATLAB slerp](https://www.mathworks.com/help/nav/ref/quaternion.slerp.html))

---

## Sources

- History of quaternions — Wikipedia: https://en.wikipedia.org/wiki/History_of_quaternions
- Quaternion — Wikipedia: https://en.wikipedia.org/wiki/Quaternion
- Quaternions and spatial rotation — Wikipedia: https://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation
- Cayley–Dickson construction — Wikipedia: https://en.wikipedia.org/wiki/Cayley%E2%80%93Dickson_construction
- Frobenius theorem (real division algebras) — Wikipedia: https://en.wikipedia.org/wiki/Frobenius_theorem_(real_division_algebras)
- Hurwitz theorem and parallelizable spheres (arXiv): https://arxiv.org/pdf/hep-th/0005184
- Normed division algebras — nLab: https://ncatlab.org/nlab/show/normed+division+algebra
- Hamilton's Quaternions, or, The Trouble with Triples — Mathematical Enchantments: https://mathenchant.wordpress.com/2023/05/17/hamiltons-quaternions-or-the-trouble-with-triples/
- The Tragic Downfall and Peculiar Revival of Quaternions — Preprints.org: https://www.preprints.org/manuscript/202412.1922
- Back to the Roots of Vector and Tensor Calculus: Heaviside versus Gibbs (arXiv): https://arxiv.org/pdf/2010.09679
- Slerp — Grokipedia (Shoemake 1985, "Animating Rotation with Quaternion Curves"): https://grokipedia.com/page/Slerp
- slerp — Spherical linear interpolation — MATLAB: https://www.mathworks.com/help/nav/ref/quaternion.slerp.html
- The Mathematical Cause of Gimbal Lock and How to Avoid It — CompuTools: https://www.compu-tools.com/blog/2026-03-07-gimbal-lock/
- Understanding 3D Rotation: Quaternions, Euler Angles, Rotation Matrices — CompuTools: https://www.compu-tools.com/blog/2026-01-31-3d-rotation/
- A quaternionic approach to teaching 3D rotations and the resolution of gimbal lock (arXiv): https://arxiv.org/pdf/2511.04452
- Spinor — Grokipedia: https://grokipedia.com/page/Spinor
- Orientation entanglement — Wikipedia: https://en.wikipedia.org/wiki/Orientation_entanglement
- Representation theory of SU(2) — Wikipedia: https://en.wikipedia.org/wiki/Representation_theory_of_SU(2)
- Visualizing quaternions — Ben Eater / 3Blue1Brown (interactive): https://eater.net/quaternions
- Quaternions and 3d rotation, explained interactively — 3Blue1Brown: https://www.3blue1brown.com/lessons/quaternions-and-3d-rotation/
- Visualizing quaternions (4d numbers) with stereographic projection — 3Blue1Brown (YouTube): https://www.youtube.com/watch?v=d4EgbgTm0Bg
- Why Do Quaternions Double-Cover? — Nathan Reed: https://www.reedbeta.com/blog/why-quaternions-double-cover/
- Why Do the Unit Quaternions Double-Cover the Space of Rotations? — Neil Bickford (G4G13): https://www.gathering4gardner.org/g4g13gift/math/BickfordNeil-GiftExchange-WhyDoTheUnitQuaternionsDoubleCoverTheSpaceOfRotations-G4G13.pdf
- Maths — Quaternion half-angle transforms — EuclideanSpace: https://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/transforms/halfAngle.htm
- Q-RBSA: high-resolution 3D EBSD map generation — npj Computational Materials: https://www.nature.com/articles/s41524-024-01209-6
- Quaternions in molecular modeling (arXiv): https://arxiv.org/pdf/physics/0506177
- The Quaternions with Applications to Rigid Body Dynamics — ResearchGate: https://www.researchgate.net/publication/237253907_The_Quaternions_with_Applications_to_Rigid_Body_Dynamics
