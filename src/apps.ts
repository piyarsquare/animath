import type { AppDescriptor } from './components/AppShell';

/** Catalog of animations, shared by the hash router (src/index.tsx) and the
 *  menu screen (src/components/Menu.tsx). The order here is the order shown
 *  both in the drawer's Apps tab and on the landing gallery. */
export const apps: AppDescriptor[] = [
  {
    hash: '/complex-particles',
    name: 'Complex Particles',
    icon: '✦',
    blurb: 'Visualise z → f(z) as a cloud of particles living in 4D, projected down to 3D.',
  },
  {
    hash: '/plane-transform',
    name: 'Plane Transform',
    icon: '↦',
    blurb: 'Watch a complex function f : ℂ → ℂ warp a colored grid of the plane.',
  },
  {
    hash: '/fractals',
    name: 'Fractals',
    icon: '◯',
    blurb: 'Explore the Mandelbrot, Julia, Burning Ship and Tricorn sets, rendered on the GPU.',
  },
  {
    hash: '/correspondence',
    name: 'Mandelbrot ↔ Julia',
    icon: '⇄',
    blurb: 'See how every point of the Mandelbrot set seeds its own Julia set.',
  },
  {
    hash: '/topology-walk',
    name: 'Topology Walk',
    icon: '∞',
    blurb: 'Walk a closed surface in first person — twisting corridor or flat torus / Klein bottle — and read the topology off your own footprints.',
  },
  {
    hash: '/trinary',
    name: 'Trinary System',
    icon: '✸',
    blurb: 'Drop a planet into a three-star system and watch sensitive dependence erase its future — then open the Lab to run thousands of worlds and tally how often chaos ends happily.',
  },
  {
    hash: '/stable-marriage',
    name: 'Stable Marriage',
    icon: '♥',
    blurb: 'Step through the Gale–Shapley algorithm and probe the stability of its matchings.',
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
];
