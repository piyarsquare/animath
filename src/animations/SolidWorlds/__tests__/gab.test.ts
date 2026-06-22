import { describe, it, expect } from 'vitest';
import { abelianizationH1, isFreeAction } from '../lib/freeness';
import { computeHomology } from '../lib/homology';
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
  // each must be a genuine manifold (free) and carry its curated H₁ (= Γᵃᵇ).
  // `verified` = the cube cell complex *fully* agrees: same H₁, χ=0, and its own
  // vertex-link manifold cert passes. Since the 2026-06-20 screw fix all four —
  // including both screw worlds (second amphidicosm, didicosm) — are dual-verified.
  const cases: Record<string, { h1: string; orientable: boolean }> = {
    'second-amphicosm': { h1: 'ℤ²', orientable: false },
    'first-amphidicosm': { h1: 'ℤ ⊕ ℤ/2 ⊕ ℤ/2', orientable: false },
    'second-amphidicosm': { h1: 'ℤ ⊕ ℤ/4', orientable: false },
    'didicosm': { h1: 'ℤ/4 ⊕ ℤ/4', orientable: true },
  };
  for (const [id, want] of Object.entries(cases)) {
    it(`${id}: free, H₁ = ${want.h1}, dual-verified`, () => {
      const w = worldById(id);
      const a = analyzeSolid(w);
      expect(isFreeAction(w)).toBe(true);          // genuine flat manifold
      expect(abelianizationH1(w).h1).toBe(want.h1); // Γᵃᵇ matches the catalog
      expect(a.h1).toBe(want.h1);                   // analyzeSolid reports Γᵃᵇ
      expect(a.h1).toBe(w.h1);                      // curated spec agrees
      expect(a.orientable).toBe(want.orientable);
      expect(a.isManifold).toBe(true);
      expect(a.euler).toBe(0);
      expect(a.verified).toBe(true);                // the cell engine now agrees too
    });
  }

  it('didicosm (Hantzsche–Wendt): the cube cell complex now fully agrees', () => {
    // regression for the screw fix: the cube cell complex must agree on every
    // count — H₁ = ℤ/4 ⊕ ℤ/4, χ = 0, AND its own vertex-link manifold certificate
    // (each link an S²). Before the fix the screwed faces were left unglued and
    // the N=2 link was pinched, so this world shipped Γᵃᵇ-only/experimental.
    const w = worldById('didicosm');
    const hom = computeHomology(w);
    expect(hom.h1).toBe('ℤ/4 ⊕ ℤ/4');
    expect(hom.euler).toBe(0);
    expect(hom.manifold).toBe(true);
    expect(analyzeSolid(w).verified).toBe(true);
  });

  it('the `verified` gate still requires the cell complex own its manifold cert', () => {
    // the gate is `cell.h1 === Γᵃᵇ && cell.χ === 0 && cell.manifold`. Guard that
    // it actually ANDs in cell.manifold — a matching H₁/χ alone must not verify.
    const w = worldById('didicosm');
    const hom = computeHomology(w);
    const matchesValuesOnly = hom.h1 === abelianizationH1(w).h1 && hom.euler === 0;
    expect(matchesValuesOnly && hom.manifold).toBe(analyzeSolid(w).verified);
  });
});
