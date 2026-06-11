# Trees and Nets

This view shows **tree-space as a polytope** — the *associahedron*.

Fix a circular order of **n leaves** around a polygon. The unrooted binary trees
compatible with that order are exactly the **triangulations of the n-gon**, and a
single **flip** of one diagonal turns one tree into a neighbor. Collect every tree
as a vertex, join flips by edges, and fill in the faces, and you get the
**associahedron K₍ₙ₋₁₎**, a polytope of dimension **n−3**:

- **n = 5** → a pentagon (2-D), 5 trees;
- **n = 6** → the **3-D associahedron**, 14 trees, bounded by **6 pentagons + 3
  squares**;
- **n ≥ 7** → 4-D and up (shown as a canonical projection for now).

The points use the **secondary polytope of the regular n-gon** — a *symmetric*
canonical realization (it inherits the polygon's dihedral symmetry), so at n ≤ 6
you are looking at the genuine, symmetric associahedron. Each **2-face** is itself a
product of smaller associahedra: a pentagon is K₃×K₅ (cut off a triangle) and a
square is K₄×K₄ (a main diagonal).

**Interact:** drag to orbit, scroll to zoom, click a vertex to read its tree (its
internal splits) in the side panel.

One associahedron is the slice of tree-space over a single circular order. The full
tree-space glues one such tile per cyclic order into the real moduli space
$\overline{M}_{0,n}(\mathbb{R})$ — the explorer for that is being built next.
