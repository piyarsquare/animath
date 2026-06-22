import { describe, expect, it } from 'vitest';
import {
  analyzeSolid, pairingDet, reflect, rot, mulM3, detM3, transposeM3, I3, M3, SolidWorldSpec,
} from '../solidSchema';
import { computeHomology } from '../lib/homology';
import { SOLID_WORLDS, worldById } from '../worlds';

/** The holonomy of walking a single loop = the product of the crossed pairings'
 *  linear parts (forward = the linear part, backward = its transpose), composed
 *  in walked order — the pure-math half of the chirality acceptance test. */
function loopLinear(steps: M3[]): M3 {
  return steps.reduce((acc, m) => mulM3(m, acc), I3);
}

describe('solidSchema — orientability is decided by the pairing determinants', () => {
  it('the orientable worlds have all proper pairings, the amphicosm does not', () => {
    expect(analyzeSolid(worldById('3-torus')).orientable).toBe(true);
    expect(analyzeSolid(worldById('half-turn')).orientable).toBe(true);
    expect(analyzeSolid(worldById('quarter-turn')).orientable).toBe(true);
    expect(analyzeSolid(worldById('amphicosm')).orientable).toBe(false);
  });

  it('the amphicosm reverses orientation only on the x-pairing', () => {
    const a = analyzeSolid(worldById('amphicosm'));
    expect(a.reversingAxes).toEqual(['x']);
    expect(a.perAxis.find((p) => p.axis === 'x')!.kind).toBe('glide-reflection');
    expect(a.perAxis.find((p) => p.axis === 'y')!.kind).toBe('translation');
  });

  it('every curated catalog world is internally consistent', () => {
    for (const w of SOLID_WORLDS) {
      expect(w.pairings).toHaveLength(3);
      const a = analyzeSolid(w);
      // orientable ⟺ no reversing pairing
      expect(a.orientable).toBe(a.reversingAxes.length === 0);
    }
  });
});

describe('solidSchema — loop holonomy (the chirality acceptance test)', () => {
  const amphiX = worldById('amphicosm').pairings.find((p) => p.axis === 'x')!.linear;

  it('the 3-torus flips on no axis', () => {
    for (const p of worldById('3-torus').pairings) expect(pairingDet(p)).toBe(1);
  });

  it('one x-loop in the amphicosm reverses orientation; two restore it', () => {
    expect(detM3(loopLinear([amphiX]))).toBeLessThan(0);          // mirrored
    expect(detM3(loopLinear([amphiX, amphiX]))).toBeCloseTo(1);   // restored
  });

  it('the y- and z-loops in the amphicosm never flip', () => {
    const { pairings } = worldById('amphicosm');
    expect(pairingDet(pairings.find((p) => p.axis === 'y')!)).toBe(1);
    expect(pairingDet(pairings.find((p) => p.axis === 'z')!)).toBe(1);
  });

  it('the quarter-turn z-loop is a proper 90° rotation, order 4', () => {
    const q = worldById('quarter-turn').pairings.find((p) => p.axis === 'z')!.linear;
    expect(detM3(q)).toBeCloseTo(1);                              // orientation-preserving
    const four = loopLinear([q, q, q, q]);
    four.forEach((v, i) => expect(v).toBeCloseTo(I3[i]));         // four laps = identity
    // two laps ≠ identity (a genuine 180° rotation, not trivial)
    expect(loopLinear([q, q])[0]).toBeCloseTo(-1);
  });
});

describe('homology — analyzeSolid reports the catalog H₁ (via Γᵃᵇ)', () => {
  const expected: Record<string, string> = {
    '3-torus': 'ℤ³', 'half-turn': 'ℤ ⊕ ℤ/2 ⊕ ℤ/2', 'quarter-turn': 'ℤ ⊕ ℤ/2', 'amphicosm': 'ℤ² ⊕ ℤ/2',
    'second-amphicosm': 'ℤ²', 'first-amphidicosm': 'ℤ ⊕ ℤ/2 ⊕ ℤ/2',
    'second-amphidicosm': 'ℤ ⊕ ℤ/4', 'didicosm': 'ℤ/4 ⊕ ℤ/4',
  };
  for (const w of SOLID_WORLDS) {
    it(`${w.id}: H₁ = curated catalog value (${w.h1})`, () => {
      const a = analyzeSolid(w);
      expect(a.h1).toBe(expected[w.id]);
      expect(a.h1).toBe(w.h1);          // computed agrees with the curated spec
    });
  }

  it('every world is a free flat manifold with χ = 0', () => {
    for (const w of SOLID_WORLDS) {
      expect(analyzeSolid(w).isManifold).toBe(true);
      expect(analyzeSolid(w).euler).toBe(0);
    }
  });
});

describe('homology — the gluing-agnostic cell engine (all catalog worlds)', () => {
  // since the 2026-06-20 screw fix the cube cell complex is valid on every catalog
  // world, including the two screw worlds (perpendicular screws keep the cube a
  // fundamental domain). H₁ here must match the curated/Γᵃᵇ value.
  const expectedH1: Record<string, string> = {
    '3-torus': 'ℤ³', 'half-turn': 'ℤ ⊕ ℤ/2 ⊕ ℤ/2', 'quarter-turn': 'ℤ ⊕ ℤ/2',
    'amphicosm': 'ℤ² ⊕ ℤ/2', 'second-amphicosm': 'ℤ²', 'first-amphidicosm': 'ℤ ⊕ ℤ/2 ⊕ ℤ/2',
    'second-amphidicosm': 'ℤ ⊕ ℤ/4', 'didicosm': 'ℤ/4 ⊕ ℤ/4',
  };

  it('every world: cell H₁ matches the catalog, χ = 0, and the vertex link is S²', () => {
    for (const w of SOLID_WORLDS) {
      const h = computeHomology(w);
      expect(h.h1).toBe(expectedH1[w.id]);
      expect(h.euler).toBe(0);            // a closed 3-manifold has χ = 0
      expect(h.manifold).toBe(true);      // every vertex link certifies as an S²
    }
  });

  it('H₁ is subdivision-invariant: a finer grid gives the same homology', () => {
    // a theorem — exercised here so a regression in the gluing/sign logic trips it.
    for (const w of SOLID_WORLDS) {
      const coarse = computeHomology(w, 2), fine = computeHomology(w, 4);
      expect(fine.h1).toBe(coarse.h1);
      expect(coarse.euler).toBe(0);
      expect(fine.euler).toBe(0);
    }
  });

  it('a full-lattice perpendicular offset is absorbed: it is still the 3-torus', () => {
    // exercises the screw code path + the orbit gluing; the +x face is shifted a
    // whole lattice step in y, which reduces away.
    const spec: SolidWorldSpec = {
      id: 't', label: '', short: '', blurb: '', manifold: '', h1: '',
      pairings: [{ axis: 'x', linear: I3, offset: [0, 1, 0] }, { axis: 'y', linear: I3 }, { axis: 'z', linear: I3 }],
    };
    const h = computeHomology(spec);
    expect(h.h1).toBe('ℤ³');
    expect(h.euler).toBe(0);
    expect(h.manifold).toBe(true);
  });

  it('the second amphidicosm: a perpendicular half-screw glues without leaving a boundary', () => {
    // the regression target. The screwed −y faces wrap a half-period in z; before
    // the fix four of them were left unglued (χ = 1, a spurious boundary). They
    // must now reach their true partners → a closed manifold, χ = 0.
    const h = computeHomology(worldById('second-amphidicosm'));
    expect(h.h1).toBe('ℤ ⊕ ℤ/4');
    expect(h.euler).toBe(0);
    expect(h.manifold).toBe(true);
  });

  it('a fractional axial offset is rejected (the cube is not a fundamental domain)', () => {
    // an offset *along* the pairing axis shrinks the net translation below one
    // cube edge, so the cube is a multi-fold cover and the cell counts are
    // meaningless. The engine must refuse rather than report a wrong χ.
    const spec: SolidWorldSpec = {
      id: 'bad', label: '', short: '', blurb: '', manifold: '', h1: '',
      pairings: [{ axis: 'x', linear: rot('x', 180), offset: [0.5, 0, 0] }, { axis: 'y', linear: I3 }, { axis: 'z', linear: I3 }],
    };
    expect(() => computeHomology(spec)).toThrow(/fundamental domain/);
  });
});

describe('solidSchema — matrix helpers', () => {
  it('rot is a proper rotation; reflect is an improper one', () => {
    expect(detM3(rot('z', 90))).toBeCloseTo(1);
    expect(detM3(reflect('y'))).toBeCloseTo(-1);
  });

  it('an orthogonal matrix times its transpose is the identity', () => {
    const m = rot('z', 90);
    mulM3(m, transposeM3(m)).forEach((v, i) => expect(v).toBeCloseTo(I3[i]));
  });
});
