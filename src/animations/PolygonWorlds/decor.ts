import * as THREE from 'three';

/**
 * The decorated fundamental polygon, shared identically by all worlds. It carries a
 * set of numbered, coloured **landmarks**; each landmark has a fixed coordinate
 * (u, v) ∈ [0,1]² in the domain and TWO forms keyed by which face of the sheet it
 * is on — a **tree** on the top (blue) face and a **column** on the bottom (brown)
 * face, at the *same* (u, v). They grow *away* from the sheet (tree up, column
 * down), so they sit exactly back-to-back and neither penetrates the surface. A
 * non-orientable gluing flips the whole sheet, which swaps every landmark tree ↔
 * column; the chiral number+arrow decal then reads reversed through the flip — the
 * orientation cue the app is built around.
 *
 * Landmarks come in two kinds:
 *   • **interior** — scattered/grid/ring inside the domain (user count + layout),
 *     kept *off the edges* (a landmark sitting on a gluing edge would be split half
 *     tree / half column across the identification, which reads as a confused
 *     object — so we keep them clear of the boundary),
 *   • **center**  — one distinctive beacon at (0.5, 0.5), drawn differently on the
 *     two faces (gold spire up vs magenta spire down) so top and bottom are
 *     immediately distinguishable.
 *
 * Everything is authored in unit-square (u, v) so the one layout drops onto every
 * cover (plane cell, sphere chart, hyperbolic tile).
 */

export type PropKind = 'interior' | 'center';

export interface DecorProp { u: number; v: number; color: number; label: string; kind: PropKind }

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

const hue = (i: number) => new THREE.Color().setHSL((i * 0.61803398875) % 1, 0.62, 0.58).getHex();

/** Generate the landmark set: one centre beacon, then `count` interior markers laid
 *  out by `arrangement`, all kept off the domain edges. Deterministic + stable. */
export function generateProps(count: number, arrangement: ArrangementId): DecorProp[] {
  const props: DecorProp[] = [];
  // centre beacon (special; its colour is set per-face by the builder)
  props.push({ u: 0.5, v: 0.5, color: 0xffd24a, label: '★', kind: 'center' });

  // interior markers — spread through the domain but held clear of the edges
  const m = 0.12, span = 1 - 2 * m;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  for (let i = 0; i < count; i++) {
    let u: number, v: number;
    if (arrangement === 'grid') {
      u = m + span * ((i % cols) + 0.5) / cols;
      v = m + span * (Math.floor(i / cols) + 0.5) / rows;
    } else if (arrangement === 'ring') {
      const a = (i / count) * Math.PI * 2;
      u = 0.5 + 0.32 * Math.cos(a);
      v = 0.5 + 0.32 * Math.sin(a);
    } else {
      u = m + span * halton(i + 1, 2);
      v = m + span * halton(i + 1, 3);
    }
    props.push({ u, v, color: hue(i + 1), label: String(i + 1), kind: 'interior' });
  }
  return props;
}

/** A reasonable default set (7 interior + centre). */
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
  ctx.font = `bold ${Math.round(s * 0.46)}px sans-serif`;
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
  /** Top-face form of landmark i (a tree, or the gold centre spire). Grows +y from
   *  its base at the origin, so the caller plants the base on the face. */
  makeTop(i: number): THREE.Group;
  /** Bottom-face form of landmark i (a column, or the magenta centre spire). Also
   *  grows +y from its base; the caller mirrors it onto the underside. */
  makeBottom(i: number): THREE.Group;
  dispose(): void;
}

export function makeFundamentalSquareDecor(props: readonly DecorProp[]): FundamentalSquareDecor {
  const columnGeo = new THREE.CylinderGeometry(0.8, 0.8, 3.2, 18);
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.4, 2.0, 12);
  const foliageGeo = new THREE.ConeGeometry(1.35, 3.0, 14);
  const decalGeo = new THREE.PlaneGeometry(1.5, 1.5);
  const trunkDecalGeo = new THREE.PlaneGeometry(1.0, 1.0);
  // centre beacon geometry (a tall tapered spire + finial), distinct from markers
  const spireGeo = new THREE.ConeGeometry(0.55, 5.0, 6);
  const orbGeo = new THREE.SphereGeometry(0.55, 16, 12);
  const cubeGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);

  const columnMats: THREE.MeshStandardMaterial[] = [];
  const foliageMats: THREE.MeshStandardMaterial[] = [];
  const decalMats: THREE.MeshBasicMaterial[] = [];
  const decalTexs: THREE.CanvasTexture[] = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.85, side: THREE.DoubleSide });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffcf4a, emissive: 0x6a4e00, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide });
  const magentaMat = new THREE.MeshStandardMaterial({ color: 0xff5ad0, emissive: 0x55003f, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide });

  for (const p of props) {
    columnMats.push(new THREE.MeshStandardMaterial({
      color: p.color, emissive: p.color, emissiveIntensity: 0.3, roughness: 0.5, side: THREE.DoubleSide,
    }));
    const leaf = new THREE.Color(p.color).lerp(new THREE.Color(0x3a8a3a), 0.55);
    foliageMats.push(new THREE.MeshStandardMaterial({
      color: leaf, emissive: leaf, emissiveIntensity: 0.18, roughness: 0.7, side: THREE.DoubleSide,
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

  const makeTree = (i: number): THREE.Group => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.0;
    const foliage = new THREE.Mesh(foliageGeo, foliageMats[i]);
    foliage.position.y = 3.2;
    g.add(trunk, foliage, decal(i, trunkDecalGeo, 0.46, 0.95));
    return g;
  };

  const makeColumn = (i: number): THREE.Group => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(columnGeo, columnMats[i]);
    body.position.y = 1.6;
    g.add(body, decal(i, decalGeo, 0.82, 1.9));
    return g;
  };

  /** The centre beacon — gold spire + orb (top) vs magenta spire + cube (bottom). */
  const makeCenter = (mat: THREE.MeshStandardMaterial, finial: 'orb' | 'cube'): THREE.Group => {
    const g = new THREE.Group();
    const spire = new THREE.Mesh(spireGeo, mat); spire.position.y = 2.5;
    const cap = new THREE.Mesh(finial === 'orb' ? orbGeo : cubeGeo, mat); cap.position.y = 5.2;
    g.add(spire, cap);
    return g;
  };

  const makeTop = (i: number): THREE.Group =>
    props[i].kind === 'center' ? makeCenter(goldMat, 'orb') : makeTree(i);
  const makeBottom = (i: number): THREE.Group =>
    props[i].kind === 'center' ? makeCenter(magentaMat, 'cube') : makeColumn(i);

  return {
    props,
    makeTop,
    makeBottom,
    dispose: () => {
      columnGeo.dispose(); trunkGeo.dispose(); foliageGeo.dispose(); decalGeo.dispose(); trunkDecalGeo.dispose();
      spireGeo.dispose(); orbGeo.dispose(); cubeGeo.dispose();
      trunkMat.dispose(); goldMat.dispose(); magentaMat.dispose();
      columnMats.forEach((m) => m.dispose());
      foliageMats.forEach((m) => m.dispose());
      decalMats.forEach((m) => m.dispose());
      decalTexs.forEach((t) => t.dispose());
    },
  };
}
