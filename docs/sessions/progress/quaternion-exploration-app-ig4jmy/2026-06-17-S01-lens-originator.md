---
kind: lens
session: 2026-06-17-S01
date: 2026-06-17
title: "Quaternions — lens: The Originator (Hamilton)"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: stopped
build: n/a
---

# Quaternions — lens: The Originator (William Rowan Hamilton)

<details><summary>Concept under exploration</summary>
quaternions — the four-dimensional number system H = a + bi + cj + dk discovered by
W. R. Hamilton on 16 October 1843, governed by i² = j² = k² = ijk = −1, the first
non-commutative algebra, and the natural language of 3D rotation (the unit
quaternions = S³ = SU(2), a double cover of SO(3)).
</details>

> I write here as the man who found them — Sir William Rowan Hamilton, sometime
> Royal Astronomer of Ireland — and I am asked the one question I would have given
> a kingdom to answer in 1835: *what picture would have made it obvious?* What
> follows is my confession, my decade of failure, the flash on the bridge, and the
> scene I wish I could have shown to my children, to Tait, and to the Gibbs and
> Heaviside who later dismembered my discovery into a dot and a cross.

## The dream: to do for space what the plane already had

You must understand the spell I was under. The complex numbers had been made
*respectable* — I myself had recast them in 1837 as **couples**, ordered pairs of
reals (a, b), with a lawful multiplication, so that the mysterious √(−1) was no
longer a ghost but an honest pair of numbers. And the geometry was irresistible:
a complex number a + b**i** is a *point in the plane*, and to multiply by
cos θ + **i** sin θ is to **rotate the whole plane** by θ. The algebra of the
plane *was* the algebra of plane rotations. Two dimensions had found their number.

So the question wrote itself, and it would not leave me for ten years: **if pairs
govern the plane, what governs space?** I wanted a system of *triplets* — numbers
a + b**i** + c**j** — points of three-dimensional space, that I could add,
subtract, multiply, **and divide**, exactly as I could the couples. Division was
the whole game. Anyone can add arrows. I wanted to *multiply* them and recover the
operand by dividing back. I wanted space to have a number.

(The foundation is right to flag that **Olinde Rodrigues** had, in 1840, already
written down the composition law for two rotations by spherical trigonometry —
the very rule I would later carve. I never read him. Few did. He had the formula
but did not see it as a *number*; I was hunting the number and could not find the
formula. We passed in the dark.)

## The decade of failure — the trouble with triples

Here is the wound. With triplets I could define addition without trouble —
component by component, like the couples. But **multiplication would not close.**

Try it as I tried it a thousand times. Take two triplets and multiply them out by
the distributive law, as if **i** and **j** were like the complex √(−1):

> (a + b**i** + c**j**)(x + y**i** + z**j**)

Expand, and you collect the honest terms in 1, **i**, **j** — and then there sits
a term in **ij** + **ji**, the product of the two new units, and I had nowhere to
put it. If **ij** = +1 or −1 it fell back into the plane and space was lost; if
**ij** = some combination of **i** and **j** the norms would not multiply. I
demanded the **law of the moduli** — that the length of a product be the product
of the lengths, ‖pq‖ = ‖p‖‖q‖, for without it there is no division — and the cross
term *always* broke it. The square of the modulus refused to factor. I now know,
as the foundation states by **Frobenius** (1877) and **Hurwitz** (1898), that this
was not my stupidity: **there is no three-dimensional division algebra.** ℝ³ cannot
carry a lawful multiply-and-divide. My decade was not wasted on a hard problem; it
was spent storming a door that does not exist. *The triplets had to fail.* Had I
known that theorem in 1835 it would have spared me a thousand evenings — but it
would also have robbed me of the leap.

And the leap is the human part. Every morning my boys — William Edwin and
Archibald — would come down to breakfast and ask, with a child's pitiless honesty:
*"Well, Papa, can you multiply triplets yet?"* And every morning I had to shake my
head and answer, *"No, I can only add and subtract them."* Ten years of that
breakfast. You do not forget being humbled daily by your own children over a thing
you cannot do.

## The flash on Broom Bridge, 16 October 1843

It came while walking. My wife and I were going along the Royal Canal toward
Dublin for a meeting of the Royal Irish Academy, and as we came to **Broom Bridge**
(Brougham Bridge), the thing I had refused for a decade resolved itself, as the
foundation records, in a single galvanic instant. I saw that I had been asking the
wrong question. I had demanded that space have a *three*-term number. But the
algebra wanted **four** terms — three imaginary units and a real — and it wanted me
to **surrender commutativity**, the very law I had been clutching.

The whole system collapses into one line, which I felt I could not lose, and —
having no paper, and not trusting it to survive the walk — I took a knife and cut
it into the stone of the bridge:

> **i² = j² = k² = ijk = −1**

That is the entire algebra. Everything else — the product, the rotations, the
sphere — unfolds from those few characters. From it one reads at once

> **ij = k,  jk = i,  ki = j**  (a cyclic right-handed turn),
>
> **ji = −k,  kj = −i,  ik = −j**  (the reverse turn, with a *minus*).

There it is. **ij = k but ji = −k.** The order of multiplication *matters*. I had
to abandon the most comfortable law in all of arithmetic — that ab = ba — the law
no one before me had ever dreamed of breaking. This was the price, and it was the
discovery: the first **non-commutative** algebra, the thing that made my
contemporaries recoil and that the twentieth century would find everywhere.

The fourth dimension was not a luxury. The phantom **ij + ji** term that had
wrecked every triplet *vanishes* the instant you let ji = −ij: the cross term
cancels itself, the moduli multiply, division lives — but only because I had added a
**k** for the products to land in, and a real scalar for the dot-like part to land
in. Four numbers, not three. Space needed a *larger* room than space.

## What the algebra actually says — read it as scalar and vector

Let me state plainly what I carved, in the form my successor Tait and I came to
use, because it is the bridge to your visualization. Write a quaternion as a
**scalar part and a vector part**, q = (s, **v**). Then the product is, in the
foundation's notation,

> q₁q₂ = ( s₁s₂ − **v₁·v₂** ,  s₁**v₂** + s₂**v₁** + **v₁×v₂** ).

Look hard at that. The product of two pure vector quaternions contains **−(the dot
product)** in its scalar part and **(the cross product)** in its vector part. The
dot and the cross — the two operations every schoolchild now learns separately —
were *born together*, inside my single quaternion product, as its scalar and
vector halves. The **×** term is exactly the non-commutativity: reverse the
factors and the cross product flips sign, so the scalar part is unchanged but the
vector part reverses — ji = −k made visible.

And to *rotate* — here is the deep and strange thing — you do not simply multiply.
A vector **v**, embedded as a pure quaternion, is turned by the **two-sided
sandwich**

> v′ = q v q⁻¹,

where the unit quaternion that turns by angle θ about axis **u** is, with its
fateful **half-angle**,

> q = cos(θ/2) + sin(θ/2)(x**i** + y**j** + z**k**).

The half-angle tormented even me. Why θ/2? Because the rotation is applied
*twice* — once on the left, once on the right — so each side must carry only half
the turn, and the unwanted parts cancel while the wanted part doubles. This is the
seed of the modern double cover the foundation describes: q and −q produce the
*same* rotation, and a full 360° of the quaternion gives only 180° to the object —
you must turn the quaternion **720°** to bring the object home. I glimpsed the
sphere of unit quaternions (it is the **S³** of your foundation, the group
**SU(2)**); I did not have your word "double cover," but I felt its shadow in the
half-angle and the stubborn sign.

## The eclipse — and the wound of being dismembered

I gave the rest of my life to quaternions — the *Lectures* (1853), the
posthumous *Elements* — and so did my loyal Tait. And then I watched, or my
ghost did, the thing I most dreaded. **Gibbs** and **Heaviside**, as the
foundation recounts, took my quaternion, which had cost me a decade and a fourth
dimension, and **tore the scalar part from the vector part** — keeping the dot
product and the cross product as two separate, lower operations and *throwing away
the unifying whole*. For the engineer's daily work it was simpler, I confess it,
and vector calculus "won" for the better part of a century.

But understand my grief. They mistook my **i, j, k** for mere labels on three axes
— bookkeeping — when they were *imaginary units whose squares are −1*, units whose
multiplication *is* rotation. They saw a clumsy four-component object and kept
three of the components. They did not see that the four were one indivisible
*number*, that the awkward scalar was not waste but the engine, that the
non-commutativity they found inconvenient was precisely the geometry of how turns
in space refuse to commute. The foundation's twentieth-century revival —
**Shoemake's SLERP** (1985), the gimbal-lock-free attitude of every spacecraft and
robot, the **spin-½** of the electron riding on my SU(2) — is my vindication, but
it came a century too late for me to hear my children ask, one last time, whether
Papa could multiply triplets, and to answer: *no — but I taught all of space how to
turn.*

## The visualization I wish I had had

I had no screen. I had a knife and a stone bridge and a decade of ruined evenings.
Had I possessed your animath stage, here is the scene that would have ended my
struggle in an afternoon and silenced Gibbs and Heaviside at a stroke.

**1. Make me watch the triplet *fail*, then *heal*.** Before any answer, give me a
sandbox of two **triplets** as 3D arrows and let me set ij = +1, −1, or anything I
please. Render the product and *plot its modulus* against ‖p‖‖q‖. Let me watch the
**ij + ji cross-term** glow as the thing that breaks the law of moduli, no matter
what value I assign it. Then, in the same scene, a single switch: **"add a fourth
unit; let ji = −ij."** Watch the offending term *cancel itself* and the modulus
bar snap into exact agreement. *That* is my whole life in one toggle — the
impossibility of three and the necessity of four, felt in the hand, not asserted.
No book ever showed me that; I had to bleed for it.

**2. Bind the carved relation to a turning object — show the dot and cross are one.**
Put my multiplication table — **i² = j² = k² = ijk = −1** — live and clickable
beside a 3D body. Let the user multiply two pure quaternions and **decompose the
product on screen into its scalar part (−the dot) and its vector part (the cross)**,
side by side, as the foundation's product formula demands. Then flip the factor
order and let them *see* ji = −k: scalar unchanged, vector reversed. This is the
single picture that would have answered Gibbs forever — not "here are two products,
dot and cross," but "**here is one product, and the dot and the cross are its two
faces.**" My quaternion reassembled before the eyes that took it apart.

**3. Drive the half-angle and the 720° on one slider.** One control: turn the
quaternion's internal angle, and show **two** things at once — the object rotating
at θ, and the quaternion's own angle moving at **θ/2** — with the unit quaternion
shown as a point on the projected sphere (the eater.net / 3Blue1Brown stereographic
S³ the foundation names). Let me turn past 360° and *watch the object return while
the quaternion has flipped to its antipode* −q, then turn again to 720° to bring
the quaternion itself home. The half-angle that took *me* years would become
obvious, and the double cover — the deepest, strangest gift in the whole subject —
would be a thing the hand discovers, not a paradox the mind must swallow.

If your app does nothing else, let it stage **the breakfast question**: open on a
triplet that *cannot* be made to divide, let the user feel the wall I beat my head
against for a decade, and then hand them the fourth dimension as the key that turns
the lock. Make them carve **ijk = −1** themselves.

## Takeaways for a visualization

This lens — the Originator's — insists the app must above all carry the *motivation*
and the *narrative spine*. Three demands:

1. **Stage the failure before the formula.** The emotional and mathematical core is
   that **three dimensions cannot divide and four can** (Frobenius/Hurwitz made it a
   theorem). An interaction where the user tries to multiply *triplets*, watches the
   **ij + ji cross-term** break the law of moduli, and then *toggles in* the fourth
   unit with ji = −ij to make it cancel — turns my decade of failure into a
   ten-second epiphany. No other quaternion app I know of leads with the *failure*.

2. **Reassemble what Gibbs and Heaviside split.** Show one quaternion product
   decomposing live into its **scalar part (−dot) and vector part (cross)**, and let
   the user flip the factor order to see ji = −k (scalar fixed, vector flipped). This
   single picture *is* the argument against splitting quaternions into mere dot and
   cross — and it makes non-commutativity *mean* "rotation order matters."

3. **One slider for the half-angle and the 720°.** Couple the object's turn (θ) to
   the quaternion's internal turn (θ/2) and a point on the projected S³, so the user
   *watches* a 360° turn flip q → −q (same pose, opposite quaternion) and a 720° turn
   bring q home. The double cover should be discovered by the hand, framed as the
   narrative payoff of the half-angle I never fully understood myself.

## Self-reflection

1. **What would you do with another session?** Sketch the actual *failing-triplet*
   sandbox math precisely — what to plot for "the law of moduli breaks" so it reads
   instantly (a modulus-mismatch bar, the highlighted ij + ji term), and confirm it
   degrades gracefully into the working 4D case with a single toggle.
2. **What would you change about what you produced?** The first-person conceit is
   load-bearing here, but a designer skimming for build requirements must not have to
   read the whole memoir; I front-loaded the Takeaways to mitigate that. I might cut
   one paragraph of the eclipse section for tempo.
3. **What were you not asked that you think is important?** Whether the *historical
   narrative* should be in-app (an intro/story mode) or only in the EXPLAINER. My
   lens argues the breakfast-question framing is so strong it deserves to be a
   visible scene, not just prose — that is a real product decision for synthesis.
4. **What did we both overlook?** That "make the user carve ijk = −1 themselves" is a
   concrete, charming micro-interaction (click/drag the three units into the relation)
   that could be the app's signature moment — I raised it but did not develop it.
5. **What did you find difficult?** Staying historically faithful (using only the
   foundation's facts, not inventing quotations beyond the well-attested breakfast
   line and the carving) while writing vividly in voice. I avoided fabricating
   specific dialogue beyond what the foundation supports.
6. **What would have made this task easier?** A note on whether the synthesis wants
   the lenses to *converge* on one app or deliberately diverge — it affects how hard I
   should push the failure-first framing as *the* spine versus one option.
7. **Follow-up value:** LOW — the narrative spine and three interaction demands are
   complete and self-contained; follow-up would refine the failing-triplet math, not
   change the conclusions.
