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
    hash: '/mobius',
    name: 'Möbius Walk',
    icon: '∞',
    blurb: 'Walk a twisting corridor — loop, Möbius, multi-twist, or trefoil knot — in first person.',
  },
  {
    hash: '/wrap-world',
    name: 'Wrap-World',
    icon: '⌗',
    blurb: 'Walk a flat torus or Klein bottle; landmarks repeat — and come back mirrored on the Klein bottle.',
  },
  {
    hash: '/projective-plane',
    name: 'Projective Plane',
    icon: '◓',
    blurb: 'Walk RP² as a little planet — opposite points are the same, so the far side is your world, mirrored.',
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
];
