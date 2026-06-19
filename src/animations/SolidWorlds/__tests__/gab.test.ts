import { describe, it, expect } from 'vitest';
import { abelianizationH1, isFreeAction } from '../lib/freeness';
import { analyzeSolid, M3, SolidWorldSpec } from '../solidSchema';
import { SOLID_WORLDS, worldById } from '../worlds';

// independent H₁ = Γᵃᵇ (group abelianization) — the trustworthy invariant.
describe('Γᵃᵇ — group abelianization (independent of the cube cell complex)', () => {
  it('matches the four catalog worlds and certifies them free', () => {
    const expected: Record<string, string> = {
      '3-torus': 'ℤ³', 'half-turn': 'ℤ ⊕ ℤ/2 ⊕ ℤ/2', 'quarter-turn': 'ℤ ⊕ ℤ/2', 'amphicosm': 'ℤ² ⊕ ℤ/2',
    };
    for (const w of SOLID_WORLDS.filter((s) => s.id in expected)) {
      expect(abelianizationH1(w).h1).toBe(expected[w.id]);
      expect(isFreeAction(w)).toBe(true);
    }
  });

  it('computes Hantzsche–Wendt H₁ = ℤ/4 ⊕ ℤ/4 (the didicosm, expressible with perpendicular half-turn screws)', () => {
    // two coordinate half-turns + a perpendicular screw on the cube
    const spec: SolidWorldSpec = {
      id: 'hw', label: '', short: '', blurb: '', manifold: '', h1: '',
      pairings: [
        { axis: 'x', linear: [1, 0, 0, 0, 1, 0, 0, 0, 1] as M3 },
        { axis: 'y', linear: [-1, 0, 0, 0, 1, 0, 0, 0, -1] as M3 },             // 180° about y
        { axis: 'z', linear: [-1, 0, 0, 0, -1, 0, 0, 0, 1] as M3, offset: [0.5, 0, 0] }, // 180° about z + screw
      ],
    };
    expect(isFreeAction(spec)).toBe(true);
    expect(abelianizationH1(spec).h1).toBe('ℤ/4 ⊕ ℤ/4');
  });
});

describe('catalog — the new screw/mirror platycosms', () => {
  // each must be a genuine manifold (free), carry its curated H₁ (= Γᵃᵇ), and be
  // dual-verified (the cube cell complex agrees with the group abelianization).
  // `verified` = the cube cell complex independently agrees (h1 + χ=0). Three of
  // the four are dual-verified; the second amphidicosm is Γᵃᵇ-only (the cell
  // engine's known screw bug gives it χ=1), so it ships as experimental.
  const cases: Record<string, { h1: string; orientable: boolean; verified: boolean }> = {
    'second-amphicosm': { h1: 'ℤ²', orientable: false, verified: true },
    'first-amphidicosm': { h1: 'ℤ ⊕ ℤ/2 ⊕ ℤ/2', orientable: false, verified: true },
    'second-amphidicosm': { h1: 'ℤ ⊕ ℤ/4', orientable: false, verified: false },
    'didicosm': { h1: 'ℤ/4 ⊕ ℤ/4', orientable: true, verified: true },
  };
  for (const [id, want] of Object.entries(cases)) {
    it(`${id}: free, H₁ = ${want.h1}${want.verified ? ', dual-verified' : ' (Γᵃᵇ-only)'}`, () => {
      const w = worldById(id);
      const a = analyzeSolid(w);
      expect(isFreeAction(w)).toBe(true);          // genuine flat manifold
      expect(abelianizationH1(w).h1).toBe(want.h1); // Γᵃᵇ matches the catalog
      expect(a.h1).toBe(want.h1);                   // analyzeSolid reports Γᵃᵇ
      expect(a.h1).toBe(w.h1);                      // curated spec agrees
      expect(a.orientable).toBe(want.orientable);
      expect(a.isManifold).toBe(true);
      expect(a.euler).toBe(0);
      expect(a.verified).toBe(want.verified);
    });
  }
});
