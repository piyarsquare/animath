# Trees and Nets

Walk the space of trees — and the space of orders — one move at a time.

The **polygon** is your current **tree**: a triangulation of an n‑gon, which is an
unrooted binary tree whose leaves are the polygon's edges (labeled by the cyclic
order). Clicking a chord does one of two moves, chosen by the **Flip / Cross**
toggle:

- **Flip** swaps that diagonal for the other diagonal of its quadrilateral. You
  step to a neighboring **tree** in the *same* cyclic order; the changed chord
  flashes, and your dot moves on the map.
- **Cross** reverses the leaves on that chord's arc. You step into the neighbor
  **cyclic‑order fiber**; the labels slide around the circle to their new places.

So flips walk the *trees*; crossings walk the *orders*. (The two are the two ways
adjacent pieces of the moduli space connect.)

The **Landscape** on the right is the **associahedron** — the map of all trees for
the current order, one vertex per tree, one edge per flip. Your tree is the gold
node, the one‑flip neighbors are teal; click any node to jump there.

> One cyclic order is one associahedron (one fiber). All the fibers, glued along
> the facets you cross, form the moduli space $\overline{M}_{0,n}(\mathbb{R})$.
