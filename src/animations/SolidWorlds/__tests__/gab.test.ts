import { describe, it, expect } from 'vitest';
import { abelianizationH1, isFreeAction } from '../lib/freeness';
import { M3, SolidWorldSpec } from '../solidSchema';
import { SOLID_WORLDS } from '../worlds';

// independent H₁ = Γᵃᵇ (group abelianization) — the trustworthy invariant.
describe('Γᵃᵇ — group abelianization (independent of the cube cell complex)', () => {
  it('matches the four catalog worlds and certifies them free', () => {
    const expected: Record<string, string> = {
      '3-torus': 'ℤ³', 'half-turn': 'ℤ ⊕ ℤ/2 ⊕ ℤ/2', 'quarter-turn': 'ℤ ⊕ ℤ/2', 'amphicosm': 'ℤ² ⊕ ℤ/2',
    };
    for (const w of SOLID_WORLDS) {
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
