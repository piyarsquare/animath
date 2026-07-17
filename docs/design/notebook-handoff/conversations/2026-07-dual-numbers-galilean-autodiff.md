# Dual Numbers, Galilean Spaces, Tropical Algebra, and Automatic Differentiation

**Conversation transcript**  
**Exported:** July 17, 2026

---

## User

Tell me about dual numbers and Gallalean spaces.

---

## Assistant

I’ll treat “Gallalean” as “Galilean,” unless you intended a specific spelling from a source. I’ll connect the algebra of dual numbers to the geometry of Galilean/degenerate metric spaces.

---

## Assistant

Dual numbers and Galilean spaces fit together because both replace ordinary Euclidean/Lorentzian geometry with a **degenerate** structure. Something has become “invisible” to the quadratic metric.

## 1. Dual numbers

The **dual numbers** are numbers of the form

$$
a + b\varepsilon
$$

where $a,b\in\mathbb R$, and

$$
\varepsilon^2 = 0,\qquad \varepsilon\neq 0.
$$

So $\varepsilon$ acts like a nonzero infinitesimal whose square vanishes.

Addition works componentwise:

$$
(a+b\varepsilon)+(c+d\varepsilon)=(a+c)+(b+d)\varepsilon.
$$

Multiplication gives:

$$
(a+b\varepsilon)(c+d\varepsilon)
=ac+(ad+bc)\varepsilon+bd\varepsilon^2
=ac+(ad+bc)\varepsilon.
$$

The key feature: when you plug a dual number into a smooth function,

$$
f(a+b\varepsilon)=f(a)+b f'(a)\varepsilon.
$$

That happens because the Taylor series stops after the linear term: all $\varepsilon^2,\varepsilon^3,\ldots$ vanish. This makes dual numbers a natural algebraic model for **first-order infinitesimal displacement**. They encode both a value and a tangent direction.

So:

$$
a+b\varepsilon
$$

means something like:

> position $a$, with infinitesimal tangent component $b$.

This explains their use in automatic differentiation, kinematics, screw theory, and projective geometry over dual-number rings. Dual quaternions, for example, encode rigid-body motions using dual numbers; this shows up in kinematic geometry and linkage theory. ([arxiv.org](https://arxiv.org/abs/2006.14259?utm_source=chatgpt.com))

## 2. Galilean geometry / Galilean spacetime

A **Galilean space** models classical Newtonian spacetime rather than relativistic spacetime.

In special relativity, spacetime has a nondegenerate metric:

$$
ds^2 = -c^2dt^2 + dx^2+dy^2+dz^2.
$$

Time and space mix under Lorentz transformations.

In Galilean spacetime, time stays absolute. A Galilean boost looks like:

$$
t' = t,\qquad x' = x - vt.
$$

So different inertial observers disagree about velocity, but they agree about time intervals. The geometric structure therefore separates into:

$$
\text{absolute time} \quad + \quad \text{Euclidean space on each time-slice}.
$$

The “metric” becomes degenerate: there is no single ordinary nondegenerate spacetime metric measuring both time and space the way a Lorentzian metric does. Modern treatments often describe Galilean/Newton-Cartan spacetime using degenerate metric structures, with a one-form for time and a spatial metric on the directions transverse to time. Recent geometric-algebra treatments also describe Galilean spacetime via a four-dimensional vector space with a degenerate metric. ([arxiv.org](https://arxiv.org/abs/2401.04205?utm_source=chatgpt.com))

## 3. The simplest 2D Galilean plane

A useful toy model has coordinates $(x,y)$, but distance only sees the $x$-direction first.

One version of Galilean plane geometry treats the “absolute” coordinate like $x$, and the other coordinate like a fiber direction. The metric behaves roughly like:

$$
ds^2 = dx^2
$$

rather than

$$
ds^2 = dx^2 + dy^2.
$$

So vertical displacement has zero length:

$$
(0,\Delta y)
$$

has squared length $0$. But it is not the zero vector. That is the same flavor as dual numbers: $\varepsilon\neq 0$, but $\varepsilon^2=0$.

This is the core analogy:

| Object | Ordinary geometry | Degenerate/Galilean version |
|---|---:|---:|
| Number | $a+bi,\ i^2=-1$ | $a+b\varepsilon,\ \varepsilon^2=0$ |
| Metric | $dx^2+dy^2$ | $dx^2$ |
| Invisible direction | none | vertical/fiber direction |
| Infinitesimal behavior | higher powers survive | first-order only |

## 4. Why dual numbers naturally describe Galilean geometry

Think of a point in the dual-number line:

$$
z = x + y\varepsilon.
$$

Its “norm” behaves like:

$$
z\bar z = (x+y\varepsilon)(x-y\varepsilon)=x^2,
$$

because the $\varepsilon$-part cancels and $\varepsilon^2=0$.

So the dual component $y\varepsilon$ contributes to position, slope, tangent data, or shear-like structure, but not to ordinary squared distance.

That makes the dual-number plane a natural coordinate model for a Galilean plane:

$$
(x,y) \leftrightarrow x+y\varepsilon.
$$

The real part $x$ gives the measurable Galilean distance.  
The dual part $y$ gives a secondary, infinitesimal, fiber, velocity, or tangent-like coordinate.

## 5. Galilean boosts as shear transformations

A Galilean boost in one spatial dimension:

$$
x' = x - vt,\qquad t'=t
$$

is a shear. It preserves time but shifts position by something proportional to time.

In matrix form:

$$
\begin{pmatrix}
t'\\
x'
\end{pmatrix}
=
\begin{pmatrix}
1 & 0\\
-v & 1
\end{pmatrix}
\begin{pmatrix}
t\\
x
\end{pmatrix}.
$$

This shear-like behavior matches the algebraic feel of dual numbers. Multiplication by a unit dual number,

$$
1+v\varepsilon,
$$

also produces a first-order shear-like transformation:

$$
(1+v\varepsilon)(a+b\varepsilon)
= a + (b+va)\varepsilon.
$$

The real part stays fixed; the dual part changes by an amount proportional to the real part. That resembles a Galilean boost: one coordinate remains absolute, while the other gets shifted linearly.

## 6. The conceptual punchline

Dual numbers are to Galilean geometry somewhat like complex numbers are to Euclidean geometry.

Complex numbers satisfy:

$$
i^2=-1
$$

and naturally encode rotations and Euclidean geometry.

Dual numbers satisfy:

$$
\varepsilon^2=0
$$

and naturally encode tangents, shears, infinitesimals, and degenerate/Galilean geometry.

A compact slogan:

> **Complex numbers encode rotation. Dual numbers encode first-order displacement. Galilean geometry is what happens when one direction counts only to first order.**

Or even more bluntly:

> A Galilean space is a geometry where one coordinate has metric reality, and another coordinate has infinitesimal/tangent/fiber reality.

That is why dual numbers feel like the right algebra for Galilean spaces.

---

## User

Is there a "complex number" with dual number coefficients?

---

## Assistant

Yes. Usually called the **complex dual numbers** or **dual-complex numbers**.

They look like

$$
z = (a+b\varepsilon) + i(c+d\varepsilon)
$$

where

$$
i^2=-1,\qquad \varepsilon^2=0,\qquad i\varepsilon=\varepsilon i.
$$

You can regroup this as

$$
z = (a+ic) + (b+id)\varepsilon.
$$

So it is equivalently:

$$
\mathbb C[\varepsilon]/(\varepsilon^2)
$$

meaning: **dual numbers with complex coefficients**.

An element has the form

$$
z = z_0 + z_1\varepsilon
$$

with $z_0,z_1\in\mathbb C$.

Multiplication:

$$
(z_0+z_1\varepsilon)(w_0+w_1\varepsilon)
=
z_0w_0+(z_0w_1+z_1w_0)\varepsilon.
$$

And functions behave beautifully:

$$
f(z_0+z_1\varepsilon)=f(z_0)+z_1 f'(z_0)\varepsilon
$$

for holomorphic $f$, assuming $f$ is defined near $z_0$.

So the interpretation:

$$
z_0+z_1\varepsilon
$$

means:

> a complex point $z_0$, together with a complex tangent vector $z_1$.

Geometrically, this is the algebra of **first-order infinitesimal neighborhoods in the complex plane**. It is not a field, because $\varepsilon\neq 0$ but $\varepsilon^2=0$, so $\varepsilon$ has no inverse.

There is also a nearby object:

$$
\mathbb D[i] \cong \mathbb C[\varepsilon]/(\varepsilon^2),
$$

where $\mathbb D$ denotes the real dual numbers. Same thing, as long as $i$ and $\varepsilon$ commute.

So yes: a “complex number with dual-number coefficients” exists naturally, and the clean notation is

$$
(a+b\varepsilon)+i(c+d\varepsilon)
$$

or, better,

$$
z_0+z_1\varepsilon,\qquad z_0,z_1\in\mathbb C.
$$

---

## User

And what does that mean, practically speaking? What does exp(z0+z1*eps)? What do I get for the extra two dimensions?

---

## Assistant

Yes. Practically, a complex dual number

$$
z=z_0+z_1\varepsilon,\qquad z_0,z_1\in\mathbb C,\quad \varepsilon^2=0
$$

represents:

> a point $z_0$ in the complex plane, plus a tangent vector $z_1$ attached to that point.

So it has four real coordinates:

$$
z_0 = x+iy,\qquad z_1 = u+iv.
$$

You can think of it as:

$$
(x,y)\quad\text{position}
$$

plus

$$
(u,v)\quad\text{infinitesimal displacement / velocity / tangent direction}.
$$

## Exponential

For any analytic function,

$$
f(z_0+z_1\varepsilon)=f(z_0)+z_1 f'(z_0)\varepsilon.
$$

For $f(z)=e^z$, since $f'(z)=e^z$,

$$
e^{z_0+z_1\varepsilon}
=
e^{z_0}+z_1 e^{z_0}\varepsilon
=
e^{z_0}(1+z_1\varepsilon).
$$

So the ordinary complex part is just:

$$
e^{z_0}.
$$

The dual part is:

$$
z_1 e^{z_0}.
$$

That dual part tells you how the infinitesimal tangent vector transforms under the exponential map.

## In real coordinates

Let

$$
z_0=x+iy,\qquad z_1=u+iv.
$$

Then

$$
e^{z_0}=e^x(\cos y+i\sin y).
$$

The extra dual component is:

$$
z_1e^{z_0}
=
(u+iv)e^x(\cos y+i\sin y).
$$

Multiplying out:

$$
z_1e^{z_0}
=
e^x\big[(u\cos y-v\sin y)+i(u\sin y+v\cos y)\big].
$$

So:

$$
e^{(x+iy)+(u+iv)\varepsilon}
=
e^x(\cos y+i\sin y)
+
e^x\big[(u\cos y-v\sin y)+i(u\sin y+v\cos y)\big]\varepsilon.
$$

The first two real dimensions give the new point:

$$
(X,Y)=\big(e^x\cos y,\ e^x\sin y\big).
$$

The extra two real dimensions give the pushed-forward tangent vector:

$$
(U,V)=
\big(
e^x(u\cos y-v\sin y),
e^x(u\sin y+v\cos y)
\big).
$$

## What the extra two dimensions “mean”

They are not another independent position. They are a **directional perturbation** at the point.

If

$$
z_0=x+iy
$$

is your actual point, then

$$
z_0+z_1\varepsilon
$$

means:

> start at $z_0$, and remember the infinitesimal direction $z_1$.

After applying $e^z$, the point moves to $e^{z_0}$, and the tangent vector gets transformed by the derivative:

$$
z_1 \mapsto e^{z_0}z_1.
$$

So the exponential map does two things:

1. sends the base point $z_0$ to $e^{z_0}$;
2. sends the attached tangent vector $z_1$ through the local linear approximation of $e^z$.

## Concrete example

Take

$$
z_0=0,\qquad z_1=1.
$$

Then

$$
e^{0+1\varepsilon}=1+\varepsilon.
$$

The point $0$ maps to $1$.  
The tangent vector $1$ maps to $1$.

Now take

$$
z_0=i\pi/2,\qquad z_1=1.
$$

Then

$$
e^{i\pi/2+\varepsilon}=i+i\varepsilon.
$$

The point maps to $i$, and the tangent vector $1$ has been rotated to $i$.

So the extra dimensions tell you the **local differential behavior** of the function at the point.

## Best mental model

A dual-complex number is not really “a 4D number” in the same way a quaternion is.

Better map:

$$
z_0+z_1\varepsilon
$$

means:

$$
\text{point in } \mathbb C
+
\text{tangent vector in } T_{z_0}\mathbb C.
$$

So the space of dual-complex numbers is essentially the **tangent bundle of the complex plane**:

$$
T\mathbb C \cong \mathbb C\times\mathbb C.
$$

The first $\mathbb C$ gives location.  
The second $\mathbb C$ gives infinitesimal direction/velocity.

That is the practical meaning: complex dual arithmetic automatically carries along first-order derivative information.

---

## User

Seems like there will be a whole family of these types of numbers for different epsilon^n = 0.

---

## Assistant

Yes. There is a whole family:

$$
\mathbb R[\varepsilon]/(\varepsilon^n)
$$

or, over complex numbers,

$$
\mathbb C[\varepsilon]/(\varepsilon^n).
$$

These are often called **truncated polynomial rings**, **nilpotent extensions**, or, in geometric contexts, **jet algebras**.

The usual dual numbers are the case

$$
\varepsilon^2=0.
$$

That keeps only first-order information:

$$
a_0+a_1\varepsilon.
$$

If instead

$$
\varepsilon^3=0,
$$

then numbers look like

$$
a_0+a_1\varepsilon+a_2\varepsilon^2.
$$

Now you retain information up to **second order**.

More generally, with

$$
\varepsilon^n=0,
$$

you get

$$
a_0+a_1\varepsilon+a_2\varepsilon^2+\cdots+a_{n-1}\varepsilon^{n-1}.
$$

The Taylor expansion stops automatically:

$$
f(a_0+a_1\varepsilon+a_2\varepsilon^2+\cdots)
$$

contains only powers below $\varepsilon^n$. So these objects carry finite Taylor data.

For the simplest case

$$
x = a + b\varepsilon,
\qquad \varepsilon^3=0,
$$

we get

$$
f(a+b\varepsilon)
=
f(a)+bf'(a)\varepsilon+\frac{b^2}{2}f''(a)\varepsilon^2.
$$

So:

| Algebra | What it carries |
|---|---|
| $\varepsilon^2=0$ | value + first derivative / tangent |
| $\varepsilon^3=0$ | value + first + second derivative |
| $\varepsilon^4=0$ | value + first + second + third derivative |
| $\varepsilon^n=0$ | Taylor data through order $n-1$ |

With complex coefficients:

$$
z=z_0+z_1\varepsilon+z_2\varepsilon^2+\cdots+z_{n-1}\varepsilon^{n-1},
\qquad z_i\in\mathbb C,
$$

you get a complex point plus higher-order infinitesimal structure. Geometrically, this corresponds to not just a tangent vector, but a **jet**: a local Taylor-germ-like description of a curve or function near a point.

For example, under the exponential,

$$
e^{z_0+z_1\varepsilon+z_2\varepsilon^2}
$$

with $\varepsilon^3=0$ becomes

$$
e^{z_0}
\left[
1
+
z_1\varepsilon
+
\left(z_2+\frac{z_1^2}{2}\right)\varepsilon^2
\right].
$$

So the extra coefficients transform according to the chain rule, including higher-order terms. First order transforms linearly; second order includes curvature/acceleration-like correction.

The practical interpretation:

$$
z_0+z_1\varepsilon+z_2\varepsilon^2+\cdots
$$

means:

> a point $z_0$, plus infinitesimal first-order, second-order, third-order, etc. information attached to it.

So yes: dual numbers are just the first nontrivial member of a ladder of nilpotent number systems. They are finite Taylor calculators built into arithmetic.

---

## User

It also looks like these dual numbers can give you all sorts of "close enough" math. Any relation with tropical algebras?

---

## Assistant

Yes, there is a relation, but not because dual numbers and tropical numbers are the same kind of “approximation.” They encode **different notions of closeness**.

## The shared theme

Both dual-number algebra and tropical algebra come from asking:

> What remains of ordinary algebra when I only care about some coarse or infinitesimal part of the answer?

But they coarse-grain in opposite directions.

## Dual numbers: infinitesimal closeness

Dual numbers keep a value plus infinitesimal correction:

$$
a+b\varepsilon,\qquad \varepsilon^2=0.
$$

They say:

> I care about the exact value and the first-order nearby behavior.

So they model **local approximation**:

$$
f(a+b\varepsilon)=f(a)+bf'(a)\varepsilon.
$$

This is “close enough” in the differential sense: ignore second-order and higher effects.

Dual numbers answer:

> What happens infinitesimally near this point?

## Tropical algebra: dominant-term closeness

Tropical algebra usually replaces

$$
+ \quad\text{by}\quad \min
$$

and

$$
\times \quad\text{by}\quad +
$$

or sometimes uses $\max$ instead of $\min$.

So in the min-plus convention:

$$
a\oplus b = \min(a,b),
$$

$$
a\odot b = a+b.
$$

This often arises by taking a logarithmic or valuation limit. For example, if

$$
x=e^{-A/t},\qquad y=e^{-B/t},
$$

then as $t\to 0^+$,

$$
xy=e^{-(A+B)/t},
$$

so multiplication becomes addition:

$$
A\odot B=A+B.
$$

And

$$
x+y=e^{-A/t}+e^{-B/t}
$$

is dominated by the larger exponential term, corresponding to smaller exponent:

$$
A\oplus B=\min(A,B).
$$

So tropical algebra says:

> I care only about the dominant scale/order of magnitude.

It ignores lower-order terms, not higher derivatives.

## Side-by-side

| System | Keeps | Throws away | Best mental model |
|---|---:|---:|---|
| Dual numbers | value + infinitesimal correction | second order and higher | tangent approximation |
| $\varepsilon^n=0$ numbers | finite Taylor jet | terms order $n$ and above | higher-order local approximation |
| Tropical algebra | dominant valuation/order | subdominant terms | asymptotic scale approximation |

## Deeper relation: both use “shadow algebra”

A nice unifying abstraction:

- Dual numbers live in a ring with a **nilpotent infinitesimal**:
  
  $$
  \varepsilon^2=0.
  $$

- Tropical numbers often arise from a ring/field with a **valuation**:

  $$
  v(xy)=v(x)+v(y),
  $$

  $$
  v(x+y)\ge \min(v(x),v(y)).
  $$

The valuation forgets most of the number and remembers only its leading scale. So tropicalization is a kind of **projection** from ordinary algebra to a coarser algebra of orders.

Dual-numberization is different: it thickens a point with infinitesimal tangent information.

So:

$$
\text{dual numbers} \approx \text{infinitesimal thickening}
$$

while

$$
\text{tropical algebra} \approx \text{asymptotic skeleton}.
$$

## A bridge: Puiseux / Laurent series

The strongest connection comes through series.

Consider something like a formal series:

$$
x(t)=c_0t^{\alpha_0}+c_1t^{\alpha_1}+c_2t^{\alpha_2}+\cdots
$$

with increasing exponents.

A tropical viewpoint often keeps only the leading exponent:

$$
v(x)=\alpha_0.
$$

A jet/dual-number viewpoint instead keeps finitely many local coefficients near a point.

So both arise from formal expansions, but choose different summaries:

$$
\text{tropical: keep leading exponent}
$$

$$
\text{jets/dual numbers: keep low-order Taylor coefficients}
$$

That is probably the cleanest bridge.

## Practical intuition

Suppose you compute a quantity and write it as:

$$
Q = Q_0 + Q_1\varepsilon + Q_2\varepsilon^2+\cdots
$$

A dual-number method says:

> Keep $Q_0$ and $Q_1$. That gives value and sensitivity.

A tropical method says something more like:

$$
Q(t)=3t^2+7t^5+\cdots
$$

and keeps:

$$
2
$$

because $t^2$ gives the leading scale.

So yes, both support “close enough math,” but with different notions of approximation:

- **Dual numbers**: close in position; preserve derivatives.
- **Tropical algebra**: close in scale; preserve dominant combinatorial structure.

## Best slogan

Dual numbers turn calculus into algebra.

Tropical algebra turns asymptotics into combinatorics.

They are cousins in the larger family of “algebras of approximation,” but they sit on different branches.

---

## User

I thought there as also something where (a + b)^n = a^n + b^n in tropical space, reminiscent of the dual numbers.

---

## Assistant

Yes — you’re thinking of the **freshman’s dream** pattern:

$$
(a+b)^n = a^n+b^n
$$

which normally fails over ordinary real/complex numbers because of binomial cross terms:

$$
(a+b)^n=a^n+\binom n1a^{n-1}b+\cdots+b^n.
$$

But there are algebraic worlds where the middle terms disappear or collapse.

## 1. Tropical version: addition is idempotent

In tropical algebra, “addition” usually means either max or min. Using max-plus notation:

$$
a\oplus b=\max(a,b),
\qquad
a\odot b=a+b.
$$

Then tropical powers mean repeated tropical multiplication:

$$
a^{\odot n}=na.
$$

Now compute:

$$
(a\oplus b)^{\odot n}
=
n\max(a,b).
$$

But

$$
a^{\odot n}\oplus b^{\odot n}
=
\max(na,nb).
$$

These are equal:

$$
n\max(a,b)=\max(na,nb).
$$

So in tropical notation:

$$
(a\oplus b)^n = a^n \oplus b^n.
$$

This works because tropical addition is **idempotent**:

$$
a\oplus a=a.
$$

Repeated copies do not accumulate. Coefficients like $\binom nk$ do not matter the same way they do in ordinary algebra.

## 2. Boolean algebra has the same flavor

Boolean OR/AND also gives:

$$
a\vee a=a.
$$

So powers and repeated terms collapse. This is another idempotent algebra. Tropical algebra is a richer numerical version of that idea.

## 3. Finite fields: another freshman’s dream

In characteristic $p$,

$$
(a+b)^p=a^p+b^p.
$$

For example over $\mathbb F_p$, all middle binomial coefficients are divisible by $p$:

$$
\binom pk \equiv 0 \pmod p
$$

for $0<k<p$.

So here the cross terms vanish because the **coefficients vanish**.

## 4. Dual numbers: related but different

Dual numbers do not generally satisfy

$$
(a+b)^n=a^n+b^n.
$$

But they do have a related “cross terms vanish after low order” behavior because

$$
\varepsilon^2=0.
$$

For example:

$$
(a+b\varepsilon)^n
=
a^n+n a^{n-1}b\varepsilon.
$$

Everything involving $\varepsilon^2$ or higher disappears.

So dual numbers keep the **first cross term**, while tropical algebra often collapses to the **dominant term**.

That distinction matters:

$$
(a+b\varepsilon)^n
\neq
a^n+(b\varepsilon)^n
$$

in general. Since $(b\varepsilon)^n=0$ for $n\ge2$, the right side would just be $a^n$, but the left side has the derivative term:

$$
n a^{n-1}b\varepsilon.
$$

So dual numbers do not erase all interaction. They preserve first-order interaction.

## The unifying abstraction

There are several ways to make binomial cross terms disappear:

| Algebraic setting | Why middle terms disappear/collapse |
|---|---|
| Tropical / idempotent semiring | repeated addition collapses: $x\oplus x=x$ |
| Boolean algebra | OR/AND are idempotent |
| Characteristic $p$ fields | binomial coefficients vanish mod $p$ |
| Dual numbers | higher-order infinitesimals vanish: $\varepsilon^2=0$ |

Your intuition is good: these systems all modify ordinary arithmetic so that some part of the binomial expansion no longer behaves normally.

But the maps differ:

$$
\text{tropical: keep the winner}
$$

$$
\text{dual: keep the tangent correction}
$$

$$
\text{characteristic }p\text{: coefficients vanish mod }p.
$$

The closest named idea for the tropical case is **idempotent algebra** or **idempotent semiring**. Tropical algebra is one of the central examples.

---

## User

Back a bit. What is this auto diff?

---

## Assistant

**Automatic differentiation** means computing derivatives by running ordinary-looking code while carrying derivative information along with every number.

It is not symbolic differentiation, and it is not numerical finite differences.

It gives derivatives to machine precision by applying the chain rule mechanically through the computation.

## Three ways to get a derivative

Suppose

$$
f(x)=\sin(x^2+3x).
$$

### 1. Symbolic differentiation

A system rewrites the formula:

$$
f'(x)=\cos(x^2+3x)(2x+3).
$$

Good for algebraic expressions, but awkward for large programs with loops, branches, arrays, etc.

### 2. Finite differences

Approximate:

$$
f'(x)\approx \frac{f(x+h)-f(x)}{h}.
$$

Simple, but numerically fragile. Too large $h$: inaccurate. Too small $h$: floating-point cancellation.

### 3. Automatic differentiation

Run the computation while carrying a pair:

$$
\text{value} + \text{derivative}\cdot \varepsilon.
$$

This is where dual numbers enter.

Let

$$
x = a + 1\varepsilon.
$$

Then

$$
f(a+\varepsilon)=f(a)+f'(a)\varepsilon.
$$

So after evaluating the ordinary function using dual numbers, the real part gives $f(a)$, and the $\varepsilon$-coefficient gives $f'(a)$.

## Example

Take

$$
f(x)=x^2+3x.
$$

Evaluate at $x=5$ using

$$
x=5+\varepsilon.
$$

Then

$$
x^2=(5+\varepsilon)^2=25+10\varepsilon+\varepsilon^2=25+10\varepsilon.
$$

And

$$
3x=15+3\varepsilon.
$$

So

$$
f(5+\varepsilon)=40+13\varepsilon.
$$

Meaning:

$$
f(5)=40,
$$

$$
f'(5)=13.
$$

Indeed,

$$
f'(x)=2x+3,
$$

so

$$
f'(5)=13.
$$

## For nested functions

Now take

$$
g(x)=\sin(x^2+3x).
$$

We already found

$$
x^2+3x=40+13\varepsilon.
$$

Then

$$
\sin(40+13\varepsilon)
=
\sin(40)+13\cos(40)\varepsilon.
$$

So:

$$
g(5)=\sin(40),
$$

$$
g'(5)=13\cos(40).
$$

The chain rule happened automatically.

## What autodiff does in code

A number becomes a little object:

```python
class Dual:
    def __init__(self, value, deriv):
        self.value = value
        self.deriv = deriv
```

Then arithmetic rules propagate derivatives:

```python
def add(x, y):
    return Dual(x.value + y.value, x.deriv + y.deriv)

def mul(x, y):
    return Dual(
        x.value * y.value,
        x.deriv * y.value + x.value * y.deriv,
    )

def sin(x):
    return Dual(
        math.sin(x.value),
        math.cos(x.value) * x.deriv,
    )
```

So when your program computes a value, it also computes the derivative.

## Forward-mode autodiff

The dual-number version is called **forward-mode automatic differentiation**.

You seed one input direction:

$$
x = a + 1\varepsilon
$$

and then compute one directional derivative.

For a function

$$
f:\mathbb R^n\to\mathbb R^m,
$$

forward mode efficiently computes:

$$
Jv
$$

where $J$ is the Jacobian and $v$ is an input direction.

Best when there are **few inputs** or you need directional derivatives.

## Reverse-mode autodiff

Modern machine learning usually uses **reverse-mode autodiff**, also called **backpropagation**.

For

$$
f:\mathbb R^n\to\mathbb R
$$

with many inputs and one scalar output, reverse mode efficiently computes the full gradient:

$$
\nabla f.
$$

That is why neural networks use it: millions or billions of parameters, one loss function.

Forward mode asks:

> If I perturb the input this way, how does the output change?

Reverse mode asks:

> How sensitive is the output to every intermediate quantity and input?

## Practical meaning

Autodiff lets you write a computation normally, then get exact derivatives of that computation.

Used for:

- neural network training
- optimization
- curve fitting
- physical simulation
- probabilistic modeling
- differentiable programming
- sensitivity analysis
- scientific computing

For your mental map:

$$
\text{dual numbers} \rightarrow \text{forward-mode autodiff}
$$

$$
\text{chain rule on computation graph} \rightarrow \text{reverse-mode autodiff / backprop}
$$

The dual-number story gives the cleanest conceptual entrance: autodiff works because numbers can be enlarged to carry derivative information, and ordinary arithmetic then propagates that information automatically.

---

## User

You brushed a lot of stuff under the rug please unpack.

---

## Assistant

Fair. I compressed several distinct ideas into “carry derivative information along.” Here is the unpacked version.

## 1. AD differentiates a *computation*, not merely a formula

Suppose you write:

```python
def f(x, y):
    u = x * y
    v = sin(u)
    w = x * x
    return v + w
```

Mathematically this computes

$$
f(x,y)=\sin(xy)+x^2.
$$

But automatic differentiation does not need to symbolically rewrite the whole expression. It treats the program as a sequence of primitive operations:

$$
u = xy
$$

$$
v = \sin(u)
$$

$$
w = x^2
$$

$$
L = v+w
$$

Then it applies local derivative rules to each step.

So AD works because a big computation is a composition of small differentiable pieces.

## 2. Forward-mode AD: carry a tangent with every value

In forward mode, every variable carries two pieces of data:

$$
\text{value},\quad \text{tangent}
$$

or symbolically:

$$
x+\dot{x}\varepsilon
$$

where

$$
\varepsilon^2=0.
$$

The ordinary part is the value. The $\varepsilon$-coefficient is the derivative/tangent.

For example, if

$$
x = a+\dot{x}\varepsilon,
\qquad
y=b+\dot{y}\varepsilon,
$$

then multiplication gives:

$$
xy
=
(a+\dot{x}\varepsilon)(b+\dot{y}\varepsilon)
$$

$$
=
ab + a\dot{y}\varepsilon + b\dot{x}\varepsilon + \dot{x}\dot{y}\varepsilon^2.
$$

Since

$$
\varepsilon^2=0,
$$

this becomes:

$$
xy = ab + (a\dot{y}+b\dot{x})\varepsilon.
$$

That $\varepsilon$-coefficient is exactly the product rule:

$$
\frac{d}{dt}(xy)=x\frac{dy}{dt}+y\frac{dx}{dt}.
$$

So the nilpotent rule $\varepsilon^2=0$ is not decorative. It enforces “keep first-order terms, discard second-order terms.”

## 3. The tangent is usually a directional derivative

For a one-variable function,

$$
f:\mathbb R\to\mathbb R,
$$

you seed

$$
x=a+1\varepsilon.
$$

Then

$$
f(a+\varepsilon)=f(a)+f'(a)\varepsilon.
$$

The $\varepsilon$-coefficient is $f'(a)$.

For a many-variable function,

$$
f:\mathbb R^n\to\mathbb R^m,
$$

you seed a direction vector

$$
v=(v_1,\ldots,v_n).
$$

That means you replace each input by

$$
x_i = a_i+v_i\varepsilon.
$$

Then AD computes

$$
f(a+v\varepsilon)=f(a)+J_f(a)v\varepsilon.
$$

So the $\varepsilon$-coefficient is not necessarily the whole Jacobian. It is the **Jacobian-vector product**:

$$
Jv.
$$

This matters.

Forward-mode AD naturally answers:

> If I nudge the input in direction $v$, how does the output change?

To get $\partial f/\partial x_j$, choose

$$
v=e_j,
$$

the basis vector in the $j$-th coordinate.

To get a full gradient of a scalar function with $n$ inputs using simple forward mode, you usually need $n$ passes, one for each basis direction. Or you carry an $n$-dimensional tangent vector with every variable, which amounts to doing those directions in parallel.

## 4. Worked forward-mode example

Take

$$
f(x,y)=\sin(xy)+x^2.
$$

Evaluate at

$$
x=2,\qquad y=3.
$$

Suppose we want $\partial f/\partial x$. Seed:

$$
x=2+1\varepsilon,
\qquad
y=3+0\varepsilon.
$$

Now compute step by step.

First:

$$
u=xy=(2+\varepsilon)(3)=6+3\varepsilon.
$$

Then:

$$
v=\sin(u)=\sin(6+3\varepsilon).
$$

Using

$$
\sin(a+b\varepsilon)=\sin(a)+b\cos(a)\varepsilon,
$$

we get:

$$
v=\sin(6)+3\cos(6)\varepsilon.
$$

Next:

$$
w=x^2=(2+\varepsilon)^2=4+4\varepsilon.
$$

Finally:

$$
L=v+w
$$

$$
L=\sin(6)+4 + \left(3\cos(6)+4\right)\varepsilon.
$$

Therefore:

$$
f(2,3)=\sin(6)+4,
$$

and

$$
\frac{\partial f}{\partial x}(2,3)=3\cos(6)+4.
$$

That matches the symbolic derivative:

$$
\frac{\partial}{\partial x}\left[\sin(xy)+x^2\right]
=
y\cos(xy)+2x.
$$

At $(2,3)$:

$$
3\cos(6)+4.
$$

The point: AD got this without forming the symbolic expression.

## 5. Reverse-mode AD: propagate sensitivities backward

Forward mode pushes tangents forward:

$$
\text{input perturbation} \longrightarrow \text{output perturbation}.
$$

Reverse mode does the opposite. It pulls sensitivities backward from the output.

For the same computation:

$$
u=xy
$$

$$
v=\sin(u)
$$

$$
w=x^2
$$

$$
L=v+w
$$

reverse mode asks:

> How much does $L$ depend on each intermediate variable?

We introduce adjoints:

$$
\bar{x}=\frac{\partial L}{\partial x},
\qquad
\bar{u}=\frac{\partial L}{\partial u},
$$

and so on.

Start with:

$$
\bar{L}=1.
$$

Because

$$
L=v+w,
$$

we get:

$$
\bar{v} += 1,
\qquad
\bar{w} += 1.
$$

Because

$$
w=x^2,
$$

we get:

$$
\bar{x} += \bar{w}\cdot 2x.
$$

Because

$$
v=\sin(u),
$$

we get:

$$
\bar{u} += \bar{v}\cdot \cos(u).
$$

Because

$$
u=xy,
$$

we get:

$$
\bar{x} += \bar{u}\cdot y,
$$

$$
\bar{y} += \bar{u}\cdot x.
$$

Putting it together:

$$
\frac{\partial L}{\partial x}
=
2x+y\cos(xy),
$$

$$
\frac{\partial L}{\partial y}
=
x\cos(xy).
$$

Same derivatives, different direction of accumulation.

## 6. Why reverse mode matters for machine learning

For a scalar-output function

$$
f:\mathbb R^n\to\mathbb R,
$$

the gradient has $n$ components:

$$
\nabla f=
\left(
\frac{\partial f}{\partial x_1},
\ldots,
\frac{\partial f}{\partial x_n}
\right).
$$

Forward mode naturally computes one directional derivative:

$$
Jv.
$$

For a scalar output, $J$ is a row vector, so $Jv$ is one number. To reconstruct the whole gradient, simple forward mode needs many directions.

Reverse mode, by contrast, can compute the whole gradient of a scalar output in one backward sweep, up to a small constant-factor overhead relative to evaluating the original function.

That is why neural networks use reverse-mode AD. They have millions or billions of parameters and usually one scalar loss.

So:

$$
\text{few inputs, many outputs} \Rightarrow \text{forward mode is attractive}
$$

$$
\text{many inputs, one output} \Rightarrow \text{reverse mode is attractive}
$$

$$
\text{many inputs, many outputs} \Rightarrow \text{full Jacobian is expensive either way}
$$

## 7. The clean abstraction: JVPs and VJPs

Modern AD systems often talk about two primitives.

Forward mode computes a **Jacobian-vector product**:

$$
Jv.
$$

This is called a **JVP**.

Reverse mode computes a **vector-Jacobian product**:

$$
v^T J.
$$

This is called a **VJP**.

For scalar loss functions, reverse mode starts with

$$
v=1
$$

at the output and returns

$$
1^T J = \nabla f.
$$

That is backpropagation.

## 8. Why this is not finite differences

Finite differences approximate:

$$
f'(x)\approx \frac{f(x+h)-f(x)}{h}.
$$

That has a step-size problem.

Too large $h$: truncation error.

Too small $h$: floating-point cancellation.

AD does not choose $h$. It does not compare two nearby function values. It propagates derivative information exactly through the primitive operations of the program.

So for

$$
f(x)=x^2,
$$

finite differences compute something like:

$$
\frac{(x+h)^2-x^2}{h}
=
2x+h.
$$

Then one hopes $h$ is small enough.

Dual-number AD computes:

$$
(x+\varepsilon)^2=x^2+2x\varepsilon.
$$

The derivative coefficient is exactly

$$
2x.
$$

No limiting process.

## 9. Why this is not symbolic differentiation

Symbolic differentiation tries to rewrite expressions:

$$
\sin(x^2+3x)
\mapsto
\cos(x^2+3x)(2x+3).
$$

AD does not need to produce that formula.

It just evaluates the program while carrying derivative data.

That means AD handles code structures that symbolic systems find annoying:

```python
for i in range(100):
    x = tanh(A @ x + b)
```

AD does not need to simplify this into a closed expression. It differentiates the executed sequence of operations.

But the flip side: AD usually gives derivatives **at a point**, not a nice closed-form expression.

## 10. The “exact derivative” claim needs qualification

When people say AD gives “exact derivatives,” they usually mean:

> exact derivatives of the implemented sequence of elementary operations, up to ordinary floating-point arithmetic.

It does **not** mean:

> exact derivative of the mathematical ideal you had in your head.

For example, suppose your program approximates a function using 20 iterations of an algorithm. AD differentiates the 20-iteration computation, not necessarily the limiting function.

Suppose your code has an `if` statement:

```python
if x > 0:
    return x
else:
    return 0
```

That is ReLU:

$$
f(x)=\max(0,x).
$$

At $x>0$, the derivative is 1.

At $x<0$, the derivative is 0.

At $x=0$, the derivative is not classically defined.

An AD framework may return 0, 1, or a chosen subgradient depending on implementation. That value is a convention, not a mathematical theorem.

So the precise statement is:

> AD gives mechanically correct chain-rule derivatives through the executed differentiable primitives, with framework-defined behavior at nonsmooth points.

## 11. What happens with branches and loops?

Loops are usually fine.

If your program says:

```python
for i in range(10):
    x = sin(x) + x*x
```

AD differentiates all 10 iterations.

Dynamic loops can also work in many systems:

```python
while x > threshold:
    x = update(x)
```

But there is a subtlety: the derivative follows the executed path. It generally does not account for how the number of loop iterations changes discontinuously when $x$ crosses a threshold.

Branches behave similarly. AD differentiates the branch that actually happened.

So a program like:

```python
if x > 0:
    y = x*x
else:
    y = -x
```

has two local derivatives:

$$
2x \quad \text{on the positive branch}
$$

and

$$
-1 \quad \text{on the negative branch}.
$$

At the boundary, AD needs a convention or fails to represent the discontinuity.

## 12. What dual numbers have to do with tangent bundles

The dual-number expression

$$
x+\dot{x}\varepsilon
$$

should not be read as “a weird real number.”

A better reading is:

$$
\text{base point} + \text{tangent vector}.
$$

So evaluating $f$ on dual numbers means lifting $f$ to the tangent bundle:

$$
f: M\to N
$$

becomes

$$
Tf: TM\to TN.
$$

For ordinary Euclidean spaces:

$$
T\mathbb R^n\cong \mathbb R^n\times\mathbb R^n.
$$

An input consists of:

$$
(x,\dot{x}).
$$

The output is:

$$
(f(x), Df_x(\dot{x})).
$$

That second component is the pushed-forward tangent vector.

This is the geometric heart of forward-mode AD.

## 13. Reverse mode lives in the cotangent world

Forward mode pushes tangent vectors forward.

Reverse mode pulls covectors backward.

Geometrically:

$$
\text{forward mode}:\quad TM\to TN
$$

$$
\text{reverse mode}:\quad T^*N\to T^*M
$$

For a scalar-valued function

$$
f:\mathbb R^n\to\mathbb R,
$$

the output cotangent starts as

$$
1\in T^*_{f(x)}\mathbb R.
$$

Pulling that back gives:

$$
df_x\in T_x^*\mathbb R^n,
$$

which is the gradient covector.

That is the geometric reason reverse mode is the right shape for scalar losses.

## 14. Higher derivatives

Dual numbers with

$$
\varepsilon^2=0
$$

carry first-order information.

If you want higher derivatives, you can use higher nilpotents:

$$
\varepsilon^3=0,
$$

$$
\varepsilon^4=0,
$$

and so on.

For example, with

$$
\varepsilon^3=0,
$$

we keep terms through $\varepsilon^2$:

$$
f(a+b\varepsilon)
=
f(a)+bf'(a)\varepsilon+\frac{b^2}{2}f''(a)\varepsilon^2.
$$

More generally, truncated polynomial arithmetic carries Taylor jets.

Modern AD systems often compute higher derivatives by composing forward and reverse mode:

$$
\text{forward-over-reverse}
$$

$$
\text{reverse-over-forward}
$$

For example, Hessian-vector products are often much cheaper than forming the full Hessian.

## 15. What about complex numbers?

For holomorphic functions,

$$
f:\mathbb C\to\mathbb C,
$$

complex dual numbers work cleanly:

$$
f(z_0+z_1\varepsilon)
=
f(z_0)+z_1f'(z_0)\varepsilon.
$$

So

$$
z_1
$$

is a complex tangent vector.

But many useful complex-valued computations are not holomorphic. For example:

$$
f(z)=\bar{z}
$$

or

$$
f(z)=|z|^2
$$

do not behave like holomorphic complex functions.

Then you should treat

$$
z=x+iy
$$

as two real variables:

$$
(x,y)\in\mathbb R^2.
$$

AD still works, but the derivative is a real Jacobian, or one may express it using Wirtinger derivatives. The naive holomorphic rule only applies to holomorphic operations.

## 16. How real AD systems implement this

There are two common implementation styles.

One is **operator overloading**. You create a special number object that carries value and derivative, and overload `+`, `*`, `sin`, `exp`, etc. That mirrors the dual-number story.

The other is **tracing / source transformation**. The system records the computation graph or transforms the program into another program that computes derivatives.

For reverse mode, the system usually does a forward pass, stores intermediate values, then performs a backward pass. The stored values matter because local derivative rules often need them. For example, differentiating

$$
u=xy
$$

backward requires knowing the primal values of $x$ and $y$.

That creates the classic reverse-mode tradeoff:

$$
\text{fast gradients}
$$

but

$$
\text{memory cost from storing intermediates}.
$$

Techniques like checkpointing trade extra recomputation for lower memory.

## 17. The rug lumps, in one table

| Slogan | What it hides |
|---|---|
| “AD computes derivatives automatically” | It differentiates the executed primitive operations, not necessarily the mathematical ideal |
| “Dual numbers give derivatives” | They give forward-mode directional derivatives, i.e. JVPs |
| “Backprop is AD” | Backprop is reverse-mode AD specialized to scalar losses / neural networks |
| “Exact derivatives” | Exact chain-rule derivatives up to floating-point arithmetic and implementation choices |
| “Works on code” | Smooth primitives work cleanly; branches, discontinuities, mutation, randomness, and solvers need care |
| “Complex AD works” | Clean for holomorphic functions; otherwise treat complex values as pairs of real variables |
| “Higher derivatives are possible” | Yes, but cost and representation grow; Hessian-vector products often beat full Hessians |

## The compact version

Automatic differentiation works because every elementary operation has a local linear approximation.

Forward mode carries that local linear approximation forward with the values:

$$
(x,\dot{x})\mapsto(f(x), Df_x\dot{x}).
$$

Dual numbers implement exactly that:

$$
x+\dot{x}\varepsilon.
$$

Reverse mode runs the computation forward, then propagates output sensitivities backward:

$$
\bar{y}\mapsto \bar{y}D f_x.
$$

That is why forward mode naturally computes directional derivatives, while reverse mode naturally computes gradients of scalar losses.

Confidence: high.

---

## User

can you please write out the full content of this conversation to a markdown file and/or pdf for download?

---

## Assistant

I’ll compile the full dual-numbers/autodiff thread into a clean Markdown transcript and a matching PDF.
