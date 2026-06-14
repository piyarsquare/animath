import * as THREE from 'three';
import { SquareMapState } from '../engineTypes';
import { cornerColor } from '../decor';
import { sq2hemi } from '../squareMap';

/**
 * The extrinsic side of Polygon Worlds: every world's abstract surface, *immersed*
 * in ordinary ℝ³. The intrinsic world (what you walk in the main view) is a
 * genuinely round / flat / hyperbolic surface; this registry gives, per world, one
 * way that same surface can be pushed into 3-space — the donut you'd picture for a
 * torus, the figure-8 bottle for the Klein, the Steiner Roman surface for ℝP², a
 * double torus for genus-2.
 *
 * Each {@link ImmersionDescriptor} provides a procedural mesh, a chart→surface map
 * `at(u,v)`, a live character `marker`, and a set of fixed **reference markers**
 * (`refs`) — the domain-center *pole* and the four identified corners, colored to
 * match the mini-map — so the inset reads as a map you can orient on, not just a
 * spinning shape. The spherical worlds ride the player's true direction; the flat
 * and hyperbolic worlds ride the fundamental-domain chart `(u,v)` (exact for the
 * flat tori/bottles, an honest approximation on the hyperbolic disk).
 */

export interface RefMarker { u: number; v: number; color: number; pole?: boolean }

export interface ImmersionDescriptor {
  caption: string;
  camDist: number;
  build(): THREE.Object3D;
  /** Chart (u,v) ∈ [0,1]² → a point on the immersion (mesh-local coords). */
  at(u: number, v: number, out: THREE.Vector3): THREE.Vector3;
  /** Live character position; spherical worlds prefer the true `dir`. null ⇒ hide. */
  marker(st: SquareMapState | null, dir: THREE.Vector3 | null): THREE.Vector3 | null;
  /** Fixed reference dots (pole at the domain center + identified corners). */
  refs: RefMarker[];
}

/* ── parametric mesh helper ──────────────────────────────────────────────────── */

type ParamFn = (u: number, v: number, out: THREE.Vector3) => void;

/** Build a closed parametric surface over (u,v) ∈ [0,1]², colored by a hue that
 *  reads the second parameter so folds/tubes stay legible on a dark inset. */
function paramMesh(fn: ParamFn, nu: number, nv: number, hueShift = 0): THREE.Mesh {
  const geo = new THREE.BufferGeometry();
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const p = new THREE.Vector3(), c = new THREE.Color();
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      fn(i / nu, j / nv, p);
      pos.push(p.x, p.y, p.z);
      c.setHSL((j / nv + hueShift) % 1, 0.5, 0.56);
      col.push(c.r, c.g, c.b);
    }
  }
  const row = nu + 1;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * row + i, b = a + 1, cc = a + row, dd = cc + 1;
    idx.push(a, cc, b, b, cc, dd);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, surfaceMat());
}

function surfaceMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.32, metalness: 0.16,
    transparent: true, opacity: 0.94, side: THREE.DoubleSide,
    emissive: 0x0c1424, emissiveIntensity: 0.45, envMapIntensity: 0.9,
  });
}

/* ── immersion parametrizations (coords pre-scaled to ~[−1.5, 1.5]) ───────────── */

const TAU = Math.PI * 2;

/** Torus of revolution — the donut every flat torus is secretly shaped like. */
function torusParam(u: number, v: number, out: THREE.Vector3): void {
  const R = 0.95, r = 0.42;
  const t = u * TAU, p = v * TAU, ring = R + r * Math.cos(p);
  out.set(ring * Math.cos(t), r * Math.sin(p), ring * Math.sin(t));
}

/** Figure-8 (Lawson) immersion of the Klein bottle: a tube whose figure-8 cross
 *  section makes a half-twist around the ring, so the inside meets the outside. */
function kleinParam(u: number, v: number, out: THREE.Vector3): void {
  const R = 0.95, a = 0.52;
  const t = u * TAU, p = v * TAU;
  const c = Math.cos(t / 2), s = Math.sin(t / 2);
  const sp = Math.sin(p), s2p = Math.sin(2 * p);
  const rr = a * (c * sp - s * s2p);
  const ring = R + rr;
  out.set(ring * Math.cos(t), a * (s * sp + c * s2p), ring * Math.sin(t));
}

/** Round sphere direction for chart (u,v). */
function sphereDir(u: number, v: number, out: THREE.Vector3): THREE.Vector3 {
  const lon = (u - 0.5) * TAU, lat = (v - 0.5) * Math.PI, cl = Math.cos(lat);
  return out.set(cl * Math.cos(lon), Math.sin(lat), cl * Math.sin(lon));
}

/** The Steiner Roman surface — image of S² → ℝ³, (a,b,c) ↦ (ab, bc, ca). */
const ROMAN_SCALE = 3.0;
function roman(d: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  return out.set(d.x * d.y, d.y * d.z, d.z * d.x).multiplyScalar(ROMAN_SCALE);
}
function romanMesh(): THREE.Mesh {
  const LON = 64, LAT = 48;
  return paramMesh((u, v, out) => {
    const lat = v * Math.PI - Math.PI / 2, cl = Math.cos(lat), lon = u * TAU;
    roman(new THREE.Vector3(cl * Math.cos(lon), Math.sin(lat), cl * Math.sin(lon)), out);
  }, LON, LAT);
}

/** Double torus (genus-2): two tori fused along the x-axis (left lobe + right). */
const G2_R = 0.6, G2_r = 0.27, G2_CX = 0.62;
function doubleTorusMesh(): THREE.Object3D {
  const sub = (cx: number, hue: number) => paramMesh((u, v, out) => {
    const t = u * TAU, p = v * TAU, ring = G2_R + G2_r * Math.cos(p);
    out.set(cx + ring * Math.cos(t), G2_r * Math.sin(p), ring * Math.sin(t));
  }, 48, 24, hue);
  const g = new THREE.Group();
  g.add(sub(-G2_CX, 0), sub(G2_CX, 0.45));
  return g;
}
/** Approximate genus-2 location from the hyperbolic disk chart: the disk angle
 *  rides the ring of the nearer lobe, the radius the tube — enough to *show where
 *  you are* on the double torus as you walk (the disk has no exact global map). */
function genus2At(u: number, v: number, out: THREE.Vector3): THREE.Vector3 {
  const dx = (u - 0.5) * 2, dy = (v - 0.5) * 2;
  const left = dx <= 0, cx = left ? -G2_CX : G2_CX;
  const a = Math.atan2(dy, left ? -dx : dx);
  const tube = Math.min(1, Math.hypot(dx, dy) * 1.7) * Math.PI;
  const ring = G2_R + G2_r * Math.cos(tube);
  return out.set(cx + ring * Math.cos(a), G2_r * Math.sin(tube), ring * Math.sin(a));
}

/** Representative immersion for the Dyck surface (N₃): the Klein figure-8, scaled. */
function dyckAt(u: number, v: number, out: THREE.Vector3): THREE.Vector3 {
  kleinParam(u, v, out); return out.multiplyScalar(1.05);
}
function dyckMesh(): THREE.Mesh {
  return paramMesh((u, v, out) => dyckAt(u, v, out), 96, 36, 0.3);
}

/* ── per-world registry ──────────────────────────────────────────────────────── */

/** Standard reference set: the domain-center "pole" (amber) + the four identified
 *  corners (mini-map hues), so the inset orients like the square mini-map. */
const STD_REFS: RefMarker[] = [
  { u: 0.5, v: 0.5, color: 0xffd24a, pole: true },
  { u: 0, v: 0, color: cornerColor(0, 4) },
  { u: 1, v: 0, color: cornerColor(1, 4) },
  { u: 1, v: 1, color: cornerColor(2, 4) },
  { u: 0, v: 1, color: cornerColor(3, 4) },
];

/** Flat/hyperbolic descriptor whose live marker rides the chart through `at`. */
function chartImmersion(
  caption: string, camDist: number, build: () => THREE.Object3D,
  at: (u: number, v: number, out: THREE.Vector3) => THREE.Vector3,
): ImmersionDescriptor {
  return {
    caption, camDist, build, at,
    marker: (st) => (st ? at(st.u, st.v, new THREE.Vector3()) : null),
    refs: STD_REFS,
  };
}

const DESCRIPTORS: Record<string, ImmersionDescriptor> = {
  sphere: {
    caption: 'Round sphere · same walk', camDist: 4.4,
    build: () => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1.3, 48, 32), surfaceMat());
      const g = m.geometry, n = g.attributes.position.count, col: number[] = [];
      const c = new THREE.Color(), p = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        p.fromBufferAttribute(g.attributes.position, i).normalize();
        c.setHSL((Math.atan2(p.z, p.x) / TAU + 0.5) % 1, 0.5, 0.5 + 0.12 * p.y);
        col.push(c.r, c.g, c.b);
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      return m;
    },
    at: (u, v, out) => sphereDir(u, v, out).multiplyScalar(1.3),
    marker: (_st, dir) => (dir ? dir.clone().multiplyScalar(1.3) : null),
    refs: STD_REFS,
  },
  rp2: {
    caption: 'Roman surface · same walk', camDist: 5.2,
    build: romanMesh,
    at: (u, v, out) => roman(sq2hemi((u - 0.5) * 2, (v - 0.5) * 2), out),
    marker: (_st, dir) => (dir ? roman(dir, new THREE.Vector3()) : null),
    refs: STD_REFS,
  },
  torus: chartImmersion('Torus of revolution · same walk', 4.6, () => paramMesh(torusParam, 64, 32), (u, v, o) => { torusParam(u, v, o); return o; }),
  klein: chartImmersion('Klein bottle (figure-8) · same walk', 4.8, () => paramMesh(kleinParam, 96, 36), (u, v, o) => { kleinParam(u, v, o); return o; }),
  torus6: chartImmersion('Torus of revolution · same walk', 4.6, () => paramMesh(torusParam, 64, 32), (u, v, o) => { torusParam(u, v, o); return o; }),
  klein6: chartImmersion('Klein bottle (figure-8) · same walk', 4.8, () => paramMesh(kleinParam, 96, 36), (u, v, o) => { kleinParam(u, v, o); return o; }),
  genus2: chartImmersion('Double torus · same walk', 4.6, doubleTorusMesh, genus2At),
  crosscap3: chartImmersion('Dyck surface · schematic', 5.0, dyckMesh, dyckAt),
};

export function immersionFor(worldId: string): ImmersionDescriptor | null {
  return DESCRIPTORS[worldId] ?? null;
}
