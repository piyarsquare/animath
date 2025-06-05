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
  const [realView, setRealView] = useState(false);
  const materialRef = useRef<THREE.ShaderMaterial>();
  const geometryRef = useRef<THREE.BufferGeometry>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
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
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const targetT = realViewRef.current ? 0 : elapsed;
      tCurrent += (targetT - tCurrent) * 0.05;
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

  return (
    <div style={{ position: 'relative' }}>
      <Canvas3D onMount={onMount} />
      <ToggleMenu title="Menu">
        <div style={{ color: 'white' }}>
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
          <br />
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
          <br />
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
          <br />
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
          <br />
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
          <br />
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
          <br />
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
          <br />
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
          <br />
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
    </div>
  );
}
