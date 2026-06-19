/**
 * Solid Worlds — the Tier-1 world catalog.
 *
 * Two flat (κ = 0) cube worlds, the minimal pair that makes the headline lesson
 * provable: the orientable **3-torus** (no loop flips you) versus the
 * non-orientable **amphicosm** = Klein bottle × circle (one glide-reflection,
 * so the x-loop returns you mirror-reversed). The full ten platycosms + the
 * curved catalog arrive in Tiers 2–3 (see the plan).
 */

import { reflect, rot, I3, Pairing, SolidWorldSpec } from './solidSchema';
import type { Axis } from './solidSchema';

const straight = (axis: Axis): Pairing => ({ axis, linear: I3 });

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
    manifold: 'Klein bottle × S¹ (amphicosm)',
    h1: 'ℤ² ⊕ ℤ/2',
  },
];

export const DEFAULT_WORLD_ID = '3-torus';

export function worldById(id: string): SolidWorldSpec {
  return SOLID_WORLDS.find((w) => w.id === id) ?? SOLID_WORLDS[0];
}
