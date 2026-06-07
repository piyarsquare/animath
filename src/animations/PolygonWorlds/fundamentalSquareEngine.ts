import * as THREE from 'three';
import { makeFootprintTrail } from './footprints';
import { makeCharacter } from './character';
import { glassState, GlassSpec } from './glassSurface';
import { makeFundamentalSquareDecor } from './decor';
import { makeEuclideanCover, L } from './euclideanCover';
import { CoverModel } from './coverModel';
import { EngineDeps, FrameInput, PolygonEngine, SquareMapState } from './engineTypes';
import { WorldSpec, deriveGeometry } from './worldSpec';

const K = 2;
const CELLS = (2 * K + 1) * (2 * K + 1);
const TRAIL_MAX = 1500;
const TRAIL_SPACING = 1.6;
const GLASS: GlassSpec = { showUnderBelow: 0.95 };
const UP = new THREE.Vector3(0, 1, 0);

function floorTexture(): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#11131c'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#283042'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cvs);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set((2 * K + 3) * L / 3, (2 * K + 3) * L / 3);
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

/**
 * The one facade engine. It owns everything the four worlds share — the decorated
 * square's copies, the glass floor + mirrored underside, the footprint trail, the
 * avatar, lights, and the frame loop — and delegates only the universal-cover
 * math (movement, camera, where the square copies go, charting the player) to a
 * {@link CoverModel}. Euclidean worlds (torus, Klein) are realised now; the
 * spherical cover slots into the same seam.
 */
export function makeFundamentalSquareEngine(deps: EngineDeps, spec: WorldSpec): PolygonEngine {
  const { scene, camera, renderer } = deps;
  const geom = deriveGeometry(spec);

  let floorOpacity = 0.35;

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

  // glass floor
  const floorTex = floorTexture();
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex, color: 0x2a3a52, roughness: 0.18, metalness: 0.1,
    transparent: true, opacity: floorOpacity, side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry((2 * K + 3) * L, (2 * K + 3) * L), floorMat);
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  function applyFloorOpacity(o: number) {
    floorOpacity = o;
    const g = glassState(o, GLASS);
    floorMat.opacity = g.opacity;
    floorMat.visible = g.visible;
    floorMat.depthWrite = g.depthWrite;
  }
  applyFloorOpacity(floorOpacity);

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
    decor.props.forEach((p, i) => {
      const x = (p.u - 0.5) * L, z = (p.v - 0.5) * L;
      const col = decor.makeColumn(i); col.position.set(x, 0, z); columns.add(col);
      const tree = decor.makeTree(i); tree.position.set(x, 0, z); trees.add(tree);
      const ucol = decor.makeColumn(i); ucol.position.set(x, 0, z); underColumns.add(ucol);
      const utree = decor.makeTree(i); utree.position.set(x, 0, z); underTrees.add(utree);
    });
    under.add(underTrees, underColumns);
    group.add(trees, columns, under);
    root.add(group);
    cells.push({ group, trees, columns, under, underTrees, underColumns });
  }

  const foot = makeFootprintTrail(TRAIL_MAX);
  const footMesh = new THREE.Mesh(foot.geometry, foot.material);
  footMesh.frustumCulled = false;
  root.add(footMesh);
  let trailLast: THREE.Vector3 | null = null;

  const character = makeCharacter();
  root.add(character.group);
  let stridePhase = 0;

  let cover: CoverModel = makeEuclideanCover(spec);
  const mapState: SquareMapState = { u: 0.5, v: 0.5, hx: 0, hz: -1, flipped: false };

  function frame(input: FrameInput) {
    cover.update(input, camera);
    const p = cover.pose();

    // avatar
    const right = new THREE.Vector3().crossVectors(UP, p.forward).normalize();
    character.group.position.copy(p.position);
    character.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, p.up, p.forward));
    character.group.visible = input.thirdPerson;
    if (input.fwd || input.strafe) stridePhase += input.dt * input.moveSpeed * 1.4;
    character.stride(stridePhase);

    // floor follows the player (euclidean only; spherical owns its planet)
    floor.position.set(p.position.x, 0, p.position.z);
    floorTex.offset.set(p.position.x / 3, -p.position.z / 3);

    // place the square copies
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
        // the underside wears the opposite face
        cell.underTrees.visible = pl.face === 1;
        cell.underColumns.visible = pl.face === 0;
      }
    }

    // mini-map chart
    Object.assign(mapState, cover.chart());

    // footprint trail (one per step, on top)
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
