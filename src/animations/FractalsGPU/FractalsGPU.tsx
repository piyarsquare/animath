import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import Readme from '../../components/Readme';
import ToggleMenu from '../../components/ToggleMenu';
import readmeText from './README.md?raw';

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
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const overlayCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pathRef = useRef<{ x: number; y: number }[] | null>(null);

  const [view, setView] = useState({
    xMin: -2.5,
    xMax: 1.5,
    yMin: -1.5,
    yMax: 1.5
  });
  const [type, setType] = useState<'mandelbrot' | 'julia'>('mandelbrot');
  const [juliaC, setJuliaC] = useState({ real: -0.7, imag: 0.27015 });
  const [iter, setIter] = useState(100);
  const [iterInput, setIterInput] = useState('100');
  const [startIter, setStartIter] = useState(0);
  const [palette, setPalette] = useState(0);
  const [power, setPower] = useState(2);
  const [powerInput, setPowerInput] = useState('2');
  const [colorMode, setColorMode] = useState<"escape" | "limit" | "layered">(
    "escape"
  );
  const [insidePalette, setInsidePalette] = useState(0);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => setIterInput(String(iter)), [iter]);
  useEffect(() => setPowerInput(String(power)), [power]);

  const FORMULAS: Record<'mandelbrot' | 'julia', string> = {
    mandelbrot: 'z_{n+1} = z_n^k + c',
    julia: 'z_{n+1} = z_n^k + c'
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
    uniform int startIter;
    uniform int type;
    uniform vec2 juliaC;
    uniform int palette;
    uniform int paletteIn;
    uniform int power;
    uniform int colorMode;
    uniform float offset;

    const int MAX_ITER = 1000;
    const int MAX_POWER = 100;

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
      float maxMag = 0.0;
      for(i=0;i<MAX_ITER;i++){
        if(i>=iter) break;
        if(dot(z,z)>4.0) break;
        vec2 zpow = z;
        for(int p=1;p<MAX_POWER;p++){
          if(p>=power) break;
          zpow = vec2(zpow.x*z.x - zpow.y*z.y, zpow.x*z.y + zpow.y*z.x);
        }
        z = zpow + k;
        if(i >= startIter){
          maxMag = max(maxMag, length(z));
        }
      }
      float v = float(i);
      float escVal = 0.0;
      if(i < iter){
        float log_zn = log(dot(z,z))/2.0;
        escVal = float(i) + 1.0 - log(log_zn)/log(2.0);
      }
      float idx = (escVal==0.0) ? 0.0 : mod(floor(escVal*10.0), 255.0);
      float t = mod(idx + offset, 256.0);
      vec3 outCol = paletteColor(t, palette);
      // Map the final |z| value to the palette for interior coloring
      vec3 inCol = paletteColor(clamp(maxMag * 128.0, 0.0, 255.0), paletteIn);
      if(i < iter){
        if(colorMode==0) gl_FragColor = vec4(outCol,1.0);
        else if(colorMode==2) gl_FragColor = vec4(outCol,1.0);
        else gl_FragColor = vec4(0.0,0.0,0.0,1.0);
      }else{
        if(colorMode==1) gl_FragColor = vec4(inCol,1.0);
        else if(colorMode==2) gl_FragColor = vec4(inCol,1.0);
        else gl_FragColor = vec4(0.0,0.0,0.0,1.0);
      }
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
    const overlay = overlayRef.current;
    if (!mount || !renderer || !overlay) return;
    const rect = mount.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    renderer.setSize(rect.width, rect.height, false);
    renderer.domElement.style.width = `${rect.width}px`;
    renderer.domElement.style.height = `${rect.height}px`;
    renderer.setPixelRatio(dpr);
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.width = rect.width * dpr;
    overlay.height = rect.height * dpr;
    overlayCtxRef.current = overlay.getContext('2d');
    setView(v => normalizeView(v, renderer.domElement));
    drawPath();
  }, [normalizeView]);


  const render = useCallback(() => {
    if (!rendererRef.current || !materialRef.current) return;
    materialRef.current.uniforms.view.value = new THREE.Vector4(view.xMin, view.xMax, view.yMin, view.yMax);
    materialRef.current.uniforms.iter.value = iter;
    materialRef.current.uniforms.startIter.value = startIter;
    materialRef.current.uniforms.type.value = type === 'mandelbrot' ? 0 : 1;
    materialRef.current.uniforms.juliaC.value = new THREE.Vector2(juliaC.real, juliaC.imag);
    materialRef.current.uniforms.palette.value = palette;
    materialRef.current.uniforms.paletteIn.value = insidePalette;
    materialRef.current.uniforms.power.value = power;
    materialRef.current.uniforms.colorMode.value = colorMode === 'escape' ? 0 : colorMode === 'limit' ? 1 : 2;
    materialRef.current.uniforms.offset.value = offset;
    if (sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [view, iter, type, juliaC, palette, insidePalette, power, colorMode, offset]);

  // Keep renderRef pointing at the latest render implementation
  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  const animate = useCallback(() => {
    setOffset(o => (o + 1) % 256);
    animRef.current = requestAnimationFrame(animate);
  }, []);

  const screenToFractal = useCallback(
    (sx: number, sy: number) => {
      const canvas = rendererRef.current?.domElement;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = sx - rect.left;
      const y = sy - rect.top;
      const scale = (view.xMax - view.xMin) / canvas.width;
      return { x: view.xMin + x * scale, y: view.yMin + y * scale };
    },
    [view]
  );

  const fractalToScreen = useCallback(
    (fx: number, fy: number) => {
      const canvas = rendererRef.current?.domElement;
      if (!canvas) return { x: 0, y: 0 };
      const scale = canvas.width / (view.xMax - view.xMin);
      return { x: (fx - view.xMin) * scale, y: (fy - view.yMin) * scale };
    },
    [view]
  );

  function drawPath() {
    const canvas = overlayRef.current;
    if (!canvas || !overlayCtxRef.current || !pathRef.current) return;
    const ctx = overlayCtxRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (pathRef.current.length < 2) return;
    ctx.lineWidth = 2;
    for (let i = 0; i < pathRef.current.length - 1; i++) {
      const start = fractalToScreen(pathRef.current[i].x, pathRef.current[i].y);
      const end = fractalToScreen(pathRef.current[i + 1].x, pathRef.current[i + 1].y);
      const hue = (i / (pathRef.current.length - 1)) * 360;
      ctx.strokeStyle = `hsl(${hue},100%,50%)`;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  }

  const handleSelect = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const start = screenToFractal(e.clientX, e.clientY);
      const pts: { x: number; y: number }[] = [];
      const powComplex = (x: number, y: number) => {
        let rx = x;
        let ry = y;
        for (let p = 1; p < power; p++) {
          const tx = rx * x - ry * y;
          ry = rx * y + ry * x;
          rx = tx;
        }
        return { x: rx, y: ry };
      };
      if (type === 'mandelbrot') {
        let zx = start.x,
          zy = start.y;
        for (let i = 0; i < iter && zx * zx + zy * zy <= 4; i++) {
          pts.push({ x: zx, y: zy });
          const pow = powComplex(zx, zy);
          zx = pow.x + start.x;
          zy = pow.y + start.y;
        }
        pts.push({ x: zx, y: zy });
      } else {
        let zx = start.x,
          zy = start.y;
        for (let i = 0; i < iter && zx * zx + zy * zy <= 4; i++) {
          pts.push({ x: zx, y: zy });
          const pow = powComplex(zx, zy);
          zx = pow.x + juliaC.real;
          zy = pow.y + juliaC.imag;
        }
        pts.push({ x: zx, y: zy });
      }
      pathRef.current = pts;
      drawPath();
    },
    [screenToFractal, iter, type, juliaC, drawPath, power]
  );


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
      startIter: { value: startIter },
      type: { value: 0 },
      juliaC: { value: new THREE.Vector2(juliaC.real, juliaC.imag) },
      palette: { value: palette },
      paletteIn: { value: insidePalette },
      power: { value: power },
      colorMode: { value: 0 },
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
  }, [view, iter, startIter, type, juliaC, palette, insidePalette, power, colorMode, offset, render]);

  useEffect(() => {
    drawPath();
  }, [view]);

  return (
    <div
      ref={mountRef}
      style={{ position: 'relative', width: '100vw', height: '100vh' }}
    >
      <canvas
        ref={overlayRef}
        style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
      />
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
            Power k:
            <input
              type="number"
              value={powerInput}
              min={1}
              max={100}
              onChange={e => setPowerInput(e.target.value)}
              onBlur={() => {
                let v = parseInt(powerInput, 10);
                if (isNaN(v)) v = power;
                v = Math.min(100, Math.max(1, v));
                setPower(v);
              }}
              style={{ width: 60 }}
            />
          </label>
          <label>
            Coloring:
            <select value={colorMode} onChange={e => setColorMode(e.target.value as any)}>
              <option value="escape">Escape velocity</option>
              <option value="limit">Limit magnitude</option>
              <option value="layered">Layered</option>
            </select>
          </label>
          {colorMode !== 'escape' && (
            <label>
              Inside palette:
              <select value={insidePalette} onChange={e => setInsidePalette(parseInt(e.target.value, 10))}>
                <option value={0}>Rainbow</option>
                <option value={1}>Fire</option>
                <option value={2}>Ocean</option>
                <option value={3}>Gray</option>
              </select>
            </label>
          )}
          <label>
            Iter:
            <input
              type="number"
              value={iterInput}
              min={1}
              max={1000}
              onChange={e => setIterInput(e.target.value)}
              onBlur={() => {
                let v = parseInt(iterInput, 10);
                if (isNaN(v)) v = iter;
                v = Math.min(1000, Math.max(1, v));
                setIter(v);
              }}
              style={{ width: 60 }}
            />
          </label>
          <label>
            Start Iter:
            <input
              type="number"
              value={startIter}
              min={0}
              max={1000}
              onChange={e => setStartIter(parseInt(e.target.value, 10))}
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
                  step="any"
                  value={juliaC.real}
                  onChange={e => setJuliaC({ ...juliaC, real: parseFloat(e.target.value) })}
                  style={{ width: 70 }}
                />
              </label>
              <label>
                C imag:
                <input
                  type="number"
                  step="any"
                  value={juliaC.imag}
                  onChange={e => setJuliaC({ ...juliaC, imag: parseFloat(e.target.value) })}
                  style={{ width: 70 }}
                />
              </label>
            </>
          )}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
        <ToggleMenu title="About">
          <Readme markdown={readmeText} />
        </ToggleMenu>
      </div>
    </div>
  );
}
