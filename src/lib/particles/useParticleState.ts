import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ProjectionMode } from '../viewpoint';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import { usePersistentState } from '../usePersistentState';
import { ViewPoint, ColorStyle, ColorBy, ColorQuantity, CoordMode, SamplePattern, JitterMode, Axis, motionModes, dropModes, RenderMode } from './types';

export interface UseParticleStateOptions {
  count?: number;
  viewPoint?: ViewPoint;
  onViewPointChange?: (vp: ViewPoint) => void;
  /** When set, the viewer's serializable settings persist to localStorage under
   *  this namespace (e.g. 'complex-particles') and are restored on reload.
   *  Omit to keep the viewer ephemeral. */
  storageKey?: string;
}

export function useParticleState(options: UseParticleStateOptions = {}) {
  const {
    count = COMPLEX_PARTICLES_DEFAULTS.defaultParticleCount,
    viewPoint,
    onViewPointChange,
    storageKey,
  } = options;

  // Build a per-field persistence key, or null to fall back to ephemeral state.
  const pk = (name: string) => (storageKey ? `${storageKey}:${name}` : null);

  // ---- Rendering state (persisted) ----
  const [saturation, setSaturation] = usePersistentState(pk('saturation'), COMPLEX_PARTICLES_DEFAULTS.initial.saturation);
  const [particleCount, setParticleCount] = usePersistentState(pk('particleCount'), count);
  const [cameraZ, setCameraZ] = usePersistentState(pk('cameraZ'), COMPLEX_PARTICLES_DEFAULTS.initial.cameraZ);
  // Camera orbit + pan are transient "looking" state, not settings — they reset
  // each session (and the Reset orientation button clears them), so they are
  // intentionally NOT persisted.
  // Free orbit: the camera's orientation quaternion (camera-local → world).
  // Identity = the straight-back default, at (0, 0, cameraZ) facing the target.
  const [camQuat, setCamQuat] = useState(() => new THREE.Quaternion());
  /** What a one-finger drag does: orbit the camera or pan the target. */
  const [dragMode, setDragMode] = useState<'orbit' | 'pan'>('orbit');
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [panZ, setPanZ] = useState(0);
  const [size, setSize] = usePersistentState(pk('size'), COMPLEX_PARTICLES_DEFAULTS.initial.size);
  const [opacity, setOpacity] = usePersistentState(pk('opacity'), COMPLEX_PARTICLES_DEFAULTS.initial.opacity);
  const [intensity, setIntensity] = usePersistentState(pk('intensity'), COMPLEX_PARTICLES_DEFAULTS.initial.intensity);
  const [shimmer, setShimmer] = usePersistentState(pk('shimmer'), COMPLEX_PARTICLES_DEFAULTS.initial.shimmer);
  const [hueShift, setHueShift] = usePersistentState(pk('hueShift'), COMPLEX_PARTICLES_DEFAULTS.initial.hueShift);
  const [jitter, setJitter] = usePersistentState(pk('jitter'), COMPLEX_PARTICLES_DEFAULTS.initial.jitter);
  // How the Jitter amount is applied: Scatter (perturb the domain, stay on the
  // surface — default) or Fuzz (offset the 4D point off the surface). See JitterMode.
  const [jitterMode, setJitterMode] = usePersistentState<JitterMode>(pk('jitterMode'), JitterMode.Scatter);
  const [axisWidth, setAxisWidth] = usePersistentState(pk('axisWidth'), COMPLEX_PARTICLES_DEFAULTS.initial.axisWidth);
  // Sampled-domain half-widths, independent per axis (a rectangular input box),
  // plus a unit multiplier (1 or π) applied to both extents and the reference
  // axes — handy for trig functions whose natural scale is π.
  const [extentX, setExtentX] = usePersistentState(pk('extentX'), COMPLEX_PARTICLES_DEFAULTS.initial.extentX);
  const [extentY, setExtentY] = usePersistentState(pk('extentY'), COMPLEX_PARTICLES_DEFAULTS.initial.extentY);
  // Domain bounds. When `boundsLock` is true (default) the box is the symmetric
  // [-extentX, +extentX] × [-extentY, +extentY] driven by the extent sliders
  // above; when unlocked, these independent min/max define an off-center window.
  const [boundsLock, setBoundsLock] = usePersistentState(pk('boundsLock'), true);
  const [xMin, setXMin] = usePersistentState(pk('xMin'), -COMPLEX_PARTICLES_DEFAULTS.initial.extentX);
  const [xMax, setXMax] = usePersistentState(pk('xMax'), COMPLEX_PARTICLES_DEFAULTS.initial.extentX);
  const [yMin, setYMin] = usePersistentState(pk('yMin'), -COMPLEX_PARTICLES_DEFAULTS.initial.extentY);
  const [yMax, setYMax] = usePersistentState(pk('yMax'), COMPLEX_PARTICLES_DEFAULTS.initial.extentY);
  const [axisScale, setAxisScale] = usePersistentState(pk('axisScale'), COMPLEX_PARTICLES_DEFAULTS.initial.axisScale);
  // How the (non-adaptive) domain grid is laid out: Cartesian grid, polar,
  // rings, spokes, web, squares, or random scatter.
  const [samplePattern, setSamplePattern] = usePersistentState<SamplePattern>(pk('samplePattern'), SamplePattern.Grid);
  // Reciprocal-symmetric sampling: warp the domain radius to be uniform in log|z|
  // (the unit circle at the middle), so samples reach as deeply inside |z|<1 as
  // outside. Applies to every render mode (points, sheet, tiles, net). On by
  // default — most of the function library is as interesting inside the unit
  // disk as outside.
  const [reciprocal, setReciprocal] = usePersistentState(pk('reciprocal'), true);
  /** When true, sample more densely where |f'(z)| is large. */
  const [adaptive, setAdaptive] = usePersistentState(pk('adaptive'), COMPLEX_PARTICLES_DEFAULTS.initial.adaptive);
  /** Exponent biasing strength for adaptive sampling. */
  const [adaptiveAlpha, setAdaptiveAlpha] = usePersistentState(pk('adaptiveAlpha'), COMPLEX_PARTICLES_DEFAULTS.initial.adaptiveAlpha);
  // ---- Surface (sheet) rendering ----
  // Draw the sampled surface as a point cloud ('Points', default) or as a single
  // continuous translucent sheet ('Sheet') built from a regular triangle grid.
  const [renderMode, setRenderMode] = usePersistentState<RenderMode>(pk('renderMode'), 'Points');
  // In Sheet mode: show the translucent filled surface and/or the wireframe grid.
  const [sheetFill, setSheetFill] = usePersistentState(pk('sheetFill'), true);
  const [sheetWire, setSheetWire] = usePersistentState(pk('sheetWire'), true);
  // Grid resolution (cells per side) of the sheet mesh — independent of the
  // particle count, since a sheet needs regular grid topology.
  const [sheetResolution, setSheetResolution] = usePersistentState(pk('sheetResolution'), 80);
  // Faceted shading strength on the filled sheet (0 = flat color, 1 = full
  // facing-ratio shading) — gives the translucent surface depth cues.
  const [sheetShade, setSheetShade] = usePersistentState(pk('sheetShade'), 0.6);
  // External directional light for Sheet/Tiles: lights the side you're facing so
  // the surface reads in 3D, and tints back faces cooler/dimmer so you can tell
  // "inside" from "outside" of the surface. `lightStrength` blends flat→fully lit.
  const [lighting, setLighting] = usePersistentState(pk('lighting'), false);
  const [lightStrength, setLightStrength] = usePersistentState(pk('lightStrength'), 0.7);
  // Adaptive density: where the function stretches the grid so a cell's deformed
  // size in 3D exceeds `sheetDensity`, the fill/wire dissolves and the underlying
  // point cloud shows through — so dense regions read as a solid sheet and sparse
  // (stretched) regions fall back to points. Off → a uniform sheet everywhere.
  const [sheetAdaptive, setSheetAdaptive] = usePersistentState(pk('sheetAdaptive'), true);
  const [sheetDensity, setSheetDensity] = usePersistentState(pk('sheetDensity'), 0.6);
  // Tiles mode: maximum world-space edge length of a tile before it stops growing
  // with the local cell. Below it tiles meet edge-to-edge (a solid fabric); past
  // it they detach into a field of separated squares (the "points").
  const [tileSize, setTileSize] = usePersistentState(pk('tileSize'), 0.35);
  // Net mode: a polar fiber net — `netRings` concentric circles (constant |z|)
  // and `netSpokes` rays (constant arg z); each family toggles independently.
  const [netRings, setNetRings] = usePersistentState(pk('netRings'), 14);
  const [netSpokes, setNetSpokes] = usePersistentState(pk('netSpokes'), 24);
  const [netCircles, setNetCircles] = usePersistentState(pk('netCircles'), true);
  const [netRays, setNetRays] = usePersistentState(pk('netRays'), false);
  // Net thread width (px, screen-space ribbons) and per-curve sample count.
  const [netWidth, setNetWidth] = usePersistentState(pk('netWidth'), 2.5);
  const [netResolution, setNetResolution] = usePersistentState(pk('netResolution'), 128);
  const [objectMode, setObjectMode] = usePersistentState(pk('objectMode'), false);
  const [shapeIndex, setShapeIndex] = usePersistentState(pk('shapeIndex'), 1);
  const [textureIndex, setTextureIndex] = usePersistentState(pk('textureIndex'), 0);
  const [realView, setRealView] = useState(false);
  const [colorStyle, setColorStyle] = usePersistentState<ColorStyle>(pk('colorStyle'), ColorStyle.HSV);
  // Palette: 0 = Phase wheel (HSV domain coloring, the default); 1..7 = sequential
  // colormaps mapped to magnitude (Grayscale / Viridis / Magma / Inferno / Plasma /
  // Fire / Ocean), for reading |z| / |f|.
  const [colormap, setColormap] = usePersistentState(pk('colormap'), 0);
  // Sequential-colormap scale: 0 = one smooth saturating sweep over log-magnitude;
  // >0 = repeat the colormap that many cycles per e-fold of |·| (log-spaced bands).
  const [colorRepeat, setColorRepeat] = usePersistentState(pk('colorRepeat'), 0);
  const [colorBy, setColorBy] = usePersistentState<ColorBy>(pk('colorBy'), ColorBy.Domain);
  // Which scalar of the chosen source drives the color wheel (hue). Phase keeps
  // the classic domain-coloring look; Modulus colors by |z| / |f|, etc.
  const [colorQuantity, setColorQuantity] = usePersistentState<ColorQuantity>(pk('colorQuantity'), ColorQuantity.Phase);
  // Which scalar drives the brightness (value) channel, independently of hue.
  // Defaults to Uniform — flat, full-strength color; pick Modulus for the
  // classic |·| → brightness domain-coloring shading.
  const [brightnessQuantity, setBrightnessQuantity] = usePersistentState<ColorQuantity>(pk('brightnessQuantity'), ColorQuantity.Uniform);
  // Coordinate chart for the input z and output f planes before they form the
  // 4-vector (Cartesian / Polar / Log-polar). The chart pickers are removed
  // from the UI for now (they confused more than they taught), so these are
  // plain ephemeral state pinned at Cartesian — the engine plumbing stays, and
  // restoring the two Selects (plus persistence) brings the feature back.
  const [inputCoord, setInputCoord] = useState<CoordMode>(CoordMode.Cartesian);
  const [outputCoord, setOutputCoord] = useState<CoordMode>(CoordMode.Cartesian);

  // ---- View / projection state ----
  const [viewType, setViewType] = usePersistentState<ProjectionMode>(pk('viewType'), ProjectionMode.Perspective);
  // The projection slider: 0 = Perspective, 1 = Torus, 2 = Hopf, fractional
  // positions are live GPU morphs between the neighbors. Seeded from the
  // restored viewType (Stereo maps to Torus — same stereographic projection,
  // the Torus path just soft-floors the pole).
  const [projMix, setProjMix] = usePersistentState(
    pk('projMix'),
    viewType === ProjectionMode.Hopf ? 2
      : viewType === ProjectionMode.Torus || viewType === ProjectionMode.Stereo ? 1 : 0,
  );
  // Base motion: start still (Fixed) so the first view reads cleanly against
  // the axes; Quaternion turns on the ambient 4D tumble.
  const [viewMotion, setViewMotion] = usePersistentState<(typeof motionModes)[number]>(pk('viewMotion'), 'Fixed');
  const [dropAxis, setDropAxis] = usePersistentState<(typeof dropModes)[number]>(pk('dropAxis'), 'None');
  // `proj` is the projection actually applied to the shader (vs. `viewType`, the
  // user's pick). Seed it from the restored viewType + dropAxis so a reloaded
  // Stereo/Hopf/Drop view renders correctly from the first frame instead of
  // snapping back to Perspective.
  const [proj, setProj] = useState(
    dropAxis === 'DropX' ? ProjectionMode.DropX
      : dropAxis === 'DropY' ? ProjectionMode.DropY
      : dropAxis === 'DropU' ? ProjectionMode.DropU
      : dropAxis === 'DropV' ? ProjectionMode.DropV
      : viewType,
  );
  // Torus → Hopf "fiber collapse" scrub (0 = full Torus, 1 = full Hopf). This is
  // transient exploratory view state, so it is not persisted.
  const [fiberCollapse, setFiberCollapse] = useState(0);
  // Whether to draw the faint sphere/donut reference scaffolding.
  const [showScaffold, setShowScaffold] = usePersistentState(pk('showScaffold'), true);
  const [orientationMatrix, setOrientationMatrix] = useState<number[][]>([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ]);

  // ---- Three.js object refs ----
  const materialsRef = useRef<THREE.ShaderMaterial[]>([]);
  const geometryRef = useRef<THREE.BufferGeometry>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const texturesRef = useRef<THREE.Texture[]>([]);
  const xAxisRef = useRef<Axis>();
  const yAxisRef = useRef<Axis>();
  const uAxisRef = useRef<Axis>();
  const vAxisRef = useRef<Axis>();

  // ---- Rotation refs ----
  const rotLRef = useRef(new THREE.Quaternion());
  const rotRRef = useRef(new THREE.Quaternion());
  const viewPointRef = useRef<ViewPoint>({
    L: new THREE.Quaternion(),
    R: new THREE.Quaternion(),
  });
  const onViewPointChangeRef = useRef(onViewPointChange);
  useEffect(() => { onViewPointChangeRef.current = onViewPointChange; }, [onViewPointChange]);

  // ---- State-sync refs (read by animation loop) ----
  const realViewRef = useRef(realView);
  useEffect(() => { realViewRef.current = realView; }, [realView]);
  const projRef = useRef(proj);
  useEffect(() => { projRef.current = proj; }, [proj]);
  const viewMotionRef = useRef(viewMotion);
  useEffect(() => { viewMotionRef.current = viewMotion; }, [viewMotion]);
  const dropAxisRef = useRef(dropAxis);
  useEffect(() => { dropAxisRef.current = dropAxis; }, [dropAxis]);
  // The user-facing projection stop (Perspective / Torus / Hopf). The loop
  // reads it to pause the 4D tumble in the nonlinear views, where a 4D
  // rotation before the map warps the image instead of turning it.
  const viewTypeRef = useRef(viewType);
  useEffect(() => { viewTypeRef.current = viewType; }, [viewType]);
  const axisScaleRef = useRef(axisScale);
  useEffect(() => { axisScaleRef.current = axisScale; }, [axisScale]);
  const orientationRef = useRef('');

  // ---- Sync external viewPoint prop → rotation refs + uniforms ----
  useEffect(() => {
    if (viewPoint) {
      rotLRef.current.copy(viewPoint.L);
      rotRRef.current.copy(viewPoint.R);
      materialsRef.current.forEach(m => {
        m.uniforms.uRotL.value.w = viewPoint.L.w;
        m.uniforms.uRotL.value.v.set(viewPoint.L.x, viewPoint.L.y, viewPoint.L.z);
        m.uniforms.uRotR.value.w = viewPoint.R.w;
        m.uniforms.uRotR.value.v.set(viewPoint.R.x, viewPoint.R.y, viewPoint.R.z);
      });
    }
  }, [viewPoint]);

  return {
    // Rendering state + setters
    saturation, setSaturation,
    particleCount, setParticleCount,
    cameraZ, setCameraZ,
    camQuat, setCamQuat,
    dragMode, setDragMode,
    panX, setPanX,
    panY, setPanY,
    panZ, setPanZ,
    size, setSize,
    opacity, setOpacity,
    intensity, setIntensity,
    shimmer, setShimmer,
    hueShift, setHueShift,
    jitter, setJitter,
    jitterMode, setJitterMode,
    axisWidth, setAxisWidth,
    extentX, setExtentX,
    extentY, setExtentY,
    boundsLock, setBoundsLock,
    xMin, setXMin,
    xMax, setXMax,
    yMin, setYMin,
    yMax, setYMax,
    axisScale, setAxisScale,
    axisScaleRef,
    samplePattern, setSamplePattern,
    reciprocal, setReciprocal,
    adaptive, setAdaptive,
    adaptiveAlpha, setAdaptiveAlpha,
    renderMode, setRenderMode,
    sheetFill, setSheetFill,
    sheetWire, setSheetWire,
    sheetResolution, setSheetResolution,
    sheetShade, setSheetShade,
    sheetAdaptive, setSheetAdaptive,
    sheetDensity, setSheetDensity,
    tileSize, setTileSize,
    netRings, setNetRings,
    netSpokes, setNetSpokes,
    netCircles, setNetCircles,
    netRays, setNetRays,
    netWidth, setNetWidth,
    netResolution, setNetResolution,
    lighting, setLighting,
    lightStrength, setLightStrength,
    objectMode, setObjectMode,
    shapeIndex, setShapeIndex,
    textureIndex, setTextureIndex,
    realView, setRealView,
    colorStyle, setColorStyle,
    colormap, setColormap,
    colorRepeat, setColorRepeat,
    colorBy, setColorBy,
    colorQuantity, setColorQuantity,
    brightnessQuantity, setBrightnessQuantity,
    inputCoord, setInputCoord,
    outputCoord, setOutputCoord,

    // View state + setters
    viewType, setViewType,
    projMix, setProjMix,
    viewMotion, setViewMotion,
    dropAxis, setDropAxis,
    proj, setProj,
    fiberCollapse, setFiberCollapse,
    showScaffold, setShowScaffold,
    orientationMatrix, setOrientationMatrix,

    // Three.js object refs
    materialsRef,
    geometryRef,
    cameraRef,
    rendererRef,
    texturesRef,
    xAxisRef,
    yAxisRef,
    uAxisRef,
    vAxisRef,

    // Rotation refs
    rotLRef,
    rotRRef,
    viewPointRef,
    onViewPointChangeRef,

    // State-sync refs
    realViewRef,
    projRef,
    viewMotionRef,
    dropAxisRef,
    viewTypeRef,
    orientationRef,
  };
}

export type ParticleState = ReturnType<typeof useParticleState>;
