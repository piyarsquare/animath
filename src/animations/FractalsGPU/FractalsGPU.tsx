import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

/** GPU accelerated Mandelbrot/Julia viewer using a fragment shader. */
export default function FractalsGPU() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const materialRef = useRef<THREE.ShaderMaterial>();
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.OrthographicCamera>();
  const animRef = useRef<number>();
  // Ref to always hold the latest render callback
  const renderRef = useRef<() => void>(() => {});

  const [view, setView] = useState({
    xMin: -2.5,
    xMax: 1.5,
    yMin: -1.5,
    yMax: 1.5
  });
  const [type, setType] = useState<'mandelbrot' | 'julia'>('mandelbrot');
  const [juliaC, setJuliaC] = useState({ real: -0.7, imag: 0.27015 });
  const [iter, setIter] = useState(100);
  const [palette, setPalette] = useState(0);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);

  const FORMULAS: Record<'mandelbrot' | 'julia', string> = {
    mandelbrot: 'z_{n+1} = z_n^2 + c',
    julia: 'z_{n+1} = z_n^2 + c'
  };

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;
    varying vec2 vUv;
    uniform vec4 view;
    uniform int iter;
    uniform int type;
    uniform vec2 juliaC;
    uniform int palette;
    uniform float offset;

    const int MAX_ITER = 1000;

    vec3 paletteColor(float t, int scheme) {
      if(scheme==0){
        return vec3(
          sin(0.024*(t)+0.0)*0.5+0.5,
          sin(0.024*(t)+2.0)*0.5+0.5,
          sin(0.024*(t)+4.0)*0.5+0.5
        );
      }else if(scheme==1){
        float r = min(255.0, t*3.0);
        float g = clamp(t*3.0-255.0,0.0,255.0);
        float b = max(0.0,t*3.0-510.0);
        return vec3(r,g,b)/255.0;
      }else if(scheme==2){
        return vec3(0.0, t/2.0, t)/255.0;
      }
      return vec3(t,t,t)/255.0;
    }

    void main(){
      vec2 c = vec2(mix(view.x, view.y, vUv.x), mix(view.z, view.w, vUv.y));
      vec2 z = type==0 ? vec2(0.0) : c;
      vec2 k = type==0 ? c : juliaC;
      int i;
      for(i=0;i<MAX_ITER;i++){
        if(i>=iter) break;
        if(dot(z,z)>4.0) break;
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + k;
      }
      float v = 0.0;
      if(i < iter){
        float log_zn = log(dot(z,z))/2.0;
        v = float(i) + 1.0 - log(log_zn)/log(2.0);
      }
      float idx = (v==0.0) ? 0.0 : mod(floor(v*10.0), 255.0);
      float t = mod(idx + offset, 256.0);
      vec3 col = paletteColor(t, palette);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const normalizeView = useCallback((v: typeof view, canvas: HTMLCanvasElement) => {
    const aspect = canvas.width / canvas.height;
    const xRange = v.xMax - v.xMin;
    const yRange = v.yMax - v.yMin;
    const viewAspect = xRange / yRange;
    if (Math.abs(viewAspect - aspect) < 1e-9) return v;
    const cx = (v.xMin + v.xMax) / 2;
    const cy = (v.yMin + v.yMax) / 2;
    if (viewAspect > aspect) {
      const newY = xRange / aspect;
      return { xMin: v.xMin, xMax: v.xMax, yMin: cy - newY / 2, yMax: cy + newY / 2 };
    } else {
      const newX = yRange * aspect;
      return { xMin: cx - newX / 2, xMax: cx + newX / 2, yMin: v.yMin, yMax: v.yMax };
    }
  }, []);

  const handleResize = useCallback(() => {
    const mount = mountRef.current;
    const renderer = rendererRef.current;
    if (!mount || !renderer) return;
    const rect = mount.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    renderer.setSize(rect.width, rect.height, false);
    renderer.domElement.style.width = `${rect.width}px`;
    renderer.domElement.style.height = `${rect.height}px`;
    renderer.setPixelRatio(dpr);
    setView(v => normalizeView(v, renderer.domElement));
  }, [normalizeView]);


  const render = useCallback(() => {
    if (!rendererRef.current || !materialRef.current) return;
    materialRef.current.uniforms.view.value = new THREE.Vector4(view.xMin, view.xMax, view.yMin, view.yMax);
    materialRef.current.uniforms.iter.value = iter;
    materialRef.current.uniforms.type.value = type === 'mandelbrot' ? 0 : 1;
    materialRef.current.uniforms.juliaC.value = new THREE.Vector2(juliaC.real, juliaC.imag);
    materialRef.current.uniforms.palette.value = palette;
    materialRef.current.uniforms.offset.value = offset;
    if (sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [view, iter, type, juliaC, palette, offset]);

  // Keep renderRef pointing at the latest render implementation
  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  const animate = useCallback(() => {
    setOffset(o => (o + 1) % 256);
    animRef.current = requestAnimationFrame(animate);
  }, []);


  const zoom = useCallback((factor: number) => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;
    const center = {
      x: (view.xMin + view.xMax) / 2,
      y: (view.yMin + view.yMax) / 2
    };
    const xr = (view.xMax - view.xMin) * factor;
    const yr = (view.yMax - view.yMin) * factor;
    const newView = {
      xMin: center.x - xr / 2,
      xMax: center.x + xr / 2,
      yMin: center.y - yr / 2,
      yMax: center.y + yr / 2
    };
    setView(normalizeView(newView, canvas));
  }, [view, normalizeView]);


  const pan = useCallback((dx: number, dy: number) => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;
    setView(v => {
      const scale = (v.xMax - v.xMin) / canvas.width;
      const newView = {
        xMin: v.xMin - dx * scale,
        xMax: v.xMax - dx * scale,
        yMin: v.yMin - dy * scale,
        yMax: v.yMax - dy * scale
      };
      return normalizeView(newView, canvas);
    });
  }, [normalizeView]);


  const reset = useCallback(() => {
    const canvas = rendererRef.current?.domElement;
    const base = { xMin: -2.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 };
    if (!canvas) return;
    setView(normalizeView(base, canvas));
    setIter(100);
  }, [normalizeView]);

  useEffect(() => {
    if (animating) {
      animRef.current = requestAnimationFrame(animate);
    } else if (animRef.current) {
      cancelAnimationFrame(animRef.current);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animating, animate]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    const canvas = renderer.domElement;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    sceneRef.current = scene;
    cameraRef.current = camera;
    renderer.setSize(1,1);
    mount.appendChild(canvas);

    const uniforms = {
      view: { value: new THREE.Vector4(view.xMin, view.xMax, view.yMin, view.yMax) },
      iter: { value: iter },
      type: { value: 0 },
      juliaC: { value: new THREE.Vector2(juliaC.real, juliaC.imag) },
      palette: { value: palette },
      offset: { value: offset }
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader
    });
    materialRef.current = material;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2), material);
    scene.add(mesh);

    let frameId: number;
    const renderLoop = () => {
      renderRef.current();
      frameId = requestAnimationFrame(renderLoop);
    };
    frameId = requestAnimationFrame(renderLoop);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      mount.removeChild(canvas);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    render();
  }, [view, iter, type, juliaC, palette, offset, render]);

  return (
    <div
      ref={mountRef}
      style={{ position: 'relative', width: '100vw', height: '100vh' }}
    >
      <div style={{ position: 'absolute', top: 10, left: 10, color: 'white' }}>
        <label>
          Function:
          <select value={type} onChange={e => setType(e.target.value as any)}>
            <option value="mandelbrot">Mandelbrot</option>
            <option value="julia">Julia</option>
          </select>
        </label>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4
        }}
      >
        <div style={{ fontSize: '1.2em' }}>{type === 'mandelbrot' ? 'Mandelbrot' : 'Julia'}</div>
        <div>{FORMULAS[type]}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button onClick={() => pan(0, -50)}>Up</button>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => pan(-50, 0)}>Left</button>
            <button onClick={() => pan(50, 0)}>Right</button>
          </div>
          <button onClick={() => pan(0, 50)}>Down</button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => zoom(0.9)}>Zoom In</button>
          <button onClick={() => zoom(1.1)}>Zoom Out</button>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
        <div style={{ color: 'white', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label>
            Palette:
            <select value={palette} onChange={e => setPalette(parseInt(e.target.value, 10))}>
              <option value={0}>Rainbow</option>
              <option value={1}>Fire</option>
              <option value={2}>Ocean</option>
              <option value={3}>Gray</option>
            </select>
          </label>
          <label>
            Iter:
            <input
              type="number"
              value={iter}
              min={50}
              max={500}
              onChange={e => setIter(parseInt(e.target.value, 10))}
              style={{ width: 60 }}
            />
          </label>
          <button onClick={() => setAnimating(a => !a)}>{animating ? 'Stop' : 'Cycle'}</button>
          <button onClick={reset}>Reset</button>
          {type === 'julia' && (
            <>
              <label>
                C real:
                <input
                  type="number"
                  step={0.01}
                  value={juliaC.real}
                  onChange={e => setJuliaC({ ...juliaC, real: parseFloat(e.target.value) })}
                  style={{ width: 70 }}
                />
              </label>
              <label>
                C imag:
                <input
                  type="number"
                  step={0.01}
                  value={juliaC.imag}
                  onChange={e => setJuliaC({ ...juliaC, imag: parseFloat(e.target.value) })}
                  style={{ width: 70 }}
                />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
