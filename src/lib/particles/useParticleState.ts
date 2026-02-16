import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ProjectionMode } from '../viewpoint';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import { ViewPoint, ColorStyle, ColourBy, Axis, motionModes, dropModes } from './types';

export interface UseParticleStateOptions {
  count?: number;
  viewPoint?: ViewPoint;
  onViewPointChange?: (vp: ViewPoint) => void;
}

export function useParticleState(options: UseParticleStateOptions = {}) {
  const {
    count = COMPLEX_PARTICLES_DEFAULTS.defaultParticleCount,
    viewPoint,
    onViewPointChange,
  } = options;

  // ---- Rendering state ----
  const [saturation, setSaturation] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.saturation);
  const [particleCount, setParticleCount] = useState(count);
  const [cameraZ, setCameraZ] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.cameraZ);
  const [size, setSize] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.size);
  const [opacity, setOpacity] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.opacity);
  const [intensity, setIntensity] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.intensity);
  const [shimmer, setShimmer] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.shimmer);
  const [hueShift, setHueShift] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.hueShift);
  const [jitter, setJitter] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.jitter);
  const [axisWidth, setAxisWidth] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.axisWidth);
  const [objectMode, setObjectMode] = useState(false);
  const [shapeIndex, setShapeIndex] = useState(1);
  const [textureIndex, setTextureIndex] = useState(0);
  const [realView, setRealView] = useState(false);
  const [colourStyle, setColourStyle] = useState<ColorStyle>(ColorStyle.HSV);
  const [colourBy, setColourBy] = useState<ColourBy>(ColourBy.Domain);

  // ---- View / projection state ----
  const [viewType, setViewType] = useState<ProjectionMode>(ProjectionMode.Perspective);
  const [viewMotion, setViewMotion] = useState<(typeof motionModes)[number]>('Quaternion');
  const [dropAxis, setDropAxis] = useState<(typeof dropModes)[number]>('None');
  const [proj, setProj] = useState(ProjectionMode.Perspective);
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
    size, setSize,
    opacity, setOpacity,
    intensity, setIntensity,
    shimmer, setShimmer,
    hueShift, setHueShift,
    jitter, setJitter,
    axisWidth, setAxisWidth,
    objectMode, setObjectMode,
    shapeIndex, setShapeIndex,
    textureIndex, setTextureIndex,
    realView, setRealView,
    colourStyle, setColourStyle,
    colourBy, setColourBy,

    // View state + setters
    viewType, setViewType,
    viewMotion, setViewMotion,
    dropAxis, setDropAxis,
    proj, setProj,
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
