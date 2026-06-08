import * as THREE from 'three';
import { makeCharacter } from './character';
import { makeFundamentalSquareDecor, DecorProp, DEFAULT_PROPS } from './decor';
import { makeEuclideanPresenter } from './presenters/euclidean';
import { makeSphericalPresenter } from './presenters/spherical';
import { makeHyperbolicPresenter } from './presenters/hyperbolic';
import { CoverModel } from './coverModel';
import {
  EngineDeps, FrameInput, PolygonEngine, SquareMapState,
  DEFAULT_SQUARE_SIZE, DEFAULT_FLOOR_THICKNESS,
} from './engineTypes';
import { WorldSpec, deriveGeometry } from './worldSpec';

const UP = new THREE.Vector3(0, 1, 0);

export interface EngineOptions {
  squareSize?: number;
  floorThickness?: number;
  props?: readonly DecorProp[];
}

/**
 * The thin facade engine. It owns only what is genuinely shared across the worlds
 * — lights, the walker avatar, and the frame orchestration — and delegates all
 * world-rendering + movement to a {@link CoverModel} chosen by the topology
 * ({@link deriveGeometry}): a Euclidean-plane cover for χ=0 (torus, Klein), a
 * spherical cover for χ>0 (ℝP², sphere), and a hyperbolic Poincaré-disk cover for
 * χ<0 (genus-2, cross-caps).
 */
export function makeFundamentalSquareEngine(deps: EngineDeps, spec: WorldSpec, opts: EngineOptions = {}): PolygonEngine {
  const { scene, camera } = deps;
  const geom = deriveGeometry(spec);
  const squareSize = opts.squareSize ?? DEFAULT_SQUARE_SIZE;
  const floorThickness = opts.floorThickness ?? DEFAULT_FLOOR_THICKNESS;

  const root = new THREE.Group();
  scene.add(root);
  root.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(0.5, 1, 0.35);
  root.add(dir);

  const decor = makeFundamentalSquareDecor(opts.props ?? DEFAULT_PROPS);

  const coverDeps = { deps, root, spec, decor, squareSize, floorThickness };
  const cover: CoverModel =
    geom.cover === 'spherical' ? makeSphericalPresenter(coverDeps)
      : geom.cover === 'hyperbolic' ? makeHyperbolicPresenter(coverDeps)
        : makeEuclideanPresenter(coverDeps);

  const character = makeCharacter();
  root.add(character.group);
  let stridePhase = 0;

  const mapState: SquareMapState = { u: 0.5, v: 0.5, hx: 0, hz: -1, flipped: false };
  const right = new THREE.Vector3();
  const basis = new THREE.Matrix4();

  function frame(input: FrameInput) {
    cover.update(input, camera);
    const p = cover.pose();

    right.crossVectors(p.up, p.forward).normalize();
    character.group.position.copy(p.position);
    character.group.quaternion.setFromRotationMatrix(basis.makeBasis(right, p.up, p.forward));
    character.group.visible = input.thirdPerson;
    if (input.fwd || input.strafe) stridePhase += input.dt * input.moveSpeed * 1.4;
    character.stride(stridePhase);

    Object.assign(mapState, cover.chart());
    deps.renderer.render(scene, camera);
  }

  return {
    frame,
    clearTrail: () => cover.clearTrail(),
    setFloorOpacity: (o) => cover.setFloorOpacity?.(o),
    setColorCells: () => {},
    setRadius: (r) => cover.setRadius?.(r),
    setSquareSize: (v) => cover.setSquareSize?.(v),
    setFloorThickness: (t) => cover.setFloorThickness?.(t),
    getMapState: () => mapState,
    dispose: () => {
      scene.remove(root);
      cover.dispose();
      decor.dispose();
      character.dispose();
    },
  };
}
