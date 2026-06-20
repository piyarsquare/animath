import * as THREE from 'three';
import type { SolidWorldSpec } from '../solidSchema';

/**
 * Solid Worlds — the **Rooms** decorator: real, solid architecture instead of
 * flat signs.
 *
 * Thick walls (box slabs, never planes) carry doorways cut as genuine 3D
 * openings, and a spiral staircase threads the vertical gluing. Everything is
 * built once in the fundamental cube and instanced across the deck-translates,
 * which is what makes it *topological* architecture:
 *
 * - The walls sit at **interior** fractional offsets (not on the cube faces), so
 *   when they tile, the rooms they bound **straddle the seams** — the room you
 *   stand in is assembled from pieces of several fundamental domains, and its far
 *   wall lives in the next copy of the world.
 * - The spiral stair completes exactly **one turn over the cube height**, so it
 *   joins continuously through the vertical (y) pairing. Because the cover
 *   applies each world's holonomy to the *same* helix, the staircase's
 *   **chirality flips** in a mirror world and **rotates** in a turn world — the
 *   handedness difference shows up in the architecture itself, no readout needed.
 *
 * World-agnostic by design: one layout, re-expressed by every world's gluing.
 * Walls have no collision (consistent with the rest of the app) — you walk
 * through doorways on foot and fly the shaft.
 */

export interface DecorBuildContext {
  spec: SolidWorldSpec;
  size: number;
  U: number;
  h: number;
  mesh: (geo: THREE.BufferGeometry, mat: THREE.Material, matrix: THREE.Matrix4, floor?: boolean) => void;
  std: (color: number) => THREE.MeshStandardMaterial;
  localM: (x: number, y: number, z: number, rx?: number, ry?: number, rz?: number) => THREE.Matrix4;
  addDisposable: (d: { dispose: () => void }) => void;
}

interface GeoItem { geo: THREE.BufferGeometry; m: THREE.Matrix4; }

/** Bake each item's matrix into its geometry and merge into one indexed
 *  BufferGeometry (position/normal/uv). Inputs are disposed. Keeps the whole
 *  same-color batch to a single instanced draw call across the cover. */
function mergeGeos(items: GeoItem[]): THREE.BufferGeometry {
  const position: number[] = [], normal: number[] = [], uv: number[] = [], index: number[] = [];
  let vOff = 0;
  for (const { geo, m } of items) {
    geo.applyMatrix4(m);
    const p = geo.getAttribute('position'), n = geo.getAttribute('normal'), t = geo.getAttribute('uv');
    const idx = geo.getIndex()!;
    for (let i = 0; i < p.count; i++) {
      position.push(p.getX(i), p.getY(i), p.getZ(i));
      normal.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(t.getX(i), t.getY(i));
    }
    for (let i = 0; i < idx.count; i++) index.push(idx.getX(i) + vOff);
    vOff += p.count;
    geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(index);
  return out;
}

// ── palette ──────────────────────────────────────────────────────────────
const TERRACOTTA = 0xb5613f;
const SLATE = 0x3f6f9c;
const SAGE = 0x5f9c6a;
const STEP = 0xc69a5e;
const NEWEL = 0x4a4d55;
const COLLAR = 0x8a8f99;

type Opening = { center: number; halfW: number; top: number };

export function buildRoomsDecor(ctx: DecorBuildContext) {
  const { size, h, mesh, std, localM } = ctx;
  const groups = new Map<number, GeoItem[]>();
  const add = (color: number, geo: THREE.BufferGeometry, m: THREE.Matrix4) => {
    const g = groups.get(color); if (g) g.push({ geo, m }); else groups.set(color, [{ geo, m }]);
  };
  const box = (color: number, w: number, hh: number, d: number, m: THREE.Matrix4) =>
    add(color, new THREE.BoxGeometry(w, hh, d), m);

  const yBase = -h;
  const t = size * 0.05;          // wall thickness (gives every wall real depth)
  const wallTop = -h + size * 0.62;

  /**
   * A solid wall on a horizontal axis, full-span on its cross axis, with doorway
   * openings. `axis` is the wall's NORMAL: 'x' ⇒ the wall spans z (plane y-z) at
   * x = coord; 'z' ⇒ spans x at z = coord. Built as solid pillars between the
   * openings + a lintel above each, plus optional corbel steps for an arch-like
   * top — so the doorway is a real 3D gap, not a cut plane.
   */
  function addWall(axis: 'x' | 'z', coord: number, color: number, openings: Opening[], corbel = false) {
    const seg = (spanLo: number, spanHi: number, yLo: number, yHi: number) => {
      const spanW = spanHi - spanLo, spanC = (spanLo + spanHi) / 2;
      const hgt = yHi - yLo, yC = (yLo + yHi) / 2;
      if (spanW <= 1e-4 || hgt <= 1e-4) return;
      if (axis === 'x') box(color, t, hgt, spanW, localM(coord, yC, spanC));
      else box(color, spanW, hgt, t, localM(spanC, yC, coord));
    };
    // solid pillars = [−h, h] minus the union of openings (full height)
    const sorted = [...openings].sort((a, b) => a.center - b.center);
    let cursor = -h;
    for (const o of sorted) {
      seg(cursor, o.center - o.halfW, yBase, wallTop);
      cursor = o.center + o.halfW;
    }
    seg(cursor, h, yBase, wallTop);
    // lintel above each opening
    for (const o of sorted) {
      seg(o.center - o.halfW, o.center + o.halfW, o.top, wallTop);
      if (corbel) {
        // two corbel steps narrowing the opening toward an arch-like head
        const stepH = (o.top - yBase) * 0.12;
        seg(o.center - o.halfW, o.center - o.halfW * 0.6, o.top - stepH, o.top);
        seg(o.center + o.halfW * 0.6, o.center + o.halfW, o.top - stepH, o.top);
        seg(o.center - o.halfW * 0.6, o.center - o.halfW * 0.25, o.top - stepH * 2, o.top);
        seg(o.center + o.halfW * 0.25, o.center + o.halfW * 0.6, o.top - stepH * 2, o.top);
      }
    }
  }

  // Three interior walls, offset from the cube center so the rooms they bound
  // straddle the seams. Different shapes + colors.
  //   A: one tall rectangular doorway (terracotta), normal +x, near −x.
  addWall('x', -h * 0.45, TERRACOTTA, [{ center: h * 0.1, halfW: size * 0.1, top: yBase + size * 0.36 }]);
  //   B: one wide corbel-arched doorway (slate), normal +z, toward +z.
  addWall('z', h * 0.4, SLATE, [{ center: -h * 0.1, halfW: size * 0.17, top: yBase + size * 0.28 }], true);
  //   C: a double portal (sage), normal +x, near +x.
  addWall('x', h * 0.5, SAGE, [
    { center: -h * 0.4, halfW: size * 0.07, top: yBase + size * 0.32 },
    { center: h * 0.45, halfW: size * 0.07, top: yBase + size * 0.32 },
  ]);

  // ── spiral staircase on the vertical gluing ──────────────────────────────
  // Full cube height, exactly one turn, right-handed — so it joins continuously
  // through the y-pairing and the cover re-hands/rotates it per world.
  const cx = h * 0.28, cz = -h * 0.55;
  const R = size * 0.15, rIn = size * 0.028;
  const N = 14, H = size, dY = H / N, dTheta = (Math.PI * 2) / N;
  const stepW = size * 0.045, stepD = R * dTheta * 1.25;
  for (let i = 0; i < N; i++) {
    const theta = i * dTheta;             // CCW-from-above as you ascend (one chirality)
    const y = yBase + (i + 0.5) * dY;
    const rMid = R * 0.55;
    // a tread reaching out from the newel; local +x points radially (ry = −θ)
    box(STEP, R, stepW, stepD, localM(cx + rMid * Math.cos(theta), y, cz + rMid * Math.sin(theta), 0, -theta, 0));
  }
  // central newel post, full height (a continuous pole threading every floor)
  add(NEWEL, new THREE.CylinderGeometry(rIn, rIn, H, 14), localM(cx, 0, cz));

  // floor + ceiling collar rims around the shaft — reads as the hole the stair
  // passes through (open frame, so the cover stays visible above/below).
  const collarW = size * 0.02, ring = R + size * 0.04;
  for (const cy of [-h, h]) {
    for (const s of [-1, 1]) {
      box(COLLAR, ring * 2, collarW, collarW, localM(cx, cy, cz + s * ring));
      box(COLLAR, collarW, collarW, ring * 2, localM(cx + s * ring, cy, cz));
    }
  }

  // flush each color batch as a single merged geometry / draw call
  for (const [color, items] of groups) mesh(mergeGeos(items), std(color), new THREE.Matrix4());
}
