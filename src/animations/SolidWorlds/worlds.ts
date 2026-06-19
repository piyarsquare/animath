/**
 * Solid Worlds — the Tier-1 world catalog.
 *
 * Two flat (κ = 0) cube worlds, the minimal pair that makes the headline lesson
 * provable: the orientable **3-torus** (no loop flips you) versus the
 * non-orientable **amphicosm** = Klein bottle × circle (one glide-reflection,
 * so the x-loop returns you mirror-reversed). The full ten platycosms + the
 * curved catalog arrive in Tiers 2–3 (see the plan).
 */

import { reflect, I3, Pairing, SolidWorldSpec } from './solidSchema';
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
