import React, { useEffect, useRef } from 'react';

/**
 * Simple Mandelbrot set renderer using a 2D canvas.
 */
export default function Mandelbrot2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    for (let y = 0; y < height; y++) {
      const c_im = minY + (y / height) * (maxY - minY);
      for (let x = 0; x < width; x++) {
        const c_re = minX + (x / width) * (maxX - minX);
        let zx = 0;
        let zy = 0;
        let iter = 0;
        while (zx * zx + zy * zy <= 4 && iter < maxIter) {
          const xtmp = zx * zx - zy * zy + c_re;
          zy = 2 * zx * zy + c_im;
          zx = xtmp;
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
