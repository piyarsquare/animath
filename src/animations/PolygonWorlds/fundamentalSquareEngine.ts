import * as THREE from 'three';
import { makeFootprintTrail } from './footprints';
import { makeCharacter } from './character';
import { glassState, GlassSpec } from './glassSurface';
import { makeFundamentalSquareDecor } from './decor';
import { makeEuclideanCover } from './euclideanCover';
import { CoverModel } from './coverModel';
import {
  EngineDeps, FrameInput, PolygonEngine, SquareMapState,
  DEFAULT_SQUARE_SIZE, DEFAULT_FLOOR_THICKNESS,
} from './engineTypes';
import { WorldSpec, deriveGeometry } from './worldSpec';

const K = 2;
const CELLS = (2 * K + 1) * (2 * K + 1);
const TRAIL_MAX = 1500;
const TRAIL_SPACING = 1.6;
const GLASS: GlassSpec = { showUnderBelow: 0.95 };
const UP = new THREE.Vector3(0, 1, 0);
const SKY = 0x070912;

/** A lit, gridded ground texture — bright enough to read as a *surface* against
 *  the near-black sky rather than blending into the void. */
function floorTexture(side: number): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#1c2a44'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#4a6796'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cvs);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set((2 * K + 3) * side / 3, (2 * K + 3) * side / 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Cell {
  group: THREE.Group;
  trees: THREE.Group;
  columns: THREE.Group;
  under: THREE.Group;
  underTrees: THREE.Group;
  underColumns: THREE.Group;
}

export interface EngineOptions {
  squareSize?: number;
  floorThickness?: number;
}

/**
 * The one facade engine. It owns everything the four worlds share — the decorated
 * square's copies, the glass floor + mirrored underside, the footprint trail, the
 * avatar, lights, and the frame loop — and delegates only the universal-cover
 * math to a {@link CoverModel}. Euclidean worlds (torus, Klein) are realised now;
 * the spherical cover slots into the same seam.
 */
export function makeFundamentalSquareEngine(deps: EngineDeps, spec: WorldSpec, opts: EngineOptions = {}): PolygonEngine {
  const { scene, camera, renderer } = deps;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const geom = deriveGeometry(spec);

  let side = opts.squareSize ?? DEFAULT_SQUARE_SIZE;
  let thickness = opts.floorThickness ?? DEFAULT_FLOOR_THICKNESS;
  let floorOpacity = 0.35;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  camera.fov = 75; camera.near = 0.05; camera.far = 400; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);

  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, side * 0.7, side * 3);

  const root = new THREE.Group();
  scene.add(root);
  root.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.75);
  dir.position.set(0.4, 1, 0.3);
  root.add(dir);

  // ── Glass floor: a coloured *slab* (a Box, not a paper-thin plane) so it reads
  // as solid ground with depth against the void, with a tunable thickness. ──────
  const floorTex = floorTexture(side);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex, color: 0x46658f, emissive: 0x0c1730, emissiveIntensity: 0.6,
    roughness: 0.5, metalness: 0.08, transparent: true, opacity: floorOpacity, side: THREE.DoubleSide,
  });
  const floorW = () => (2 * K + 3) * side;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(floorW(), thickness, floorW()), floorMat);
  root.add(floor);
  function applyFloorOpacity(o: number) {
    floorOpacity = o;
    const g = glassState(o, GLASS);
    floorMat.opacity = g.opacity;
    floorMat.visible = g.visible;
    floorMat.depthWrite = g.depthWrite;
  }
  applyFloorOpacity(floorOpacity);
  function rebuildFloorGeo() {
    floor.geometry.dispose();
    floor.geometry = new THREE.BoxGeometry(floorW(), thickness, floorW());
  }

  const decor = makeFundamentalSquareDecor();

  // build the (2K+1)² copies of the decorated square
  const cells: Cell[] = [];
  for (let c = 0; c < CELLS; c++) {
    const group = new THREE.Group();
    group.matrixAutoUpdate = false;
    const trees = new THREE.Group();
    const columns = new THREE.Group();
    const under = new THREE.Group();
    under.scale.set(1, -1, -1);
    under.visible = false;
    const underTrees = new THREE.Group();
    const underColumns = new THREE.Group();
    decor.props.forEach((_, i) => {
      columns.add(decor.makeColumn(i));
      trees.add(decor.makeTree(i));
      underColumns.add(decor.makeColumn(i));
      underTrees.add(decor.makeTree(i));
    });
    under.add(underTrees, underColumns);
    group.add(trees, columns, under);
    root.add(group);
    cells.push({ group, trees, columns, under, underTrees, underColumns });
  }

  /** Position the landmarks at the current square size (unit-square uv → side). */
  function placeDecor() {
    for (const cell of cells) {
      decor.props.forEach((p, i) => {
        const x = (p.u - 0.5) * side, z = (p.v - 0.5) * side;
        cell.columns.children[i].position.set(x, 0, z);
        cell.trees.children[i].position.set(x, 0, z);
        cell.underColumns.children[i].position.set(x, 0, z);
        cell.underTrees.children[i].position.set(x, 0, z);
      });
    }
  }
  placeDecor();

  const foot = makeFootprintTrail(TRAIL_MAX);
  const footMesh = new THREE.Mesh(foot.geometry, foot.material);
  footMesh.frustumCulled = false;
  root.add(footMesh);
  let trailLast: THREE.Vector3 | null = null;

  const character = makeCharacter();
  root.add(character.group);
  let stridePhase = 0;

  const cover: CoverModel = makeEuclideanCover(spec, side);
  const mapState: SquareMapState = { u: 0.5, v: 0.5, hx: 0, hz: -1, flipped: false };

  function frame(input: FrameInput) {
    cover.update(input, camera);
    const p = cover.pose();

    const right = new THREE.Vector3().crossVectors(UP, p.forward).normalize();
    character.group.position.copy(p.position);
    character.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, p.up, p.forward));
    character.group.visible = input.thirdPerson;
    if (input.fwd || input.strafe) stridePhase += input.dt * input.moveSpeed * 1.4;
    character.stride(stridePhase);

    // the slab's top sits at y=0; it follows the player (euclidean)
    floor.position.set(p.position.x, -thickness / 2, p.position.z);
    floorTex.offset.set(p.position.x / 3, -p.position.z / 3);

    const showUnder = glassState(floorOpacity, GLASS).showUnder;
    const places = cover.visibleSquares();
    for (let i = 0; i < cells.length && i < places.length; i++) {
      const cell = cells[i];
      const pl = places[i];
      cell.group.matrix.copy(pl.matrix);
      cell.trees.visible = pl.face === 0;
      cell.columns.visible = pl.face === 1;
      cell.under.visible = showUnder;
      if (showUnder) {
        cell.underTrees.visible = pl.face === 1;
        cell.underColumns.visible = pl.face === 0;
      }
    }

    Object.assign(mapState, cover.chart());

    const cur = cover.trailSample();
    if (!trailLast || trailLast.distanceTo(cur.pos) > TRAIL_SPACING) {
      let d: THREE.Vector3;
      if (trailLast) d = cur.pos.clone().sub(trailLast);
      else d = cur.forward.clone();
      if (d.lengthSq() < 1e-9) d = cur.forward.clone();
      foot.append(cur.pos, d.normalize(), cur.up);
      trailLast = cur.pos.clone();
    }

    renderer.render(scene, camera);
  }

  return {
    frame,
    clearTrail: () => { foot.clear(); trailLast = null; },
    setFloorOpacity: applyFloorOpacity,
    setColorCells: () => {},
    setRadius: () => {},
    setSquareSize: (v: number) => {
      side = v;
      cover.setSquareSize?.(v);
      placeDecor();
      rebuildFloorGeo();
      floorTex.repeat.set((2 * K + 3) * side / 3, (2 * K + 3) * side / 3);
      scene.fog = new THREE.Fog(SKY, side * 0.7, side * 3);
    },
    setFloorThickness: (t: number) => {
      thickness = t;
      rebuildFloorGeo();
    },
    getMapState: () => mapState,
    dispose: () => {
      scene.remove(root);
      cover.dispose();
      decor.dispose();
      foot.dispose();
      character.dispose();
      floor.geometry.dispose();
      floorTex.dispose();
      floorMat.dispose();
    },
  };
}
