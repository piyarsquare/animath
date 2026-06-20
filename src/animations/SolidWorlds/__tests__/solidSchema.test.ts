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

// the four original worlds are screw-free, where the cube cell complex is valid.
const SCREW_FREE = ['3-torus', 'half-turn', 'quarter-turn', 'amphicosm'];

describe('homology — the gluing-agnostic cell engine (screw-free worlds)', () => {
  it('H₁ is subdivision-invariant: N=1 reproduces the old fixed-CW values exactly', () => {
    const expected: Record<string, string> = {
      '3-torus': 'ℤ³', 'half-turn': 'ℤ ⊕ ℤ/2 ⊕ ℤ/2',
      'quarter-turn': 'ℤ ⊕ ℤ/2', 'amphicosm': 'ℤ² ⊕ ℤ/2',
    };
    for (const w of SOLID_WORLDS.filter((s) => SCREW_FREE.includes(s.id))) {
      const a = computeHomology(w, 1), b = computeHomology(w, 2);
      expect(a.h1).toBe(expected[w.id]);
      expect(b.h1).toBe(a.h1);            // subdivision invariance is a theorem
      expect(a.euler).toBe(0);
      expect(b.euler).toBe(0);
    }
  });

  it('every screw-free world certifies as a manifold (all vertex links are S²)', () => {
    for (const w of SOLID_WORLDS.filter((s) => SCREW_FREE.includes(s.id))) expect(analyzeSolid(w).isManifold).toBe(true);
  });

  it('a full-lattice perpendicular offset is absorbed: it is still the 3-torus', () => {
    // exercises the screw code path + the breadth-first gluing reduction; the
    // +x face is shifted a whole lattice step in y, which reduces away.
    const spec: SolidWorldSpec = {
      id: 't', label: '', short: '', blurb: '', manifold: '', h1: '',
      pairings: [{ axis: 'x', linear: I3, offset: [0, 1, 0] }, { axis: 'y', linear: I3 }, { axis: 'z', linear: I3 }],
    };
    const h = computeHomology(spec);
    expect(h.h1).toBe('ℤ³');
    expect(h.euler).toBe(0);
    expect(h.manifold).toBe(true);
  });

  it('a half-edge screw is computed correctly and told apart from a manifold', () => {
    // Three coordinate half-turns made into half-edge perpendicular screws give
    // the Hantzsche–Wendt *homology* H₁ = (ℤ/4)² — a nontrivial result that only
    // comes out right if the staggered half-offset faces are identified
    // correctly (and that would hang the old Smith-normal-form routine). But the
    // action is NOT fixed-point-free in this opposite-face cube model, so the
    // quotient is a pseudomanifold, not the genuine HW manifold: the vertex-link
    // certificate correctly rejects it. (The free HW needs half-edge *axial*
    // screws — gluings that aren't opposite-face — i.e. a schema extension.)
    const off = { x: [-0.5, -0.5, 0], y: [0, -0.5, 0.5], z: [-0.5, 0, -0.5] } as const;
    const half = (a: 'x' | 'y' | 'z') => rot(a, 180);
    const spec: SolidWorldSpec = {
      id: 'hw-pseudo', label: '', short: '', blurb: '', manifold: '', h1: '',
      pairings: (['x', 'y', 'z'] as const).map((a) => ({ axis: a, linear: half(a), offset: off[a] as [number, number, number] })),
    };
    const h = computeHomology(spec);
    expect(h.h1).toBe('ℤ/4 ⊕ ℤ/4');   // the HW homology fingerprint
    expect(h.euler).toBe(0);
    expect(h.manifold).toBe(false);    // pseudomanifold: a vertex link is not S²
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
