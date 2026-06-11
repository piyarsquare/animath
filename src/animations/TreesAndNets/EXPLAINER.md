# Trees and Nets

Walk the space of trees, one **flip** at a time.

The **polygon** on the left is your current **tree** — a triangulation of an n‑gon,
which is the same thing as an unrooted binary tree whose leaves are the polygon's
edges (labeled by the cyclic order). **Click a chord to flip it:** that one diagonal
swaps for the other diagonal of its quadrilateral, and you step to a neighboring
tree. The diagonal that changed flashes, so you can watch the tree move.

The **Landscape** on the right is the **associahedron** — the map of *all* trees for
this cyclic order, with one vertex per tree and an edge for every flip. Your current
tree is the gold node; the trees one flip away are teal. Click any node to walk
there. So the two views are the same journey seen two ways: the tree itself, and
your position in the landscape of trees.

"Rotate" turns the whole cyclic order, relabeling the picture.

> One cyclic order gives one associahedron (one fiber). Gluing every order's
> associahedron together along shared facets builds the whole moduli space
> $\overline{M}_{0,n}(\mathbb{R})$ — walking *between* fibers is the next step.
