import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ProjectionMode } from '../viewpoint';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import { usePersistentState } from '../usePersistentState';
import { ViewPoint, ColorStyle, ColourBy, ColourQuantity, CoordMode, SamplePattern, JitterMode, Axis, motionModes, dropModes } from './types';

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
  const [azimuth, setAzimuth] = useState(0);
  const [elevation, setElevation] = useState(0);
  const [roll, setRoll] = useState(0);
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
  // above; when unlocked, these independent min/max define an off-centre window.
  const [boundsLock, setBoundsLock] = usePersistentState(pk('boundsLock'), true);
  const [xMin, setXMin] = usePersistentState(pk('xMin'), -COMPLEX_PARTICLES_DEFAULTS.initial.extentX);
  const [xMax, setXMax] = usePersistentState(pk('xMax'), COMPLEX_PARTICLES_DEFAULTS.initial.extentX);
  const [yMin, setYMin] = usePersistentState(pk('yMin'), -COMPLEX_PARTICLES_DEFAULTS.initial.extentY);
  const [yMax, setYMax] = usePersistentState(pk('yMax'), COMPLEX_PARTICLES_DEFAULTS.initial.extentY);
  const [axisScale, setAxisScale] = usePersistentState(pk('axisScale'), COMPLEX_PARTICLES_DEFAULTS.initial.axisScale);
  // How the (non-adaptive) domain grid is laid out: Cartesian grid, polar,
  // rings, spokes, web, squares, or random scatter.
  const [samplePattern, setSamplePattern] = usePersistentState<SamplePattern>(pk('samplePattern'), SamplePattern.Grid);
  /** When true, sample more densely where |f'(z)| is large. */
  const [adaptive, setAdaptive] = usePersistentState(pk('adaptive'), COMPLEX_PARTICLES_DEFAULTS.initial.adaptive);
  /** Exponent biasing strength for adaptive sampling. */
  const [adaptiveAlpha, setAdaptiveAlpha] = usePersistentState(pk('adaptiveAlpha'), COMPLEX_PARTICLES_DEFAULTS.initial.adaptiveAlpha);
  const [objectMode, setObjectMode] = usePersistentState(pk('objectMode'), false);
  const [shapeIndex, setShapeIndex] = usePersistentState(pk('shapeIndex'), 1);
  const [textureIndex, setTextureIndex] = usePersistentState(pk('textureIndex'), 0);
  const [realView, setRealView] = useState(false);
  const [colourStyle, setColourStyle] = usePersistentState<ColorStyle>(pk('colourStyle'), ColorStyle.HSV);
  const [colourBy, setColourBy] = usePersistentState<ColourBy>(pk('colourBy'), ColourBy.Domain);
  // Which scalar of the chosen source drives the colour wheel (hue). Phase keeps
  // the classic domain-colouring look; Modulus colours by |z| / |f|, etc.
  const [colourQuantity, setColourQuantity] = usePersistentState<ColourQuantity>(pk('colourQuantity'), ColourQuantity.Phase);
  // Which scalar drives the brightness (value) channel, independently of hue.
  // Defaults to Modulus = magnitude (the classic |·| → brightness).
  const [brightnessQuantity, setBrightnessQuantity] = usePersistentState<ColourQuantity>(pk('brightnessQuantity'), ColourQuantity.Modulus);
  // Torus radius scale: when true, the Torus mapping derives each fiber's donut
  // from log(1+|z|) and log(1+|f|) instead of the raw magnitudes, spreading the
  // nesting across orders of magnitude. Only affects the Torus projection.
  const [logRadius, setLogRadius] = usePersistentState(pk('logRadius'), false);
  // Coordinate chart for the input z and output f planes before they form the
  // 4-vector (Cartesian / Polar / Log-polar). Colour stays Cartesian.
  const [inputCoord, setInputCoord] = usePersistentState<CoordMode>(pk('inputCoord'), CoordMode.Cartesian);
  const [outputCoord, setOutputCoord] = usePersistentState<CoordMode>(pk('outputCoord'), CoordMode.Cartesian);

  // ---- View / projection state ----
  const [viewType, setViewType] = usePersistentState<ProjectionMode>(pk('viewType'), ProjectionMode.Perspective);
  const [viewMotion, setViewMotion] = usePersistentState<(typeof motionModes)[number]>(pk('viewMotion'), 'Quaternion');
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
  // Hopf fiber-trace overlay (Torus view): toggle + how many fibers per latitude.
  const [showFibers, setShowFibers] = usePersistentState(pk('showFibers'), false);
  const [fiberDensity, setFiberDensity] = usePersistentState(pk('fiberDensity'), 12);
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
    azimuth, setAzimuth,
    elevation, setElevation,
    roll, setRoll,
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
    adaptive, setAdaptive,
    adaptiveAlpha, setAdaptiveAlpha,
    objectMode, setObjectMode,
    shapeIndex, setShapeIndex,
    textureIndex, setTextureIndex,
    realView, setRealView,
    colourStyle, setColourStyle,
    colourBy, setColourBy,
    colourQuantity, setColourQuantity,
    brightnessQuantity, setBrightnessQuantity,
    logRadius, setLogRadius,
    inputCoord, setInputCoord,
    outputCoord, setOutputCoord,

    // View state + setters
    viewType, setViewType,
    viewMotion, setViewMotion,
    dropAxis, setDropAxis,
    proj, setProj,
    fiberCollapse, setFiberCollapse,
    showScaffold, setShowScaffold,
    showFibers, setShowFibers,
    fiberDensity, setFiberDensity,
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
    orientationRef,
  };
}

export type ParticleState = ReturnType<typeof useParticleState>;
