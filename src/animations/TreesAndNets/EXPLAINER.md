# Trees and Nets

Start from **data** — a table of pairwise **distances** between n things (leaves) —
and watch it become a **tree** and a **net**.

Edit any cell of the **Distances** matrix and everything recomputes:

- **Neighbor-Joining tree** — the classic phylogenetic tree built from the
  distances. Every distance table yields *some* tree, even when the data isn't
  really tree-shaped.
- **Split network (the net)** — the honest picture. Each chord is a **split** (a
  way of cutting the leaves into two groups) whose weight is fit to the distances.
  A tree-like metric gives a few non-crossing chords (a tree in disguise); a
  conflicted metric gives **crossing chords** — the signature of structure no
  single tree can hold.
- **Split weights** — the numbers behind the net: the weight of each split.

Try the **preset metrics**: **Tree** is clean and nested (the net looks like a
tree), while **Conflict** is net-like (crossing chords). **Star** has no
structure at all (every pair equidistant); **Cycle** places the leaves evenly
around a circle.

## Watch the algorithms run (the *Run* layout)

**Run** plays Neighbor-Joining and NeighborNet **step by step** on the current
matrix, so you can see *why* each pair is joined — not just the result. The **Q
matrix** scores every pair by how cheap it is to join them, and the minimum
(outlined) is the one chosen. NeighborNet locks in the circular order one
adjacency per merge: once a block grows past size two its orientation is fixed,
and from then on it can only flip **as a whole**.

## Build your own (the *Build* layout)

**Build** runs the app backwards. Instead of a matrix → tree/net, you weight the
**edges** and the matrix is *generated* — each distance is the sum of the weights
of the splits that separate that pair. Pick a **Tree** basis (its branches build
an additive tree metric) or a **Circular order** basis (its chords build a net),
then drag the weights and watch the tree, the net, and the distances all follow.
**Fit to current** snaps the weights to whatever matrix is on screen, so you can
start from a preset and sculpt.

## Trees, orders, and the associahedron (the *Fibers* layout)

Switch the **Layout** menu to **Fibers** for the geometry of tree-space itself.
Fix a circular order of the leaves around a polygon; the trees compatible with it
are the **triangulations** of that polygon, and flipping one diagonal steps to a
neighbor. That set of trees-with-flips is the **associahedron**. Hold a tree
fixed instead and vary the order, and you trace an **(n−3)-cube**. The two
windows show these two **fibers** through the current (tree, order) point; click
**Flip** to change the tree, **Cross** to change the order.

(This abstract tree-space view used to be the whole app; it is now one lens
beside the data-driven trees and nets.)

## Possible sources & where to go further

Pointers for going deeper, not priority claims. The project this ports from (a
private `quantum-tree`) frames phylogenetics as **evidence assembly**: distances
→ scores/energies → an *optional* probability law, never collapsing to a
distribution too early.

What the underlying working paper itself points to:

- **Neighbor-Net** and its circular-ordering view of tree-space — **Levy &
  Pachter**, *The Neighbor-Net algorithm*.
- The **associahedron tessellation of the real moduli space** M̄₀,ₙ(ℝ) (orders
  glued across flips) — **Satyan Devadoss**'s mosaic-operad work, and
  **Carr & Devadoss** on graph associahedra.
- **Circular orders and trees** — **Semple & Steel**, on cyclic permutations and
  evolutionary trees.
- Tree-space as a metric space — **Billera, Holmes & Vogtmann** (the BHV
  geometry of phylogenetic tree space).

Standard sources for the methods used here, which we cite ourselves (the paper
names them only in passing, without references):

- **Neighbor-Joining** — **Saitou & Nei** (1987).
- The **four-point condition** and **splits** — **Buneman**; split networks and
  split decomposition — **Bandelt & Dress**; the original **NeighborNet** —
  **Bryant & Moulton**.
- **Circular-decomposable metrics** / the **Kalmanson** conditions — **Kalmanson**
  (1975).
- The **associahedron** — **Stasheff**; its symmetric realization as a
  **secondary polytope** — **Gelfand, Kapranov & Zelevinsky**.
