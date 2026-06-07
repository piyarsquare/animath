import * as THREE from 'three';

/**
 * The decorated fundamental square, shared identically by all four worlds. The
 * square carries a set of numbered, coloured landmarks; each landmark has TWO
 * forms keyed by orientation class — a **column** and a **tree** of the same
 * identifying colour and number, at the same (u,v). One face of the square wears
 * columns, the other wears trees, so there is a **tree opposite every column**;
 * crossing an orientation-reversing gluing swaps every landmark from one form to
 * the other. Both forms carry the same number+arrow decal (visible on each), and
 * the decal is chiral, so it reads reversed through a mirrored copy — the
 * orientation cue the whole app is built around.
 *
 * Landmarks are authored in **unit-square (u,v) ∈ [0,1]²** coordinates so the one
 * layout drops onto every cover, and their count + arrangement are user-driven
 * (see {@link generateProps}).
 */

export interface DecorProp { u: number; v: number; color: number; label: string }

export type ArrangementId = 'scattered' | 'grid' | 'ring';

export const ARRANGEMENTS: { id: ArrangementId; label: string }[] = [
  { id: 'scattered', label: 'Scattered' },
  { id: 'grid', label: 'Grid' },
  { id: 'ring', label: 'Ring' },
];

/** Low-discrepancy sequence for an even "random-looking" scatter. */
function halton(i: number, base: number): number {
  let r = 0, f = 1;
  while (i > 0) { f /= base; r += f * (i % base); i = Math.floor(i / base); }
  return r;
}

/** Generate `count` landmarks laid out by `arrangement`, each with a distinct hue
 *  and a number label 1..count. Deterministic, so the layout is stable. */
export function generateProps(count: number, arrangement: ArrangementId): DecorProp[] {
  const props: DecorProp[] = [];
  const m = 0.13, span = 1 - 2 * m;       // keep off the very edges
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  for (let i = 0; i < count; i++) {
    let u: number, v: number;
    if (arrangement === 'grid') {
      u = m + span * ((i % cols) + 0.5) / cols;
      v = m + span * (Math.floor(i / cols) + 0.5) / rows;
    } else if (arrangement === 'ring') {
      const a = (i / count) * Math.PI * 2;
      u = 0.5 + 0.34 * Math.cos(a);
      v = 0.5 + 0.34 * Math.sin(a);
    } else { // scattered
      u = m + span * halton(i + 1, 2);
      v = m + span * halton(i + 1, 3);
    }
    const color = new THREE.Color().setHSL((i * 0.61803398875) % 1, 0.62, 0.58).getHex();
    props.push({ u, v, color, label: String(i + 1) });
  }
  return props;
}

/** A reasonable default set (7 scattered landmarks). */
export const DEFAULT_PROPS = generateProps(7, 'scattered');

/** Number + arrow on a transparent tile; both reverse under a mirror. */
function labelTexture(label: string, color: number): THREE.CanvasTexture {
  const s = 128;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 6;
  ctx.font = `bold ${Math.round(s * 0.5)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeText(label, s * 0.36, s * 0.5);
  ctx.fillText(label, s * 0.36, s * 0.5);
  ctx.beginPath();
  ctx.moveTo(s * 0.6, s * 0.34); ctx.lineTo(s * 0.84, s * 0.5); ctx.lineTo(s * 0.6, s * 0.66);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export interface FundamentalSquareDecor {
  readonly props: readonly DecorProp[];
  makeColumn(i: number): THREE.Group;
  makeTree(i: number): THREE.Group;
  dispose(): void;
}

export function makeFundamentalSquareDecor(props: readonly DecorProp[]): FundamentalSquareDecor {
  const columnGeo = new THREE.CylinderGeometry(0.8, 0.8, 3.2, 18);
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.4, 2.0, 12);
  const foliageGeo = new THREE.ConeGeometry(1.35, 3.0, 14);
  const decalGeo = new THREE.PlaneGeometry(1.5, 1.5);
  const trunkDecalGeo = new THREE.PlaneGeometry(1.0, 1.0);

  const columnMats: THREE.MeshStandardMaterial[] = [];
  const foliageMats: THREE.MeshStandardMaterial[] = [];
  const decalMats: THREE.MeshBasicMaterial[] = [];
  const decalTexs: THREE.CanvasTexture[] = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.85 });

  for (const p of props) {
    columnMats.push(new THREE.MeshStandardMaterial({
      color: p.color, emissive: p.color, emissiveIntensity: 0.3, roughness: 0.5, side: THREE.DoubleSide,
    }));
    const leaf = new THREE.Color(p.color).lerp(new THREE.Color(0x3a8a3a), 0.55);
    foliageMats.push(new THREE.MeshStandardMaterial({
      color: leaf, emissive: leaf, emissiveIntensity: 0.18, roughness: 0.7,
    }));
    const tex = labelTexture(p.label, p.color);
    decalTexs.push(tex);
    decalMats.push(new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  }

  /** A number decal facing +x at (x,y), sized for the body it sits on. */
  const decal = (i: number, geo: THREE.PlaneGeometry, x: number, y: number) => {
    const d = new THREE.Mesh(geo, decalMats[i]);
    d.position.set(x, y, 0);
    d.rotation.y = Math.PI / 2; // face +x
    return d;
  };

  const makeColumn = (i: number): THREE.Group => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(columnGeo, columnMats[i]);
    body.position.y = 1.6;
    g.add(body, decal(i, decalGeo, 0.82, 1.9));
    return g;
  };

  const makeTree = (i: number): THREE.Group => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.0;
    const foliage = new THREE.Mesh(foliageGeo, foliageMats[i]);
    foliage.position.y = 3.2;
    // The number sits on the TRUNK (below the foliage cone at y≈1.7), so it is
    // visible — placing it up among the foliage would bury it inside the cone.
    g.add(trunk, foliage, decal(i, trunkDecalGeo, 0.46, 0.95));
    return g;
  };

  return {
    props,
    makeColumn,
    makeTree,
    dispose: () => {
      columnGeo.dispose(); trunkGeo.dispose(); foliageGeo.dispose(); decalGeo.dispose(); trunkDecalGeo.dispose();
      trunkMat.dispose();
      columnMats.forEach((m) => m.dispose());
      foliageMats.forEach((m) => m.dispose());
      decalMats.forEach((m) => m.dispose());
      decalTexs.forEach((t) => t.dispose());
    },
  };
}
