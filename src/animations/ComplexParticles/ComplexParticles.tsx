import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import Canvas3D from '../../components/Canvas3D';
import ToggleMenu from '../../components/ToggleMenu';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import { quatRotate4D, ProjectionMode, project } from '../../lib/viewpoint';
import QuarterTurnBar from '@/controls/QuarterTurnBar';
import { QUARTER, Plane } from '@/math/constants';
import { quarterQuat } from '@/math/quat4';
import { vertexShader, fragmentShader } from './shaders';

export interface ComplexParticlesProps {
  count?: number;
  selectedFunction?: string;
}

const functionNames = [
  'linear',
  'sqrt',
  'square',
  'ln',
  'exp',
  'sin',
  'cos',
  'tan',
  'inverse',

  /*  🚩 new additions  — keep order fixed */
  'cube',
  'reciprocalCube',
  'joukowski',
  'rational22',
  'essentialExpInv',
  'branchSqrtPoly'
];

const functionFormulas: Record<string, string> = {
  sqrt: '√z',
  square: 'z²',
  ln: 'ln(z)',
  exp: 'e^z',
  sin: 'sin(z)',
  cos: 'cos(z)',
  tan: 'tan(z)',
  inverse: '1/z',
  cube: 'z³',
  reciprocalCube: '1/z³',
  joukowski: '0.5*(z + 1/z)',
  rational22: '(z² + 1)/(z² - 1)',
  essentialExpInv: 'e^{1/z}',
  branchSqrtPoly: '√(z(z-1)(z+1))',
  linear: 'z'
};

const shapeNames = ['sphere', 'hexagon', 'pyramid'] as const;
const textureNames = ['none', 'checker', 'speckled', 'stone', 'metal', 'royal'] as const;

export enum ColorStyle {
  HSV = 0,
  ModulusBands = 1,
  PhaseOnly = 2,
  DualHueCVD = 3
}

export enum ColourBy {
  Domain = 0,
  Range  = 1
}

const AXIS_LENGTH = COMPLEX_PARTICLES_DEFAULTS.axisLength;
const viewTypes = [
  ['Perspective', ProjectionMode.Perspective],
  ['Stereo', ProjectionMode.Stereo],
  ['Hopf', ProjectionMode.Hopf]
] as const;
const motionModes = ['Quaternion','DropX','DropY','DropU','DropV'] as const;

function makeCheckerTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const c = ((x >> 4) & 1) ^ ((y >> 4) & 1) ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

function makeSpeckledTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const c = Math.floor(Math.random() * 256);
    const j = i * 4;
    data[j] = data[j + 1] = data[j + 2] = c;
    data[j + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

function makeStoneTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n =
        0.5 +
        0.5 *
          (Math.sin(x * 0.3) * Math.sin(y * 0.3)) +
        0.1 * Math.random();
      const c = Math.floor(100 + 80 * n);
      data[i] = data[i + 1] = data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

function makeMetalTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const shine = 0.5 + 0.5 * Math.sin(x * 0.2);
      const c = Math.floor(180 + 40 * shine);
      data[i] = data[i + 1] = data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

// CPU versions of the complex functions used in the shader
function complexSqrt(z: THREE.Vector2): THREE.Vector2 {
  const r = Math.hypot(z.x, z.y);
  const t = Math.atan2(z.y, z.x);
  const sr = Math.sqrt(r);
  return new THREE.Vector2(sr * Math.cos(t * 0.5), sr * Math.sin(t * 0.5));
}

function complexSquare(z: THREE.Vector2): THREE.Vector2 {
  return new THREE.Vector2(z.x * z.x - z.y * z.y, 2 * z.x * z.y);
}

function complexLn(z: THREE.Vector2): THREE.Vector2 {
  const r = Math.hypot(z.x, z.y);
  const t = Math.atan2(z.y, z.x);
  return new THREE.Vector2(Math.log(r), t);
}

function complexExp(z: THREE.Vector2): THREE.Vector2 {
  const ex = Math.exp(z.x);
  return new THREE.Vector2(ex * Math.cos(z.y), ex * Math.sin(z.y));
}

function complexSin(z: THREE.Vector2): THREE.Vector2 {
  const iz = new THREE.Vector2(-z.y, z.x);
  const e1 = complexExp(iz);
  const e2 = complexExp(new THREE.Vector2(-iz.x, -iz.y));
  const diff = new THREE.Vector2(e1.x - e2.x, e1.y - e2.y);
  return new THREE.Vector2(diff.y * 0.5, -diff.x * 0.5);
}

function complexCos(z: THREE.Vector2): THREE.Vector2 {
  const iz = new THREE.Vector2(-z.y, z.x);
  const e1 = complexExp(iz);
  const e2 = complexExp(new THREE.Vector2(-iz.x, -iz.y));
  const sum = new THREE.Vector2(e1.x + e2.x, e1.y + e2.y);
  return new THREE.Vector2(sum.x * 0.5, sum.y * 0.5);
}

function complexTan(z: THREE.Vector2): THREE.Vector2 {
  const s = complexSin(z);
  const c = complexCos(z);
  let d = c.x * c.x + c.y * c.y;
  if (d < 1e-4) d = 1e-4;
  return new THREE.Vector2((s.x * c.x + s.y * c.y) / d, (s.y * c.x - s.x * c.y) / d);
}

function complexInv(z: THREE.Vector2): THREE.Vector2 {
  let d = z.x * z.x + z.y * z.y;
  if (d < 1e-4) d = 1e-4;
  return new THREE.Vector2(z.x / d, -z.y / d);
}

function complexCube(z: THREE.Vector2): THREE.Vector2 {
  return new THREE.Vector2(
    z.x * z.x * z.x - 3 * z.x * z.y * z.y,
    3 * z.x * z.x * z.y - z.y * z.y * z.y
  );
}

function complexReciprocalCube(z: THREE.Vector2): THREE.Vector2 {
  let d = z.dot(z);
  if (d < 1e-6) d = 1e-6;
  const z3 = complexCube(z);
  d = d * d * d;
  return new THREE.Vector2(z3.x / d, -z3.y / d);
}

function complexJoukowski(z: THREE.Vector2): THREE.Vector2 {
  const inv = complexInv(z);
  return new THREE.Vector2(0.5 * (z.x + inv.x), 0.5 * (z.y + inv.y));
}

function complexRational22(z: THREE.Vector2): THREE.Vector2 {
  const num = new THREE.Vector2(z.x * z.x - z.y * z.y + 1, 2 * z.x * z.y);
  const den = new THREE.Vector2(z.x * z.x - z.y * z.y - 1, 2 * z.x * z.y);
  const invd = complexInv(den);
  return new THREE.Vector2(num.x * invd.x - num.y * invd.y, num.x * invd.y + num.y * invd.x);
}

function complexEssentialExpInv(z: THREE.Vector2): THREE.Vector2 {
  let r2 = z.dot(z);
  if (r2 < 1e-6) r2 = 1e-6;
  const inv = new THREE.Vector2(z.x / r2, -z.y / r2);
  return complexExp(inv);
}

function complexBranchSqrtPoly(z: THREE.Vector2): THREE.Vector2 {
  const a = new THREE.Vector2(z.x - 1, z.y);
  const b = new THREE.Vector2(z.x + 1, z.y);
  const p = new THREE.Vector2(z.x * a.x - z.y * a.y, z.x * a.y + z.y * a.x);
  const q = new THREE.Vector2(p.x * b.x - p.y * b.y, p.x * b.y + p.y * b.x);
  return complexSqrt(q);
}

function applyComplex(z: THREE.Vector2, t: number): THREE.Vector2 {
  switch (t) {
    case 0: return z.clone();
    case 1: return complexSqrt(z);
    case 2: return complexSquare(z);
    case 3: return complexLn(z);
    case 4: return complexExp(z);
    case 5: return complexSin(z);
    case 6: return complexCos(z);
    case 7: return complexTan(z);
    case 8: return complexInv(z);
    case 9: return complexCube(z);
    case 10: return complexReciprocalCube(z);
    case 11: return complexJoukowski(z);
    case 12: return complexRational22(z);
    case 13: return complexEssentialExpInv(z);
    case 14: return complexBranchSqrtPoly(z);
    default: return z.clone();
  }
}


export default function ComplexParticles({ count = COMPLEX_PARTICLES_DEFAULTS.defaultParticleCount, selectedFunction = 'exp' }: ComplexParticlesProps) {
  const [saturation, setSaturation] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.saturation);
  const [functionIndex, setFunctionIndex] = useState(() => {
    const idx = functionNames.indexOf(selectedFunction);
    return idx >= 0 ? idx : 0;
  });
  const [particleCount, setParticleCount] = useState(count);
  const [cameraZ, setCameraZ] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.cameraZ);
  const [size, setSize] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.size);
  const [opacity, setOpacity] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.opacity);
  const [intensity, setIntensity] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.intensity);
  const [shimmer, setShimmer] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.shimmer);
  const [hueShift, setHueShift] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.hueShift);
  const [jitter, setJitter] = useState(COMPLEX_PARTICLES_DEFAULTS.initial.jitter);
  const [objectMode, setObjectMode] = useState(false);
  const [shapeIndex, setShapeIndex] = useState(0);
  const [textureIndex, setTextureIndex] = useState(0);
  const [realView, setRealView] = useState(false);
  const [colourStyle, setColourStyle] = useState<ColorStyle>(ColorStyle.HSV);
  const [colourBy, setColourBy] = useState<ColourBy>(ColourBy.Range);
  const [viewType, setViewType] = useState<ProjectionMode>(ProjectionMode.Perspective);
  const [viewMotion, setViewMotion] = useState<(typeof motionModes)[number]>('Quaternion');
  const [proj, setProj] = useState(ProjectionMode.Perspective);
  const materialRef = useRef<THREE.ShaderMaterial>();
  const geometryRef = useRef<THREE.BufferGeometry>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const xAxisRef = useRef<THREE.Line>();
  const yAxisRef = useRef<THREE.Line>();
  const uAxisRef = useRef<THREE.Line>();
  const vAxisRef = useRef<THREE.Line>();
  const texturesRef = useRef<THREE.Texture[]>([]);
  const rotLRef = useRef(new THREE.Quaternion());
  const rotRRef = useRef(new THREE.Quaternion());
  const realViewRef = useRef(realView);
  useEffect(() => { realViewRef.current = realView; }, [realView]);
  const projRef = useRef(proj);
  useEffect(() => { projRef.current = proj; }, [proj]);
  const onMount = React.useCallback(
    (ctx: {
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      renderer: THREE.WebGLRenderer;
    }) => {
      const { scene, camera, renderer } = ctx;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      renderer.setClearColor(objectMode ? 0xffffff : 0x000000);
      camera.position.z = cameraZ;

      const textures: THREE.Texture[] = [];
      const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
      white.needsUpdate = true;
      textures[0] = white;
      textures[1] = makeCheckerTexture(64);
      textures[2] = makeSpeckledTexture(64);
      textures[3] = makeStoneTexture(64);
      textures[4] = makeMetalTexture(64);
      new RGBELoader()
        .setDataType(THREE.UnsignedByteType)
        .load('/textures/royal_esplanade_1k.hdr', tex => {
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.flipY = true;
          tex.needsUpdate = true;
          textures[5] = tex;
          if (materialRef.current) {
            materialRef.current.uniforms.tex.value = textures[textureIndex];
          }
        });
      texturesRef.current = textures;

      const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          opacity: { value: opacity },
          functionType: { value: functionIndex },
          globalSize: { value: size },
          intensity: { value: intensity },
          shimmerAmp: { value: shimmer },
          jitterAmp: { value: jitter },
          hueShift: { value: hueShift },
          saturation: { value: saturation },
          realView: { value: realViewRef.current ? 1 : 0 },
          shapeType: { value: shapeIndex },
          tex: { value: white },
          textureIndex: { value: textureIndex },
          uColourStyle: { value: colourStyle },
          uColourBy: { value: colourBy },
          uRotL: { value: { w: 1, v: new THREE.Vector3() } },
          uRotR: { value: { w: 1, v: new THREE.Vector3() } },
          uProjMode: { value: projRef.current },
          uProjTarget: { value: projRef.current },
          uProjAlpha: { value: 0 }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
      });

      const side = Math.sqrt(particleCount);
      const geometry = new THREE.BufferGeometry();
      geometryRef.current = geometry;
      const positions = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount).fill(1);
      const seeds = new Float32Array(particleCount * 4);
      let i = 0;
      for (let ix = 0; ix < side; ix++) {
        for (let iz = 0; iz < side; iz++) {
          positions[3 * i] = (ix / side - 0.5) * 8;
          positions[3 * i + 1] = 0;
          positions[3 * i + 2] = (iz / side - 0.5) * 8;
          for (let k = 0; k < 4; k++) {
            seeds[4 * i + k] = Math.random();
          }
          i++;
        }
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));

    materialRef.current = particleMaterial;
    const particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);


    const xMat = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(hueShift % 1, 1, 0.5)
    });
    const yMat = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL((0.25 + hueShift) % 1, 1, 0.5)
    });
    const uvMat = new THREE.LineBasicMaterial({ color: 0x888888 });

    const makeAxis = (mat: THREE.LineBasicMaterial) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(g, mat);
      scene.add(line);
      return line;
    };

    xAxisRef.current = makeAxis(xMat);
    yAxisRef.current = makeAxis(yMat);
    uAxisRef.current = makeAxis(uvMat.clone());
    vAxisRef.current = makeAxis(uvMat.clone());

    const clock = new THREE.Clock();
    let tCurrent = 0;
    let offset = 0;
    let lastReal = realViewRef.current;
    let lastProj = projRef.current;
    let transitioning = false;
    let transStart = 0;
    let transDuration = 0;
    let transStartVal = 0;
    const animate = () => {
      const elapsed = clock.getElapsedTime();

      const dropMode = projRef.current >= ProjectionMode.DropX;

      if (projRef.current !== lastProj) {
        lastProj = projRef.current;
      }

      if (realViewRef.current !== lastReal) {
        if (realViewRef.current) {
          // begin smooth transition to real view
          transStartVal = tCurrent;
          transStart = elapsed;
          const speeds = [0.5 * 0.5, 0.7 * 0.5, 1 * 0.5];
          const angles = [Math.abs(tCurrent * 0.5), Math.abs(tCurrent * 0.7), Math.abs(tCurrent)];
          transDuration = Math.max(
            angles[0] / speeds[0],
            angles[1] / speeds[1],
            angles[2] / speeds[2]
          );
          transitioning = transDuration > 0;
        } else {
          // resume normal rotation from current orientation
          if (transitioning) {
            const p = Math.min((elapsed - transStart) / transDuration, 1);
            tCurrent = transStartVal * (1 - p);
            transitioning = false;
          }
          offset = tCurrent - elapsed * 0.5;
        }
        lastReal = realViewRef.current;
      }

      if (realViewRef.current) {
        if (transitioning) {
          const p = Math.min((elapsed - transStart) / transDuration, 1);
          tCurrent = transStartVal * (1 - p);
          if (p === 1) {
            transitioning = false;
            tCurrent = 0;
          }
        } else {
          tCurrent = 0;
        }
      } else if (dropMode) {
        tCurrent = 0;
      } else {
        if (!transitioning) {
          tCurrent = elapsed * 0.5 + offset;
        } else {
          const p = Math.min((elapsed - transStart) / transDuration, 1);
          tCurrent = transStartVal * (1 - p);
          if (p === 1) {
            transitioning = false;
            offset = tCurrent - elapsed * 0.5;
          }
        }
      }

      particleMaterial.uniforms.time.value = tCurrent;



      const qxy = quarterQuat('XY', tCurrent*0.5);
      const qyu = quarterQuat('YU', tCurrent*0.7);
      const qxv = quarterQuat('XV', tCurrent);
      const dynL = qxv.L.clone().multiply(qyu.L).multiply(qxy.L);
      const dynR = qxv.R.clone().multiply(qyu.R).multiply(qxy.R);
      const baseL = rotLRef.current;
      const baseR = rotRRef.current;
      const Lq = dynL.clone().multiply(baseL);
      const Rq = dynR.clone().multiply(baseR);
      if(materialRef.current){
        materialRef.current.uniforms.uRotL.value.w = Lq.w;
        materialRef.current.uniforms.uRotL.value.v.set(Lq.x,Lq.y,Lq.z);
        materialRef.current.uniforms.uRotR.value.w = Rq.w;
        materialRef.current.uniforms.uRotR.value.v.set(Rq.x,Rq.y,Rq.z);
      }
      const L = new THREE.Vector4(Lq.x,Lq.y,Lq.z,Lq.w);
      const R = new THREE.Vector4(Rq.x,Rq.y,Rq.z,Rq.w);

      const updateAxis = (
        line: THREE.Line | undefined,
        start: THREE.Vector4,
        end: THREE.Vector4
      ) => {
        if (!line) return;
        const p1 = project(quatRotate4D(start, L, R), projRef.current);
        const p2 = project(quatRotate4D(end, L, R), projRef.current);
        const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        pos.setXYZ(0, p1.x, p1.y, p1.z);
        pos.setXYZ(1, p2.x, p2.y, p2.z);
        pos.needsUpdate = true;
      };

      updateAxis(xAxisRef.current, new THREE.Vector4(-AXIS_LENGTH, 0, 0, 0), new THREE.Vector4(AXIS_LENGTH, 0, 0, 0));
      if (yAxisRef.current) {
        yAxisRef.current.visible = !realViewRef.current;
      }
      updateAxis(yAxisRef.current, new THREE.Vector4(0, -AXIS_LENGTH, 0, 0), new THREE.Vector4(0, AXIS_LENGTH, 0, 0));
      updateAxis(uAxisRef.current, new THREE.Vector4(0, 0, -AXIS_LENGTH, 0), new THREE.Vector4(0, 0, AXIS_LENGTH, 0));
      updateAxis(vAxisRef.current, new THREE.Vector4(0, 0, 0, -AXIS_LENGTH), new THREE.Vector4(0, 0, 0, AXIS_LENGTH));


      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();
    }, []);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.saturation.value = saturation;
    }
  }, [saturation]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.opacity.value = opacity;
    }
  }, [opacity]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.globalSize.value = size;
    }
  }, [size]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.intensity.value = intensity;
    }
  }, [intensity]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.shimmerAmp.value = shimmer;
    }
  }, [shimmer]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.jitterAmp.value = jitter;
    }
  }, [jitter]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.hueShift.value = hueShift;
    }
    if (xAxisRef.current) {
      (xAxisRef.current.material as THREE.LineBasicMaterial).color.setHSL(
        hueShift % 1,
        1,
        0.5
      );
    }
    if (yAxisRef.current) {
      (yAxisRef.current.material as THREE.LineBasicMaterial).color.setHSL(
        (0.25 + hueShift) % 1,
        1,
        0.5
      );
    }
  }, [hueShift]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.realView.value = realView ? 1 : 0;
    }
  }, [realView]);



  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.z = cameraZ;
    }
  }, [cameraZ]);

  useEffect(() => {
    if (rendererRef.current && materialRef.current) {
      rendererRef.current.setClearColor(objectMode ? 0xffffff : 0x000000);
      materialRef.current.blending = objectMode
        ? THREE.NormalBlending
        : THREE.AdditiveBlending;
      materialRef.current.depthWrite = objectMode;
    }
  }, [objectMode]);


  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.functionType.value = functionIndex;
    }
  }, [functionIndex]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.shapeType.value = shapeIndex;
    }
  }, [shapeIndex]);

  useEffect(() => {
    if (materialRef.current && texturesRef.current[textureIndex]) {
      materialRef.current.uniforms.tex.value = texturesRef.current[textureIndex];
      materialRef.current.uniforms.textureIndex.value = textureIndex;
    }
  }, [textureIndex]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColourStyle.value = colourStyle;
    }
  }, [colourStyle]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColourBy.value = colourBy;
    }
  }, [colourBy]);

  useEffect(() => {
    if (geometryRef.current) {
      const side = Math.sqrt(particleCount);
      const pos = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount).fill(1);
      const seeds = new Float32Array(particleCount * 4);
      let i = 0;
      for (let ix = 0; ix < side; ix++) {
        for (let iz = 0; iz < side; iz++) {
          pos[3 * i] = (ix / side - 0.5) * 8;
          pos[3 * i + 1] = 0;
          pos[3 * i + 2] = (iz / side - 0.5) * 8;
          for (let k = 0; k < 4; k++) {
            seeds[4 * i + k] = Math.random();
          }
          i++;
        }
      }
      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geometryRef.current.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometryRef.current.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
      geometryRef.current.setDrawRange(0, particleCount);
    }
  }, [particleCount]);

  function animateTo(target: ProjectionMode){
    if(!materialRef.current) return;
    if(target===projRef.current) return;
    const start = performance.now();
    const duration = 1000;
    const step = (now: number) => {
      const p = Math.min((now-start)/duration,1);
      materialRef.current!.uniforms.uProjAlpha.value = p;
      if(p<1){
        requestAnimationFrame(step);
      }else{
        materialRef.current!.uniforms.uProjMode.value = target;
        materialRef.current!.uniforms.uProjAlpha.value = 0;
        materialRef.current!.uniforms.uProjTarget.value = target;
        setProj(target);
      }
    };
    materialRef.current.uniforms.uProjTarget.value = target;
    requestAnimationFrame(step);
  }

  function applyView(type: ProjectionMode, motion: (typeof motionModes)[number]){
    const target = motion==='Quaternion'
      ? type
      : motion==='DropX' ? ProjectionMode.DropX
      : motion==='DropY' ? ProjectionMode.DropY
      : motion==='DropU' ? ProjectionMode.DropU
      : ProjectionMode.DropV;
    animateTo(target);
  }

  function handleViewType(t: ProjectionMode){
    setViewType(t);
    applyView(t, viewMotion);
  }

  function handleMotion(m: (typeof motionModes)[number]){
    setViewMotion(m);
    applyView(viewType, m);
  }

  function applyQuarterTurn(plane: Plane, θ: number){
    if(!materialRef.current) return;
    const { L, R } = quarterQuat(plane, θ);
    const startL = rotLRef.current.clone();
    const startR = rotRRef.current.clone();
    const endL = L.clone().multiply(startL).normalize();
    const endR = startR.clone().multiply(R.conjugate()).normalize();
    const duration = 1000;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now-start)/duration,1);
      const qL = startL.clone().slerp(endL, p);
      const qR = startR.clone().slerp(endR, p);
      materialRef.current!.uniforms.uRotL.value.w = qL.w;
      materialRef.current!.uniforms.uRotL.value.v.set(qL.x,qL.y,qL.z);
      materialRef.current!.uniforms.uRotR.value.w = qR.w;
      materialRef.current!.uniforms.uRotR.value.v.set(qR.x,qR.y,qR.z);
      rotLRef.current.copy(qL);
      rotRRef.current.copy(qR);
      if(p<1){
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  const turn = (plane: Plane) => {
    applyQuarterTurn(plane, QUARTER);
  };

  const currentName = functionNames[functionIndex];
  const currentFormula = functionFormulas[currentName];

  return (
    <div style={{ position: 'relative' }}>
      <Canvas3D onMount={onMount} />
      <div style={{position:'absolute',bottom:10,left:10}}>
        <ToggleMenu title="Menu">
          <div
            style={{
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
          }}
        >
          <label>
            Saturation:
            <input
              type="range"
              min={COMPLEX_PARTICLES_DEFAULTS.ranges.saturation.min}
              max={COMPLEX_PARTICLES_DEFAULTS.ranges.saturation.max}
              step={COMPLEX_PARTICLES_DEFAULTS.ranges.saturation.step}
              value={saturation}
              onChange={(e) => setSaturation(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Particles:
            <input
              type="range"
              min={COMPLEX_PARTICLES_DEFAULTS.ranges.particleCount.min}
              max={COMPLEX_PARTICLES_DEFAULTS.ranges.particleCount.max}
              step={COMPLEX_PARTICLES_DEFAULTS.ranges.particleCount.step}
              value={particleCount}
              onChange={(e) => setParticleCount(parseInt(e.target.value, 10))}
            />
          </label>
          <label>
            Size:
            <input
              type="range"
              min={COMPLEX_PARTICLES_DEFAULTS.ranges.size.min}
              max={COMPLEX_PARTICLES_DEFAULTS.ranges.size.max}
              step={COMPLEX_PARTICLES_DEFAULTS.ranges.size.step}
              value={size}
              onChange={(e) => setSize(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Opacity:
            <input
              type="range"
              min={COMPLEX_PARTICLES_DEFAULTS.ranges.opacity.min}
              max={COMPLEX_PARTICLES_DEFAULTS.ranges.opacity.max}
              step={COMPLEX_PARTICLES_DEFAULTS.ranges.opacity.step}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Intensity:
            <input
              type="range"
              min={COMPLEX_PARTICLES_DEFAULTS.ranges.intensity.min}
              max={COMPLEX_PARTICLES_DEFAULTS.ranges.intensity.max}
              step={COMPLEX_PARTICLES_DEFAULTS.ranges.intensity.step}
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Shimmer:
            <input
              type="range"
              min={COMPLEX_PARTICLES_DEFAULTS.ranges.shimmer.min}
              max={COMPLEX_PARTICLES_DEFAULTS.ranges.shimmer.max}
              step={COMPLEX_PARTICLES_DEFAULTS.ranges.shimmer.step}
              value={shimmer}
              onChange={(e) => setShimmer(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Jitter:
            <input
              type="range"
              min={COMPLEX_PARTICLES_DEFAULTS.ranges.jitter.min}
              max={COMPLEX_PARTICLES_DEFAULTS.ranges.jitter.max}
              step={COMPLEX_PARTICLES_DEFAULTS.ranges.jitter.step}
              value={jitter}
              onChange={(e) => setJitter(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Hue Shift:
            <input
              type="range"
              min={COMPLEX_PARTICLES_DEFAULTS.ranges.hueShift.min}
              max={COMPLEX_PARTICLES_DEFAULTS.ranges.hueShift.max}
              step={COMPLEX_PARTICLES_DEFAULTS.ranges.hueShift.step}
              value={hueShift}
              onChange={(e) => setHueShift(parseFloat(e.target.value))}
            />
          </label>
          <div className="color-by-toolbar" style={{display:'flex',gap:4}}>
            {(['Domain','Range'] as const).map((n,idx) => (
              <button key={n}
                className={colourBy===idx ? 'active' : ''}
                onClick={() => setColourBy(idx as ColourBy)}>{n}</button>
            ))}
          </div>
          <div className="color-style-toolbar" style={{display:'flex',gap:4}}>
            {Object.keys(ColorStyle).filter(k => isNaN(Number(k))).map(k => (
              <button key={k}
                className={colourStyle===ColorStyle[k as keyof typeof ColorStyle] ? 'active' : ''}
                onClick={() => setColourStyle(ColorStyle[k as keyof typeof ColorStyle])}>{k}</button>
            ))}
          </div>
          <label>
            Shape:
            <select
              value={shapeIndex}
              onChange={(e) => setShapeIndex(parseInt(e.target.value, 10))}
            >
              {shapeNames.map((s, idx) => (
                <option key={s} value={idx}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Texture:
            <select
              value={textureIndex}
              onChange={(e) => setTextureIndex(parseInt(e.target.value, 10))}
            >
              {textureNames.map((t, idx) => (
                <option key={t} value={idx}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Object Mode:
            <input
              type="checkbox"
              checked={objectMode}
              onChange={(e) => setObjectMode(e.target.checked)}
            />
          </label>
        </div>
        </ToggleMenu>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}
      >
        <div className="function-toolbar" style={{display:'grid',gridTemplateColumns:'repeat(8,auto)',gap:4}}>
          {functionNames.map((name, idx) => (
            <button key={name}
              className={functionIndex===idx ? 'active' : ''}
              onClick={() => setFunctionIndex(idx)}>{name}</button>
          ))}
        </div>
        <div
          style={{
            color: objectMode ? 'black' : 'white',
            fontSize: '1.2em',
            pointerEvents: 'none'
          }}
        >
          <div>{currentName}</div>
          <div>{currentFormula}</div>
        </div>
        <div className="view-type-toolbar">
          {viewTypes.map(([name,code]) => (
            <button key={name}
              className={viewType===code ? 'active' : ''}
              onClick={() => handleViewType(code)}>{name}</button>
          ))}
        </div>
        <div className="view-motion-toolbar">
          {motionModes.map(m => (
            <button key={m}
              className={viewMotion===m ? 'active' : ''}
              onClick={() => handleMotion(m)}>{m}</button>
          ))}
        </div>
        <QuarterTurnBar onTurn={turn}/>
        <label style={{color:'white',display:'flex',flexDirection:'column'}}>
          Distance: {cameraZ.toFixed(1)}
          <input
            type="range"
            min={COMPLEX_PARTICLES_DEFAULTS.ranges.cameraZ.min}
            max={COMPLEX_PARTICLES_DEFAULTS.ranges.cameraZ.max}
            step={COMPLEX_PARTICLES_DEFAULTS.ranges.cameraZ.step}
            value={cameraZ}
            onChange={(e) => setCameraZ(parseFloat(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
