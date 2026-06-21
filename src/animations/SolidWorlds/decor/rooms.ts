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
  /** Current wall opacity (the Wall opacity slider); 1 = fully opaque. */
  wallOpacity: number;
  /** Engine sink for the wall materials, so the slider can update them live. */
  onWallMaterial: (m: THREE.MeshStandardMaterial) => void;
}

// Faint axis tint on the solid walls (X warm · Y green · Z blue) — orientation
// without the busy arrows.
const WALL_TINT: Record<Axis, number> = { x: 0x6f5a54, y: 0x566b5d, z: 0x556071 };

/**
 * A small **Klein bottle** ornament — the classic immersed "bottle" (the neck
 * dives through the wall and reopens into the base). Sampled from the standard
 * figure-of-the-bottle immersion, then normalized to unit max-dimension and
 * centered at the origin, so the caller just scales + places it.
 */
function kleinBottleGeometry(seg = 44): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  const P = (u: number, v: number): [number, number, number] => {
    const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
    const x = -2 / 15 * cu * (3 * cv - 30 * su + 90 * cu ** 4 * su - 60 * cu ** 6 * su + 5 * cu * cv * su);
    const y = -1 / 15 * su * (3 * cv - 3 * cv * cu ** 2 - 48 * cv * cu ** 4 + 48 * cv * cu ** 6
      - 60 * su + 5 * cu * cv * su - 5 * cu ** 3 * cv * su - 80 * cu ** 5 * cv * su + 80 * cu ** 7 * cv * su);
    const z = 2 / 15 * (3 + 5 * cu * su) * sv;
    return [x, y, z];
  };
  for (let i = 0; i <= seg; i++) for (let j = 0; j <= seg; j++) {
    const [x, y, z] = P(i / seg * 2 * Math.PI, j / seg * 2 * Math.PI); pos.push(x, y, z);
  }
  const row = seg + 1;
  for (let i = 0; i < seg; i++) for (let j = 0; j < seg; j++) {
    const a = i * row + j, b = (i + 1) * row + j, c = (i + 1) * row + j + 1, d = i * row + j + 1;
    idx.push(a, b, d, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const size = new THREE.Vector3(); bb.getSize(size);
  const ctr = new THREE.Vector3(); bb.getCenter(ctr);
  g.translate(-ctr.x, -ctr.y, -ctr.z);
  g.scale(1 / Math.max(size.x, size.y, size.z), 1 / Math.max(size.x, size.y, size.z), 1 / Math.max(size.x, size.y, size.z));
  g.computeVertexNormals();
  return g;
}

export function buildRoomsDecor(ctx: DecorBuildContext) {
  const { U: u, h, mesh, std, localM, addDisposable, wallOpacity, onWallMaterial } = ctx;
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
  //
  // Besides the floor-standing arch (the doorway), each wall carries a **duct**
  // opening that runs UP to the ceiling in the opposite corner (open at the top
  // edge, just as the arch is open at the floor). In worlds that flip the room
  // top↔bottom, the gluing carries that ceiling duct DOWN to floor level in the
  // next copy — so there's a visible, foot-level opening exactly where you cross,
  // instead of clipping through a blank wall while the arch hangs from the ceiling.
  // It's a steel-framed rectangle so it never reads as a doorway.
  const DUCT = { u: -H * 0.42, halfW: H * 0.13, vBot: H * 0.42 };  // open at the ceiling (top = +H)
  const ductHole = () => {
    const p = new THREE.Path();
    p.moveTo(DUCT.u - DUCT.halfW, H);
    p.lineTo(DUCT.u - DUCT.halfW, DUCT.vBot);
    p.lineTo(DUCT.u + DUCT.halfW, DUCT.vBot);
    p.lineTo(DUCT.u + DUCT.halfW, H);
    p.closePath();
    return p;
  };
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
    s.holes.push(ductHole());                       // square ceiling duct
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
  // arch) but can be made faintly translucent with the Wall opacity slider, so a
  // hint of the surrounding copies glows through. depthWrite stays ON — the
  // nearest wall occludes the ones behind it, so the tiled panels don't flicker
  // the way fully transparent panes did.
  const wallMat = (a: Axis) => {
    const m = new THREE.MeshStandardMaterial({
      color: WALL_TINT[a], roughness: 0.85, metalness: 0.05,
      transparent: wallOpacity < 0.999, opacity: wallOpacity, depthWrite: true, side: THREE.DoubleSide,
    });
    addDisposable(m); onWallMaterial(m); return m;
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

  // ── arch moldings: a casing band hugging each opening, proud of the wall so the
  // arch reads as built architecture (jambs + an arched header) rather than a clean
  // cut. The band follows the opening (open at the floor) and extrudes inward.
  const casing = std(0x7a5a3a);
  const archCasingGeo = (u0: number, halfW: number, vTop: number, m: number, depth: number) => {
    const s = new THREE.Shape();
    s.moveTo(u0 - halfW - m, -H);
    s.lineTo(u0 - halfW - m, vTop);
    s.absarc(u0, vTop, halfW + m, Math.PI, 0, true);   // outer arch over the top
    s.lineTo(u0 + halfW + m, -H);
    s.lineTo(u0 + halfW, -H);
    s.lineTo(u0 + halfW, vTop);
    s.absarc(u0, vTop, halfW, 0, Math.PI, false);      // inner arch (back the other way)
    s.lineTo(u0 - halfW, -H);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    addDisposable(g); return g;
  };
  const buildCasing = (a: Axis) => {
    const ti = axisIndex(a);
    const uIdx = a === 'x' ? 2 : 0, vIdx = 1;
    const M = new THREE.Matrix4().makeBasis(unit(uIdx), unit(vIdx), unit(ti)).setPosition(unit(ti, -h * 0.999));
    mesh(archCasingGeo(H * 0.42, H * 0.24, -H * 0.05, H * 0.045, u * 0.06), casing, M);
  };
  buildCasing('x');
  buildCasing('z');
  // trapdoor rim: a low raised ring around the floor hole, the hatch's casing.
  {
    const rim = new THREE.TorusGeometry(H * 0.27, u * 0.02, 8, 28);
    addDisposable(rim);
    mesh(rim, casing, localM(-h * 0.42, F + u * 0.015, h * 0.42, -Math.PI / 2));
  }

  // ── duct frames: a steel square casing around each ceiling duct, so it reads as
  // industrial ductwork (not a doorway). Same basis as the arch casing.
  const steel = new THREE.MeshStandardMaterial({ color: 0x767c84, roughness: 0.5, metalness: 0.6 });
  addDisposable(steel);
  // Casing follows the duct: jambs + a bottom sill, open at the ceiling (the duct's
  // top), mirroring how the arch casing is open at the floor.
  const ductCasingGeo = (m: number, depth: number) => {
    const { u, halfW, vBot } = DUCT;
    const s = new THREE.Shape();
    s.moveTo(u - halfW - m, H);
    s.lineTo(u - halfW - m, vBot - m);
    s.lineTo(u + halfW + m, vBot - m);
    s.lineTo(u + halfW + m, H);
    s.lineTo(u + halfW, H);
    s.lineTo(u + halfW, vBot);
    s.lineTo(u - halfW, vBot);
    s.lineTo(u - halfW, H);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    addDisposable(g); return g;
  };
  const buildDuctCasing = (a: Axis) => {
    const ti = axisIndex(a);
    const uIdx = a === 'x' ? 2 : 0, vIdx = 1;
    const M = new THREE.Matrix4().makeBasis(unit(uIdx), unit(vIdx), unit(ti)).setPosition(unit(ti, -h * 0.999));
    mesh(ductCasingGeo(H * 0.03, u * 0.07), steel, M);
  };
  buildDuctCasing('x');
  buildDuctCasing('z');

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
    mesh(new THREE.PlaneGeometry(u * 0.42, u * 0.12), texMat(signTexture('Hello')), localM(cx, F + u * 0.64, z0 + u * 0.026));
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

  // ── bookshelf on the +x side wall, toward −z (clear of the +z arch; under the
  // ceiling duct). An OPEN case — back + sides + top/bottom + shelf boards — whose
  // open front faces the room (−x), so the books, a plant, and a small glass Klein
  // bottle on the shelves read from inside. On a side wall it shows at a nice angle
  // and stays clear of the default third-person camera (which sits behind the
  // walker, near the +z wall). ──────────────────────────────────────────────────
  {
    const x0 = h - u * 0.1, bz = -u * 0.16;                 // center; back panel toward +x wall
    const w = u * 0.5, dep = u * 0.18, ht = u * 0.8, baseY = F + u * 0.4, t = u * 0.02;
    const xBack = x0 + dep / 2 - t / 2;                     // back panel, toward the wall
    const xFront = x0 - dep / 2;                            // open mouth, toward the room
    box(t, ht, w, woodDark, xBack, baseY, bz);                                   // back
    box(dep, ht, t, woodDark, x0, baseY, bz - w / 2 + t / 2);                    // −z side
    box(dep, ht, t, woodDark, x0, baseY, bz + w / 2 - t / 2);                    // +z side
    box(dep, t, w, woodDark, x0, baseY + ht / 2 - t / 2, bz);                    // top
    box(dep, t, w, woodDark, x0, baseY - ht / 2 + t / 2, bz);                    // bottom
    const shelfY = (k: number) => F + t + k * u * 0.19;
    for (let k = 1; k < 4; k++) box(dep - t, t, w - 2 * t, wood, x0, shelfY(k), bz); // boards (k=0 is the bottom panel)
    // books — spines toward the open front; shelves 1 & 2 stop short on the +z end
    // to make room for the plant and the Klein bottle.
    const bookMats = [0x9c3b34, 0x3a6ea5, 0x4f8a4f, 0xb0904a, 0x6b4a8a, 0x7a5a3a].map((c) => std(c));
    const bws = [0.030, 0.022, 0.034, 0.026, 0.030, 0.024, 0.032];
    const bhs = [0.150, 0.130, 0.160, 0.140, 0.155, 0.135, 0.145];
    const bd = dep * 0.6, bookX = xFront + bd / 2 + u * 0.012;
    const zLeft = bz - w / 2 + t + u * 0.012;
    for (let k = 0; k < 4; k++) {
      const sy = shelfY(k), zEnd = (k === 1 || k === 2) ? bz + w * 0.04 : bz + w / 2 - t - u * 0.012;
      let z = zLeft, j = k;
      while (z < zEnd) {
        const bw = u * bws[j % bws.length], bh = u * bhs[j % bhs.length];
        box(bd, bh, bw, bookMats[j % bookMats.length], bookX, sy + t / 2 + bh / 2, z + bw / 2);
        z += bw + u * 0.004; j++;
      }
    }
    // potted plant on shelf 2 (+z end)
    {
      const pz = bz + w * 0.3, py = shelfY(2) + t / 2, px = xFront + dep * 0.32;
      cyl(u * 0.045, u * 0.032, u * 0.06, std(0x9a5a3e), px, py + u * 0.03, pz, 14);   // terracotta pot
      const leaf = std(0x3f7d44);
      for (const [dx, dy, dz, r] of [[0, 0.1, 0, 0.05], [-0.012, 0.07, 0.035, 0.036], [0.012, 0.075, -0.035, 0.036], [0, 0.145, 0, 0.032]] as const)
        mesh(new THREE.SphereGeometry(u * r, 10, 8), leaf, localM(px + u * dx, py + u * dy, pz + u * dz));
    }
    // small glass Klein bottle on shelf 1 (+z end)
    {
      const pz = bz + w * 0.3, ky = shelfY(1) + t / 2, kx = xFront + dep * 0.32, kScale = u * 0.17;
      const kg = kleinBottleGeometry(); addDisposable(kg);
      const km = new THREE.MeshStandardMaterial({ color: 0x9fd9e6, roughness: 0.2, metalness: 0.25, side: THREE.DoubleSide, emissive: 0x1b3640, emissiveIntensity: 0.5 });
      addDisposable(km);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.7, Math.PI / 2));
      const M = new THREE.Matrix4().compose(new THREE.Vector3(kx, ky + kScale * 0.5, pz), q, new THREE.Vector3(kScale, kScale, kScale));
      mesh(kg, km, M);
    }
  }

  // ── wardrobe on the +z wall, toward the center (clear of the +x arch); a flat
  // front so it barely peeks past the cutaway behind the default camera ──────────
  {
    const z0 = h - u * 0.09, cx2 = -u * 0.05, dw = u * 0.42, depz = u * 0.16, bodyY = F + u * 0.37;
    box(dw, u * 0.72, depz, wood, cx2, bodyY, z0);                              // body
    for (const sx of [-1, 1]) box(dw * 0.46, u * 0.64, u * 0.012, woodDark, cx2 + sx * dw * 0.24, bodyY, z0 - depz / 2 - u * 0.006); // doors
    for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(u * 0.018, 10, 8), gold, localM(cx2 + sx * u * 0.03, bodyY, z0 - depz / 2 - u * 0.012)); // knobs
    box(dw * 1.06, u * 0.04, depz * 1.15, woodDark, cx2, F + u * 0.745, z0);    // cornice
  }
}
