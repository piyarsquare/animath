import * as THREE from 'three';

/**
 * The decorated fundamental square, shared identically by all four worlds. The
 * square carries a fixed set of numbered, coloured landmarks; each landmark has
 * TWO forms keyed by orientation class — a **column** and a **tree** of the same
 * identifying colour. One face of the square wears columns, the other wears
 * trees; crossing an orientation-reversing gluing swaps every landmark from one
 * form to the other. Both forms carry the same number+arrow decal, which is
 * chiral, so it additionally reads reversed through a mirrored copy — the
 * orientation cue the whole app is built around.
 *
 * Landmarks are authored in **unit-square (u,v) ∈ [0,1]²** coordinates so the one
 * layout drops onto every cover: the Euclidean cover scales (u,v) into its
 * L-square tile; the spherical cover charts (u,v) onto the planet.
 */

export interface DecorProp { u: number; v: number; color: number; label: string }

/** Seven landmarks spread across the unit square (kept off the exact centre/edges
 *  so they read clearly from a spawn near the middle). */
export const PROPS: DecorProp[] = [
  { u: 0.20, v: 0.27, color: 0xff5a5a, label: '1' },
  { u: 0.77, v: 0.20, color: 0x5ad1ff, label: '2' },
  { u: 0.30, v: 0.77, color: 0x8aff6a, label: '3' },
  { u: 0.83, v: 0.70, color: 0xffd24a, label: '4' },
  { u: 0.50, v: 0.50, color: 0xc08aff, label: '5' },
  { u: 0.10, v: 0.57, color: 0xff9a3d, label: '6' },
  { u: 0.63, v: 0.90, color: 0xff6ad5, label: '7' },
];

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

/** Shared geometry + materials for the landmarks, built once and reused across
 *  every rendered copy of the square (meshes are still per-copy; the heavy
 *  buffers/textures are not). */
export interface FundamentalSquareDecor {
  readonly props: readonly DecorProp[];
  /** Build one landmark in column form (face that wears columns). */
  makeColumn(i: number): THREE.Group;
  /** Build one landmark in tree form (face that wears trees). */
  makeTree(i: number): THREE.Group;
  dispose(): void;
}

export function makeFundamentalSquareDecor(): FundamentalSquareDecor {
  const columnGeo = new THREE.CylinderGeometry(0.8, 0.8, 3.2, 18);
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.4, 2.0, 12);
  const foliageGeo = new THREE.ConeGeometry(1.35, 3.0, 14);
  const decalGeo = new THREE.PlaneGeometry(1.5, 1.5);

  const columnMats: THREE.MeshStandardMaterial[] = [];
  const foliageMats: THREE.MeshStandardMaterial[] = [];
  const decalMats: THREE.MeshBasicMaterial[] = [];
  const decalTexs: THREE.CanvasTexture[] = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.85 });

  for (const p of PROPS) {
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

  const decal = (i: number) => {
    const d = new THREE.Mesh(decalGeo, decalMats[i]);
    d.position.set(0.82, 1.9, 0);
    d.rotation.y = Math.PI / 2; // face +x
    return d;
  };

  const makeColumn = (i: number): THREE.Group => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(columnGeo, columnMats[i]);
    body.position.y = 1.6;
    g.add(body, decal(i));
    return g;
  };

  const makeTree = (i: number): THREE.Group => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.0;
    const foliage = new THREE.Mesh(foliageGeo, foliageMats[i]);
    foliage.position.y = 3.2;
    g.add(trunk, foliage, decal(i));
    return g;
  };

  return {
    props: PROPS,
    makeColumn,
    makeTree,
    dispose: () => {
      columnGeo.dispose(); trunkGeo.dispose(); foliageGeo.dispose(); decalGeo.dispose();
      trunkMat.dispose();
      columnMats.forEach((m) => m.dispose());
      foliageMats.forEach((m) => m.dispose());
      decalMats.forEach((m) => m.dispose());
      decalTexs.forEach((t) => t.dispose());
    },
  };
}
