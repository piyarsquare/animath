import * as THREE from 'three';
import { SquareMapState } from '../engineTypes';

/**
 * The extrinsic side of Polygon Worlds: every world's abstract surface, *immersed*
 * in ordinary ℝ³. The intrinsic world (what you walk in the main view) is a
 * genuinely round / flat / hyperbolic surface; this registry gives, per world, one
 * way that same surface can be pushed into 3-space — the donut you'd picture for a
 * torus, the figure-8 bottle for the Klein, the Steiner Roman surface for ℝP².
 *
 * Each {@link ImmersionDescriptor} provides a procedural mesh (no asset import) and
 * a marker map, so the player's bead can ride the immersed shape at the same point
 * they occupy intrinsically. The map is driven by whichever signal that world
 * charts cleanly:
 *  - **spherical** worlds (sphere, ℝP²) ride the player's unit **direction** `dir`
 *    (pose up), so the bead tracks the whole sphere — antipodal directions land on
 *    the *same* Roman point, which is exactly why that map factors through ℝP²;
 *  - **flat** worlds (torus, Klein, and their hexagonal cousins) ride the chart
 *    `(u, v)` of the fundamental domain → the immersion's two angles;
 *  - **hyperbolic** worlds (genus-2, Dyck) get a recognizable representative mesh
 *    with no faithful live marker (their disk chart has no clean global immersion).
 */

export interface ImmersionDescriptor {
  /** Bottom caption naming the immersion. */
  caption: string;
  /** Camera distance for the inset's own little orbit camera. */
  camDist: number;
  /** Build the immersed surface (vertex-colored, double-sided); a Group for the
   *  multi-piece worlds. */
  build(): THREE.Object3D;
  /** Marker position on the immersion for the current player state, in the mesh's
   *  own coordinates; `null` ⇒ this world shows no live bead (spins only). */
  marker(st: SquareMapState | null, dir: THREE.Vector3 | null): THREE.Vector3 | null;
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
    vertexColors: true, roughness: 0.45, metalness: 0.05,
    transparent: true, opacity: 0.92, side: THREE.DoubleSide,
    emissive: 0x101820, emissiveIntensity: 0.5,
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
 *  section makes a half-twist around the ring, so the inside meets the outside —
 *  the famous one-sided bottle, here without an extra self-intersecting neck. */
function kleinParam(u: number, v: number, out: THREE.Vector3): void {
  const R = 0.95, a = 0.52;
  const t = u * TAU, p = v * TAU;
  const c = Math.cos(t / 2), s = Math.sin(t / 2);
  const sp = Math.sin(p), s2p = Math.sin(2 * p);
  const rr = a * (c * sp - s * s2p);
  const ring = R + rr;
  out.set(ring * Math.cos(t), a * (s * sp + c * s2p), ring * Math.sin(t));
}

/** The Steiner Roman surface — the image of S² → ℝ³, (a,b,c) ↦ (ab, bc, ca). The
 *  quadratic identifies ±(a,b,c), so it immerses ℝP². */
const ROMAN_SCALE = 3.0;
function roman(d: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  return out.set(d.x * d.y, d.y * d.z, d.z * d.x).multiplyScalar(ROMAN_SCALE);
}
function romanMesh(): THREE.Mesh {
  const LON = 64, LAT = 48;
  const fn: ParamFn = (u, v, out) => {
    const lat = v * Math.PI - Math.PI / 2, cl = Math.cos(lat);
    const lon = u * TAU;
    roman(new THREE.Vector3(cl * Math.cos(lon), Math.sin(lat), cl * Math.sin(lon)), out);
  };
  return paramMesh(fn, LON, LAT);
}

/** A double torus (genus-2): two tori fused along the x-axis. Recognizable, and the
 *  correct topology — the orientable χ=−2 surface the octagon glues to. */
function doubleTorusMesh(): THREE.Object3D {
  const sub = (cx: number, hue: number) => paramMesh((u, v, out) => {
    const R = 0.6, r = 0.27;
    const t = u * TAU, p = v * TAU, ring = R + r * Math.cos(p);
    out.set(cx + ring * Math.cos(t), r * Math.sin(p), ring * Math.sin(t));
  }, 48, 24, hue);
  const g = new THREE.Group();
  g.add(sub(-0.62, 0), sub(0.62, 0.45));
  return g;
}

/** A representative immersion for the Dyck surface (N₃, three cross-caps): a Klein
 *  bottle carrying an extra handle is hard to draw cleanly, so we show the Klein
 *  figure-8 at larger scale as the non-orientable stand-in (captioned schematic). */
function dyckMesh(): THREE.Mesh {
  return paramMesh((u, v, out) => { kleinParam(u, v, out); out.multiplyScalar(1.05); }, 96, 36, 0.3);
}

/* ── per-world registry ──────────────────────────────────────────────────────── */

/** Live bead from the flat chart (u,v) through a square-world immersion. */
function flatMarker(param: ParamFn): ImmersionDescriptor['marker'] {
  return (st) => {
    if (!st) return null;
    const out = new THREE.Vector3();
    param(st.u, st.v, out);
    return out;
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
    marker: (_st, dir) => (dir ? dir.clone().multiplyScalar(1.3) : null),
  },
  rp2: {
    caption: 'Roman surface · same walk', camDist: 5.2,
    build: romanMesh,
    marker: (_st, dir) => (dir ? roman(dir, new THREE.Vector3()) : null),
  },
  torus: {
    caption: 'Torus of revolution · same walk', camDist: 4.6,
    build: () => paramMesh(torusParam, 64, 32),
    marker: flatMarker(torusParam),
  },
  klein: {
    caption: 'Klein bottle (figure-8) · same walk', camDist: 4.8,
    build: () => paramMesh(kleinParam, 96, 36),
    marker: flatMarker(kleinParam),
  },
  torus6: {
    caption: 'Torus of revolution · same walk', camDist: 4.6,
    build: () => paramMesh(torusParam, 64, 32),
    marker: flatMarker(torusParam),
  },
  klein6: {
    caption: 'Klein bottle (figure-8) · same walk', camDist: 4.8,
    build: () => paramMesh(kleinParam, 96, 36),
    marker: flatMarker(kleinParam),
  },
  genus2: {
    caption: 'Double torus · extrinsic shape', camDist: 4.6,
    build: doubleTorusMesh,
    marker: () => null,
  },
  crosscap3: {
    caption: 'Non-orientable · schematic', camDist: 5.0,
    build: dyckMesh,
    marker: () => null,
  },
};

export function immersionFor(worldId: string): ImmersionDescriptor | null {
  return DESCRIPTORS[worldId] ?? null;
}
