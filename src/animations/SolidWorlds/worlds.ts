/**
 * Solid Worlds — the Tier-1 world catalog.
 *
 * Two flat (κ = 0) cube worlds, the minimal pair that makes the headline lesson
 * provable: the orientable **3-torus** (no loop flips you) versus the
 * non-orientable **amphicosm** = Klein bottle × circle (one glide-reflection,
 * so the x-loop returns you mirror-reversed). The full ten platycosms + the
 * curved catalog arrive in Tiers 2–3 (see the plan).
 */

import { reflect, rot, I3, M3, Pairing, SolidWorldSpec } from './solidSchema';
import type { Axis } from './solidSchema';

const straight = (axis: Axis): Pairing => ({ axis, linear: I3 });
/** Reflection that swaps two axes (a glide across a diagonal plane, det −1). */
const swap = (a: Axis, b: Axis): M3 => {
  const i = a === 'x' ? 0 : a === 'y' ? 1 : 2, j = b === 'x' ? 0 : b === 'y' ? 1 : 2;
  const m = [...I3]; m[i * 3 + i] = 0; m[j * 3 + j] = 0; m[i * 3 + j] = 1; m[j * 3 + i] = 1;
  return m;
};

export const SOLID_WORLDS: SolidWorldSpec[] = [
  {
    id: '3-torus',
    label: '3-Torus',
    short: 'cube · all three face pairs glued straight',
    blurb:
      'Walk out any wall, return through the opposite one unchanged — a room that repeats forever in all three directions. No loop ever flips you.',
    pairings: [straight('x'), straight('y'), straight('z')],
    manifold: '3-torus (torocosm)',
    h1: 'ℤ³',
  },
  {
    id: 'half-turn',
    label: 'Half-turn space',
    short: 'cube · top↔bottom glued with a 180° turn',
    blurb:
      'The x/y walls glue straight (a flat torus); the top and bottom glue with a half-turn. Walk the z-loop and the world comes back spun 180° — but you can just turn to face it. A rotation, not a mirror.',
    // mapping torus of the 180° rotation of the xy-torus: z-pair carries Rz(180).
    pairings: [straight('x'), straight('y'), { axis: 'z', linear: rot('z', 180) }],
    manifold: 'half-turn space (dicosm)',
    h1: 'ℤ ⊕ ℤ/2 ⊕ ℤ/2',
  },
  {
    id: 'quarter-turn',
    label: 'Quarter-turn space',
    short: 'cube · top↔bottom glued with a 90° turn',
    blurb:
      'Top and bottom glue with a quarter-turn, so each z-loop spins the world 90°; four laps return it. Still orientable — a rotation you can undo by reorienting, never a mirror.',
    // mapping torus of the 90° rotation of the (square) xy-torus.
    pairings: [straight('x'), straight('y'), { axis: 'z', linear: rot('z', 90) }],
    manifold: 'quarter-turn space (tetracosm)',
    h1: 'ℤ ⊕ ℤ/2',
  },
  {
    id: 'amphicosm',
    label: 'Klein × Circle',
    short: 'cube · +x/−x glued with a flip (glide-reflection)',
    blurb:
      'One face pair glued by reflect-then-translate; the other two straight. Walk the x-loop once and the world — and your own footprints — come back mirror-reversed. Walk it twice and you are restored.',
    // +x ↔ −x glued by reflect-in-Y then translate (the mirror headliner);
    // +y/+z straight. Orientation-reversing on x only.
    pairings: [{ axis: 'x', linear: reflect('y') }, straight('y'), straight('z')],
    manifold: 'Klein bottle × S¹ (first amphicosm)',
    h1: 'ℤ² ⊕ ℤ/2',
  },

  // ── the screw / mirror platycosms (S02): the cube's remaining flat worlds ───
  // Found by enumerating the schema and certifying free action; H₁ from the deck
  // group's abelianization, dual-verified against the cube cell complex (the
  // 2026-06-20 screw fix, see lib/homology.ts + SCREW_BUG.md). (Of the ten
  // platycosms only the tricosm and hexacosm are missing — they need a hexagonal
  // prism, not a cube.) The two amphidicosms (Bieberbach B₃/B₄, first Betti
  // number 1, holonomy ℤ₂²) are uniquely pinned by homology in the literature —
  // H₁ = ℤ⊕(ℤ/2)² and ℤ⊕ℤ/4 — so the −a2 = ℤ⊕ℤ/4 pairing below is the genuine
  // name↔invariant match (Conway–Rossetti, *Describing the Platycosms*).
  {
    id: 'second-amphicosm',
    label: 'Second amphicosm',
    short: 'cube · top↔bottom glued with a diagonal mirror (swap x↔y)',
    blurb:
      'Top and bottom glue with a mirror that swaps the two horizontal axes; the sides straight. Non-orientable like the Klein × S¹ world, but a genuinely different one — its first homology is ℤ² (no ℤ/2 torsion).',
    pairings: [straight('x'), straight('y'), { axis: 'z', linear: swap('x', 'y') }],
    manifold: 'second amphicosm (−a1)',
    h1: 'ℤ²',
  },
  {
    id: 'first-amphidicosm',
    label: 'First amphidicosm',
    short: 'cube · two perpendicular mirror-flips, one pair straight',
    blurb:
      'Two of the three face pairs glue with mirror-flips about perpendicular planes; the third straight. Holonomy ℤ/2 × ℤ/2. Non-orientable — yet it carries exactly the homology of the orientable half-turn space, H₁ = ℤ ⊕ (ℤ/2)², a flat-3-manifold homology coincidence.',
    pairings: [straight('x'), { axis: 'y', linear: reflect('z') }, { axis: 'z', linear: reflect('x') }],
    manifold: 'first amphidicosm (+a2)',
    h1: 'ℤ ⊕ ℤ/2 ⊕ ℤ/2',
  },
  {
    id: 'second-amphidicosm',
    label: 'Second amphidicosm',
    short: 'cube · two perpendicular mirrors, one carrying a screw',
    blurb:
      'Two perpendicular mirror-flips — one of them also slides a quarter-period (a glide screw) — and the third pair straight. Still ℤ/2 × ℤ/2 holonomy, but the screw twists the first homology to H₁ = ℤ ⊕ ℤ/4.',
    pairings: [{ axis: 'x', linear: reflect('y') }, { axis: 'y', linear: reflect('x'), offset: [0, 0, 0.5] }, straight('z')],
    manifold: 'second amphidicosm (−a2)',
    h1: 'ℤ ⊕ ℤ/4',
  },
  {
    id: 'didicosm',
    label: 'Hantzsche–Wendt',
    short: 'cube · two perpendicular half-turn screws (the didicosm)',
    blurb:
      'Two perpendicular half-turn screws; the third direction’s half-turn comes free as their product (holonomy ℤ/2 × ℤ/2). The famous Hantzsche–Wendt manifold — the only closed flat 3-manifold with finite first homology (H₁ = ℤ/4 ⊕ ℤ/4, first Betti number 0). Orientable, yet every loop twists you and none is a mirror.',
    // mapping-torus-free realization: half-turns about y and z (about x is M_y·M_z),
    // made fixed-point-free by a perpendicular screw on the z-pairing.
    pairings: [straight('x'), { axis: 'y', linear: rot('y', 180) }, { axis: 'z', linear: rot('z', 180), offset: [0.5, 0, 0] }],
    manifold: 'didicosm / Hantzsche–Wendt (c22)',
    h1: 'ℤ/4 ⊕ ℤ/4',
  },
];

export const DEFAULT_WORLD_ID = '3-torus';

export function worldById(id: string): SolidWorldSpec {
  return SOLID_WORLDS.find((w) => w.id === id) ?? SOLID_WORLDS[0];
}
