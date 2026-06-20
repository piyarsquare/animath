import * as THREE from 'three';
import type { SolidWorldSpec } from '../solidSchema';

/**
 * Solid Worlds — the **Rooms** decorator: real, solid architecture instead of
 * flat signs.
 *
 * Thick **glass** walls (transparent panels set in opaque colored frames) carry
 * doorways cut as genuine 3D openings; a **floor** with a hole cut for the
 * staircase grounds the room; and a spiral staircase threads the vertical
 * gluing. The glass lets you see through the near walls into the rooms beyond
 * (so the cover stays legible), while the opaque frames + distinct hues keep each
 * wall recognizable. Everything is built once in the fundamental cube and
 * instanced across the deck-translates, which is what makes it *topological*
 * architecture:
 *
 * - The walls sit at **interior** fractional offsets (not on the cube faces), so
 *   when they tile, the rooms they bound **straddle the seams** — the room you
 *   stand in is assembled from pieces of several fundamental domains.
 * - The spiral stair completes exactly **one turn over the cube height**, so it
 *   joins continuously through the vertical (y) pairing. Because the cover
 *   applies each world's holonomy to the *same* helix, the staircase's
 *   **chirality flips** in a mirror world and **rotates** in a turn world.
 * - The floor tiles too, so its hole stacks into a continuous shaft in the
 *   vertical cover (you can look down the stairwell to the floor below).
 *
 * World-agnostic by design: one layout, re-expressed by every world's gluing.
 * Walls have no collision — you walk through doorways on foot and fly the shaft.
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
 *  batch to a single instanced draw call across the cover. */
function mergeGeos(items: GeoItem[]): THREE.BufferGeometry {
  const position: number[] = [], normal: number[] = [], uv: number[] = [], index: number[] = [];
  let vOff = 0;
  for (const { geo, m } of items) {
    geo.applyMatrix4(m);
    const p = geo.getAttribute('position'), n = geo.getAttribute('normal'), tx = geo.getAttribute('uv');
    const idx = geo.getIndex()!;
    for (let i = 0; i < p.count; i++) {
      position.push(p.getX(i), p.getY(i), p.getZ(i));
      normal.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(tx.getX(i), tx.getY(i));
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

type Opening = { center: number; halfW: number; top: number };
type WallSpec = {
  axis: 'x' | 'z'; coord: number; glass: number; trim: number;
  openings: Opening[]; corbel?: boolean;
};

// Three distinct walls — different hue, trim and doorway shape.
const WALLS: WallSpec[] = [
  // amber glass · dark bronze trim · one tall doorway
  { axis: 'x', coord: -0.45, glass: 0xe0a23e, trim: 0x2a2014, openings: [{ center: 0.1, halfW: 0.1, top: 0.36 }] },
  // teal glass · white trim · one wide corbel-arched doorway
  { axis: 'z', coord: 0.4, glass: 0x2fa6ad, trim: 0xf0f4f6, openings: [{ center: -0.1, halfW: 0.17, top: 0.28 }], corbel: true },
  // violet glass · near-black trim · a double portal
  { axis: 'x', coord: 0.5, glass: 0x9163c8, trim: 0x130f1a, openings: [{ center: -0.4, halfW: 0.07, top: 0.32 }, { center: 0.45, halfW: 0.07, top: 0.32 }] },
];

const STEP = 0xc69a5e, NEWEL = 0x4a4d55, COLLAR = 0x8a8f99, FLOOR = 0x57514a;

export function buildRoomsDecor(ctx: DecorBuildContext) {
  const { size, h, mesh, std, localM, addDisposable } = ctx;

  // batches keyed by id → one merged draw call; `floor` flag wires the Floor
  // checkbox; `mat` is the material (opaque via std, or a glass material).
  const batch = new Map<string, { mat: THREE.Material; items: GeoItem[]; floor?: boolean }>();
  const grab = (id: string, mat: THREE.Material, floor = false) => {
    let b = batch.get(id); if (!b) { b = { mat, items: [], floor }; batch.set(id, b); } return b;
  };
  const glassMat = (color: number) => {
    // depthWrite TRUE on purpose: with the cover tiling the room dozens of times,
    // a non-writing glass would stack into murk. Writing depth means you see
    // through only the nearest pane (and clearly through its doorway), like real
    // glass — the near walls stop obstructing without the haze.
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.32, side: THREE.DoubleSide });
    addDisposable(m); return m;
  };

  const yBase = -h;
  const t = size * 0.045;          // wall thickness (real depth)
  const wallTop = -h + size * 0.56;
  const plinthTop = yBase + size * 0.12;  // opaque colored base (the wall's bold ID)
  const trimT = t * 1.4;           // trim protrudes past the glass on both faces
  const mw = size * 0.045;         // trim member cross-section

  /** Place a box on a wall whose NORMAL is `axis` at `coord`; `spanLen` along the
   *  wall's horizontal span, `yLen` vertical, `thick` through the wall. */
  const wallBox = (b: { items: GeoItem[] }, axis: 'x' | 'z', coord: number, spanC: number, spanLen: number, yC: number, yLen: number, thick: number) => {
    if (spanLen <= 1e-4 || yLen <= 1e-4) return;
    const geo = axis === 'x' ? new THREE.BoxGeometry(thick, yLen, spanLen) : new THREE.BoxGeometry(spanLen, yLen, thick);
    const m = axis === 'x' ? localM(coord, yC, spanC) : localM(spanC, yC, coord);
    b.items.push({ geo, m });
  };

  WALLS.forEach((w, i) => {
    const coord = w.coord * h;
    const glass = grab(`glass${i}`, glassMat(w.glass));
    const solid = grab(`solid${i}`, std(w.glass));   // opaque plinth, same hue
    const trim = grab(`trim${i}`, std(w.trim));
    const gseg = (lo: number, hi: number, yLo: number, yHi: number) =>
      wallBox(glass, w.axis, coord, (lo + hi) / 2, hi - lo, (yLo + yHi) / 2, yHi - yLo, t);
    const sseg = (lo: number, hi: number, yLo: number, yHi: number) =>
      wallBox(solid, w.axis, coord, (lo + hi) / 2, hi - lo, (yLo + yHi) / 2, yHi - yLo, t * 1.05);
    const openings = w.openings.map((o) => ({ center: o.center * h, halfW: o.halfW * size, top: yBase + o.top * size }));

    // pillars between the openings: an opaque colored plinth at the base (the
    // wall's bold ID) with clear glass above; lintel above each doorway is glass.
    const sorted = [...openings].sort((a, b) => a.center - b.center);
    let cursor = -h;
    const pillar = (lo: number, hi: number) => { sseg(lo, hi, yBase, plinthTop); gseg(lo, hi, plinthTop, wallTop); };
    for (const o of sorted) { pillar(cursor, o.center - o.halfW); cursor = o.center + o.halfW; }
    pillar(cursor, h);
    for (const o of sorted) {
      gseg(o.center - o.halfW, o.center + o.halfW, o.top, wallTop);
      if (w.corbel) {
        const sh = (o.top - yBase) * 0.12;
        gseg(o.center - o.halfW, o.center - o.halfW * 0.6, o.top - sh, o.top);
        gseg(o.center + o.halfW * 0.6, o.center + o.halfW, o.top - sh, o.top);
        gseg(o.center - o.halfW * 0.6, o.center - o.halfW * 0.25, o.top - sh * 2, o.top);
        gseg(o.center + o.halfW * 0.25, o.center + o.halfW * 0.6, o.top - sh * 2, o.top);
      }
    }

    // opaque trim: a top rail along the wall + a surround (jambs + header) framing
    // each doorway — keeps the structure crisp through the glass + IDs the wall.
    wallBox(trim, w.axis, coord, 0, 2 * h, wallTop, mw, trimT);          // top rail
    for (const o of sorted) {
      for (const s of [-1, 1]) wallBox(trim, w.axis, coord, o.center + s * o.halfW, mw, (yBase + o.top) / 2, o.top - yBase, trimT); // jambs
      wallBox(trim, w.axis, coord, o.center, 2 * o.halfW + mw, o.top, mw, trimT);   // header
    }
  });

  // ── floor with a hole cut for the staircase ──────────────────────────────
  const cx = h * 0.28, cz = -h * 0.55;
  const R = size * 0.15, rIn = size * 0.028;
  const hs = R + size * 0.06;        // half-size of the square hole
  const ft = size * 0.03;            // floor slab thickness
  const fy = yBase + ft / 2 - size * 0.002;
  const floor = grab('floor', std(FLOOR), true);
  const floorBox = (x0: number, x1: number, z0: number, z1: number) => {
    if (x1 - x0 <= 1e-4 || z1 - z0 <= 1e-4) return;
    floor.items.push({ geo: new THREE.BoxGeometry(x1 - x0, ft, z1 - z0), m: localM((x0 + x1) / 2, fy, (z0 + z1) / 2) });
  };
  floorBox(-h, cx - hs, -h, h);                 // left of hole
  floorBox(cx + hs, h, -h, h);                  // right of hole
  floorBox(cx - hs, cx + hs, -h, cz - hs);      // in front of hole
  floorBox(cx - hs, cx + hs, cz + hs, h);       // behind hole

  // ── spiral staircase on the vertical gluing ──────────────────────────────
  const N = 14, H = size, dY = H / N, dTheta = (Math.PI * 2) / N;
  const stepW = size * 0.045, stepD = R * dTheta * 1.25;
  const steps = grab('step', std(STEP));
  for (let i = 0; i < N; i++) {
    const theta = i * dTheta;             // CCW-from-above as you ascend (one chirality)
    const y = yBase + (i + 0.5) * dY;
    const rMid = R * 0.55;
    steps.items.push({ geo: new THREE.BoxGeometry(R, stepW, stepD), m: localM(cx + rMid * Math.cos(theta), y, cz + rMid * Math.sin(theta), 0, -theta, 0) });
  }
  grab('newel', std(NEWEL)).items.push({ geo: new THREE.CylinderGeometry(rIn, rIn, H, 14), m: localM(cx, 0, cz) });

  // ceiling collar rim — reads as the hole the stair passes through above.
  const collarW = size * 0.02, ring = R + size * 0.04;
  const collar = grab('collar', std(COLLAR));
  for (const s of [-1, 1]) {
    collar.items.push({ geo: new THREE.BoxGeometry(ring * 2, collarW, collarW), m: localM(cx, h, cz + s * ring) });
    collar.items.push({ geo: new THREE.BoxGeometry(collarW, collarW, ring * 2), m: localM(cx + s * ring, h, cz) });
  }

  // flush each batch as one merged geometry / draw call
  for (const [, b] of batch) if (b.items.length) mesh(mergeGeos(b.items), b.mat, new THREE.Matrix4(), b.floor);
}
