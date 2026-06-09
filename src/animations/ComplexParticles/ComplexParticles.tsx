import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import ParticleViewerShell from '../../components/ParticleViewerShell';
import { Select, NumberInput } from '../../components/ControlPanel';
import readmeText from './README.md?raw';
import explainerText from './EXPLAINER.md?raw';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import { vertexShader, fragmentShader, sheetFillVertexShader, sheetWireVertexShader, sheetFragmentShader, tileVertexShader, tileFragmentShader, netVertexShader, netFragmentShader } from './shaders';
import { loadParticleTextures } from '../../lib/textures';
import {
  useParticleState, useUniformSync, useViewControls,
  createParticleGeometry, rebuildGeometryBuffers, redistributeAdaptive,
  createSheetGeometry, rebuildSheetGeometry,
  createSheetWireGeometry, rebuildSheetWireGeometry, sheetCellSize,
  createTileGeometry, rebuildTileGeometry,
  createNetGeometry, rebuildNetGeometry,
  createAxes, createHopfScaffold, createHopfFibers, startAnimationLoop,
} from '../../lib/particles';
import { usePersistentState } from '../../lib/usePersistentState';
import { ProjectionMode } from '../../lib/viewpoint';
import type { ViewPoint, HopfScaffold, HopfFibers } from '../../lib/particles';

/** localStorage namespace for this viewer's saved settings. */
const STORAGE_KEY = 'complex-particles';
/** Cap on how many Riemann sheets (particle sets) can be drawn at once. */
const MAX_SHEETS = 12;
import {
  applyComplex, complexPowRational, complexQuadratic,
  functionNames, functionFormulas, functionCategories, POW_PQ_INDEX, QUADRATIC_INDEX,
} from '../../lib/complexMath';

type Complex2 = [number, number];

export type { ViewPoint };

export interface ComplexParticlesProps {
  count?: number;
  selectedFunction?: string;
  p?: number;
  q?: number;
  branches?: number;
  onViewPointChange?: (view: ViewPoint) => void;
  viewPoint?: ViewPoint;
}

export default function ComplexParticles({
  count = COMPLEX_PARTICLES_DEFAULTS.defaultParticleCount,
  selectedFunction = 'exp',
  p = 1,
  q = 2,
  branches = 1,
  onViewPointChange,
  viewPoint,
}: ComplexParticlesProps) {
  const state = useParticleState({ count, viewPoint, onViewPointChange, storageKey: STORAGE_KEY });
  const controls = useViewControls(state);
  useUniformSync(state);

  const defaultFunctionIndex = (() => {
    const idx = functionNames.indexOf(selectedFunction);
    return idx >= 0 ? idx : 0;
  })();
  const [functionIndex, setFunctionIndex] = usePersistentState(`${STORAGE_KEY}:functionIndex`, defaultFunctionIndex);
  const [expP, setExpP] = usePersistentState(`${STORAGE_KEY}:expP`, p);
  const [expQ, setExpQ] = usePersistentState(`${STORAGE_KEY}:expQ`, q);
  // Riemann-sheet range. The viewer draws one particle set per sheet, at branch
  // index branchMin..branchMax (multivalued functions read it; single-valued
  // ignore it). Capped at MAX_SHEETS to keep the draw count sane.
  const [branchMin, setBranchMin] = usePersistentState(`${STORAGE_KEY}:branchMin`, 0);
  const [branchMax, setBranchMax] = usePersistentState(`${STORAGE_KEY}:branchMax`, branches - 1);
  const branchCount = Math.max(1, branchMax - branchMin + 1);
  // Coefficients for the generic quadratic a·z²+b·z+c (each [Re, Im]); default a=1
  // (so the out-of-the-box quadratic is z²).
  const [quadA, setQuadA] = usePersistentState<Complex2>(`${STORAGE_KEY}:quadA`, [1, 0]);
  const [quadB, setQuadB] = usePersistentState<Complex2>(`${STORAGE_KEY}:quadB`, [0, 0]);
  const [quadC, setQuadC] = usePersistentState<Complex2>(`${STORAGE_KEY}:quadC`, [0, 0]);

  // Effective sampling box (× axisScale). Locked → symmetric ±extent; unlocked →
  // the independent min/max window.
  const effectiveBounds = (): [number, number, number, number] => {
    const sc = state.axisScale;
    if (state.boundsLock) {
      return [-state.extentX * sc, state.extentX * sc, -state.extentY * sc, state.extentY * sc];
    }
    return [state.xMin * sc, state.xMax * sc, state.yMin * sc, state.yMax * sc];
  };

  const sceneRef = useRef<THREE.Scene>();
  const pointsRef = useRef<THREE.Points[]>([]);
  // Sheet (surface) render mode: a non-indexed per-quad fill geometry (flat
  // averaged color per rectangle) + a separate line geometry for the
  // rectangular wireframe (row/column edges, no diagonals). Both are drawn per
  // Riemann sheet.
  const sheetGeomRef = useRef<THREE.BufferGeometry>();
  const sheetWireGeomRef = useRef<THREE.BufferGeometry>();
  const fillMeshRef = useRef<THREE.Mesh[]>([]);
  const wireMeshRef = useRef<THREE.LineSegments[]>([]);
  // Tiles render mode: one oriented quad per grid sample (its own geometry +
  // mesh per Riemann sheet).
  const tileGeomRef = useRef<THREE.BufferGeometry>();
  const tileMeshRef = useRef<THREE.Mesh[]>([]);
  // Net render mode: a polar fiber net (circles + rays) drawn as screen-space
  // ribbon meshes (so it can have a real pixel width).
  const netGeomRef = useRef<THREE.BufferGeometry>();
  const netMeshRef = useRef<THREE.Mesh[]>([]);
  const scaffoldRef = useRef<HopfScaffold>();
  const fibersRef = useRef<HopfFibers>();

  useEffect(() => {
    state.materialsRef.current.forEach(m => { m.uniforms.functionType.value = functionIndex; });
  }, [functionIndex]);

  /** Rebuild the particle grid when sampling-related state changes. In
   *  adaptive mode the rebuild depends on the function (we need |f'(z)| at
   *  each candidate); otherwise we re-stamp the uniform grid. */
  useEffect(() => {
    const geom = state.geometryRef.current;
    if (!geom) return;
    const [bxMin, bxMax, byMin, byMax] = effectiveBounds();
    if (state.adaptive) {
      const evalFn = (x: number, z: number) => {
        const pt = new THREE.Vector2(x, z);
        const out = functionIndex === POW_PQ_INDEX
          ? complexPowRational(pt, expP, expQ === 0 ? 1 : expQ)
          : functionIndex === QUADRATIC_INDEX
            ? complexQuadratic(pt, new THREE.Vector2(quadA[0], quadA[1]), new THREE.Vector2(quadB[0], quadB[1]), new THREE.Vector2(quadC[0], quadC[1]))
            : applyComplex(pt, functionIndex);
        return { x: out.x, y: out.y };
      };
      redistributeAdaptive(geom, state.particleCount, bxMin, bxMax, byMin, byMax, {
        evalFn,
        alpha: state.adaptiveAlpha,
      });
    } else {
      rebuildGeometryBuffers(geom, state.particleCount, bxMin, bxMax, byMin, byMax, state.samplePattern);
    }
  }, [
    state.adaptive, state.adaptiveAlpha, state.particleCount,
    state.extentX, state.extentY, state.axisScale, state.samplePattern,
    state.boundsLock, state.xMin, state.xMax, state.yMin, state.yMax,
    functionIndex, expP, expQ, quadA, quadB, quadC,
  ]);

  useEffect(() => {
    state.materialsRef.current.forEach(m => {
      m.uniforms.exponentP.value = expP;
      m.uniforms.exponentQ.value = expQ === 0 ? 1 : expQ;
    });
  }, [expP, expQ]);

  useEffect(() => {
    state.materialsRef.current.forEach(m => {
      m.uniforms.uQuadA.value.set(quadA[0], quadA[1]);
      m.uniforms.uQuadB.value.set(quadB[0], quadB[1]);
      m.uniforms.uQuadC.value.set(quadC[0], quadC[1]);
    });
  }, [quadA, quadB, quadC]);

  // Each material renders the Riemann sheet at branchMin + its branch. There are
  // now several materials per branch (points + sheet fill + wire), so the branch
  // is tagged on the material rather than read from its position in the list.
  useEffect(() => {
    state.materialsRef.current.forEach(m => {
      m.uniforms.branchIndex.value = branchMin + ((m.userData.branch as number) ?? 0);
    });
  }, [branchMin, branchMax]);

  // The full uniform set shared by every material (points + sheet fill + wire),
  // so useUniformSync / the animation loop / useViewControls drive them all
  // uniformly. Each material gets its own fresh objects (no aliasing).
  const makeUniforms = (b: number) => ({
    time: { value: 0 },
    opacity: { value: state.opacity },
    functionType: { value: functionIndex },
    exponentP: { value: expP },
    exponentQ: { value: expQ === 0 ? 1 : expQ },
    uQuadA: { value: new THREE.Vector2(quadA[0], quadA[1]) },
    uQuadB: { value: new THREE.Vector2(quadB[0], quadB[1]) },
    uQuadC: { value: new THREE.Vector2(quadC[0], quadC[1]) },
    globalSize: { value: state.size },
    intensity: { value: state.intensity },
    shimmerAmp: { value: state.shimmer },
    jitterAmp: { value: state.jitter },
    uJitterMode: { value: state.jitterMode },
    hueShift: { value: state.hueShift },
    saturation: { value: state.saturation },
    realView: { value: state.realViewRef.current ? 1 : 0 },
    shapeType: { value: state.shapeIndex },
    tex: { value: state.texturesRef.current[state.textureIndex] ?? new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1) },
    textureIndex: { value: state.textureIndex },
    uColorStyle: { value: state.colorStyle },
    uColormap: { value: state.colormap },
    uColorRepeat: { value: state.colorRepeat },
    uReciprocal: { value: state.reciprocal ? 1 : 0 },
    uWarpR: { value: netRadius() },
    uLight: { value: state.lighting ? 1 : 0 },
    uLightStrength: { value: state.lightStrength },
    uColorBy: { value: state.colorBy },
    uColorQty: { value: state.colorQuantity },
    uBrightnessQty: { value: state.brightnessQuantity },
    uInCoord: { value: state.inputCoord },
    uOutCoord: { value: state.outputCoord },
    uRotL: { value: { w: 1, v: new THREE.Vector3() } },
    uRotR: { value: { w: 1, v: new THREE.Vector3() } },
    uProjMode: { value: state.projRef.current },
    uProjTarget: { value: state.projRef.current },
    uProjAlpha: { value: 0 },
    branchIndex: { value: branchMin + b },
  });

  // Adaptive fade only applies while the sheet is on screen — in plain Points
  // mode the cloud must show everywhere, so the point material's uAdaptive is
  // gated on the render mode (the fill/wire are hidden outside Sheet mode anyway).
  const adaptiveOn = () => state.renderMode === 'Sheet' && state.sheetAdaptive;

  function createBranchMaterial(b: number) {
    const [csx, csy] = currentCellSize();
    const m = new THREE.ShaderMaterial({
      uniforms: {
        ...makeUniforms(b),
        uAdaptive: { value: adaptiveOn() ? 1 : 0 },
        uDensity: { value: state.sheetDensity },
        uCellSize: { value: new THREE.Vector2(csx, csy) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    m.userData.branch = b;
    return m;
  }

  // The sheet uses true alpha compositing (NormalBlending), not the points'
  // additive glow — overlapping translucent triangles must read as a layered
  // surface, not blow out to white. This is fixed regardless of background, so
  // the objectMode effect leaves sheet materials' blending alone (userData.sheet).
  // Current cell spacing (domain units per cell) for the fill shader's corner
  // averaging — must track the domain box and sheet resolution.
  const currentCellSize = (): [number, number] => {
    const [bx0, bx1, by0, by1] = effectiveBounds();
    return sheetCellSize(state.sheetResolution, bx0, bx1, by0, by1);
  };

  function createSheetFillMaterial(b: number) {
    const [csx, csy] = currentCellSize();
    const [bx0, bx1, by0, by1] = effectiveBounds();
    const m = new THREE.ShaderMaterial({
      uniforms: {
        ...makeUniforms(b),
        uShade: { value: state.sheetShade },
        uWire: { value: 0 },
        uAdaptive: { value: adaptiveOn() ? 1 : 0 },
        uDensity: { value: state.sheetDensity },
        uCellSize: { value: new THREE.Vector2(csx, csy) },
        uDomainBox: { value: new THREE.Vector4(bx0, bx1, by0, by1) },
      },
      vertexShader: sheetFillVertexShader,
      fragmentShader: sheetFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      vertexColors: true,
    });
    m.userData.branch = b;
    m.userData.sheet = true;
    return m;
  }

  function createSheetWireMaterial(b: number) {
    const [csx, csy] = currentCellSize();
    const [bx0, bx1, by0, by1] = effectiveBounds();
    const m = new THREE.ShaderMaterial({
      uniforms: {
        ...makeUniforms(b), uShade: { value: state.sheetShade }, uWire: { value: 1 },
        uAdaptive: { value: adaptiveOn() ? 1 : 0 },
        uDensity: { value: state.sheetDensity },
        uCellSize: { value: new THREE.Vector2(csx, csy) },
        uDomainBox: { value: new THREE.Vector4(bx0, bx1, by0, by1) },
      },
      vertexShader: sheetWireVertexShader,
      fragmentShader: sheetFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexColors: true,
    });
    m.userData.branch = b;
    m.userData.sheet = true;
    m.userData.sheetWire = true;
    return m;
  }

  // Radius of the polar fiber net: reach the farthest corner of the domain box.
  const netRadius = (): number => {
    const [bx0, bx1, by0, by1] = effectiveBounds();
    return Math.max(Math.abs(bx0), Math.abs(bx1), Math.abs(by0), Math.abs(by1));
  };

  function createNetMaterial(b: number) {
    const size = new THREE.Vector2(1, 1);
    state.rendererRef.current?.getSize(size);
    const m = new THREE.ShaderMaterial({
      uniforms: {
        ...makeUniforms(b),
        uResolution: { value: size },
        uLineWidth: { value: state.netWidth },
      },
      vertexShader: netVertexShader,
      fragmentShader: netFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      vertexColors: true,
    });
    m.userData.branch = b;
    m.userData.sheet = true;   // keep NormalBlending through the object-mode toggle
    m.userData.net = true;
    return m;
  }

  function createTileMaterial(b: number) {
    const [csx, csy] = currentCellSize();
    const m = new THREE.ShaderMaterial({
      uniforms: {
        ...makeUniforms(b),
        uShade: { value: state.sheetShade },
        uCellSize: { value: new THREE.Vector2(csx, csy) },
        uMaxTile: { value: state.tileSize },
      },
      vertexShader: tileVertexShader,
      fragmentShader: tileFragmentShader,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      vertexColors: true,
    });
    m.userData.branch = b;
    m.userData.sheet = true;
    return m;
  }

  // Visibility follows the render mode: Points shows the cloud; Sheet shows the
  // filled surface and/or the wireframe overlay.
  const applyRenderVisibility = () => {
    const isSheet = state.renderMode === 'Sheet';
    const isTiles = state.renderMode === 'Tiles';
    // The point cloud shows in Points mode and, in adaptive Sheet mode, stays
    // visible underneath so it shows through wherever the fill/wire dissolves.
    pointsRef.current.forEach(o => { o.visible = state.renderMode === 'Points' || (isSheet && state.sheetAdaptive); });
    fillMeshRef.current.forEach(o => { o.visible = isSheet && state.sheetFill; });
    wireMeshRef.current.forEach(o => { o.visible = isSheet && state.sheetWire; });
    tileMeshRef.current.forEach(o => { o.visible = isTiles; });
    netMeshRef.current.forEach(o => { o.visible = state.renderMode === 'Net'; });
  };

  // (Re)create the per-branch objects: a point cloud, a filled sheet, and a
  // wireframe sheet for each Riemann sheet. Used by both the initial mount and
  // the branch-range effect.
  const rebuildBranchObjects = (scene: THREE.Scene) => {
    const pointsGeom = state.geometryRef.current;
    const fillGeom = sheetGeomRef.current;
    const wireGeom = sheetWireGeomRef.current;
    const tileGeom = tileGeomRef.current;
    const netGeom = netGeomRef.current;
    if (!pointsGeom || !fillGeom || !wireGeom || !tileGeom || !netGeom) return;
    pointsRef.current.forEach(o => scene.remove(o));
    fillMeshRef.current.forEach(o => scene.remove(o));
    wireMeshRef.current.forEach(o => scene.remove(o));
    tileMeshRef.current.forEach(o => scene.remove(o));
    netMeshRef.current.forEach(o => scene.remove(o));
    state.materialsRef.current.forEach(m => m.dispose());
    state.materialsRef.current = [];
    pointsRef.current = [];
    fillMeshRef.current = [];
    wireMeshRef.current = [];
    tileMeshRef.current = [];
    netMeshRef.current = [];
    for (let b = 0; b < branchCount; b++) {
      const pm = createBranchMaterial(b);
      const fm = createSheetFillMaterial(b);
      const wm = createSheetWireMaterial(b);
      const tm = createTileMaterial(b);
      const nm = createNetMaterial(b);
      const pts = new THREE.Points(pointsGeom, pm);
      const fill = new THREE.Mesh(fillGeom, fm);
      const wire = new THREE.LineSegments(wireGeom, wm);
      const tiles = new THREE.Mesh(tileGeom, tm);
      const net = new THREE.Mesh(netGeom, nm);
      // In adaptive Sheet mode the cloud and sheet overlap; without a fixed order
      // these depth-write-off transparent objects sort by distance and the
      // additive points can land on top of an opaque fill. Pin points behind, then
      // fill, then wire, so a dense (opaque) fill cleanly covers the cloud and only
      // the stretched, dissolved cells let the points show through.
      pts.renderOrder = 0;
      fill.renderOrder = 1;
      wire.renderOrder = 2;
      state.materialsRef.current.push(pm, fm, wm, tm, nm);
      pointsRef.current.push(pts);
      fillMeshRef.current.push(fill);
      wireMeshRef.current.push(wire);
      tileMeshRef.current.push(tiles);
      netMeshRef.current.push(net);
      scene.add(pts, fill, wire, tiles, net);
    }
    applyRenderVisibility();
  };

  useEffect(() => {
    if (!sceneRef.current || !state.geometryRef.current || !sheetGeomRef.current) return;
    rebuildBranchObjects(sceneRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchCount]);

  // Toggle which render mode's objects are visible without rebuilding them.
  useEffect(() => {
    applyRenderVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.renderMode, state.sheetFill, state.sheetWire, state.sheetAdaptive]);

  // Push the adaptive-density controls to every material (points + sheet fill +
  // wire). The point cloud only fades in Sheet mode (adaptiveOn), so it stays a
  // full cloud in plain Points mode.
  useEffect(() => {
    const on = adaptiveOn() ? 1 : 0;
    state.materialsRef.current.forEach(m => {
      if (m.uniforms.uAdaptive) m.uniforms.uAdaptive.value = on;
      if (m.uniforms.uDensity) m.uniforms.uDensity.value = state.sheetDensity;
    });
  }, [state.renderMode, state.sheetAdaptive, state.sheetDensity]);

  // Rebuild the sheet fill + wire grids when the resolution or domain box
  // changes, and refresh the fill shader's cell size (for corner averaging).
  useEffect(() => {
    const fillGeom = sheetGeomRef.current;
    const wireGeom = sheetWireGeomRef.current;
    const tileGeom = tileGeomRef.current;
    if (!fillGeom || !wireGeom || !tileGeom) return;
    const [bxMin, bxMax, byMin, byMax] = effectiveBounds();
    rebuildSheetGeometry(fillGeom, state.sheetResolution, bxMin, bxMax, byMin, byMax);
    rebuildSheetWireGeometry(wireGeom, state.sheetResolution, bxMin, bxMax, byMin, byMax);
    rebuildTileGeometry(tileGeom, state.sheetResolution, bxMin, bxMax, byMin, byMax);
    const [csx, csy] = sheetCellSize(state.sheetResolution, bxMin, bxMax, byMin, byMax);
    const warpR = netRadius();
    state.materialsRef.current.forEach(m => {
      if (m.uniforms.uCellSize) m.uniforms.uCellSize.value.set(csx, csy);
      if (m.uniforms.uDomainBox) m.uniforms.uDomainBox.value.set(bxMin, bxMax, byMin, byMax);
      if (m.uniforms.uWarpR) m.uniforms.uWarpR.value = warpR;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.sheetResolution, state.extentX, state.extentY, state.axisScale,
    state.boundsLock, state.xMin, state.xMax, state.yMin, state.yMax,
  ]);

  // Rebuild the fiber net when its counts/mode or the domain box change.
  useEffect(() => {
    const netGeom = netGeomRef.current;
    if (!netGeom) return;
    rebuildNetGeometry(netGeom, state.netRings, state.netSpokes, netRadius(), state.netCircles, state.netRays, state.netResolution);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.netRings, state.netSpokes, state.netCircles, state.netRays, state.netResolution,
    state.extentX, state.extentY, state.axisScale,
    state.boundsLock, state.xMin, state.xMax, state.yMin, state.yMax,
  ]);

  // Push the net thread width to its materials.
  useEffect(() => {
    state.materialsRef.current.forEach(m => {
      if (m.uniforms.uLineWidth) m.uniforms.uLineWidth.value = state.netWidth;
    });
  }, [state.netWidth]);

  // Keep the net's screen-space width correct as the canvas resizes (the ribbon
  // expansion is in pixels, so it needs the live drawing-buffer size).
  useEffect(() => {
    const sync = () => {
      const r = state.rendererRef.current;
      if (!r) return;
      const s = new THREE.Vector2();
      r.getSize(s);
      state.materialsRef.current.forEach(m => {
        if (m.uniforms.uResolution) (m.uniforms.uResolution.value as THREE.Vector2).copy(s);
      });
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  });

  // Push the faceted-shading strength to the sheet materials (points lack uShade).
  useEffect(() => {
    state.materialsRef.current.forEach(m => {
      if (m.uniforms.uShade) m.uniforms.uShade.value = state.sheetShade;
    });
  }, [state.sheetShade]);

  // Push the max tile size to the tile materials.
  useEffect(() => {
    state.materialsRef.current.forEach(m => {
      if (m.uniforms.uMaxTile) m.uniforms.uMaxTile.value = state.tileSize;
    });
  }, [state.tileSize]);

  // Show the sphere scaffold in the Hopf view (or once the Torus → Hopf collapse
  // is past halfway) and the donut scaffold in the Torus view; hide both in the
  // flat/perspective projections.
  useEffect(() => {
    const s = scaffoldRef.current;
    if (!s) return;
    const showSphere = state.viewType === ProjectionMode.Hopf
      || (state.viewType === ProjectionMode.Torus && state.fiberCollapse >= 0.5);
    const showTorus = state.viewType === ProjectionMode.Torus && state.fiberCollapse < 0.5;
    s.group.visible = state.showScaffold && (showSphere || showTorus);
    s.sphereGroup.visible = showSphere;
    s.torusGroup.visible = showTorus;
  }, [state.viewType, state.fiberCollapse, state.showScaffold]);

  // Hopf fibers show in the Torus view (before the collapse swallows them).
  const fibersVisible = state.showFibers
    && state.viewType === ProjectionMode.Torus
    && state.fiberCollapse < 0.5;
  useEffect(() => {
    if (fibersRef.current) fibersRef.current.group.visible = fibersVisible;
  }, [fibersVisible]);

  // Rebuild the fiber overlay when the density changes (skips until mounted).
  useEffect(() => {
    if (!sceneRef.current) return;
    fibersRef.current?.dispose();
    fibersRef.current = createHopfFibers(sceneRef.current, state.fiberDensity);
    fibersRef.current.group.visible = fibersVisible;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fiberDensity]);

  const onMount = React.useCallback(
    (ctx: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer }) => {
      const { scene, camera, renderer } = ctx;
      sceneRef.current = scene;
      state.cameraRef.current = camera;
      state.rendererRef.current = renderer;
      renderer.setClearColor(state.objectMode ? 0xffffff : 0x000000);
      camera.position.z = state.cameraZ;

      const textures = loadParticleTextures(() => {
        state.materialsRef.current.forEach(m => {
          m.uniforms.tex.value = textures[state.textureIndex];
        });
      });
      state.texturesRef.current = textures;

      const [bxMin, bxMax, byMin, byMax] = effectiveBounds();
      const geometry = createParticleGeometry(state.particleCount, bxMin, bxMax, byMin, byMax, state.samplePattern);
      state.geometryRef.current = geometry;
      sheetGeomRef.current = createSheetGeometry(state.sheetResolution, bxMin, bxMax, byMin, byMax);
      sheetWireGeomRef.current = createSheetWireGeometry(state.sheetResolution, bxMin, bxMax, byMin, byMax);
      tileGeomRef.current = createTileGeometry(state.sheetResolution, bxMin, bxMax, byMin, byMax);
      netGeomRef.current = createNetGeometry(state.netRings, state.netSpokes, netRadius(), state.netCircles, state.netRays, state.netResolution);

      rebuildBranchObjects(scene);

      const axes = createAxes(scene, state.hueShift, state.axisWidth);
      state.xAxisRef.current = axes.x;
      state.yAxisRef.current = axes.y;
      state.uAxisRef.current = axes.u;
      state.vAxisRef.current = axes.v;

      // Faint reference geometry for the Hopf sphere / nested Clifford-torus
      // donuts. Apply the initial visibility here (the effect below only fires
      // on later state changes), then it's kept in sync by that effect.
      const scaffold = createHopfScaffold(scene);
      scaffoldRef.current = scaffold;
      {
        const showSphere = state.viewType === ProjectionMode.Hopf;
        const showTorus = state.viewType === ProjectionMode.Torus;
        scaffold.sphereGroup.visible = showSphere;
        scaffold.torusGroup.visible = showTorus;
        scaffold.group.visible = state.showScaffold && (showSphere || showTorus);
      }

      const fibers = createHopfFibers(scene, state.fiberDensity);
      fibersRef.current = fibers;
      fibers.group.visible = state.showFibers
        && state.viewType === ProjectionMode.Torus
        && state.fiberCollapse < 0.5;

      state.viewPointRef.current = { L: state.rotLRef.current.clone(), R: state.rotRRef.current.clone() };
      state.onViewPointChangeRef.current?.(state.viewPointRef.current);

      startAnimationLoop({
        renderer, scene, camera,
        materialsRef: state.materialsRef,
        axisRefs: { x: state.xAxisRef, y: state.yAxisRef, u: state.uAxisRef, v: state.vAxisRef },
        realViewRef: state.realViewRef,
        projRef: state.projRef,
        viewMotionRef: state.viewMotionRef,
        dropAxisRef: state.dropAxisRef,
        rotLRef: state.rotLRef,
        rotRRef: state.rotRRef,
        axisScaleRef: state.axisScaleRef,
        viewPointRef: state.viewPointRef,
        onViewPointChangeRef: state.onViewPointChangeRef,
        orientationRef: state.orientationRef,
        setOrientationMatrix: state.setOrientationMatrix,
      });
    }, []);

  const currentName = functionNames[functionIndex];
  const isPowPQ = functionIndex === POW_PQ_INDEX;
  const isQuadratic = functionIndex === QUADRATIC_INDEX;
  const fmtComplex = ([re, im]: Complex2): string => {
    const r = Number(re.toFixed(3));
    const i = Number(im.toFixed(3));
    if (i === 0) return `${r}`;
    if (r === 0) return i === 1 ? 'i' : i === -1 ? '−i' : `${i}i`;
    return `${r}${i > 0 ? '+' : '−'}${Math.abs(i)}i`;
  };
  const displayName = isPowPQ ? `z^(${expP}/${expQ})` : currentName;
  const displayFormula = isPowPQ
    ? `p = ${expP}, q = ${expQ}`
    : isQuadratic
      ? `(${fmtComplex(quadA)})·z² + (${fmtComplex(quadB)})·z + (${fmtComplex(quadC)})`
      : functionFormulas[currentName];

  const functionGroups = functionCategories.map(cat => ({
    label: cat.label,
    options: cat.members.map(idx => ({ value: idx, label: functionNames[idx] })),
  }));

  const functionPicker = (
    <>
      <Select
        label="Function"
        groups={functionGroups}
        value={functionIndex}
        onChange={setFunctionIndex}
      />
      {isPowPQ && (
        <>
          <NumberInput label="p" value={expP} integer onChange={setExpP} />
          {/* q = 0 is undefined (z^(p/0)); coerce to 1 so the header/saved value
              matches what actually renders. Negative q stays allowed. */}
          <NumberInput label="q" value={expQ} integer onChange={v => setExpQ(v === 0 ? 1 : v)} />
        </>
      )}
      {isQuadratic && (
        <>
          <NumberInput label="a (Re)" value={quadA[0]} step={0.1} onChange={v => setQuadA([v, quadA[1]])} />
          <NumberInput label="a (Im)" value={quadA[1]} step={0.1} onChange={v => setQuadA([quadA[0], v])} />
          <NumberInput label="b (Re)" value={quadB[0]} step={0.1} onChange={v => setQuadB([v, quadB[1]])} />
          <NumberInput label="b (Im)" value={quadB[1]} step={0.1} onChange={v => setQuadB([quadB[0], v])} />
          <NumberInput label="c (Re)" value={quadC[0]} step={0.1} onChange={v => setQuadC([v, quadC[1]])} />
          <NumberInput label="c (Im)" value={quadC[1]} step={0.1} onChange={v => setQuadC([quadC[0], v])} />
        </>
      )}
    </>
  );

  // Riemann-sheet range (multivalued functions only). Kept ≤ MAX_SHEETS sheets
  // and min ≤ max by nudging the partner bound. Lives in the Domain section.
  const branchControls = (
    <>
      <NumberInput
        label="Branch min (sheet)"
        value={branchMin}
        integer
        onChange={v => {
          const nv = Math.min(v, branchMax);
          setBranchMin(Math.max(nv, branchMax - (MAX_SHEETS - 1)));
        }}
      />
      <NumberInput
        label="Branch max (sheet)"
        value={branchMax}
        integer
        onChange={v => {
          const nv = Math.max(v, branchMin);
          setBranchMax(Math.min(nv, branchMin + (MAX_SHEETS - 1)));
        }}
      />
    </>
  );

  return (
    <ParticleViewerShell
      appId="complex-particles"
      state={state}
      controls={controls}
      onMount={onMount}
      functionName={displayName}
      functionFormula={displayFormula}
      functionPicker={functionPicker}
      domainExtras={branchControls}
      readme={readmeText}
      explainer={explainerText}
      settingsStorageKey={STORAGE_KEY}
    />
  );
}
