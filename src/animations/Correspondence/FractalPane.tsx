import React, { useEffect, useRef, useCallback } from 'react';
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
      renderer.setSize(rect.width, rect.height, false);
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

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaY < 0 ? 0.9 : 1.1;
      const frac = screenToComplex(e.nativeEvent, rendererRef.current!.domElement, view);
      const xr = (view.xMax - view.xMin) * scale;
      const yr = (view.yMax - view.yMin) * scale;
      onViewChange({
        xMin: frac.real - xr / 2,
        xMax: frac.real + xr / 2,
        yMin: frac.imag - yr / 2,
        yMax: frac.imag + yr / 2,
      });
    },
    [view, onViewChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!onPickC) return;
      const canvas = rendererRef.current?.domElement;
      if (!canvas) return;
      const c = screenToComplex(e.nativeEvent, canvas, view);
      onPickC(c);
    },
    [onPickC, view]
  );

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%' }}
      onWheel={handleWheel}
      onPointerMove={handlePointerMove}
    />
  );
}
