import * as THREE from 'three';
import { makeFootprintTrail } from './footprints';
import { makeCharacter, Character } from './character';
import { EngineDeps, EngineOptions, FrameInput, WorldEngine, FlatMapState } from './engine';

const L = 30;             // fundamental-domain side
const K = 2;              // render (2K+1)^2 cells around the player
const EYE = 1.7;
const TRAIL_MAX = 1500;
const TRAIL_SPACING = 1.6;   // distance between footprints
const UP_Y = new THREE.Vector3(0, 1, 0);

interface Pillar { x: number; z: number; color: number; label: string }
const PILLARS: Pillar[] = [
  { x: -9, z: -7, color: 0xff5a5a, label: '1' },
  { x: 8, z: -9, color: 0x5ad1ff, label: '2' },
  { x: -6, z: 8, color: 0x8aff6a, label: '3' },
  { x: 10, z: 6, color: 0xffd24a, label: '4' },
  { x: 0, z: 0, color: 0xc08aff, label: '5' },
  { x: -12, z: 2, color: 0xff9a3d, label: '6' },
  { x: 4, z: 12, color: 0xff6ad5, label: '7' },
];

/** Number + arrow on a transparent tile; the arrow/number reverse under a
 *  mirror, which is exactly how you spot the Klein flip. */
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
  // arrow ▶ to the right of the number
  ctx.beginPath();
  ctx.moveTo(s * 0.6, s * 0.34); ctx.lineTo(s * 0.84, s * 0.5); ctx.lineTo(s * 0.6, s * 0.66);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function floorTexture(): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#11131c'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#283042'; ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cvs);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set((2 * K + 3) * L / 3, (2 * K + 3) * L / 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A distinct, stable hue for each copy of the fundamental domain in the universal
// cover. Golden-ratio steps in each axis keep neighbours well-separated and avoid
// repeats over the few cells on screen; the result reads as a patchwork that makes
// the tiling (and your motion between copies) obvious.
const _cellCol = new THREE.Color();
function cellColor(I: number, J: number): THREE.Color {
  const hue = (((I * 0.61803399 + J * 0.27639320) % 1) + 1) % 1;
  return _cellCol.setHSL(hue, 0.6, 0.55);
}

/**
 * Geometry + materials for the landmarks, built once and shared across every
 * rendered cell (meshes are still per-cell, but the heavy buffers/textures are
 * not). Each landmark has two forms keyed by orientation class: a **column** and
 * a **tree** of the same identifying colour. The flat Klein bottle shows columns
 * on one class of cell and trees on the mirror class, so crossing the red (flip)
 * edge swaps every landmark from one form to the other — the orientation flip
 * made impossible to miss. Both forms carry the same numbered/arrow decal, which
 * additionally reads reversed through a mirrored cell.
 */
interface SharedDecor {
  columnGeo: THREE.CylinderGeometry;
  trunkGeo: THREE.CylinderGeometry;
  foliageGeo: THREE.ConeGeometry;
  decalGeo: THREE.PlaneGeometry;
  /** L×L floor tile, one tinted copy per cell when "colour the covers" is on. */
  tileGeo: THREE.PlaneGeometry;
  columnMats: THREE.MeshStandardMaterial[];
  foliageMats: THREE.MeshStandardMaterial[];
  trunkMat: THREE.MeshStandardMaterial;
  decalMats: THREE.MeshBasicMaterial[];
  decalTexs: THREE.CanvasTexture[];
  dispose: () => void;
}

function makeSharedDecor(): SharedDecor {
  const columnGeo = new THREE.CylinderGeometry(0.8, 0.8, 3.2, 18);
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.4, 2.0, 12);
  const foliageGeo = new THREE.ConeGeometry(1.35, 3.0, 14);
  const decalGeo = new THREE.PlaneGeometry(1.5, 1.5);
  const tileGeo = new THREE.PlaneGeometry(L, L);

  const columnMats: THREE.MeshStandardMaterial[] = [];
  const foliageMats: THREE.MeshStandardMaterial[] = [];
  const decalMats: THREE.MeshBasicMaterial[] = [];
  const decalTexs: THREE.CanvasTexture[] = [];

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.85 });

  for (const p of PILLARS) {
    columnMats.push(new THREE.MeshStandardMaterial({
      color: p.color, emissive: p.color, emissiveIntensity: 0.3, roughness: 0.5, side: THREE.DoubleSide,
    }));
    // Foliage keeps the landmark's identifying colour (so "the red one" stays the
    // red one whether it's a tree or a column), tinted toward leafy green.
    const leaf = new THREE.Color(p.color).lerp(new THREE.Color(0x3a8a3a), 0.55);
    foliageMats.push(new THREE.MeshStandardMaterial({
      color: leaf, emissive: leaf, emissiveIntensity: 0.18, roughness: 0.7,
    }));
    const tex = labelTexture(p.label, p.color);
    decalTexs.push(tex);
    decalMats.push(new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  }

  return {
    columnGeo, trunkGeo, foliageGeo, decalGeo, tileGeo,
    columnMats, foliageMats, trunkMat, decalMats, decalTexs,
    dispose: () => {
      columnGeo.dispose(); trunkGeo.dispose(); foliageGeo.dispose(); decalGeo.dispose(); tileGeo.dispose();
      trunkMat.dispose();
      columnMats.forEach((m) => m.dispose());
      foliageMats.forEach((m) => m.dispose());
      decalMats.forEach((m) => m.dispose());
      decalTexs.forEach((t) => t.dispose());
    },
  };
}

interface Built {
  group: THREE.Group;
  trees: THREE.Group;
  columns: THREE.Group;
  /** Reflected copy of the decor hanging below the glass floor — the Klein
   *  "other side", shown with the opposite skin and revealed by clearing the
   *  floor. Held in `under` (scaled y=-1); its two skins toggle like the top. */
  under: THREE.Group;
  underTrees: THREE.Group;
  underColumns: THREE.Group;
  /** Translucent floor tile, tinted per (I,J) to make the cover tiling visible. */
  tileMat: THREE.MeshBasicMaterial;
  tile: THREE.Mesh;
  /** Per-cell "twin" avatar, built lazily the first time projection is enabled. */
  ghost: Character | null;
  dispose: () => void;
}

/** A single landmark in column form: a coloured pillar + its numbered decal. */
function makeColumnProp(d: SharedDecor, i: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(d.columnGeo, d.columnMats[i]);
  body.position.y = 1.6;
  g.add(body);
  const decal = new THREE.Mesh(d.decalGeo, d.decalMats[i]);
  decal.position.set(0.82, 1.9, 0);
  decal.rotation.y = Math.PI / 2; // face +x
  g.add(decal);
  return g;
}

/** The same landmark in tree form: trunk + coloured foliage + its decal. */
function makeTreeProp(d: SharedDecor, i: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(d.trunkGeo, d.trunkMat);
  trunk.position.y = 1.0;
  g.add(trunk);
  const foliage = new THREE.Mesh(d.foliageGeo, d.foliageMats[i]);
  foliage.position.y = 3.2;
  g.add(foliage);
  const decal = new THREE.Mesh(d.decalGeo, d.decalMats[i]);
  decal.position.set(0.82, 1.9, 0);
  decal.rotation.y = Math.PI / 2; // face +x
  g.add(decal);
  return g;
}

/** One copy of the fundamental domain: the landmarks (in both forms, one shown
 *  at a time) and a coloured boundary square. The footprint trail is *not* a
 *  child of the cell — it is tiled separately, relative to the player's own
 *  cell, so it can sit on the correct side of the glass (see the frame loop). */
function buildCell(d: SharedDecor): Built {
  const group = new THREE.Group();
  const disposers: (() => void)[] = [];

  const trees = new THREE.Group();
  const columns = new THREE.Group();
  // The other-side copy hangs below the glass, wearing the opposite skin. It is
  // the genuine *other face*: reflected through the floor AND mirrored across the
  // twist axis (z). The z-mirror matters for the chiral marks — a flat footprint
  // decal viewed from above is unchanged by a y-flip alone, so without it the
  // underside trail would render face-up, identical to the top. With it, the
  // prints read reversed and face-down through the glass, as they should.
  const under = new THREE.Group();
  under.scale.set(1, -1, -1);
  under.visible = false;
  const underTrees = new THREE.Group();
  const underColumns = new THREE.Group();
  for (let i = 0; i < PILLARS.length; i++) {
    const p = PILLARS[i];
    const col = makeColumnProp(d, i); col.position.set(p.x, 0, p.z); columns.add(col);
    const tree = makeTreeProp(d, i); tree.position.set(p.x, 0, p.z); trees.add(tree);
    const ucol = makeColumnProp(d, i); ucol.position.set(p.x, 0, p.z); underColumns.add(ucol);
    const utree = makeTreeProp(d, i); utree.position.set(p.x, 0, p.z); underTrees.add(utree);
  }
  under.add(underTrees, underColumns);
  group.add(trees);
  group.add(columns);
  group.add(under);

  // A translucent tile filling the cell, tinted per (I,J) each frame so each copy
  // of the fundamental domain in the universal cover reads as a distinct colour.
  // Hidden unless "colour the covers" is on. depthWrite off so it doesn't occlude
  // the glass reveal of the underside.
  const tileMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide,
  });
  const tile = new THREE.Mesh(d.tileGeo, tileMat);
  tile.rotation.x = -Math.PI / 2;
  tile.position.y = 0.02;
  tile.visible = false;
  group.add(tile);
  disposers.push(() => tileMat.dispose());

  // boundary square: left/right edges red (the "flip" gluing on a Klein
  // bottle), top/bottom edges blue.
  const h = L / 2, y = 0.04;
  const segs: [THREE.Vector3, THREE.Vector3, THREE.Color][] = [
    [new THREE.Vector3(-h, y, -h), new THREE.Vector3(-h, y, h), new THREE.Color(0xff4060)], // left
    [new THREE.Vector3(h, y, -h), new THREE.Vector3(h, y, h), new THREE.Color(0xff4060)],   // right
    [new THREE.Vector3(-h, y, -h), new THREE.Vector3(h, y, -h), new THREE.Color(0x4080ff)], // bottom
    [new THREE.Vector3(-h, y, h), new THREE.Vector3(h, y, h), new THREE.Color(0x4080ff)],   // top
  ];
  const lpos: number[] = [], lcol: number[] = [];
  for (const [a, c, col] of segs) {
    lpos.push(a.x, a.y, a.z, c.x, c.y, c.z);
    lcol.push(col.r, col.g, col.b, col.r, col.g, col.b);
  }
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(lpos, 3));
  edgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(lcol, 3));
  const edgeMat = new THREE.LineBasicMaterial({ vertexColors: true });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));
  disposers.push(() => { edgeGeo.dispose(); edgeMat.dispose(); });

  return { group, trees, columns, under, underTrees, underColumns, tileMat, tile, ghost: null, dispose: () => disposers.forEach((dd) => dd()) };
}

/**
 * The flat "open space" engine. Walks an intrinsically flat torus or Klein
 * bottle; the edge-gluing is shown by tiling the fundamental domain (the
 * universal cover) around the player, so movement is ordinary flat walking —
 * nothing flips locally, you only discover the topology by travelling.
 *
 * On the Klein bottle, every other column of cells is mirror-reflected (the red
 * edges glue with a flip). To make that flip legible rather than invisible, the
 * two orientation classes wear different skins — **columns** on one, **trees** on
 * the mirror — over a glassy floor. You drop one footprint per step on the side
 * you walk; the trail is tiled *relative to your own cell*, so a neighbour that
 * differs by a twist re-expresses your prints on the underside of the glass,
 * mirror-reversed. Walk the twist back to the start and your earlier prints slide
 * under the glass (you're now on the other side); cross the blue (roll) edges and
 * nothing flips. There is no consistent way to skin the whole world with one form
 * — that impossibility *is* the Klein bottle's non-orientability.
 */
export function makeFlatEngine(deps: EngineDeps, opts: EngineOptions): WorldEngine {
  const { scene, camera, renderer } = deps;
  let klein = opts.surfaceId === 'klein';
  let projectAvatar = opts.projectAvatar;
  let floorOpacityVal = opts.floorOpacity;
  let colorCells = opts.colorCells;

  // player state
  let px = 2, pz = 2;
  let stridePhase = 0;
  let trailLast: THREE.Vector2 | null = null;

  // Live position/heading inside the fundamental domain, sampled by the mini-map.
  const mapState: FlatMapState = { u: 0.5, v: 0.5, hx: 0, hz: -1, flipped: false, klein };

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  camera.fov = 75; camera.near = 0.05; camera.far = 400; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);

  scene.background = new THREE.Color(0x070912);
  scene.fog = new THREE.Fog(0x070912, L * 0.6, L * 2.6);

  const root = new THREE.Group();
  scene.add(root);

  root.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(0.4, 1, 0.3);
  root.add(dir);

  // A glassy floor: translucent + double-sided, so the trail shows "through" it
  // and the underside reads as the other face of the surface. The opacity is a
  // live knob — turn it down to clear glass to see the other side of the world.
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTexture(), color: 0x2a3a52, roughness: 0.18, metalness: 0.1,
    transparent: true, opacity: opts.floorOpacity, side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry((2 * K + 3) * L, (2 * K + 3) * L), floorMat);
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  function applyFloorOpacity(o: number) {
    floorOpacityVal = o;
    floorMat.opacity = o;
    floorMat.visible = o > 0.01;
    // Clear glass shouldn't occlude depth, so the far side reads through it.
    floorMat.depthWrite = o >= 0.98;
  }
  applyFloorOpacity(opts.floorOpacity);

  const decor = makeSharedDecor();
  const foot = makeFootprintTrail(TRAIL_MAX);
  const character = makeCharacter();
  root.add(character.group);

  const cells: Built[] = [];
  for (let i = 0; i < (2 * K + 1) * (2 * K + 1); i++) {
    const built = buildCell(decor);
    built.group.matrixAutoUpdate = false;
    root.add(built.group);
    cells.push(built);
  }

  // The footprint trail lives in true (cover) coordinates and is tiled around the
  // player with its own per-cell meshes — one per rendered cell, sharing the one
  // trail buffer — so each tile can land the trail on the correct side of the
  // glass relative to the player (top when same orientation, underside when the
  // tile differs by a twist). See the frame loop for the relative transform.
  const footMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < (2 * K + 1) * (2 * K + 1); i++) {
    const fm = new THREE.Mesh(foot.geometry, foot.material);
    fm.frustumCulled = false;
    fm.matrixAutoUpdate = false;
    root.add(fm);
    footMeshes.push(fm);
  }

  const M = new THREE.Matrix4();
  const S = new THREE.Matrix4();
  const Mf = new THREE.Matrix4();
  const Sf = new THREE.Matrix4();

  // Twin avatars are allocated lazily — one per cell — only once the player turns
  // projection on, so the default walk pays nothing for them.
  let ghostsBuilt = false;
  function ensureGhosts() {
    if (ghostsBuilt) return;
    for (const cell of cells) {
      const g = makeCharacter();
      g.group.visible = false;
      cell.group.add(g.group);
      cell.ghost = g;
    }
    ghostsBuilt = true;
  }

  function clearTrail() { foot.clear(); trailLast = null; }

  function frame(input: FrameInput) {
    const { dt, fwd, strafe, yaw, pitch } = input;
    const moving = !!(fwd || strafe);
    if (moving) {
      const v = input.moveSpeed * dt;
      const sy = Math.sin(yaw), cy = Math.cos(yaw);
      // forward = (sin yaw, -cos yaw); right = (cos yaw, sin yaw)
      px += (fwd * sy + strafe * cy) * v;
      pz += (fwd * -cy + strafe * sy) * v;
      stridePhase += dt * input.moveSpeed * 1.4;
    }

    const cp = Math.cos(pitch);
    const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)); // heading on the floor

    const charRight = new THREE.Vector3().crossVectors(UP_Y, forward).normalize();
    character.group.position.set(px, 0, pz);
    character.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(charRight, UP_Y, forward));
    // When projecting twins, the home-cell twin stands in for the player, so the
    // standalone avatar steps aside to avoid drawing two in the same spot.
    character.group.visible = input.thirdPerson && !projectAvatar;
    character.stride(stridePhase);

    if (input.thirdPerson) {
      const aspect = camera.aspect || 1;
      const distScale = Math.min(1.6, Math.max(1, 1 / Math.min(aspect, 1)));
      const D = 3.2 * distScale;
      const camPos = new THREE.Vector3(px, 0, pz)
        .addScaledVector(forward, -D)
        .addScaledVector(UP_Y, 2.2 + pitch * 1.6);
      camera.up.set(0, 1, 0);
      camera.position.copy(camPos);
      camera.lookAt(px + forward.x * 0.5, 1.3, pz + forward.z * 0.5);
    } else {
      const look = new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
      camera.up.set(0, 1, 0);
      camera.position.set(px, EYE, pz);
      camera.lookAt(px + look.x, EYE + look.y, pz + look.z);
    }
    floor.position.set(px, 0, pz);
    (floor.material as THREE.MeshStandardMaterial).map!.offset.set(px / 3, -pz / 3);

    // Player position in base (quotient) coords, reused by the trail and the
    // twin avatars. sz0 bakes in the home cell's mirror parity so the home copy
    // lands exactly on the player.
    const I0 = Math.round(px / L), J0 = Math.round(pz / L);
    const sz0 = klein && (I0 & 1) ? -1 : 1;
    const bx = px - I0 * L;
    const bz = sz0 * (pz - J0 * L);

    // Mini-map sample: position in the domain (0..1) plus heading in the domain
    // frame. Reducing through sz0 means the x-wrap already mirrors v on the Klein
    // bottle, so the marker re-enters the far edge flipped — the gluing made live.
    mapState.u = bx / L + 0.5;
    mapState.v = bz / L + 0.5;
    const mhx = forward.x, mhz = sz0 * forward.z, mhl = Math.hypot(mhx, mhz) || 1;
    mapState.hx = mhx / mhl;
    mapState.hz = mhz / mhl;
    mapState.flipped = klein && (I0 & 1) !== 0;
    mapState.klein = klein;

    // Shared local pose for the twin avatars; each cell's own matrix then mirrors
    // it where that cell is mirrored.
    if (projectAvatar) ensureGhosts();
    const gForward = new THREE.Vector3(forward.x, 0, sz0 * forward.z).normalize();
    const gRight = new THREE.Vector3().crossVectors(UP_Y, gForward).normalize();
    const gQuat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(gRight, UP_Y, gForward));

    // Tile the fundamental domain around the player. On the Klein bottle, odd
    // columns are mirror-reflected (the red flip) and wear the alternate skin
    // (trees vs columns); the torus shows columns everywhere (orientable).
    // Skip the under-floor copy once the glass is solid enough to hide it.
    const showUnder = floorOpacityVal < 0.95;
    let idx = 0;
    for (let di = -K; di <= K; di++) {
      for (let dj = -K; dj <= K; dj++) {
        const I = I0 + di, J = J0 + dj;
        const flipped = klein && (I & 1) !== 0;
        const sz = flipped ? -1 : 1;
        S.makeScale(1, 1, sz);
        M.makeTranslation(I * L, 0, J * L).multiply(S);
        const cell = cells[idx++];
        cell.group.matrix.copy(M);
        // Trees on the flipped class, columns otherwise (torus: columns only).
        cell.trees.visible = flipped;
        cell.columns.visible = !flipped;
        // The underside is the other face: opposite skin, reflected below.
        cell.under.visible = showUnder;
        if (showUnder) {
          cell.underTrees.visible = !flipped;
          cell.underColumns.visible = flipped;
        }
        // Tint this copy of the domain so the universal-cover tiling is visible.
        cell.tile.visible = colorCells;
        if (colorCells) cell.tileMat.color.copy(cellColor(I, J));
        // Project a twin into this cell — but ONLY where the cell has the same
        // orientation as you. Crossing the twist once leaves you mirror-reversed
        // (the "opposite side"), so the nearest identical copy of you is two
        // squares away across the twist (2L) but only one square away across the
        // roll (L) — the twist takes twice as long to walk. The mirror-flipped
        // cells in between hold no twin (that copy is on the far side).
        if (cell.ghost) {
          const mirroredRelHome = klein && ((I - I0) & 1) !== 0;
          if (projectAvatar && !mirroredRelHome) {
            const isHome = I === I0 && J === J0;
            cell.ghost.group.position.set(bx, 0, bz);
            cell.ghost.group.quaternion.copy(gQuat);
            cell.ghost.stride(stridePhase);
            // In first person, hide your own copy — you're standing inside it.
            cell.ghost.group.visible = !(isHome && !input.thirdPerson);
          } else {
            cell.ghost.group.visible = false;
          }
        }

        // Tile the (cover-coordinate) trail into this cell *relative to the
        // player's own cell*, so the home copy is the identity — you always see
        // your own footprints upright, on top, on the side you walk. A neighbour
        // an odd number of columns away differs from you by a twist (an
        // orientation flip), so its copy of the trail drops to the underside of
        // the glass and reads mirror-reversed: same forward direction (the twist
        // mirrors the transverse axis, not your heading), swapped chirality. Even
        // offsets are pure translations and stay on top. Walking the twist back
        // to the start is exactly what slides your old prints under the glass.
        const fm = footMeshes[idx - 1];
        if (klein && ((di & 1) !== 0)) {
          Sf.makeScale(1, -1, -1); // reflect under the floor (y) + mirror twist (z)
          Mf.makeTranslation(di * L, 0, (2 * J0 + dj) * L).multiply(Sf);
          fm.visible = showUnder;
        } else {
          Mf.makeTranslation(di * L, 0, dj * L);
          fm.visible = true;
        }
        fm.matrix.copy(Mf);
      }
    }

    // One footprint per step, stored in true (cover) coordinates on the side the
    // player is actually walking. The tiling above is what re-expresses it on the
    // far side of the glass once you've crossed the twist; here we just record
    // the real path.
    const cur = new THREE.Vector2(px, pz);
    if (!trailLast || trailLast.distanceTo(cur) > TRAIL_SPACING) {
      let dwx: number, dwz: number;
      if (trailLast) { dwx = px - trailLast.x; dwz = pz - trailLast.y; }
      else { dwx = Math.sin(yaw); dwz = -Math.cos(yaw); }
      const len = Math.hypot(dwx, dwz) || 1;
      foot.append(new THREE.Vector3(px, 0, pz), new THREE.Vector3(dwx / len, 0, dwz / len), UP_Y);
      trailLast = cur;
    }

    renderer.render(scene, camera);
  }

  return {
    family: 'flat',
    frame,
    clearTrail,
    setSurface: (id) => { klein = id === 'klein'; clearTrail(); },
    setProjectAvatar: (on) => { projectAvatar = on; if (on) ensureGhosts(); },
    setFloorOpacity: (o) => applyFloorOpacity(o),
    setColorCells: (on) => { colorCells = on; },
    getMapState: () => mapState,
    dispose: () => {
      scene.remove(root);
      cells.forEach((c) => { c.ghost?.dispose(); c.dispose(); });
      decor.dispose();
      foot.dispose();
      character.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.MeshStandardMaterial).map?.dispose();
      (floor.material as THREE.Material).dispose();
    },
  };
}
