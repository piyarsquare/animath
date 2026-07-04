import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useViewportGestures } from '../../lib/useViewportGestures';
import { PALETTE_GLSL } from '../../lib/colormaps';

export interface Complex {
  real: number;
  imag: number;
}

export interface ViewBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export type FractalType = 'mandelbrot' | 'julia';

/** Split a float64 into a (hi, lo) pair of float32s whose exact sum is the
 *  original — the df64 representation the Extended-precision shader expects. */
function splitDouble(value: number): [number, number] {
  const hi = Math.fround(value);
  return [hi, value - hi];
}

export interface FractalPaneProps {
  type: FractalType;
  view: ViewBounds;
  onViewChange: (v: ViewBounds) => void;
  juliaC: Complex;
  iter: number;
  palette: number;
  offset: number;
  /** 'single' = float32 (fast, pixelates past ~1e5× zoom); 'double' = df64
   *  emulated double precision for deep zoom. See FractalsGPU/DEEP_ZOOM.md. */
  precision?: 'single' | 'double';
  onPickC?: (c: Complex) => void;
  markC?: Complex;
  drawing?: boolean;
  path?: Complex[];
  onPathChange?: (pts: Complex[]) => void;
}

export default function FractalPane({
  type,
  view,
  onViewChange,
  juliaC,
  iter,
  palette,
  offset,
  precision = 'single',
  onPickC,
  markC,
  drawing,
  path,
  onPathChange,
}: FractalPaneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const materialRef = useRef<THREE.ShaderMaterial>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    // Pixel coordinate is center + offset, with the center in extended
    // precision (centerHi + centerLo) and span the small view width/height.
    uniform vec2 centerHi;
    uniform vec2 centerLo;
    uniform vec2 span;
    uniform int fType;
    uniform vec2 cHi;
    uniform vec2 cLo;
    uniform int maxIter;
    uniform int power;
    uniform int palette;
    uniform float offset;
    uniform int hp;          // 0 = single float32, 1 = extended (df64)

    const int MAX_ITER = 4000;   // hard ceiling; maxIter is the dynamic cap

    // df64: an extended number is the unevaluated sum hi+lo of two float32s.
    // dfAdd / dfMul are error-free transformations (two-sum, Dekker
    // two-product) — they keep the rounding error in lo, roughly doubling the
    // working mantissa. See FractalsGPU/DEEP_ZOOM.md.
    vec2 dfAdd(vec2 a, vec2 b){
      float t1 = a.x + b.x;
      float e  = t1 - a.x;
      float t2 = ((b.x - e) + (a.x - (t1 - e))) + a.y + b.y;
      float hi = t1 + t2;
      float lo = t2 - (hi - t1);
      return vec2(hi, lo);
    }
    vec2 dfMul(vec2 a, vec2 b){
      float split = 4097.0;            // 2^12 + 1, the Dekker split for float32
      float cona = a.x * split;
      float conb = b.x * split;
      float a1 = cona - (cona - a.x);
      float b1 = conb - (conb - b.x);
      float a2 = a.x - a1;
      float b2 = b.x - b1;
      float c11 = a.x * b.x;
      float c21 = a2 * b2 - (((c11 - a1 * b1) - a2 * b1) - a1 * b2);
      float c2 = a.x * b.y + a.y * b.x;
      float t1 = c11 + c2;
      float e = t1 - c11;
      float t2 = ((c2 - e) + (c11 - (t1 - e))) + c21 + a.y * b.y;
      float hi = t1 + t2;
      float lo = t2 - (hi - t1);
      return vec2(hi, lo);
    }
    vec2 dfNeg(vec2 a){ return vec2(-a.x, -a.y); }

    ${PALETTE_GLSL}
    void main(){
      float ox = (vUv.x - 0.5) * span.x;
      float oy = (vUv.y - 0.5) * span.y;
      int i = 0;
      if(hp == 0){
        // ---- standard single precision (float32) ----
        vec2 pos = vec2(centerHi.x + ox, centerHi.y + oy);
        vec2 z = fType==0 ? vec2(0.0) : pos;
        vec2 k = fType==0 ? pos : cHi;
        i = maxIter;
        for(int it=0; it<MAX_ITER; it++){
          if(it>=maxIter) break;
          if(dot(z,z)>4.0){ i = it; break; }
          vec2 zp = z;
          for(int p=1;p<10;p++){
            if(p>=power) break;
            zp = vec2(zp.x*z.x - zp.y*z.y, zp.x*z.y + zp.y*z.x);
          }
          z = zp + k;
        }
      }else{
        // ---- extended precision (df64) ----
        vec2 pr = dfAdd(vec2(centerHi.x, centerLo.x), vec2(ox, 0.0));
        vec2 pi = dfAdd(vec2(centerHi.y, centerLo.y), vec2(oy, 0.0));
        vec2 zr, zi, kr, ki;
        if(fType==0){ zr=vec2(0.0); zi=vec2(0.0); kr=pr; ki=pi; }
        else { zr=pr; zi=pi; kr=vec2(cHi.x,cLo.x); ki=vec2(cHi.y,cLo.y); }
        i = maxIter;
        for(int it=0; it<MAX_ITER; it++){
          if(it>=maxIter) break;
          vec2 mag = dfAdd(dfMul(zr,zr), dfMul(zi,zi));
          if(mag.x>4.0){ i = it; break; }
          vec2 ar=zr, ai=zi;
          vec2 qr=ar, qi=ai;
          for(int p=1;p<10;p++){
            if(p>=power) break;
            vec2 nr = dfAdd(dfMul(qr,ar), dfNeg(dfMul(qi,ai)));
            vec2 ni = dfAdd(dfMul(qr,ai), dfMul(qi,ar));
            qr=nr; qi=ni;
          }
          zr = dfAdd(qr, kr);
          zi = dfAdd(qi, ki);
        }
      }
      float t = mod(float(i)*10.0 + offset, 256.0);
      gl_FragColor = vec4(paletteColor(t, palette),1.0);
    }
  `;

  const setup = useCallback(() => {
    if (!mountRef.current) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    const canvas = renderer.domElement;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      centerHi: { value: new THREE.Vector2(0, 0) },
      centerLo: { value: new THREE.Vector2(0, 0) },
      span: { value: new THREE.Vector2(1, 1) },
      fType: { value: type === 'mandelbrot' ? 0 : 1 },
      cHi: { value: new THREE.Vector2(juliaC.real, juliaC.imag) },
      cLo: { value: new THREE.Vector2(0, 0) },
      maxIter: { value: iter },
      power: { value: 2 },
      palette: { value: palette },
      offset: { value: offset },
      hp: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
    materialRef.current = material;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    mountRef.current.appendChild(canvas);
    canvasRef.current = canvas;

    const handleResize = () => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR — phones report 3
      const size = Math.min(rect.width, rect.height);
      renderer.setSize(size, size, false);
      renderer.domElement.style.width = `${size}px`;
      renderer.domElement.style.height = `${size}px`;
      renderer.domElement.style.margin = 'auto';
      renderer.setPixelRatio(dpr);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(handleResize);
    if (mountRef.current) {
      ro.observe(mountRef.current);
    }

    const render = () => {
      renderer.render(scene, camera);
    };

    const loop = () => {
      render();
      requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
      renderer.dispose();
      mountRef.current?.removeChild(canvas);
    };
  }, []);

  useEffect(() => setup(), [setup]);

  useEffect(() => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    // Carry the view center in extended precision (hi + lo); span stays plain.
    const cx = (view.xMin + view.xMax) / 2;
    const cy = (view.yMin + view.yMax) / 2;
    const [cxHi, cxLo] = splitDouble(cx);
    const [cyHi, cyLo] = splitDouble(cy);
    u.centerHi.value.set(cxHi, cyHi);
    u.centerLo.value.set(cxLo, cyLo);
    u.span.value.set(view.xMax - view.xMin, view.yMax - view.yMin);
    u.fType.value = type === 'mandelbrot' ? 0 : 1;
    const [crHi, crLo] = splitDouble(juliaC.real);
    const [ciHi, ciLo] = splitDouble(juliaC.imag);
    u.cHi.value.set(crHi, ciHi);
    u.cLo.value.set(crLo, ciLo);
    u.maxIter.value = iter;
    u.palette.value = palette;
    u.offset.value = offset;
    u.hp.value = precision === 'double' ? 1 : 0;
  }, [view, type, juliaC, iter, palette, offset, precision]);


  const [drawPoints, setDrawPoints] = useState<Complex[]>([]);
  const drawBufferRef = useRef<Complex[]>([]);

  const gestures = useViewportGestures({
    view,
    onViewChange,
    coordRef: canvasRef,
    mode: drawing ? 'draw' : 'pan',
    onTap: (p) => {
      onPickC?.({ real: p.x, imag: p.y });
    },
    onDrawStart: (p) => {
      const c = { real: p.x, imag: p.y };
      drawBufferRef.current = [c];
      setDrawPoints([c]);
      onPathChange?.([c]);
    },
    onDrawMove: (p) => {
      const c = { real: p.x, imag: p.y };
      drawBufferRef.current = [...drawBufferRef.current, c];
      setDrawPoints(drawBufferRef.current);
      onPathChange?.(drawBufferRef.current);
    },
    onDrawEnd: () => {
      onPathChange?.(drawBufferRef.current);
    },
  });

  const crossStyle = () => {
    if (!markC || !mountRef.current) return { display: 'none' } as React.CSSProperties;
    const rect = mountRef.current.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const offsetX = (rect.width - size) / 2;
    const offsetY = (rect.height - size) / 2;
    // Math-Y points up; screen-Y points down. yMax sits at the top of the pane.
    const x = offsetX + ((markC.real - view.xMin) / (view.xMax - view.xMin)) * size;
    const y = offsetY + ((view.yMax - markC.imag) / (view.yMax - view.yMin)) * size;
    return {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      color: 'white'
    } as React.CSSProperties;
  };

  const toScreen = (c: Complex): { x: number; y: number } => {
    if (!mountRef.current) return { x: 0, y: 0 };
    const rect = mountRef.current.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const offsetX = (rect.width - size) / 2;
    const offsetY = (rect.height - size) / 2;
    const x = offsetX + ((c.real - view.xMin) / (view.xMax - view.xMin)) * size;
    const y = offsetY + ((view.yMax - c.imag) / (view.yMax - view.yMin)) * size;
    return { x, y };
  };

  const pathPoints = (path ?? drawPoints).map(p => {
    const { x, y } = toScreen(p);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        touchAction: 'none'
      }}
      {...gestures}
    >
      {markC && <div style={crossStyle()}>X</div>}
      {pathPoints.length > 0 && (
        <svg
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
        >
          <polyline
            points={pathPoints}
            fill="none"
            stroke="white"
            strokeWidth="1"
          />
        </svg>
      )}
    </div>
  );
}
