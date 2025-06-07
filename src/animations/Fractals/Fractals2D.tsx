import React, { useEffect, useRef, useState } from 'react';

/**
 * Simple fractal renderer using a 2D canvas.
 */
export default function Fractals2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [type, setType] = useState('mandelbrot');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const maxIter = 100;
    const minX = -2.5;
    const maxX = 1;
    const minY = -1.5;
    const maxY = 1.5;

    const img = ctx.createImageData(width, height);
    const juliaC = { re: -0.8, im: 0.156 };
    for (let y = 0; y < height; y++) {
      const c_im = minY + (y / height) * (maxY - minY);
      for (let x = 0; x < width; x++) {
        const c_re = minX + (x / width) * (maxX - minX);
        let zx = (type === 'julia') ? c_re : 0;
        let zy = (type === 'julia') ? c_im : 0;
        let cx = (type === 'julia') ? juliaC.re : c_re;
        let cy = (type === 'julia') ? juliaC.im : c_im;
        let iter = 0;
        while (zx * zx + zy * zy <= 4 && iter < maxIter) {
          let xtmp;
          switch (type) {
            case 'burningShip':
              xtmp = zx * zx - zy * zy + cx;
              zy = Math.abs(2 * zx * zy) + cy;
              zx = Math.abs(xtmp);
              break;
            case 'multibrot3':
              xtmp = zx * zx * zx - 3 * zx * zy * zy + cx;
              zy = 3 * zx * zx * zy - zy * zy * zy + cy;
              zx = xtmp;
              break;
            default: // mandelbrot or julia
              xtmp = zx * zx - zy * zy + cx;
              zy = 2 * zx * zy + cy;
              zx = xtmp;
          }
          iter++;
        }
        const idx = (y * width + x) * 4;
        const col = iter === maxIter ? 0 : Math.floor((255 * iter) / maxIter);
        img.data[idx] = col;
        img.data[idx + 1] = col;
        img.data[idx + 2] = col;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [type]);

  return (
    <div>
      <select value={type} onChange={e => setType(e.target.value)}>
        <option value="mandelbrot">Mandelbrot</option>
        <option value="julia">Julia</option>
        <option value="burningShip">Burning Ship</option>
        <option value="multibrot3">Multibrot (p=3)</option>
      </select>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
