# Topology Walk

Walk a **closed surface** in first person and discover its shape by reading your
own footprints. One **Setting** switch moves you between two kinds of world:

- **Corridor (hallway):** a twisting or knotted tube you walk *through*.
- **Open space (flat):** a flat plane with its edges glued, walked *across*.

Both are the same idea — a finite world with no boundary — shown two ways. The
**torus** even appears in both: as a curved ring corridor (**Loop**) and as a
flat room (**Flat torus**) with no walls at all.

## The corridor worlds

You walk the **floor** of an enclosed corridor. Crucially, **"up" is always the
floor's surface normal** — gravity is glued to whatever you're standing on.

- **Loop (torus tube):** a plain ring. Walk far enough and you return exactly as
  you left.
- **Möbius strip:** the corridor has a single **half-twist**, which makes it
  **non-orientable**. Walking one full lap rolls the whole world 180°: you end
  up where the *ceiling* used to be, upside-down. A second lap brings you back.
  The hallway looks ordinary until you notice the world has flipped.
- **Double / triple twist:** more half-twists per lap.
- **Trefoil knot:** the centreline is knotted; watch it tie itself in the map.

A **mini-map** redraws to match — its edge colours swap around a Möbius loop but
stay put on a plain one. You can switch **themes** for different scenery and
lighting (flickering torches, ship lights, cool moonbeams), and **press Space
(or ✎) to write on the walls** in glowing ink — then find your message again,
flipped, when you pass it from the other side.

## The flat worlds

These surfaces are **intrinsically flat** — locally they're just an ordinary
plane — so walking feels completely normal: nothing reorients, nothing flips
under your feet, you never hit a wall or get teleported. The world is a single
square tile (the **fundamental domain**) with its edges **glued**. Rather than
show a seam, the view tiles that tile seamlessly in every direction (the
**universal cover**), so you simply keep walking into more world and pass the
**same numbered pillars** again.

- **Flat torus:** both pairs of edges glue **straight** (like Asteroids /
  Pac-Man). Every repeated copy of a pillar looks identical.
- **Klein bottle:** one pair of edges (the **red** ones) glues with a **flip**,
  so every other column of the world is **mirror-reversed**. To make that flip
  impossible to miss, the two mirror-classes wear different skins — **columns**
  on one side, **trees** on the other (each landmark keeps its colour, so "the
  red one" stays the red one whichever form it takes). Cross a **red** edge and
  you watch the columns ahead become trees. You drop **one footprint per step, on
  the side you're walking** — and here's the tell: walk the **twist** direction
  all the way around and, back near where you started, your *earlier* footprints
  now hang **under the glass**, mirror-reversed (still pointing the way you
  walked — the twist mirrors your left/right, not your heading). The fresh print
  you lay on top sits **mirror-opposite the buried one**. That's because crossing
  the twist put you on the **other side** of the surface; to return to an
  *identical* copy of yourself you must cross it **twice** (the twist takes twice
  as long to walk as the roll). Turn the **floor opacity** down to see it clearly
  — the other side hanging below, opposite skin and reversed trail. Cross the
  **blue** (roll) edges instead and **nothing flips**: you stay on the same side,
  your prints stay on top. (Project your avatar and you'll see your true copies
  repeat every *other* square across the twist for exactly this reason.) Crucially
  there is **no way to skin the whole world with one form**: trees and columns can
  never be made consistent everywhere. That impossibility *is* the Klein bottle's
  **non-orientability**.

## The curved worlds

Flat surfaces are special: they're exactly the closed surfaces whose curvature can
be zero everywhere (Euler characteristic χ = 0). Push χ positive and you're forced
onto a **curved** world — a small planet — which is the third **Setting**:

- **Sphere:** an ordinary round world (χ = 2). Walk a great circle and you return
  home after one lap, **facing the same way**. The curvature is real — a big
  planet feels flat underfoot (that's why Earth does), a small one curves away at
  your feet — but you can never get rid of it: the total is pinned at 2π·χ. The
  **Planet radius** slider lets you feel exactly this: shrink the planet and the
  horizon bends up at your toes; grow it and the ground flattens out, though the
  *total* curvature never budges.
- **Projective plane (ℝP²):** the *same* sphere with **antipodal points glued**
  (every point is identified with the one straight through the centre, χ = 1). The
  planet is decorated symmetrically, so the near and far sides look identical — but
  your **footprints betray it**: laid on one side, they reappear on the far side
  **mirror-reversed**, because the antipodal map flips orientation. A one-way trip
  to the "other side" turns you into your mirror image; a second lap brings the
  real you back. It's the Klein bottle's flip again, now wrapped onto a sphere —
  and ℝP² is famously impossible to build in 3-D without the surface passing
  through itself (the **cross-cap**, **Roman surface**, and **Boy's surface** are
  the three classic ways to try).

Two readouts help you keep your bearings on the planet:

- **Mini-map:** on the plain **sphere**, a flattened latitude × longitude map with
  the numbered, colour-coded landmarks and a compass arrow for you. On **ℝP²** it
  switches to a *fundamental-domain square* in the same style as the torus/Klein
  maps — but with **both** pairs of opposite edges glued with a flip (that's the
  antipodal identification, and it's the unique square gluing with χ = 1). Your
  marker is charted into the square and turns **amber on the far cover sheet**.
- **Trees ⇄ columns (cover skins):** the sphere is the **double cover** of ℝP² —
  the two hemispheres (split at the `z = 0` seam, marked by a glowing ring) are
  antipodal twins, so each holds exactly one of every glued pair. One sheet grows a
  **forest**, the other a **colonnade**, placed in antipodal pairs: so on ℝP² every
  glued point is a *tree on one sheet and a column on the other* — the Klein
  bottle's flip wrapped onto a sphere. The flat worlds have the matching **Colour
  each cover cell** knob, which tints every tiled copy of the fundamental domain so
  you can watch yourself cross from one cover cell to the next.
- **Inner shell — the glued other side (ℝP²):** turns the planet to glass and
  hangs a smaller, point-reflected copy of the world *inside* it. The inner-shell
  point straight below your feet is your **identified antipode** — the very point
  ℝP² glues you to — shown **mirror-reversed**, because the antipodal map flips
  orientation. Drop a beacon, walk to its far side, and its glued image is right
  there beneath the ground. It's the spherical echo of the Klein bottle's glass
  floor and mirrored underside: the "other face" of a one-sided world, seen
  through the floor. (It's only a *representation* — ℝP² can't truly fit in 3-D
  without self-intersecting — but the gluing it shows is exact.)
  - **Twin orientation:** the antipodal map is the point inversion **−I**, which
    flips *all three* axes — so its orientation-reversal can be parked either on a
    horizontal axis (**Upright (mirror)**: the twin stands the same way up, just
    left-right mirrored) or on the vertical one (**Upside-down (normal flip)**: the
    twin hangs head-to-head through the glass, its up-normal opposite yours). Same
    gluing, two equally honest pictures — flip between them to feel why "mirror"
    and "upside-down" are the *same* move on a one-sided surface. (By contrast the
    Klein bottle's gluing is a *glide reflection*, which only ever flips one
    horizontal axis with up untouched — hence its always-left/right mirror style.)

## Reading the footprints

In every world you leave **oriented footprints** — arrows pointing the way you
walked, each with the letter **F** (for *forward*) inside it and a **cyan-left /
magenta-right** pair of halves. You laid them to read correctly from where you
stood. Because they live on the surface they reappear wherever the surface is
re-rendered:

- identical on the orientable worlds (Loop, Flat torus);
- **mirror-reversed** across any orientation flip — the F comes back as **Ⅎ** and
  the cyan/magenta halves swap. On the **Möbius** corridor you see this overhead
  after one lap (your footprints run across the ceiling, seen from beneath); on
  the **Klein bottle** across the red gluing; and on the **projective plane** on
  the far (antipodal) side of the planet.

A plain arrow would look the same mirrored; the **F can't hide a reflection**,
so it's the clearest possible signature of an orientation flip.

## Walking it

Drag to look, use **WASD / arrow keys** (or the on-screen pad) to move, and
toggle **third-person** to watch your avatar lay the trail. In the flat worlds a
**mini-map** shows the **fundamental domain** — the glued square, its edges
marked with identification arrows (matching arrows are the same edge: the
**red** left/right pair glues with a *flip*, the **blue** top/bottom pair glues
*straight*) — with a marker for where you are and which way you face. Watch it as
you cross an edge: the marker wraps to the opposite side, flipped on the red
pair, and turns amber once you're on the Klein bottle's mirror side. You can also
**project your avatar into every cell** to watch your twins walk the universal
cover in lockstep — mirror-reversed across the Klein bottle's flip, so you
literally see your reflected double striding the other way. There's no autopilot
— you go where you steer.
