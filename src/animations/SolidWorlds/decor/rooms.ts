import * as THREE from 'three';
import { axisIndex, type Axis, type SolidWorldSpec } from '../solidSchema';
import { rugTexture, pictureTexture, signTexture } from '../textures';

/**
 * Solid Worlds — the **Rooms** decorator: a furnished room you leave by archways.
 *
 * The fundamental cube is a real room — solid walls (a faint axis tint: X warm ·
 * Y green · Z blue), a rug, a desk + lamp, a fireplace, a framed picture, a
 * chandelier, a WELCOME sign — and each wall carries ONE **off-center archway**;
 * the floor and ceiling carry an off-center **hole**. Those openings are where the
 * gluing lives: the connections between rooms happen at the archways.
 *
 * Why off-center, and why this is built on only the three −axis faces:
 *  - The cover instances the room by the deck group, so a cell's +axis wall is
 *    drawn as its neighbor's −axis panel, **transported by that pairing's gluing**.
 *    So the opening you see on the far (+axis) wall is literally your near (−axis)
 *    opening after the deck transform — no matching math, the tiling does it.
 *  - Every gluing fixes the center of the face it acts through, so a *centered*
 *    opening would be invariant under the very turn/mirror we want to expose. Put
 *    the arch off-center and the transform becomes visible: walk through and the
 *    arch has jumped to a new corner (turn world) or flipped side (glide world);
 *    in worlds whose gluing tips vertical to horizontal, the ceiling hole lands
 *    where a wall arch was. That mismatch is the shape of the space.
 *
 * Solid walls also stage the surprise: you don't see how the next room is arranged
 * until you're through the arch. Lights are emissive-only (no real point lights,
 * which would multiply across the cover and fight the symmetrized lighting).
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

// Faint axis tint on the solid walls (X warm · Y green · Z blue) — orientation
// without the busy arrows.
const WALL_TINT: Record<Axis, number> = { x: 0x6f5a54, y: 0x566b5d, z: 0x556071 };

export function buildRoomsDecor(ctx: DecorBuildContext) {
  const { U: u, h, mesh, std, localM, addDisposable } = ctx;
  const H = h, F = -h;

  // ── helpers ──────────────────────────────────────────────────────────────
  const box = (w: number, hh: number, d: number, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) =>
    mesh(new THREE.BoxGeometry(w, hh, d), mat, localM(x, y, z, rx, ry, rz));
  const cyl = (rt: number, rb: number, ht: number, mat: THREE.Material, x: number, y: number, z: number, seg = 16, rx = 0, ry = 0, rz = 0) =>
    mesh(new THREE.CylinderGeometry(rt, rb, ht, seg), mat, localM(x, y, z, rx, ry, rz));
  const emis = (color: number, intensity = 1) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x120d08, emissive: color, emissiveIntensity: intensity, roughness: 0.5 });
    addDisposable(m); return m;
  };
  const texMat = (t: THREE.Texture, opts: THREE.MeshStandardMaterialParameters = {}) => {
    addDisposable(t);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide, ...opts });
    addDisposable(m); return m;
  };
  const unit = (i: number, s = 1) => new THREE.Vector3(i === 0 ? s : 0, i === 1 ? s : 0, i === 2 ? s : 0);

  // ── the room shell: three solid faces, each with one off-center opening ─────
  // (the +x/+y/+z faces are supplied by the neighbors, gluing-transported)
  const wallArchGeo = (u0: number, halfW: number, vTop: number) => {
    const s = new THREE.Shape();
    s.moveTo(-H, -H); s.lineTo(H, -H); s.lineTo(H, H); s.lineTo(-H, H); s.closePath();
    const a = new THREE.Path();
    a.moveTo(u0 - halfW, -H);
    a.lineTo(u0 - halfW, vTop);
    a.absarc(u0, vTop, halfW, Math.PI, 0, true);  // arched top
    a.lineTo(u0 + halfW, -H);
    a.closePath();
    s.holes.push(a);
    return new THREE.ShapeGeometry(s);
  };
  const holeGeo = (u0: number, v0: number, r: number) => {
    const s = new THREE.Shape();
    s.moveTo(-H, -H); s.lineTo(H, -H); s.lineTo(H, H); s.lineTo(-H, H); s.closePath();
    const o = new THREE.Path();
    o.absellipse(u0, v0, r, r, 0, Math.PI * 2, true);
    s.holes.push(o);
    return new THREE.ShapeGeometry(s);
  };
  // Walls are mostly opaque (so the next room stays hidden until you reach the
  // arch) but faintly translucent, so a hint of the surrounding copies glows
  // through. depthWrite stays ON — the nearest wall occludes the ones behind it,
  // so the tiled panels don't flicker the way fully transparent panes did.
  const wallMat = (a: Axis) => {
    const m = new THREE.MeshStandardMaterial({
      color: WALL_TINT[a], roughness: 0.85, metalness: 0.05,
      transparent: true, opacity: 0.84, depthWrite: true, side: THREE.DoubleSide,
    });
    addDisposable(m); return m;
  };
  const buildFace = (a: Axis, geo: THREE.BufferGeometry) => {
    const ti = axisIndex(a);
    const uIdx = a === 'x' ? 2 : 0;              // horizontal transverse (z for x-wall, x otherwise)
    const vIdx = a === 'y' ? 2 : 1;              // vertical (z is the 2nd transverse on the floor)
    const M = new THREE.Matrix4().makeBasis(unit(uIdx), unit(vIdx), unit(ti)).setPosition(unit(ti, -h * 0.999));
    mesh(geo, wallMat(a), M);
  };
  buildFace('x', wallArchGeo(H * 0.42, H * 0.24, -H * 0.05));   // arch toward +z
  buildFace('z', wallArchGeo(H * 0.42, H * 0.24, -H * 0.05));   // arch toward +x
  buildFace('y', holeGeo(-H * 0.42, H * 0.42, H * 0.26));        // trapdoor, off in a corner

  const wood = std(0x6b4a2f), woodDark = std(0x4a3320);
  const stone = std(0x9a9088), darkBack = std(0x171210);
  const gold = std(0xb0904a), metal = std(0x8f8a7a);

  // ── rug (offset, clear of the floor hole) ───────────────────────────────────
  mesh(new THREE.PlaneGeometry(u * 0.66, u * 0.42), texMat(rugTexture()), localM(u * 0.06, F + 0.05, -u * 0.06, -Math.PI / 2));

  // ── desk + lamp on the −x wall, toward −z (clear of the +z arch) ─────────────
  {
    const dx = -h + u * 0.2, dz = -u * 0.16, topY = F + u * 0.24, t = u * 0.04;
    box(u * 0.26, t, u * 0.46, wood, dx, topY, dz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      box(u * 0.035, u * 0.24, u * 0.035, woodDark, dx + sx * u * 0.1, F + u * 0.12, dz + sz * u * 0.19);
    const lz = dz - u * 0.13, lampBase = topY + t / 2;
    cyl(u * 0.05, u * 0.06, u * 0.02, metal, dx, lampBase + u * 0.01, lz, 16);
    cyl(u * 0.012, u * 0.012, u * 0.17, metal, dx, lampBase + u * 0.1, lz, 8);
    cyl(u * 0.085, u * 0.055, u * 0.1, emis(0xffcc66, 0.9), dx, lampBase + u * 0.21, lz, 18);
  }

  // ── framed picture high on the −x wall (faces +x), toward −z ─────────────────
  {
    const x0 = -h + u * 0.02, y0 = F + u * 0.62, z0 = -u * 0.16;
    box(u * 0.03, u * 0.34, u * 0.26, gold, x0, y0, z0);
    mesh(new THREE.PlaneGeometry(u * 0.2, u * 0.28), texMat(pictureTexture()), localM(x0 + u * 0.025, y0, z0, 0, Math.PI / 2, 0));
  }

  // ── fireplace on the −z wall, toward −x (clear of the +x arch) ───────────────
  {
    const z0 = -h + u * 0.06, cx = -u * 0.2;
    for (const sx of [-1, 1]) box(u * 0.07, u * 0.44, u * 0.12, stone, cx + sx * u * 0.2, F + u * 0.22, z0);
    box(u * 0.5, u * 0.08, u * 0.12, stone, cx, F + u * 0.45, z0);                       // lintel
    box(u * 0.6, u * 0.05, u * 0.18, stone, cx, F + u * 0.5, z0 + u * 0.02);             // mantel
    box(u * 0.5, u * 0.04, u * 0.16, stone, cx, F + u * 0.02, z0 + u * 0.01);            // hearth
    box(u * 0.34, u * 0.4, u * 0.02, darkBack, cx, F + u * 0.22, z0 - u * 0.04);          // firebox
    box(u * 0.3, u * 0.11, u * 0.07, emis(0xff6a1a, 1.2), cx, F + u * 0.08, z0 - u * 0.02); // embers
    for (const sx of [-1, 1]) cyl(u * 0.02, u * 0.02, u * 0.22, woodDark, cx + sx * u * 0.05, F + u * 0.1, z0 - u * 0.01, 8, 0, 0, Math.PI / 2 + sx * 0.2);
    box(u * 0.46, u * 0.15, u * 0.025, wood, cx, F + u * 0.64, z0 + u * 0.01);            // sign frame
    mesh(new THREE.PlaneGeometry(u * 0.42, u * 0.12), texMat(signTexture('WELCOME')), localM(cx, F + u * 0.64, z0 + u * 0.026));
  }

  // ── chandelier from the ceiling ─────────────────────────────────────────────
  {
    const cy = h - u * 0.22;
    cyl(u * 0.012, u * 0.012, u * 0.2, metal, 0, h - u * 0.1, 0, 8);
    mesh(new THREE.TorusGeometry(u * 0.16, u * 0.018, 8, 22), metal, localM(0, cy, 0, Math.PI / 2));
    const bulb = emis(0xffddaa, 1.1);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2, r = u * 0.16;
      cyl(u * 0.014, u * 0.014, u * 0.07, std(0xeee3c0), Math.cos(ang) * r, cy + u * 0.04, Math.sin(ang) * r, 8);
      mesh(new THREE.SphereGeometry(u * 0.022, 10, 8), bulb, localM(Math.cos(ang) * r, cy + u * 0.09, Math.sin(ang) * r));
    }
    mesh(new THREE.SphereGeometry(u * 0.03, 12, 10), metal, localM(0, cy - u * 0.02, 0));
  }
}
