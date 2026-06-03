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
  so every other column of the world is **mirror-reversed**. You discover this
  only by travelling and reading a familiar landmark returned backwards — never
  by anything strange happening locally. That mirror-gluing is what makes the
  Klein bottle **non-orientable**.

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
  the **Klein bottle** you see it across the red gluing.

A plain arrow would look the same mirrored; the **F can't hide a reflection**,
so it's the clearest possible signature of an orientation flip.

## Walking it

Drag to look, use **WASD / arrow keys** (or the on-screen pad) to move, and
toggle **third-person** to watch your avatar lay the trail. There's no
autopilot — you go where you steer.
