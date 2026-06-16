import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import ParticleViewerShell from '../../components/ParticleViewerShell';
import { Select, NumberInput, ComplexInput, Checkbox, RangeSlider } from '../../components/ControlPanel';
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
  createAxes, createHopfScaffold, startAnimationLoop,
} from '../../lib/particles';
import { usePersistentState } from '../../lib/usePersistentState';
import { ProjectionMode } from '../../lib/viewpoint';
import type { ViewPoint, HopfScaffold } from '../../lib/particles';

/** localStorage namespace for this viewer's saved settings. */
const STORAGE_KEY = 'complex-particles';
/** Cap on how many Riemann sheets (particle sets) can be drawn at once. */
const MAX_SHEETS = 12;
/** Radius-band slider ceiling; the max thumb here means "no upper |z| limit". */
const REGION_RMAX = 12;
import {
  applyComplex, complexPowRational, complexQuadratic,
  functionNames, functionFormulas, functionCategories, POW_PQ_INDEX, QUADRATIC_INDEX,
  MULTIVALUED_INDICES, branchPeriod,
} from '../../lib/complexMath';
import { decodeFunction, encodeFunction, type FunctionState } from '../../lib/functionHandoff';

// ── Per-function "recommended view" presets (PR-1, 2026-06-16) ──────────────
// Picking a *different* function auto-snaps the DOMAIN/PROJECTION to what that
// function wants — never the user's appearance choices (color, size, render
// mode, motion stay exactly as set). Anything a function doesn't list here falls
// back to the shipped default — Perspective · ×π units (±2π) · one sheet — so
// snapping back to an entire function restores the calm default framing, and z²
// (the initial load, which is never a "change") is left byte-for-byte untouched.
//
// Poles & Möbius read best on the sphere (the Hopf projection): 1/z, 1/z², 1/z³,
// (z²+1)/(z²−1), (z−1)/(z+1).
const HOPF_PROJECTION_FUNCS = new Set<number>([8, 29, 10, 12, 17]);
// Near-origin branch / essential structure frames tighter at ±2 (×1 units) than
// at the ±2π default: the roots & logs, inverse trig, inverse hyperbolics,
// e^{1/z}, and the Joukowski map.
const UNIT_SCALE_FUNCS = new Set<number>([1, 16, 18, 3, 14, 20, 21, 25, 26, 27, 28, 33, 34, 35, 13, 11]);

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
  /** Chrome-less applet mode (#/embed/…): URL-configured, ephemeral state
   *  (never reads or writes the visitor's saved settings). docs/EMBEDS.md. */
  embed?: import('../../lib/embedParams').ParticleEmbedConfig;
}

export default function ComplexParticles({
  count = COMPLEX_PARTICLES_DEFAULTS.defaultParticleCount,
  selectedFunction = 'square',
  p = 1,
  q = 2,
  branches = 1,
  onViewPointChange,
  viewPoint,
  embed,
}: ComplexParticlesProps) {
  const state = useParticleState({
    count: embed?.count ?? count,
    viewPoint,
    onViewPointChange,
    storageKey: embed ? undefined : STORAGE_KEY,
  });
  const controls = useViewControls(state);
  useUniformSync(state);

  // Per-field persistence key; null in embed mode (ephemeral, like storageKey).
  const ek = (field: string) => (embed ? null : `${STORAGE_KEY}:${field}`);

  const defaultFunctionIndex = (() => {
    const idx = functionNames.indexOf(embed?.fn ?? selectedFunction);
    return idx >= 0 ? idx : 0;
  })();
  const [functionIndex, setFunctionIndex] = usePersistentState(ek('functionIndex'), defaultFunctionIndex);
  const [expP, setExpP] = usePersistentState(ek('expP'), embed?.p ?? p);
  const [expQ, setExpQ] = usePersistentState(ek('expQ'), embed?.q ?? q);
  // Riemann-sheet range. The viewer draws one particle set per sheet, at branch
  // index branchMin..branchMax. Only multivalued functions get extra sheets:
  // for single-valued ones every sheet would be the same additive cloud drawn
  // N times (N× brightness and draw cost), so the count is forced to 1. A
  // finite sheet family (sqrt: 2, cbrt: 3, z^(p/q): q) is also capped at its
  // period — sheets beyond it repeat. Capped at MAX_SHEETS to keep draws sane.
  const [branchMin, setBranchMin] = usePersistentState(ek('branchMin'), 0);
  const [branchMax, setBranchMax] = usePersistentState(ek('branchMax'), branches - 1);
  // Tint each sheet's HSV hue so simultaneous sheets are distinguishable in
  // Domain coloring (where they are otherwise colored identically).
  const [sheetTint, setSheetTint] = usePersistentState(ek('sheetTint'), true);
  const isMultivalued = MULTIVALUED_INDICES.has(functionIndex);
  const period = branchPeriod(functionIndex, expQ === 0 ? 1 : expQ);
  const maxSpan = Math.min(MAX_SHEETS, period ?? MAX_SHEETS);
  const branchCount = isMultivalued
    ? Math.min(Math.max(1, branchMax - branchMin + 1), maxSpan)
    : 1;
  /** Hue offset for the sheet drawn by tagged branch b: evenly spaced around
   *  the wheel for a finite family, a gentle progression for the infinite
   *  (ln-type) ones. 0 when tinting is off or only one sheet shows. */
  const branchHue = (b: number): number => {
    if (!sheetTint || branchCount <= 1) return 0;
    const sheet = branchMin + b;
    if (period !== null) return (((sheet % period) + period) % period) / period;
    return ((sheet * 0.13) % 1 + 1) % 1;
  };
  // Coefficients for the generic quadratic a·z²+b·z+c (each [Re, Im]); default a=1
  // (so the out-of-the-box quadratic is z²).
  const [quadA, setQuadA] = usePersistentState<Complex2>(ek('quadA'), [1, 0]);
  const [quadB, setQuadB] = usePersistentState<Complex2>(ek('quadB'), [0, 0]);
  const [quadC, setQuadC] = usePersistentState<Complex2>(ek('quadC'), [0, 0]);

  // One-time function handoff (Phase-2 "graph ↔ map"): arriving from Plane
  // Transform's "↗ 4D graph" link carries the function in the URL (?fn=…). Adopt
  // it once, then strip the query so a later reload uses the user's own saved
  // choice. Embed mode parses its own params, so it is skipped here.
  useEffect(() => {
    if (embed) return;
    const seed = decodeFunction(window.location.hash);
    if (seed.index === undefined) return;
    setFunctionIndex(seed.index);
    if (seed.p !== undefined) setExpP(seed.p);
    if (seed.q !== undefined) setExpQ(seed.q === 0 ? 1 : seed.q);
    if (seed.quad) { setQuadA(seed.quad.a); setQuadB(seed.quad.b); setQuadC(seed.quad.c); }
    window.history.replaceState(null, '', window.location.hash.split('?')[0] || '#/complex-particles');
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Domain region (Domain panel): restrict the sampled plane to a polar radius
  // band on |z| (max thumb = no limit), applied live in the shaders (no geometry
  // rebuild). rMax at the ceiling means "no upper limit".
  const [radiusRange, setRadiusRange] = usePersistentState<[number, number]>(ek('radiusRange'), [0, REGION_RMAX]);
  const regionRMax = () => (radiusRange[1] >= REGION_RMAX ? 1e9 : radiusRange[1]);

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
  // The per-sheet hue tint rides along (it depends on the same inputs).
  useEffect(() => {
    state.materialsRef.current.forEach(m => {
      const b = (m.userData.branch as number) ?? 0;
      m.uniforms.branchIndex.value = branchMin + b;
      m.uniforms.uBranchHue.value = branchHue(b);
    });
  }, [branchMin, branchMax, sheetTint, functionIndex, expQ]);

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
    uBranchHue: { value: branchHue(b) },
    uRegionRadius: { value: new THREE.Vector2(radiusRange[0], regionRMax()) },
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
    // Preserve the live projection across the rebuild. Fresh materials start at
    // makeUniforms' defaults (uProjMode = uProjTarget = projRef, alpha 0), which
    // collapses any active cross-fade — so a Torus/Sphere/mid-morph view would
    // snap back to Perspective when the sheet count changes. The animation loop
    // re-pushes rotation every frame (orientation self-heals) but never touches
    // the projection cross-fade, so capture it here and restore it after rebuild.
    const prevMat = state.materialsRef.current[0];
    const projSnap = prevMat
      ? {
          mode: prevMat.uniforms.uProjMode.value as number,
          target: prevMat.uniforms.uProjTarget.value as number,
          alpha: prevMat.uniforms.uProjAlpha.value as number,
        }
      : null;
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
    if (projSnap) {
      state.materialsRef.current.forEach(m => {
        m.uniforms.uProjMode.value = projSnap.mode;
        m.uniforms.uProjTarget.value = projSnap.target;
        m.uniforms.uProjAlpha.value = projSnap.alpha;
      });
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
  // expansion is in pixels, so it needs the live drawing-buffer size). View
  // windows resize without a window `resize` event, so observe the canvas
  // itself (it exists by the time effects run — Canvas3D's child effect mounts
  // it first); the window listener stays as a belt-and-suspenders fallback.
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
    const canvas = state.rendererRef.current?.domElement;
    const ro = new ResizeObserver(sync);
    if (canvas) ro.observe(canvas);
    window.addEventListener('resize', sync);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Push the domain-region radius band to every material — live masking, no
  // geometry rebuild.
  useEffect(() => {
    const rMax = regionRMax();
    state.materialsRef.current.forEach(m => {
      if (m.uniforms.uRegionRadius) (m.uniforms.uRegionRadius.value as THREE.Vector2).set(radiusRange[0], rMax);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusRange]);

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

      state.viewPointRef.current = { L: state.rotLRef.current.clone(), R: state.rotRRef.current.clone() };
      state.onViewPointChangeRef.current?.(state.viewPointRef.current);

      const stopLoop = startAnimationLoop({
        renderer, scene, camera,
        materialsRef: state.materialsRef,
        axisRefs: { x: state.xAxisRef, y: state.yAxisRef, u: state.uAxisRef, v: state.vAxisRef },
        realViewRef: state.realViewRef,
        projRef: state.projRef,
        viewMotionRef: state.viewMotionRef,
        dropAxisRef: state.dropAxisRef,
        viewTypeRef: state.viewTypeRef,
        rotLRef: state.rotLRef,
        rotRRef: state.rotRRef,
        axisScaleRef: state.axisScaleRef,
        viewPointRef: state.viewPointRef,
        onViewPointChangeRef: state.onViewPointChangeRef,
        orientationRef: state.orientationRef,
        setOrientationMatrix: state.setOrientationMatrix,
      });

      // Teardown (Canvas3D runs this on unmount, before disposing the
      // renderer): stop the render loop, then release every GPU resource this
      // mount created — otherwise each visit to the route strands a live rAF
      // loop and its geometries/materials/textures.
      return () => {
        stopLoop();
        const meshes = [
          ...pointsRef.current, ...fillMeshRef.current, ...wireMeshRef.current,
          ...tileMeshRef.current, ...netMeshRef.current,
        ];
        meshes.forEach(o => scene.remove(o));
        pointsRef.current = [];
        fillMeshRef.current = [];
        wireMeshRef.current = [];
        tileMeshRef.current = [];
        netMeshRef.current = [];
        state.materialsRef.current.forEach(m => m.dispose());
        state.materialsRef.current = [];
        for (const ref of [state.geometryRef, sheetGeomRef, sheetWireGeomRef, tileGeomRef, netGeomRef]) {
          ref.current?.dispose();
          ref.current = undefined;
        }
        for (const ref of [state.xAxisRef, state.yAxisRef, state.uAxisRef, state.vAxisRef]) {
          const ax = ref.current;
          if (!ax) continue;
          scene.remove(ax.line);
          ax.line.geometry.dispose();
          (ax.line.material as THREE.Material).dispose();
          ref.current = undefined;
        }
        scaffold.dispose();
        scaffoldRef.current = undefined;
        textures.forEach(t => t.dispose());
        state.texturesRef.current = [];
        sceneRef.current = undefined;
      };
    }, []);

  // Re-apply the restored projection slider once after mount: the fresh
  // materials start at the persisted viewType, so a non-zero projMix needs
  // its blend uniforms and axis fade pushed (runs before the embed effect,
  // letting an embed's proj= param win).
  useEffect(() => {
    if (!embed && state.projMix > 0) controls.handleProjMix(state.projMix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Embed mode: apply the URL-configured view once on mount. Canvas3D's
  // child effect (onMount) has already run by the time this fires, so the
  // materials exist and the normal control surface (projection cross-fade,
  // drop axis) behaves exactly as in the full app.
  useEffect(() => {
    if (!embed) return;
    if (embed.render) state.setRenderMode(embed.render);
    if (embed.pattern !== undefined) state.setSamplePattern(embed.pattern);
    if (embed.motion) state.setViewMotion(embed.motion);
    if (embed.colorBy !== undefined) state.setColorBy(embed.colorBy);
    if (embed.colormap !== undefined) state.setColormap(embed.colormap);
    if (embed.extent !== undefined) { state.setExtentX(embed.extent); state.setExtentY(embed.extent); }
    if (embed.proj !== undefined) {
      const drop = embed.proj === ProjectionMode.DropX ? 'DropX'
        : embed.proj === ProjectionMode.DropY ? 'DropY'
        : embed.proj === ProjectionMode.DropU ? 'DropU'
        : embed.proj === ProjectionMode.DropV ? 'DropV' : null;
      if (drop) controls.handleDropAxis(drop);
      else controls.handleViewType(embed.proj);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Embed spin: continuous 4D plane rotations (composing, like the 4D
  // Rotation panel's spin toggles); implies a Fixed base motion so the
  // requested spin reads cleanly rather than stacking on the auto-tumble.
  useEffect(() => {
    if (!embed?.spin?.length) return;
    state.setViewMotion('Fixed');
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const pl of embed.spin!) controls.rotateBy(pl, 0.5 * dt);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Auto-snap the recommended domain/projection when the function actually
  // changes (PR-1). Domain/projection only — color, size, render mode and motion
  // are the user's and are left exactly as set. A same-function re-pick and the
  // initial restore never call this, so the z² landing is preserved.
  const applyFunctionPreset = (idx: number) => {
    state.setAxisScale(UNIT_SCALE_FUNCS.has(idx) ? 1 : Math.PI);
    // Projection: Sphere (Hopf) for poles & Möbius, else Perspective. Only morph
    // when it differs, so switching among same-projection functions is calm.
    const proj = HOPF_PROJECTION_FUNCS.has(idx) ? ProjectionMode.Hopf : ProjectionMode.Perspective;
    if (state.viewType !== proj) controls.handleViewType(proj);
    // Sheets: a multivalued function arrives showing its full Riemann-sheet set
    // (capped, tinted by the default sheetTint); single-valued collapses to one.
    if (MULTIVALUED_INDICES.has(idx)) {
      const sheets = branchPeriod(idx, expQ === 0 ? 1 : expQ) ?? 3;
      setBranchMin(0);
      setBranchMax(Math.min(sheets, MAX_SHEETS) - 1);
    } else {
      setBranchMin(0);
      setBranchMax(0);
    }
  };

  const selectFunction = (idx: number) => {
    if (idx !== functionIndex) applyFunctionPreset(idx);
    setFunctionIndex(idx);
  };

  const functionPicker = (
    <>
      <Select
        label="Function"
        groups={functionGroups}
        value={functionIndex}
        onChange={selectFunction}
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
          <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', margin: '4px 0 2px' }}>
            f(z) = a·z² + b·z + c
          </div>
          <ComplexInput label="a" value={quadA} onChange={setQuadA} />
          <ComplexInput label="b" value={quadB} onChange={setQuadB} />
          <ComplexInput label="c" value={quadC} onChange={setQuadC} />
        </>
      )}
    </>
  );

  // Always-available top-bar function picker: switching functions should never
  // require opening a panel. Per-function parameters (p/q, the quadratic
  // coefficients) stay in the Function panel — one tap on the title away.
  const functionTopSelect = (
    <select
      className="am-select am-bar-select"
      aria-label="Function"
      title="Function"
      value={functionIndex}
      onChange={e => selectFunction(Number(e.target.value))}
    >
      {functionGroups.map(g => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  // Cross-app handoff (Phase-2 "graph ↔ map"): open the same function as a plane
  // map (domain → image) in Plane Transform. The link carries ONLY the function
  // (name + p/q or quadratic coeffs), never the view — the two apps are two ways
  // of seeing one function, not two persistence roots.
  const fnState: FunctionState = { index: functionIndex, p: expP, q: expQ, quad: { a: quadA, b: quadB, c: quadC } };
  const topBarExtra = (
    <span className="am-bar-extra">
      {functionTopSelect}
      <a
        className="am-bar-link"
        href={`#/plane-transform?${encodeFunction(fnState)}`}
        title="See this function as a plane map — the domain z-plane beside its image f(z)"
      >↗ plane map</a>
    </span>
  );

  // Riemann-sheet range (shown for multivalued functions only). Kept min ≤ max
  // and within the sheet span (the function's finite period, else MAX_SHEETS)
  // by nudging the partner bound. Lives in the Domain section.
  const branchControls = (
    <>
      <NumberInput
        label="Branch min (sheet)"
        value={branchMin}
        integer
        onChange={v => {
          const nv = Math.min(v, branchMax);
          setBranchMin(Math.max(nv, branchMax - (maxSpan - 1)));
        }}
      />
      <NumberInput
        label="Branch max (sheet)"
        value={branchMax}
        integer
        onChange={v => {
          const nv = Math.max(v, branchMin);
          setBranchMax(Math.min(nv, branchMin + (maxSpan - 1)));
        }}
      />
      {period !== null && (
        <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', margin: '4px 0 2px' }}>
          {period} distinct sheets — a wider span would only repeat them
        </div>
      )}
      <Checkbox
        label="Tint sheets (hue offset per sheet)"
        checked={sheetTint}
        onChange={setSheetTint}
      />
    </>
  );

  // Domain-region control: a polar radius band on |z|. A shader mask, so it
  // applies live in every render mode (max thumb = ∞ = no upper limit).
  const regionControls = (
    <RangeSlider
      label="Radius |z|"
      min={0}
      max={REGION_RMAX}
      step={0.05}
      valueMin={radiusRange[0]}
      valueMax={radiusRange[1]}
      onChange={(lo, hi) => setRadiusRange([lo, hi])}
      format={v => (v >= REGION_RMAX ? '∞' : v.toFixed(2))}
    />
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
      topExtra={topBarExtra}
      domainExtras={<>{regionControls}{isMultivalued ? branchControls : null}</>}
      readme={readmeText}
      explainer={explainerText}
      settingsStorageKey={embed ? undefined : STORAGE_KEY}
      embed={embed ? { caption: embed.caption, controls: embed.controls, buttons: embed.buttons } : undefined}
    />
  );
}
