# Trees and Nets

A point here is a **tree** together with a **cyclic order** of its leaves. Several
windows show it, and you can open whichever you like:

- **Tree** — the actual unrooted tree, leaves around the circle in cyclic order.
- **Polygon + triangulation** — the same point as a triangulated polygon (a tree is
  dual to a triangulation of an n‑gon).
- **Overlay** — both at once (the "single object" view).

Every tree has **n−3 interior edges**, and each edge gives two moves (toggle with
**Flip / Cross**, or click a node in a fiber window):

- **Flip** — keep the order, swap that edge. The *tree* changes. This is a step in
  the **associahedron**.
- **Cross** — keep the tree, reverse the leaves on that edge's arc. The *order*
  changes (the tree re‑embeds). This is a step in the **(n−3)‑cube**.

## The two fibers

Through every point run two fibers, shown as embedded graphs:

- **Associahedron fiber** — all trees compatible with the *current order* (vary the
  tree by flips). For n=6 this is the 3‑D associahedron.
- **(n−3)‑cube fiber** — all orders compatible with the *current tree* (vary the
  order by crosses). It really is a cube: 2^(n−3) orders, each edge toggling one
  interior edge's twist.

Your position glides as a marker in each. The **neighborhood radius** controls how
far out from where you stand the fiber is drawn.

## Possible sources & where to go further

Pointers for going deeper, not priority claims.

- **The associahedron** — the polytope whose vertices are triangulations of an
  n-gon and whose edges are flips — is **Stasheff's** associahedron (originally
  from homotopy theory, 1963); the polytope realization on triangulations is
  classical, and **Loday's** explicit coordinates are one well-known realization.
- **The secondary polytope** (the symmetric realization used here) is due to
  **Gelfand, Kapranov & Zelevinsky** (the *GKZ* secondary polytope of a point
  configuration); the associahedron is the secondary polytope of a convex polygon.
- **Trees ↔ triangulations duality** and **flip graphs** are standard combinatorics
  (see e.g. Devadoss & O'Rourke, *Discrete and Computational Geometry*).
- **The mosaic / cyclic-order structure** — gluing associahedron tiles into the
  real moduli space M̄₀,ₙ(ℝ) — follows **Satyan Devadoss's** *mosaic operad* work
  on the real points of the moduli space of marked curves.
- **Where the "Nets" half is headed** — distance matrices to split networks
  (NeighborNet, neighbor-joining) is phylogenetics: **Bryant & Moulton** (NeighborNet),
  **Saitou & Nei** (neighbor-joining), and the split-network framework of
  **Bandelt & Dress**.
- This app ports the classical core of a private `quantum-tree` project; the
  attribution/license for that port is still being settled.
