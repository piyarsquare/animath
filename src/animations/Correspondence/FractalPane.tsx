import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';

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

export interface FractalPaneProps {
  type: FractalType;
  view: ViewBounds;
  onViewChange: (v: ViewBounds) => void;
  juliaC: Complex;
  iter: number;
  palette: number;
  offset: number;
  onPickC?: (c: Complex) => void;
  markC?: Complex;
  drawing?: boolean;
  path?: Complex[];
  onPathChange?: (pts: Complex[]) => void;
}

export function screenToComplex(
  e: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
  v: ViewBounds
): Complex {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  return {
    real: v.xMin + (v.xMax - v.xMin) * x,
    imag: v.yMin + (v.yMax - v.yMin) * y,
  };
}

export default function FractalPane({
  type,
  view,
  onViewChange,
  juliaC,
  iter,
  palette,
  offset,
  onPickC,
  markC,
  drawing,
  path,
  onPathChange,
}: FractalPaneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const materialRef = useRef<THREE.ShaderMaterial>();

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
    uniform int fType;
    uniform vec2 c;
    uniform int maxIter;
    uniform int power;
    uniform int palette;
    uniform float offset;
    vec3 paletteColor(float t, int scheme){
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
      vec2 pos = vec2(mix(view.x,view.y,vUv.x), mix(view.z,view.w,vUv.y));
      vec2 z = fType==0 ? vec2(0.0) : pos;
      vec2 k = fType==0 ? pos : c;
      int i=0;
      for(i=0;i<maxIter;i++){
        if(dot(z,z)>4.0) break;
        vec2 zp = z;
        for(int p=1;p<10;p++){
          if(p>=power) break;
          zp = vec2(zp.x*z.x - zp.y*z.y, zp.x*z.y + zp.y*z.x);
        }
        z = zp + k;
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
      view: { value: new THREE.Vector4(view.xMin, view.xMax, view.yMin, view.yMax) },
      fType: { value: type === 'mandelbrot' ? 0 : 1 },
      c: { value: new THREE.Vector2(juliaC.real, juliaC.imag) },
      maxIter: { value: iter },
      power: { value: 2 },
      palette: { value: palette },
      offset: { value: offset },
    };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
    materialRef.current = material;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    mountRef.current.appendChild(canvas);

    const handleResize = () => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
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
    materialRef.current.uniforms.view.value.set(view.xMin, view.xMax, view.yMin, view.yMax);
    materialRef.current.uniforms.fType.value = type === 'mandelbrot' ? 0 : 1;
    materialRef.current.uniforms.c.value.set(juliaC.real, juliaC.imag);
    materialRef.current.uniforms.maxIter.value = iter;
    materialRef.current.uniforms.palette.value = palette;
    materialRef.current.uniforms.offset.value = offset;
  }, [view, type, juliaC, iter, palette, offset]);


  const [drawPoints, setDrawPoints] = useState<Complex[]>([]);
  const isDrawingRef = useRef(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (drawing) return;
      if (!onPickC) return;
      const canvas = rendererRef.current?.domElement;
      if (!canvas) return;
      const c = screenToComplex(e.nativeEvent, canvas, view);
      onPickC(c);
    },
    [onPickC, view, drawing]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing) return;
      const canvas = rendererRef.current?.domElement;
      if (!canvas) return;
      const c = screenToComplex(e.nativeEvent, canvas, view);
      isDrawingRef.current = true;
      setDrawPoints([c]);
      onPathChange?.([c]);
    },
    [drawing, view, onPathChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing || !isDrawingRef.current) return;
      const canvas = rendererRef.current?.domElement;
      if (!canvas) return;
      const c = screenToComplex(e.nativeEvent, canvas, view);
      setDrawPoints(prev => {
        const np = [...prev, c];
        onPathChange?.(np);
        return np;
      });
    },
    [drawing, view, onPathChange]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawing || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    onPathChange?.(drawPoints);
  }, [drawing, drawPoints, onPathChange]);

  const crossStyle = () => {
    if (!markC || !mountRef.current) return { display: 'none' } as React.CSSProperties;
    const rect = mountRef.current.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const offsetX = (rect.width - size) / 2;
    const offsetY = (rect.height - size) / 2;
    const x = offsetX + ((markC.real - view.xMin) / (view.xMax - view.xMin)) * size;
    const y = offsetY + ((markC.imag - view.yMin) / (view.yMax - view.yMin)) * size;
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
    const y = offsetY + ((c.imag - view.yMin) / (view.yMax - view.yMin)) * size;
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
        position: 'relative'
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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
