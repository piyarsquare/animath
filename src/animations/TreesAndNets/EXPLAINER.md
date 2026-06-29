# Trees and Nets

Start from distances between n leaves and watch them become a **tree** and a
**net**. The top bar has four modes — **Build** (the default), **Nets**, **Run**,
and **Fibers**.

## Fatten a tree into a net (*Build* — the default)

A tree is a net in disguise: with the leaves in a fixed cyclic order, every tree
edge is a non-crossing **split**. Start from a balanced **tree** (choose the leaf
count and the branch / leaf lengths), then **fatten** an internal edge — that adds
the *crossing* split beside it, which opens a **box**. Fatten a few edges and the
tree becomes a genuine net (a circular-decomposable metric). You see the result
three ways at once:

- **Neighbor-Joining tree** — the dominant tree (its edges *are* the splits).
- **Split network (SplitsTree)** — the net, with a box wherever you fattened.
- **Generated distances** — the matrix the weights imply (each distance is the sum
  of the weights of the splits that separate that pair).

## From a distance table (*Nets*)

Switch to **Nets** to work the other way: edit any cell of the **Distances**
matrix and everything recomputes — the Neighbor-Joining tree, the split network
(the net), and the **split weights**. Each chord is a split whose weight is fit to
the distances; a tree-like metric gives non-crossing chords, a conflicted metric
gives **crossing chords** — the signature of structure no single tree can hold.
Try the presets: **Tree** (clean and nested), **Conflict** (net-like), **Star**
(no structure at all), **Cycle** (leaves evenly around a circle).

## Watch the algorithms run (*Run*)

**Run** plays Neighbor-Joining and NeighborNet **step by step** on the current
matrix, so you can see *why* each pair is joined — not just the result. The **Q
matrix** scores every pair by how cheap it is to join them, and the minimum
(outlined) is the one chosen. NeighborNet locks in the circular order one
adjacency per merge: once a block grows past size two its orientation is fixed,
and from then on it can only flip **as a whole**.

## Trees, orders, and the associahedron (*Fibers*)

Switch to **Fibers** for the geometry of tree-space itself.
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
