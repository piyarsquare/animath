import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import readmeText from './README.md?raw';
import explainerText from './EXPLAINER.md?raw';
import { PALETTE_GLSL, PALETTE_OPTIONS } from '../../lib/colormaps';
import { useViewportGestures } from '../../lib/useViewportGestures';
import Workspace from '../../chrome/workspace/Workspace';
import type { LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Slider, Pills, Select, Checkbox, NumberInput } from '../../components/ControlPanel';

type FractalType = 'mandelbrot' | 'julia' | 'burning' | 'tricorn';

const INITIAL_VIEW = { xMin: -2.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 };

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

  ${PALETTE_GLSL}

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

/** GPU accelerated Mandelbrot/Julia viewer using a fragment shader. */
export default function FractalsGPU() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  // The mount element doubles as state so the Three.js setup effect re-runs if
  // the workspace remounts the view-window body (e.g. desktop ↔ phone chrome).
  const [mountEl, setMountEl] = useState<HTMLDivElement | null>(null);
  const setMount = useCallback((el: HTMLDivElement | null) => {
    mountRef.current = el;
    setMountEl(el);
  }, []);
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

  const [view, setView] = useState(INITIAL_VIEW);
  const [type, setType] = useState<FractalType>('mandelbrot');
  const [juliaC, setJuliaC] = useState({ real: -0.7, imag: 0.27015 });
  const [iter, setIter] = useState(100);
  const [startIter, setStartIter] = useState(0);
  const [palette, setPalette] = useState(0);
  const [power, setPower] = useState(2);
  const [colorMode, setColorMode] = useState<"escape" | "limit" | "layered">(
    "escape"
  );
  const [insidePalette, setInsidePalette] = useState(0);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  /** When true, a tap/click on the canvas traces an iteration orbit from
   *  that point. When false, taps do nothing (so panning doesn't spawn
   *  unwanted trajectories). Default off. */
  const [tracing, setTracing] = useState(false);

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
    // A collapsed/hidden view window reports zero size; keep the last good
    // viewport instead of poisoning the view with a 0/0 aspect.
    if (!rect.width || !rect.height) return;
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
  }, [view, iter, startIter, type, juliaC, palette, insidePalette, power, colorMode, offset]);

  // Keep renderRef pointing at the latest render implementation
  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  const animate = useCallback(() => {
    setOffset(o => (o + 1) % 256);
    animRef.current = requestAnimationFrame(animate);
  }, []);


  const fractalToScreen = useCallback(
    (fx: number, fy: number) => {
      const canvas = rendererRef.current?.domElement;
      if (!canvas) return { x: 0, y: 0 };
      const scaleX = canvas.width  / (view.xMax - view.xMin);
      const scaleY = canvas.height / (view.yMax - view.yMin);
      // Math-Y points up but canvas-Y grows downward, so flip: yMax → 0, yMin → height.
      return { x: (fx - view.xMin) * scaleX, y: (view.yMax - fy) * scaleY };
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

  const tracePath = useCallback(
    (start: { x: number; y: number }) => {
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
    [iter, type, juliaC, drawPath, power]
  );


  const gestures = useViewportGestures({
    view,
    onViewChange: setView,
    clamp: (v) => {
      const canvas = rendererRef.current?.domElement;
      return canvas ? normalizeView(v, canvas) : v;
    },
    // Tracing is opt-in via the Trace panel toggle. Without this gate, every
    // tap before a pan would spawn a stray orbit.
    onTap: tracing ? tracePath : undefined,
  });

  const clearPath = useCallback(() => {
    pathRef.current = null;
    const canvas = overlayRef.current;
    const ctx = overlayCtxRef.current;
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const reset = useCallback(() => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;
    setView(normalizeView(INITIAL_VIEW, canvas));
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
    const mount = mountEl;
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
    // The view window resizes independently of the browser window (drag
    // handle, layout switches), so observe the mount itself as well.
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
      mount.removeChild(canvas);
      renderer.dispose();
    };
  }, [mountEl]);

  useEffect(() => {
    render();
  }, [view, iter, startIter, type, juliaC, palette, insidePalette, power, colorMode, offset, render]);

  useEffect(() => {
    drawPath();
  }, [view]);

  /* ---- archetype panels (PARAM-MAP §3) ---- */

  const setNode = (
    <>
      <Select
        label="Fractal type"
        options={[
          { value: 'mandelbrot', label: 'Mandelbrot' },
          { value: 'julia', label: 'Julia' },
          { value: 'burning', label: 'Burning Ship' },
          { value: 'tricorn', label: 'Tricorn' },
        ]}
        value={type}
        onChange={(v) => setType(v)}
      />
      <Slider label="Power k" value={power}
        min={1} max={10} step={1}
        onChange={(v) => setPower(Math.max(1, Math.round(v)))}
        format={v => String(v)} />
      {type === 'julia' && (
        <>
          <NumberInput label="c real" value={juliaC.real} step={0.01}
            onChange={v => setJuliaC(c => ({ ...c, real: v }))} />
          <NumberInput label="c imag" value={juliaC.imag} step={0.01}
            onChange={v => setJuliaC(c => ({ ...c, imag: v }))} />
        </>
      )}
    </>
  );

  const viewportNode = (
    <>
      <button className="am-mini" style={{ width: '100%' }} onClick={reset}>
        Reset view
      </button>
      <div className="am-hint">
        Navigate on the canvas itself: drag to pan, pinch or mouse-wheel to zoom.
      </div>
    </>
  );

  const paletteNode = (
    <>
      <Select label="Palette"
        options={PALETTE_OPTIONS}
        value={palette} onChange={setPalette} />
      <Slider label="Offset" value={offset}
        min={0} max={255} step={1}
        onChange={(v) => setOffset(Math.round(v))}
        format={v => String(Math.round(v))} />
      <Pills label="Color mode"
        options={[
          { value: 'escape', label: 'Escape' },
          { value: 'limit', label: 'Limit' },
          { value: 'layered', label: 'Layered' },
        ]}
        value={colorMode}
        onChange={setColorMode} />
      {colorMode !== 'escape' && (
        <Select label="Inside palette"
          options={PALETTE_OPTIONS}
          value={insidePalette} onChange={setInsidePalette} />
      )}
      <Checkbox label="Animate colors"
        checked={animating} onChange={setAnimating} />
    </>
  );

  const traceNode = (
    <>
      <Checkbox label="Trace orbits on tap"
        checked={tracing} onChange={setTracing} />
      <button className="am-mini" style={{ width: '100%' }} onClick={clearPath}>
        Clear orbit paths
      </button>
    </>
  );

  const iterationNode = (
    <>
      <Slider label="Max iterations" value={iter}
        min={10} max={1000} step={10}
        onChange={(v) => setIter(Math.max(1, Math.round(v)))}
        format={v => String(v)} />
      <Slider label="Start iteration" value={startIter}
        min={0} max={500} step={1}
        onChange={(v) => setStartIter(Math.max(0, Math.round(v)))}
        format={v => String(v)} />
    </>
  );

  const sections: SectionDef[] = [
    { id: 'set', title: 'Set', arch: 'subject', node: setNode, estHeight: 220 },
    { id: 'viewport', title: 'Viewport', arch: 'domain', node: viewportNode, estHeight: 130 },
    { id: 'palette', title: 'Palette', arch: 'color', node: paletteNode, estHeight: 280 },
    { id: 'trace', title: 'Trace', arch: 'drive', node: traceNode, estHeight: 130 },
    { id: 'iteration', title: 'Iteration', arch: 'quality', node: iterationNode, estHeight: 150 },
  ];

  const views: ViewDef[] = [
    {
      id: 'plot',
      title: TYPE_NAMES[type],
      defaultRect: { x: 372, y: 16, w: 712, h: 628 },
      node: (
        <div
          ref={setMount}
          style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'none' }}
          {...gestures}
        >
          <canvas
            ref={overlayRef}
            style={{
              position: 'absolute', left: 0, top: 0,
              width: '100%', height: '100%',
              zIndex: 1, pointerEvents: 'none', touchAction: 'none',
            }}
          />
        </div>
      ),
    },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'essentials', name: 'Essentials', sub: 'Set · Palette', icon: 'tune',
      open: { set: { x: 84, y: 18 }, palette: { x: 84, y: 260 } },
    },
  ];

  // The "?" modal carries both the short explainer and the full About readme,
  // so nothing from the old drawer's About section is lost.
  const help = [explainerText, readmeText].filter(Boolean).join('\n\n---\n\n');

  return (
    <Workspace
      appId="fractals"
      title={TYPE_NAMES[type]}
      subtitle={FORMULAS[type]}
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="essentials"
      explainer={help}
    />
  );
}
