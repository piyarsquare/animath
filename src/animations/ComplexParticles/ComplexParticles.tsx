import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '../../components/Canvas3D';
import ToggleMenu from '../../components/ToggleMenu';
import { vertexShader, fragmentShader } from './shaders';

export interface ComplexParticlesProps {
  count?: number;
  selectedFunction?: string;
}

const functionNames = [
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
  branchSqrtPoly: '√(z(z-1)(z+1))'
};

const AXIS_LENGTH = 4;

function rotXY(v: THREE.Vector4, a: number): THREE.Vector4 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new THREE.Vector4(c * v.x - s * v.y, s * v.x + c * v.y, v.z, v.w);
}

function rotYZ(v: THREE.Vector4, a: number): THREE.Vector4 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new THREE.Vector4(v.x, c * v.y - s * v.z, s * v.y + c * v.z, v.w);
}

function rotXW(v: THREE.Vector4, a: number): THREE.Vector4 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new THREE.Vector4(c * v.x + s * v.w, v.y, v.z, -s * v.x + c * v.w);
}

function project4D(v: THREE.Vector4, t: number, realOnly = false): THREE.Vector3 {
  let r = rotXY(v, t * 0.5);
  r = rotYZ(r, t * 0.7);
  r = rotXW(r, t);
  if (realOnly) {
    return new THREE.Vector3(r.x, r.z, r.w).multiplyScalar(0.5);
  }
  const w = 3 + r.w;
  return new THREE.Vector3(r.x, r.y, r.z).multiplyScalar(1.5 / w);
}

export default function ComplexParticles({ count = 40000, selectedFunction = 'sqrt' }: ComplexParticlesProps) {
  const [saturation, setSaturation] = useState(1);
  const [functionIndex, setFunctionIndex] = useState(() => {
    const idx = functionNames.indexOf(selectedFunction);
    return idx >= 0 ? idx : 0;
  });
  const [particleCount, setParticleCount] = useState(count);
  const [cameraZ, setCameraZ] = useState(5);
  const [size, setSize] = useState(1);
  const [opacity, setOpacity] = useState(0.9);
  const [intensity, setIntensity] = useState(1);
  const [shimmer, setShimmer] = useState(0);
  const [hueShift, setHueShift] = useState(0);
  const [objectMode, setObjectMode] = useState(false);
  const [realView, setRealView] = useState(false);
  const materialRef = useRef<THREE.ShaderMaterial>();
  const geometryRef = useRef<THREE.BufferGeometry>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const xAxisRef = useRef<THREE.Line>();
  const yAxisRef = useRef<THREE.Line>();
  const uAxisRef = useRef<THREE.Line>();
  const vAxisRef = useRef<THREE.Line>();
  const realViewRef = useRef(realView);
  useEffect(() => { realViewRef.current = realView; }, [realView]);
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

      const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          opacity: { value: opacity },
          functionType: { value: functionIndex },
          globalSize: { value: size },
          intensity: { value: intensity },
          shimmerAmp: { value: shimmer },
          hueShift: { value: hueShift },
          saturation: { value: saturation },
          realView: { value: realViewRef.current ? 1 : 0 }
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
      let i = 0;
      for (let ix = 0; ix < side; ix++) {
        for (let iz = 0; iz < side; iz++) {
          positions[3 * i] = (ix / side - 0.5) * 8;
          positions[3 * i + 1] = 0;
          positions[3 * i + 2] = (iz / side - 0.5) * 8;
          i++;
        }
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

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
    let transitioning = false;
    let transStart = 0;
    let transDuration = 0;
    let transStartVal = 0;
    const animate = () => {
      const elapsed = clock.getElapsedTime();

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



      const tt = tCurrent * 0.3;
      const updateAxis = (
        line: THREE.Line | undefined,
        start: THREE.Vector4,
        end: THREE.Vector4
      ) => {
        if (!line) return;
        const p1 = project4D(start, tt, realViewRef.current);
        const p2 = project4D(end, tt, realViewRef.current);
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
    if (geometryRef.current) {
      const side = Math.sqrt(particleCount);
      const pos = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount).fill(1);
      let i = 0;
      for (let ix = 0; ix < side; ix++) {
        for (let iz = 0; iz < side; iz++) {
          pos[3 * i] = (ix / side - 0.5) * 8;
          pos[3 * i + 1] = 0;
          pos[3 * i + 2] = (iz / side - 0.5) * 8;
          i++;
        }
      }
      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geometryRef.current.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometryRef.current.setDrawRange(0, particleCount);
    }
  }, [particleCount]);

  const currentName = functionNames[functionIndex];
  const currentFormula = functionFormulas[currentName];

  return (
    <div style={{ position: 'relative' }}>
      <Canvas3D onMount={onMount} />
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
            Function:
            <select
              value={functionIndex}
              onChange={(e) => setFunctionIndex(parseInt(e.target.value, 10))}
            >
              {functionNames.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Saturation:
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={saturation}
              onChange={(e) => setSaturation(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Particles:
            <input
              type="range"
              min={1000}
              max={80000}
              step={1000}
              value={particleCount}
              onChange={(e) => setParticleCount(parseInt(e.target.value, 10))}
            />
          </label>
          <label>
            Size:
            <input
              type="range"
              min={0.2}
              max={5}
              step={0.1}
              value={size}
              onChange={(e) => setSize(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Opacity:
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Intensity:
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Shimmer:
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={shimmer}
              onChange={(e) => setShimmer(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Hue Shift:
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={hueShift}
              onChange={(e) => setHueShift(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Object Mode:
            <input
              type="checkbox"
              checked={objectMode}
              onChange={(e) => setObjectMode(e.target.checked)}
            />
          </label>
          <label>
            Camera Distance:
            <input
              type="range"
              min={2}
              max={20}
              step={0.1}
              value={cameraZ}
              onChange={(e) => setCameraZ(parseFloat(e.target.value))}
            />
          </label>
        </div>
      </ToggleMenu>
      <button
        onClick={() => setRealView(v => !v)}
        style={{ position: 'absolute', bottom: 10, left: 10 }}
      >
        x:u
      </button>
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          color: objectMode ? 'black' : 'white',
          fontSize: '1.2em',
          textAlign: 'right',
          pointerEvents: 'none'
        }}
      >
        <div>{currentName}</div>
        <div>{currentFormula}</div>
      </div>
    </div>
  );
}
