# Trees and Nets

A point here is a **tree together with a cyclic order** of its leaves. The left
panel draws the actual unrooted tree (dual to a triangulation of an n‑gon; turn on
"Show triangulation" to see the polygon). Every tree has **n−3 interior edges**, and
each edge offers *two* moves:

- **Flip** — keep the order, swap that edge for the other diagonal of its
  quadrilateral. The tree changes: this is a step in the **associahedron**.
- **Cross** — keep the edge, reverse the leaves on its arc. The order changes: this
  is a step in the **(n−3)‑cube** of orders compatible with the tree.

The **Flip / Cross** toggle chooses what clicking a branch does. The tree morphs
(flip) or the labels slide around the circle (cross).

## The local map

The right panel is the **local viewpoint graph**: from where you stand, it draws all
the one‑move neighbors — <span>flip targets in teal</span>, <span>cross targets in
orange</span>. The interesting part is where they **overlap**:

- A node hit by **both** a flip and a cross (gold halo) is where the associahedron
  and the cube **glue** — two different moves land on the same tree.
- A **twist** loop (purple) is a cross that leaves the tree unchanged: the order
  moves but the labeled tree doesn't.

Click any node to walk there. So you can watch tree‑space and order‑space meet,
locally, without drawing the whole moduli space $\overline{M}_{0,n}(\mathbb{R})$.
