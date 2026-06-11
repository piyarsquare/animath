# Trees and Nets

This view shows **tree-space itself as a polytope** — the *associahedron*.

Fix a circular order of **n leaves** around a polygon. The unrooted binary trees
compatible with that order are exactly the **triangulations of the n-gon**, and a
single **flip** of one diagonal turns one tree into a neighbor. Collect every tree
as a vertex and join flips by edges, and you get the **associahedron K₍ₙ₋₁₎**, a
polytope of dimension **n−3**:

- **n = 5** → a pentagon (2D), 5 trees;
- **n = 6** → the **3D associahedron**, 14 trees;
- **n = 7** → the **4D associahedron**, 42 trees (shown here as a flat slice for now).

So instead of drawing one circular order's *fiber* as a flat graph, you see the
whole object as the geometric polytope it actually is.

**Color = energy.** Each tree carries an energy; vertices run teal (low) → magenta
(high), and the **Energy terrain** window pushes each vertex outward by its energy
so tree-space becomes a landscape whose lowest point is the best tree. *(The energy
shown is a placeholder until the distance-matrix pipeline is wired in.)*

**Interact:** drag to orbit, scroll to zoom, click a vertex to read its tree (its
internal splits) in the side panel. Both windows stay linked.
