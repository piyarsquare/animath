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
