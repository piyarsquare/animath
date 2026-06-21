import * as THREE from 'three';
import type { SolidWorldSpec } from '../solidSchema';
import { faceMotifTexture, rugTexture, pictureTexture, signTexture } from '../textures';

/**
 * Solid Worlds — the **Rooms** decorator: a furnished room.
 *
 * The fundamental cube is dressed as a recognizable room — a rug, a desk with a
 * lamp, a fireplace on one wall, a framed picture on another, a chandelier from
 * the ceiling, and a worded sign over the mantel. The six faces stay as faint
 * color-coded frames (the walls, open in the middle — the "doorways"). Built once
 * in the home cell and instanced across the cover, so every copy carries that
 * cell's holonomy: walk through a doorway and the room you knew comes back
 * **rotated** (turn worlds) or **mirror-flipped** (glide worlds) — the fireplace
 * jumps to a different wall, the sign reads backwards — which is the whole
 * surprise. Orientation cues (axis colors X red · Y green · Z blue) stay on the
 * walls so you can still tell what the gluing did.
 *
 * Emissive-only "light" sources (lamp, fire, chandelier) — no real point lights,
 * which would be too many across the cover and would fight the engine's
 * holonomy-symmetrized lighting.
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

// X = red, Y = green, Z = blue (the RGB corner-marker scheme), muted/dim so the
// walls stay faint as the cover tiles them into the distance.
const AXIS_COLORS: { axis: 'x' | 'y' | 'z'; hex: string }[] = [
  { axis: 'x', hex: '#6e433d' },
  { axis: 'y', hex: '#3e5c48' },
  { axis: 'z', hex: '#3c4a66' },
];

export function buildRoomsDecor(ctx: DecorBuildContext) {
  const { size, U: u, h, mesh, std, localM, addDisposable } = ctx;

  // ── the walls: faint color-coded frames, open in the middle (the doorways) ──
  const inset = h * 0.97, face = size * 0.94;
  for (const { axis, hex } of AXIS_COLORS) {
    const tex = faceMotifTexture(hex); addDisposable(tex);
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    addDisposable(mat);
    for (const s of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(face, face);
      const m =
        axis === 'x' ? localM(s * inset, 0, 0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0)
        : axis === 'y' ? localM(0, s * inset, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0)
        : localM(0, 0, s * inset, 0, s > 0 ? Math.PI : 0, 0);
      mesh(geo, mat, m);
    }
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  const F = -h;                          // floor level
  const box = (w: number, hh: number, d: number, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) =>
    mesh(new THREE.BoxGeometry(w, hh, d), mat, localM(x, y, z, rx, ry, rz));
  const cyl = (rt: number, rb: number, ht: number, mat: THREE.Material, x: number, y: number, z: number, seg = 16, rx = 0, ry = 0, rz = 0) =>
    mesh(new THREE.CylinderGeometry(rt, rb, ht, seg), mat, localM(x, y, z, rx, ry, rz));
  const emis = (color: number, intensity = 1) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x120d08, emissive: color, emissiveIntensity: intensity, roughness: 0.5 });
    addDisposable(m); return m;
  };
  const tex = (t: THREE.Texture, opts: THREE.MeshStandardMaterialParameters = {}) => {
    addDisposable(t);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide, ...opts });
    addDisposable(m); return m;
  };

  const wood = std(0x6b4a2f), woodDark = std(0x4a3320);
  const stone = std(0x9a9088), darkBack = std(0x171210);
  const gold = std(0xb0904a), metal = std(0x8f8a7a);

  // ── rug (center of the floor) ───────────────────────────────────────────────
  mesh(new THREE.PlaneGeometry(u * 0.82, u * 0.54), tex(rugTexture()), localM(0, F + 0.05, u * 0.05, -Math.PI / 2));

  // ── desk against the −x wall, with a lamp ───────────────────────────────────
  {
    const dx = -h + u * 0.2, topY = F + u * 0.24, t = u * 0.04;
    box(u * 0.26, t, u * 0.5, wood, dx, topY, 0);                       // top
    for (const sx of [-1, 1]) for (const sz of [-1, 1])               // legs
      box(u * 0.035, u * 0.24, u * 0.035, woodDark, dx + sx * u * 0.1, F + u * 0.12, sz * u * 0.21);
    // lamp at one end of the desk
    const lx = dx, lz = u * 0.16, lampBase = topY + t / 2;
    cyl(u * 0.05, u * 0.06, u * 0.02, metal, lx, lampBase + u * 0.01, lz, 16);
    cyl(u * 0.012, u * 0.012, u * 0.17, metal, lx, lampBase + u * 0.1, lz, 8);
    cyl(u * 0.085, u * 0.055, u * 0.1, emis(0xffcc66, 0.9), lx, lampBase + u * 0.21, lz, 18); // glowing shade
  }

  // ── fireplace on the −z wall, with logs + fire ──────────────────────────────
  {
    const z0 = -h + u * 0.06;                                          // face stands a little off the wall
    for (const sx of [-1, 1]) box(u * 0.08, u * 0.46, u * 0.12, stone, sx * u * 0.24, F + u * 0.23, z0); // pillars
    box(u * 0.56, u * 0.09, u * 0.12, stone, 0, F + u * 0.47, z0);     // lintel
    box(u * 0.68, u * 0.05, u * 0.18, stone, 0, F + u * 0.52, z0 + u * 0.02); // mantel shelf
    box(u * 0.56, u * 0.04, u * 0.16, stone, 0, F + u * 0.02, z0 + u * 0.01); // hearth
    box(u * 0.4, u * 0.42, u * 0.02, darkBack, 0, F + u * 0.23, z0 - u * 0.04); // dark back
    const fire = emis(0xff6a1a, 1.3);
    box(u * 0.34, u * 0.12, u * 0.07, fire, 0, F + u * 0.08, z0 - u * 0.02); // ember bed
    for (const sx of [-1, 1]) cyl(u * 0.022, u * 0.022, u * 0.26, woodDark, sx * u * 0.05, F + u * 0.1, z0 - u * 0.01, 8, 0, 0, Math.PI / 2 + sx * 0.2); // logs
    // worded sign over the mantel (−z wall faces +z inward → reads head-on)
    box(u * 0.5, u * 0.16, u * 0.025, wood, 0, F + u * 0.66, z0 + u * 0.01);                 // sign frame
    mesh(new THREE.PlaneGeometry(u * 0.46, u * 0.13), tex(signTexture('WELCOME')), localM(0, F + u * 0.66, z0 + u * 0.026));
  }

  // ── framed picture on the +x wall (faces −x inward) ─────────────────────────
  {
    const x0 = h - u * 0.02, y0 = F + u * 0.42;
    box(u * 0.03, u * 0.42, u * 0.34, gold, x0, y0, 0);                                       // frame
    mesh(new THREE.PlaneGeometry(u * 0.26, u * 0.36), tex(pictureTexture()), localM(x0 - u * 0.025, y0, 0, 0, -Math.PI / 2, 0));
  }

  // ── chandelier from the ceiling ─────────────────────────────────────────────
  {
    const cy = h - u * 0.22;
    cyl(u * 0.012, u * 0.012, u * 0.2, metal, 0, h - u * 0.1, 0, 8);                          // rod
    mesh(new THREE.TorusGeometry(u * 0.16, u * 0.018, 8, 22), metal, localM(0, cy, 0, Math.PI / 2)); // ring
    const bulb = emis(0xffddaa, 1.1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, r = u * 0.16;
      cyl(u * 0.014, u * 0.014, u * 0.07, std(0xeee3c0), Math.cos(a) * r, cy + u * 0.04, Math.sin(a) * r, 8); // candle
      mesh(new THREE.SphereGeometry(u * 0.022, 10, 8), bulb, localM(Math.cos(a) * r, cy + u * 0.09, Math.sin(a) * r)); // flame
    }
    mesh(new THREE.SphereGeometry(u * 0.03, 12, 10), metal, localM(0, cy - u * 0.02, 0));     // hub
  }
}
