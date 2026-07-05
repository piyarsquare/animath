export interface AppDescriptor {
  /** Hash route (no leading `#`, e.g. `/` or `/fractals`). */
  hash: string;
  /** Human-readable name shown in the gallery. */
  name: string;
  /** Optional emoji or single character used as the card glyph. */
  icon?: string;
  /** One-line description shown on the gallery cards. */
  blurb?: string;
}

/** Catalog of animations — the canonical app registry. The gallery
 *  (src/chrome/catalog.ts) derives its cards from THIS order.
 *
 *  Normally append-only (see CLAUDE.md's parallel-branch rule). The one
 *  deliberate exception is the trailing **plane-arithmetic pair** (Plane
 *  Transform · Argand): two unmerged realizations of the same "arithmetic on
 *  the plane / number planes" idea (Argand also carries the dormant
 *  `numberPlanes.ts` engine), grouped at the end until we settle their final
 *  unified format — a notebook thread is working out what that artifact should
 *  be. Complex Particles stays the flagship (first). Keep new apps ABOVE the
 *  trailing pair. */
export const apps: AppDescriptor[] = [
  {
    hash: '/complex-particles',
    name: 'Complex Particles',
    icon: '✦',
    blurb: 'Visualize z → f(z) as a cloud of particles living in 4D, projected down to 3D.',
  },
  {
    hash: '/fractals',
    name: 'Fractals',
    icon: '◯',
    blurb: 'Explore the Mandelbrot, Julia, Burning Ship and Tricorn sets, rendered on the GPU.',
  },
  {
    hash: '/polygon-worlds',
    name: 'Polygon Worlds',
    icon: '⬚',
    blurb: 'One decorated square, four worlds: glue its edges and let curvature follow — walk a torus, Klein bottle, projective plane or sphere in first person.',
  },
  {
    hash: '/correspondence',
    name: 'Mandelbrot ↔ Julia',
    icon: '⇄',
    blurb: 'See how every point of the Mandelbrot set seeds its own Julia set.',
  },
  {
    hash: '/trinary',
    name: 'Trinary System',
    icon: '✸',
    blurb: 'Drop a planet into a three-star system and watch sensitive dependence erase its future — then open the Lab to run thousands of worlds and tally how often chaos ends happily.',
  },
  {
    hash: '/agentic-sorting',
    name: 'Agentic Sorting',
    icon: '⇅',
    blurb: 'Watch autonomous agents with rival strategies race to sort a population of values.',
  },
  {
    hash: '/stable-matching',
    name: 'Stable Matching',
    icon: '⇆',
    blurb: 'A rebuilt Gale–Shapley lab: tune how much each group shares a common preference, then watch the proposer advantage appear — and vanish at full consensus.',
  },
  {
    hash: '/trees-and-nets',
    name: 'Trees and Nets',
    icon: '⤳',
    blurb: 'See tree-space as a polytope: every triangulation of an n-gon is a tree, every flip an edge, and the whole associahedron a 3D (or 4D) shape colored by energy.',
  },
  {
    hash: '/solid-worlds',
    name: 'Solid Worlds',
    icon: '⬢',
    blurb: 'Walk inside a closed 3-manifold built from one glued cube — a room that repeats forever — and watch an orientation-reversing loop bring you back mirrored.',
  },
  {
    hash: '/counting-the-ways',
    name: 'Counting the Ways',
    icon: '◫',
    blurb: 'Why does a Bessel function show up when you take the difference of two Poisson counts? Walk the diagonal of the (gains, losses) lattice and watch the scary function become a simple sum — the Skellam distribution, demystified.',
  },

  // ---- Plane-arithmetic pair (grouped at the end; see the header note) -------
  {
    hash: '/plane-transform',
    name: 'Plane Transform',
    icon: '↦',
    blurb: 'Watch a complex function f : ℂ → ℂ warp a colored grid of the plane.',
  },
  {
    hash: '/argand',
    name: 'Argand Plane',
    icon: '∡',
    blurb: 'Build the complex line f(z) = α₁·z + α₀ (and quadratics): drag the coefficients, feed it a point, a shape or the whole grid, and watch multiply spiral while add slides — through complex, dual and split-complex numbers.',
  },
];
