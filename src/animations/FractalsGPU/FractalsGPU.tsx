import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import Readme from '../../components/Readme';
import ToggleMenu from '../../components/ToggleMenu';
import readmeText from './README.md?raw';
import { useResponsive, getResponsiveControlsStyle, getResponsiveButtonStyle, getResponsiveInputStyle } from '../../styles/responsive';

/** GPU accelerated Mandelbrot/Julia viewer using a fragment shader. */
export default function FractalsGPU() {
  const { isMobile, isTablet, screenSize } = useResponsive();
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
  type FractalType = 'mandelbrot' | 'julia' | 'burning' | 'tricorn';
  const [type, setType] = useState<FractalType>('mandelbrot');
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

  const FORMULAS: Record<FractalType, string> = {
    mandelbrot: 'z_{n+1} = z_n^k + c',
    julia: 'z_{n+1} = z_n^k + c',
    burning: 'z_{n+1} = (|Re(z_n)| + i|Im(z_n)|)^k + c',
    tricorn: 'z_{n+1} = (conj(z_n))^k + c'
  };

  const TYPE_NAMES: Record<FractalType, string> = {
    mandelbrot: 'Mandelbrot',
    julia: 'Julia',
    burning: 'Burning Ship',
    tricorn: 'Tricorn'
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
      // type: 0=Mandelbrot, 1=Julia, 2=Burning Ship, 3=Tricorn
      vec2 c = vec2(mix(view.x, view.y, vUv.x), mix(view.z, view.w, vUv.y));
      vec2 z = (type==0 || type==2 || type==3) ? vec2(0.0) : c;
      vec2 k = (type==0 || type==2 || type==3) ? c : juliaC;
      int i;
      float maxMag = 0.0;
      for(i=0;i<MAX_ITER;i++){
        if(i>=iter) break;
        if(dot(z,z)>4.0) break;
        vec2 zcur = z;
        if(type==2){
          zcur = vec2(abs(zcur.x), abs(zcur.y));
        }else if(type==3){
          zcur = vec2(zcur.x, -zcur.y);
        }
        vec2 zpow = zcur;
        for(int p=1;p<MAX_POWER;p++){
          if(p>=power) break;
          zpow = vec2(zpow.x*zcur.x - zpow.y*zcur.y, zpow.x*zcur.y + zpow.y*zcur.x);
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
    const tMap = { mandelbrot: 0, julia: 1, burning: 2, tricorn: 3 } as const;
    materialRef.current.uniforms.type.value = tMap[type];
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
      if (type === 'mandelbrot' || type === 'burning' || type === 'tricorn') {
        let zx = start.x,
          zy = start.y;
        for (let i = 0; i < iter && zx * zx + zy * zy <= 4; i++) {
          pts.push({ x: zx, y: zy });
          let tx = zx,
            ty = zy;
          if (type === 'burning') {
            tx = Math.abs(tx);
            ty = Math.abs(ty);
          } else if (type === 'tricorn') {
            ty = -ty;
          }
          const pow = powComplex(tx, ty);
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
      style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}
    >
      <canvas
        ref={overlayRef}
        style={{ 
          position: 'absolute', 
          left: 0, 
          top: 0, 
          width: '100%', 
          height: '100%', 
          zIndex: 1, 
          pointerEvents: 'none',
          touchAction: 'none' 
        }}
      />
      
      {/* Top Left - Function Selector */}
      <div 
        style={{
          ...getResponsiveControlsStyle(isMobile),
          top: '10px',
          left: '10px',
        }}
      >
        <label>
          Function:
          <select 
            value={type} 
            onChange={e => setType(e.target.value as any)}
            style={{ ...getResponsiveInputStyle(isMobile), marginLeft: '4px' }}
          >
            <option value="mandelbrot">Mandelbrot</option>
            <option value="julia">Julia</option>
            <option value="burning">Burning Ship</option>
            <option value="tricorn">Tricorn</option>
          </select>
        </label>
      </div>
      
      {/* Top Right - Info and Navigation */}
      <div
        style={{
          ...getResponsiveControlsStyle(isMobile),
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: isMobile ? 4 : 6,
          maxWidth: isMobile ? '180px' : '220px'
        }}
      >
        <div style={{ fontSize: isMobile ? '1em' : '1.2em', textAlign: 'center' }}>
          <div>{TYPE_NAMES[type]}</div>
          <div style={{ fontSize: isMobile ? '0.8em' : '0.9em' }}>{FORMULAS[type]}</div>
        </div>
        
        {!isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button 
              onClick={() => pan(0, -50)}
              style={getResponsiveButtonStyle(isMobile)}
            >
              Up
            </button>
            <div style={{ display: 'flex', gap: 4 }}>
              <button 
                onClick={() => pan(-50, 0)}
                style={getResponsiveButtonStyle(isMobile)}
              >
                Left
              </button>
              <button 
                onClick={() => pan(50, 0)}
                style={getResponsiveButtonStyle(isMobile)}
              >
                Right
              </button>
            </div>
            <button 
              onClick={() => pan(0, 50)}
              style={getResponsiveButtonStyle(isMobile)}
            >
              Down
            </button>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: isMobile ? 2 : 4 }}>
          <button 
            onClick={() => zoom(0.9)}
            style={getResponsiveButtonStyle(isMobile)}
          >
            Zoom In
          </button>
          <button 
            onClick={() => zoom(1.1)}
            style={getResponsiveButtonStyle(isMobile)}
          >
            Zoom Out
          </button>
        </div>
        
        {isMobile && (
          <div style={{ 
            fontSize: '10px', 
            color: '#ccc', 
            textAlign: 'center',
            marginTop: '4px'
          }}>
            Pinch to zoom, drag to pan
          </div>
        )}
      </div>
      
      {/* Bottom Left - Main Controls */}
      <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
        <div 
          style={{ 
            ...getResponsiveControlsStyle(isMobile),
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? 6 : 8,
            maxWidth: isMobile ? '200px' : '250px',
            maxHeight: isMobile ? '50vh' : '60vh',
            overflowY: 'auto'
          }}
        >
          <label>
            Palette:
            <select 
              value={palette} 
              onChange={e => setPalette(parseInt(e.target.value, 10))}
              style={{ ...getResponsiveInputStyle(isMobile), width: '100%' }}
            >
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
              onChange={e => {
                const val = e.target.value;
                setPowerInput(val);
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed)) {
                  setPower(Math.min(100, Math.max(1, parsed)));
                }
              }}
              style={{ ...getResponsiveInputStyle(isMobile), width: isMobile ? '50px' : '60px' }}
            />
          </label>
          
          <label>
            Coloring:
            <select 
              value={colorMode} 
              onChange={e => setColorMode(e.target.value as any)}
              style={{ ...getResponsiveInputStyle(isMobile), width: '100%' }}
            >
              <option value="escape">Escape velocity</option>
              <option value="limit">Limit magnitude</option>
              <option value="layered">Layered</option>
            </select>
          </label>
          
          {colorMode !== 'escape' && (
            <label>
              Inside palette:
              <select 
                value={insidePalette} 
                onChange={e => setInsidePalette(parseInt(e.target.value, 10))}
                style={{ ...getResponsiveInputStyle(isMobile), width: '100%' }}
              >
                <option value={0}>Rainbow</option>
                <option value={1}>Fire</option>
                <option value={2}>Ocean</option>
                <option value={3}>Gray</option>
              </select>
            </label>
          )}
          
          <label>
            Iterations:
            <input
              type="number"
              value={iterInput}
              min={1}
              max={1000}
              onChange={e => {
                const val = e.target.value;
                setIterInput(val);
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed)) {
                  setIter(Math.min(1000, Math.max(1, parsed)));
                }
              }}
              style={{ ...getResponsiveInputStyle(isMobile), width: isMobile ? '50px' : '60px' }}
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
              style={{ ...getResponsiveInputStyle(isMobile), width: isMobile ? '50px' : '60px' }}
            />
          </label>
          
          <div style={{ display: 'flex', gap: isMobile ? 2 : 4 }}>
            <button 
              onClick={() => setAnimating(a => !a)}
              style={{ ...getResponsiveButtonStyle(isMobile), backgroundColor: animating ? '#ff4444' : '#44ff44' }}
            >
              {animating ? 'Stop' : 'Cycle'}
            </button>
            <button 
              onClick={reset}
              style={getResponsiveButtonStyle(isMobile)}
            >
              Reset
            </button>
          </div>
          
          {type === 'julia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label>
                C real:
                <input
                  type="number"
                  step="any"
                  value={juliaC.real}
                  onChange={e => setJuliaC({ ...juliaC, real: parseFloat(e.target.value) })}
                  style={{ ...getResponsiveInputStyle(isMobile), width: isMobile ? '60px' : '70px' }}
                />
              </label>
              <label>
                C imaginary:
                <input
                  type="number"
                  step="any"
                  value={juliaC.imag}
                  onChange={e => setJuliaC({ ...juliaC, imag: parseFloat(e.target.value) })}
                  style={{ ...getResponsiveInputStyle(isMobile), width: isMobile ? '60px' : '70px' }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
      
      {/* About Menu */}
      <div style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
        <ToggleMenu title="About" defaultOpen={!isMobile}>
          <Readme markdown={readmeText} />
        </ToggleMenu>
      </div>
    </div>
  );
}
