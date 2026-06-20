import * as THREE from 'three';
import type { SolidWorldSpec } from '../solidSchema';
import { plaqueTexture } from '../textures';

/**
 * Solid Worlds — the **lived-seams** interior decorator.
 *
 * The diagnostic scene proves the math with neutral landmark props. This module
 * instead furnishes the fundamental room as if a resident *lived* in the
 * manifold and built around its gluing rules. The trick is the engine's own
 * cover model: every decor part is instanced across the deck-translate cells, so
 * a prop that **spans the whole cube** (±h on some axis) tiles seamlessly into
 * its neighbor copy — it reads as one continuous structure threading through the
 * identification. We exploit exactly that:
 *
 * - **3-torus** (straight translations): full-span props become continuous
 *   loops — a wraparound pipe, a split counter, a floor rug across the seam, a
 *   floor-to-ceiling ladder. Nothing flips; the room is a periodic apartment.
 * - **amphicosm / Klein × Circle**: the +x pairing reflects y
 *   (`g(x,y,z) = (x+size, −y, z)`). A pipe built **low at −x / high at +x** tiles
 *   into a continuous floor↔ceiling zigzag — the resident's plumbing literally
 *   encodes that a horizontal x-loop reverses the vertical direction.
 *
 * Geometry only: BoxGeometry / CylinderGeometry / PlaneGeometry + canvas
 * plaques, no external assets, low object count. The two target worlds are
 * decorated deeply; the rest get a sparse, honest generic scene.
 */

/** What the decorator borrows from the engine's `buildRoom` scope. */
export interface DecorBuildContext {
  spec: SolidWorldSpec;
  /** Fundamental cube edge length (world units). */
  size: number;
  /** Furniture reference scale (the engine's `U`). */
  U: number;
  /** Half the cube edge (= size / 2): the wall coordinate. */
  h: number;
  /** Register one solid decor part (instanced across the cover). The geometry is
   *  disposed for you; materials/textures go through `addDisposable`. */
  mesh: (geo: THREE.BufferGeometry, mat: THREE.Material, matrix: THREE.Matrix4, floor?: boolean) => void;
  /** Build a tracked MeshStandardMaterial of the given color. */
  std: (color: number) => THREE.MeshStandardMaterial;
  /** Local transform (position + optional XYZ-Euler rotation). */
  localM: (x: number, y: number, z: number, rx?: number, ry?: number, rz?: number) => THREE.Matrix4;
  /** Register a material/texture for disposal on rebuild. */
  addDisposable: (d: { dispose: () => void }) => void;
}

const PLAQUE_ASPECT = 168 / 512;

/** A short canvas plaque on a thin plane, facing +z (toward the default view)
 *  unless rotated. Mirror-reverses for a flipped walker — that's intended. */
function addPlaque(ctx: DecorBuildContext, text: string, matrix: THREE.Matrix4, width: number, accent?: string) {
  const tex = plaqueTexture(text, accent);
  ctx.addDisposable(tex);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  ctx.addDisposable(mat);
  ctx.mesh(new THREE.PlaneGeometry(width, width * PLAQUE_ASPECT), mat, matrix);
}

/** A cylinder "pipe" between two points (in fundamental coords). */
function addPipe(ctx: DecorBuildContext, a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 1e-4) return;
  const geo = new THREE.CylinderGeometry(radius, radius, len, 14);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  ctx.mesh(geo, mat, m);
}

/** A simple ladder standing against an x-wall, rungs running along z. Spans
 *  y ∈ [yBottom, yTop] at (x, z). Two rails + a few rungs. */
function addLadder(ctx: DecorBuildContext, x: number, z: number, yBottom: number, yTop: number, hw: number, mat: THREE.Material) {
  const { U, localM, mesh } = ctx;
  const railR = U * 0.018;
  const height = yTop - yBottom;
  const midY = (yTop + yBottom) / 2;
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(railR * 2, height, railR * 2), mat, localM(x, midY, z + s * hw));
  }
  const rungN = Math.max(3, Math.round(height / (U * 0.16)));
  for (let i = 0; i < rungN; i++) {
    const y = yBottom + (height * (i + 0.5)) / rungN;
    mesh(new THREE.BoxGeometry(railR * 1.4, railR * 1.4, hw * 2), mat, localM(x, y, z));
  }
}

// ── palette ────────────────────────────────────────────────────────────────
const COPPER = 0xc77b3e;   // pipes
const STEEL = 0x8b94a3;    // ladders / shafts
const WOOD = 0x9c7a4d;     // shelves / counters
const RUG = 0xb1503e;      // floor stripe
const PANEL_FLOOR = 0x35506b;
const PANEL_CEIL = 0x6b4a35;
const CATWALK = 0x9aa1ab;

/**
 * World 1 — the 3-torus as a wraparound apartment / workshop. Every utility is
 * a full-span object so it threads continuously through the straight gluing.
 */
function buildTorusDecor(ctx: DecorBuildContext) {
  const { size, U, h, mesh, std, localM } = ctx;

  // 1. wraparound pipe — full span along x at a fixed height/depth, so it is one
  //    continuous utility loop through the +x/−x identification.
  const pipeMat = std(COPPER);
  ctx.addDisposable(pipeMat);
  addPipe(ctx, new THREE.Vector3(-h, h * 0.42, -h * 0.5), new THREE.Vector3(h, h * 0.42, -h * 0.5), U * 0.05, pipeMat);
  addPlaque(ctx, 'WRAPAROUND PIPE', localM(0, h * 0.42 + U * 0.12, -h * 0.5 + U * 0.05), size * 0.26);

  // 2. split counter — full span along x; reads as one continuous shelf across
  //    the paired x-faces. No rotation, no flip.
  const counterY = -h + U * 0.42;
  mesh(new THREE.BoxGeometry(size, U * 0.05, U * 0.5), std(WOOD), localM(0, counterY, h * 0.52));
  // a couple of stout legs so it reads as built, not floating
  for (const sx of [-0.6, 0.6]) {
    mesh(new THREE.BoxGeometry(U * 0.05, counterY + h, U * 0.05), std(WOOD), localM(sx * h, (-h + counterY) / 2, h * 0.52));
  }
  addPlaque(ctx, 'SAME SHELF', localM(0, counterY + U * 0.2, h * 0.52 - U * 0.27, 0, Math.PI, 0), size * 0.22);

  // 3. floor rug / walking path — full span along z, crossing the z-seam and
  //    continuing naturally as a domestic circulation route.
  mesh(new THREE.BoxGeometry(U * 0.6, U * 0.02, size), std(RUG), localM(-h * 0.3, -h + U * 0.02, 0), true);

  // 4. vertical ladder — full height; continues through the top/bottom pairing,
  //    so climbing out the ceiling returns you through the floor below.
  const ladderMat = std(STEEL);
  ctx.addDisposable(ladderMat);
  addLadder(ctx, h * 0.55, -h * 0.6, -h, h, U * 0.09, ladderMat);
  addPlaque(ctx, 'UP RETURNS BELOW', localM(h * 0.55, h * 0.78, -h * 0.6 + U * 0.12), size * 0.26);
}

/**
 * World 2 — the amphicosm / Klein × Circle as a floor/ceiling mirror-house. The
 * +x pairing reflects y, so the resident's infrastructure connects floor-side to
 * ceiling-side across a single horizontal loop.
 */
function buildAmphicosmDecor(ctx: DecorBuildContext) {
  const { size, U, h, mesh, std, localM } = ctx;
  const z0 = -h * 0.45;

  // 1. high-to-low x-loop pipe — built low at −x and high at +x. Because g
  //    reflects y, tiling makes it a continuous floor↔ceiling zigzag: the pipe
  //    leaves high on +x and re-enters low on −x.
  const pipeMat = std(COPPER);
  ctx.addDisposable(pipeMat);
  addPipe(ctx, new THREE.Vector3(-h, -h * 0.55, z0), new THREE.Vector3(h, h * 0.55, z0), U * 0.05, pipeMat);
  addPlaque(ctx, 'SAME PIPE', localM(0, U * 0.14, z0 + U * 0.06), size * 0.2, '#ffd2ea');

  // 2. service ladder / maintenance shaft at the +x wall — climbs from the floor
  //    up to where the pipe exits high, so the resident can reach it. Its cover
  //    image (across the x-loop) descends from the ceiling at the −x wall.
  const shaftMat = std(STEEL);
  ctx.addDisposable(shaftMat);
  addLadder(ctx, h * 0.9, z0, -h, h * 0.62, U * 0.09, shaftMat);
  addPlaque(ctx, 'SAME SERVICE SHAFT', localM(h * 0.9 - U * 0.02, -h * 0.1, z0 + U * 0.12, 0, -Math.PI / 2, 0), size * 0.26);

  // 3. catwalk at the pipe's high end — a maintenance platform. Across the x-loop
  //    its copy lands at floor level (the y-reflection again).
  mesh(new THREE.BoxGeometry(U * 0.7, U * 0.04, U * 0.45), std(CATWALK), localM(h * 0.5, h * 0.5, z0));

  // 4. explicit floor & ceiling panels — so the user can read which surface is
  //    which. Same footprint at y = ±h: under the x-loop the floor panel becomes
  //    the ceiling panel and vice-versa.
  const px = -h * 0.25, pw = h * 0.7, pd = U * 0.7;
  mesh(new THREE.BoxGeometry(pw, U * 0.02, pd), std(PANEL_FLOOR), localM(px, -h + U * 0.015, z0), true);
  addPlaque(ctx, 'LOCAL FLOOR', localM(px, -h + U * 0.05, z0 + pd * 0.5 + U * 0.02, -Math.PI / 2, 0, 0), size * 0.18);
  mesh(new THREE.BoxGeometry(pw, U * 0.02, pd), std(PANEL_CEIL), localM(px, h - U * 0.015, z0));
  addPlaque(ctx, 'CEILING SIDE', localM(px, h - U * 0.05, z0 + pd * 0.5 + U * 0.02, Math.PI / 2, 0, 0), size * 0.18);

  // headline plaque on the +x wall, facing into the room
  addPlaque(ctx, 'X LOOP: FLOOR ↔ CEILING', localM(h * 0.97, h * 0.3, z0, 0, -Math.PI / 2, 0), size * 0.34, '#ffd2ea');
}

/**
 * Generic fallback for the six not-yet-decorated worlds — a sparse, honest
 * "someone lives here" scene that does NOT claim seam continuity (most of these
 * worlds rotate or screw their gluings, so a full-span prop would not actually
 * line up). Just a few lived props + a prototype plaque.
 */
function buildGenericLivedDecor(ctx: DecorBuildContext) {
  const { size, U, h, mesh, std, localM } = ctx;
  // a shelf against the −z wall
  mesh(new THREE.BoxGeometry(h * 0.8, U * 0.04, U * 0.3), std(WOOD), localM(-h * 0.2, -h + U * 0.5, -h * 0.9));
  mesh(new THREE.BoxGeometry(h * 0.8, U * 0.04, U * 0.3), std(WOOD), localM(-h * 0.2, -h + U * 0.9, -h * 0.9));
  // a neutral ladder in a corner
  const ladderMat = std(STEEL);
  ctx.addDisposable(ladderMat);
  addLadder(ctx, h * 0.6, h * 0.6, -h, h * 0.4, U * 0.08, ladderMat);
  // one asymmetric crate so a mirror/rotation is obvious
  mesh(new THREE.BoxGeometry(U * 0.3, U * 0.2, U * 0.4), std(RUG), localM(h * 0.4, -h + U * 0.1, h * 0.3));
  addPlaque(ctx, 'LIVED SEAMS PROTOTYPE', localM(0, U * 0.1, -h * 0.92), size * 0.3);
}

/** Dispatch the lived-seams decor for the current world. */
export function buildLivedSeamDecor(ctx: DecorBuildContext) {
  switch (ctx.spec.id) {
    case '3-torus':
      buildTorusDecor(ctx);
      break;
    case 'amphicosm':
      buildAmphicosmDecor(ctx);
      break;
    default:
      buildGenericLivedDecor(ctx);
      break;
  }
}
