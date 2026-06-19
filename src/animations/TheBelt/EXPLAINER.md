# The Belt

Grab the block and turn it. A ribbon — a belt — runs from a fixed clamp up to
the block, and it twists in lockstep with your turn.

Now try the thing that feels obvious: turn the block one full circle (**360°**)
and try to shake the twist out without turning the block back. **You can't.** The
belt stays twisted.

Keep going. Turn it *again*, the same way, to **720°** — and the belt comes
**free**. A second full turn, somehow, *undoes* the first. Turn once more and the
twist is back. This is real, and you can feel it with a real belt or the cord of
a pair of headphones.

## Why a turn of 720° is "home"

Rotations in 3D have a hidden second layer. A quaternion `q` records not just
*where* the block ends up but *how it got there* — the whole path of the turn.
The scalar part `w = cos(θ/2)` runs at **half** your turning rate:

| Block turn θ | w = cos(θ/2) | belt |
|---|---|---|
| 0° | +1 | flat (home) |
| 360° | **−1** | still twisted |
| 720° | +1 | flat (home again) |

At 360° the block is *visibly back where it started* — its faces point home, and
the plain 3×3 rotation matrix is back to the identity — yet the quaternion sits at
**−q**, the opposite point, and the belt knows it. Only at 720° does everything
agree on "home." Two turns of the block = one trip for the quaternion. This
two-to-one relationship is the **double cover** of the rotation group, and the
belt is the part of it you can hold in your hand.

> The belt is an honest *demonstration* of a topological fact (a 360° loop of
> rotations cannot be shrunk to nothing, but a 720° loop can), not a proof of it.
> The same hidden factor of two is why a spin-½ particle like the electron must
> turn through 720° to look the same again.
