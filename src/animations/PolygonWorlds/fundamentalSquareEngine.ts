import * as THREE from 'three';
import { makeSelectiveBloom } from './bloom';
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

/** Per-geometry light intensities. The flat plane is well-lit by the directional
 *  key; the spherical shell is large and far from a single distant light so it
 *  reads dark — give χ>0 a stronger fill + headlamp. The hyperbolic disk is dark
 *  toward its horizon, so it gets a touch more headlamp too. */
function lightingProfile(cover: 'euclidean' | 'spherical' | 'hyperbolic'): { fill: number; key: number; lamp: number } {
  switch (cover) {
    case 'spherical': return { fill: 1.5, key: 1.1, lamp: 90 };
    case 'hyperbolic': return { fill: 1.15, key: 1.0, lamp: 70 };
    default: return { fill: 1.0, key: 1.0, lamp: 45 };
  }
}

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
  // Two-tone lighting so the two faces of the sheet read differently: a WARM light
  // from above (the side you walk) and a COOL light from below (the underside), so
  // the top face is warm-lit and the bottom face cool-lit even where the glass lets
  // them meet. On top of that two-tone key we add a soft hemisphere fill (warm sky /
  // cool ground — same axis, so it reinforces the cue without flattening it) and a
  // gentle camera-follow "headlamp" that keeps nearby decor readable in every world.
  // Each world scales these by a per-geometry profile (the big sphere shell reads
  // dark under a single distant key, so χ>0 gets brighter fills).
  const L = lightingProfile(geom.cover);
  root.add(new THREE.AmbientLight(0xffffff, 0.42 * L.fill));
  const hemi = new THREE.HemisphereLight(0xffe6c2, 0x5b73a6, 0.4 * L.fill);
  root.add(hemi);
  const warm = new THREE.DirectionalLight(0xffd2a1, 0.95 * L.key);
  warm.position.set(0.4, 1, 0.3);
  root.add(warm);
  const cool = new THREE.DirectionalLight(0x9bc2ff, 0.62 * L.key);
  cool.position.set(-0.35, -1, -0.2);
  root.add(cool);
  // headlamp: a warm point light pinned to the camera each frame (set in frame()),
  // with decay so it only lifts the immediate surroundings.
  const headlamp = new THREE.PointLight(0xfff0d8, L.lamp, 0, 1.4);
  root.add(headlamp);

  // Richer materials: filmic tone mapping + a soft gradient image-based environment,
  // so the shells, decor and avatar catch specular life and a graded ambient instead
  // of reading flat under the direct lights alone.
  deps.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  deps.renderer.toneMappingExposure = 1.06;
  deps.renderer.outputColorSpace = THREE.SRGBColorSpace;
  const envTex = makeGradientEnv(deps.renderer);
  const prevEnv = scene.environment;
  scene.environment = envTex;

  // Emissive-keyed selective bloom so only the things that genuinely emit (seams,
  // markers, the ★ beacon, the avatar's glow) bleed light — keyed to emissive, not
  // to the lights, so the camera headlamp never blows the nearby decor into glare.
  let bufW = deps.renderer.domElement.width, bufH = deps.renderer.domElement.height;
  const bloom = makeSelectiveBloom(deps.renderer, scene, camera, { strength: 0.9, radius: 0.5, threshold: 0 });

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
  let poseState: { position: THREE.Vector3; up: THREE.Vector3; forward: THREE.Vector3 } | null = null;
  const right = new THREE.Vector3();
  const basis = new THREE.Matrix4();

  function frame(input: FrameInput) {
    cover.update(input, camera);
    headlamp.position.copy(camera.position);
    const p = cover.pose();
    poseState = p;

    right.crossVectors(p.up, p.forward).normalize();
    character.group.position.copy(p.position);
    character.group.quaternion.setFromRotationMatrix(basis.makeBasis(right, p.up, p.forward));
    character.group.visible = input.thirdPerson;
    if (input.fwd || input.strafe) stridePhase += input.dt * input.moveSpeed * 1.4;
    character.stride(stridePhase);

    Object.assign(mapState, cover.chart());
    const dw = deps.renderer.domElement.width, dh = deps.renderer.domElement.height;
    if (dw !== bufW || dh !== bufH) { bufW = dw; bufH = dh; bloom.setSize(dw, dh); }
    bloom.render();
  }

  return {
    frame,
    clearTrail: () => cover.clearTrail(),
    setFloorOpacity: (o) => cover.setFloorOpacity?.(o),
    setColorCells: () => {},
    setRadius: (r) => cover.setRadius?.(r),
    setSquareSize: (v) => cover.setSquareSize?.(v),
    setFloorThickness: (t) => cover.setFloorThickness?.(t),
    setCameraDistance: (d) => cover.setCameraDistance?.(d),
    getMapState: () => mapState,
    getPose: () => poseState,
    debugProbe: () => cover.debugProbe?.(),
    auditInk: () => cover.auditInk?.(),
    plantSign: (front, back) => cover.plantSign?.(front, back),
    clearSigns: () => cover.clearSigns?.(),
    dispose: () => {
      scene.remove(root);
      scene.environment = prevEnv;
      envTex.dispose();
      bloom.dispose();
      cover.dispose();
      decor.dispose();
      character.dispose();
    },
  };
}

/** A soft three-stop vertical gradient prefiltered into an environment map — a cheap
 *  "studio sky" (cool zenith → indigo → near-black) that gives image-based fill and
 *  gentle specular highlights without loading an HDR asset. */
function makeGradientEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const sky = new THREE.Scene();
  const geo = new THREE.SphereGeometry(40, 32, 16);
  const top = new THREE.Color(0x3a5aa0), mid = new THREE.Color(0x141b34), bot = new THREE.Color(0x05060d);
  const c = new THREE.Color(), p = new THREE.Vector3(), cols: number[] = [];
  const pa = geo.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    p.fromBufferAttribute(pa, i).normalize();
    const t = p.y * 0.5 + 0.5;
    c.copy(t > 0.5 ? mid.clone().lerp(top, (t - 0.5) * 2) : bot.clone().lerp(mid, t * 2));
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  sky.add(new THREE.Mesh(geo, mat));
  // a soft warm "sun" in the warm-key direction — gives the glass + metals a moving
  // specular highlight to catch, instead of a flat featureless gradient to reflect.
  const sunGeo = new THREE.SphereGeometry(5, 24, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.copy(new THREE.Vector3(0.4, 1, 0.3).normalize().multiplyScalar(34));
  sky.add(sun);
  const haloGeo = new THREE.SphereGeometry(9, 24, 16);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0x6a5a44, transparent: true, opacity: 0.5, side: THREE.BackSide });
  const halo = new THREE.Mesh(haloGeo, haloMat); halo.position.copy(sun.position);
  sky.add(halo);
  const rt = pmrem.fromScene(sky);
  geo.dispose(); mat.dispose(); sunGeo.dispose(); sunMat.dispose(); haloGeo.dispose(); haloMat.dispose(); pmrem.dispose();
  return rt.texture;
}
