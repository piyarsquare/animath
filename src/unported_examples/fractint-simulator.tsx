import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Palette, Play, Pause, Download, Move } from 'lucide-react';

const FractintSimulator = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [viewPort, setViewPort] = useState({
    xMin: -2.5,
    xMax: 1.5,
    yMin: -1.5,
    yMax: 1.5
  });
  const [maxIterations, setMaxIterations] = useState(100);
  const [colorScheme, setColorScheme] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [colorOffset, setColorOffset] = useState(0);
  const [fractalType, setFractalType] = useState('mandelbrot');
  const [juliaC, setJuliaC] = useState({ real: -0.7, imag: 0.27015 });
  
  // Pan and zoom state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  const [lastTouchTime, setLastTouchTime] = useState(0);

  // Color palette generation - simulating Fractint's classic palettes
  const generatePalette = useCallback((scheme: number, offset: number) => {
    const palette = [];
    for (let i = 0; i < 256; i++) {
      const t = (i + offset) % 256;
      let r, g, b;
      
      switch (scheme) {
        case 0: // Classic Fractint rainbow
          r = Math.sin(0.024 * t + 0) * 127 + 128;
          g = Math.sin(0.024 * t + 2) * 127 + 128;
          b = Math.sin(0.024 * t + 4) * 127 + 128;
          break;
        case 1: // Fire palette
          r = Math.min(255, t * 3);
          g = Math.max(0, Math.min(255, t * 3 - 255));
          b = Math.max(0, t * 3 - 510);
          break;
        case 2: // Ocean palette
          r = 0;
          g = t / 2;
          b = t;
          break;
        case 3: // Grayscale
          r = g = b = t;
          break;
        default:
          r = g = b = 0;
      }
      
      palette.push({ r: Math.floor(r), g: Math.floor(g), b: Math.floor(b) });
    }
    return palette;
  }, []);

  // Mandelbrot calculation
  const calculateMandelbrot = useCallback((cx: number, cy: number, maxIter: number) => {
    let x = 0, y = 0;
    let iter = 0;
    
    while (x * x + y * y <= 4 && iter < maxIter) {
      const xTemp = x * x - y * y + cx;
      y = 2 * x * y + cy;
      x = xTemp;
      iter++;
    }
    
    if (iter === maxIter) return 0;
    
    // Smooth coloring
    const log2 = Math.log(2);
    const smoothed = iter + 1 - Math.log(Math.log(Math.sqrt(x * x + y * y))) / log2;
    return smoothed;
  }, []);

  // Julia set calculation
  const calculateJulia = useCallback((zx: number, zy: number, cx: number, cy: number, maxIter: number) => {
    let x = zx, y = zy;
    let iter = 0;
    
    while (x * x + y * y <= 4 && iter < maxIter) {
      const xTemp = x * x - y * y + cx;
      y = 2 * x * y + cy;
      x = xTemp;
      iter++;
    }
    
    if (iter === maxIter) return 0;
    
    const smoothed = iter + 1 - Math.log(Math.log(Math.sqrt(x * x + y * y))) / Math.log(2);
    return smoothed;
  }, []);

  // Main rendering function
  const renderFractal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.createImageData(width, height);
    const palette = generatePalette(colorScheme, colorOffset);
    
    const xScale = (viewPort.xMax - viewPort.xMin) / width;
    const yScale = (viewPort.yMax - viewPort.yMin) / height;
    
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const x = viewPort.xMin + px * xScale;
        const y = viewPort.yMin + py * yScale;
        
        let value;
        if (fractalType === 'mandelbrot') {
          value = calculateMandelbrot(x, y, maxIterations);
        } else {
          value = calculateJulia(x, y, juliaC.real, juliaC.imag, maxIterations);
        }
        
        const colorIndex = value === 0 ? 0 : Math.floor((value * 10) % 255);
        const color = palette[colorIndex];
        
        const index = (py * width + px) * 4;
        imageData.data[index] = color.r;
        imageData.data[index + 1] = color.g;
        imageData.data[index + 2] = color.b;
        imageData.data[index + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, [viewPort, maxIterations, colorScheme, colorOffset, fractalType, juliaC, generatePalette, calculateMandelbrot, calculateJulia]);

  // Convert screen coordinates to fractal coordinates
  const screenToFractal = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    
    const fractalX = viewPort.xMin + (x / canvas.width) * (viewPort.xMax - viewPort.xMin);
    const fractalY = viewPort.yMin + (y / canvas.height) * (viewPort.yMax - viewPort.yMin);
    
    return { x: fractalX, y: fractalY };
  }, [viewPort]);

  // Zoom functionality with proper centering
  const handleZoom = useCallback((factor: number, centerX?: number, centerY?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let fractalCenter;
    if (centerX !== undefined && centerY !== undefined) {
      fractalCenter = screenToFractal(centerX, centerY);
    } else {
      fractalCenter = {
        x: (viewPort.xMin + viewPort.xMax) / 2,
        y: (viewPort.yMin + viewPort.yMax) / 2
      };
    }
    
    const xRange = (viewPort.xMax - viewPort.xMin) * factor;
    const yRange = (viewPort.yMax - viewPort.yMin) * factor;
    
    setViewPort({
      xMin: fractalCenter.x - xRange / 2,
      xMax: fractalCenter.x + xRange / 2,
      yMin: fractalCenter.y - yRange / 2,
      yMax: fractalCenter.y + yRange / 2
    });
  }, [viewPort, screenToFractal]);

  // Pan functionality
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const xRange = viewPort.xMax - viewPort.xMin;
    const yRange = viewPort.yMax - viewPort.yMin;
    
    const xShift = (deltaX / canvas.width) * xRange;
    const yShift = (deltaY / canvas.height) * yRange;
    
    setViewPort({
      xMin: viewPort.xMin - xShift,
      xMax: viewPort.xMax - xShift,
      yMin: viewPort.yMin - yShift,
      yMax: viewPort.yMax - yShift
    });
  }, [viewPort]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning) return;
    
    const deltaX = e.clientX - panStart.x;
    const deltaY = e.clientY - panStart.y;
    
    handlePan(deltaX, deltaY);
    setPanStart({ x: e.clientX, y: e.clientY });
  }, [isPanning, panStart, handlePan]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = e.clientX;
    const centerY = e.clientY;
    
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    handleZoom(zoomFactor, centerX, centerY);
  }, [handleZoom]);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      // Single touch - prepare for pan or tap
      const touch = e.touches[0];
      setPanStart({ x: touch.clientX, y: touch.clientY });
      setLastTouchTime(Date.now());
    } else if (e.touches.length === 2) {
      // Two fingers - prepare for pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      setLastPinchDistance(distance);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && lastPinchDistance === 0) {
      // Single touch - pan
      const touch = e.touches[0];
      const deltaX = touch.clientX - panStart.x;
      const deltaY = touch.clientY - panStart.y;
      
      handlePan(deltaX, deltaY);
      setPanStart({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      // Two fingers - pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (lastPinchDistance > 0) {
        const scale = distance / lastPinchDistance;
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        handleZoom(2 - scale, centerX, centerY);
      }
      
      setLastPinchDistance(distance);
    }
  }, [panStart, lastPinchDistance, handlePan, handleZoom]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (e.touches.length === 0) {
      // Check for double tap
      const touchTime = Date.now();
      if (touchTime - lastTouchTime < 300 && e.changedTouches.length === 1) {
        // Double tap - zoom in
        const touch = e.changedTouches[0];
        handleZoom(0.5, touch.clientX, touch.clientY);
      }
      
      setLastPinchDistance(0);
    } else if (e.touches.length === 1) {
      // Reset to single touch
      const touch = e.touches[0];
      setPanStart({ x: touch.clientX, y: touch.clientY });
      setLastPinchDistance(0);
    }
  }, [lastTouchTime, handleZoom]);

  // Reset view
  const resetView = useCallback(() => {
    setViewPort({
      xMin: -2.5,
      xMax: 1.5,
      yMin: -1.5,
      yMax: 1.5
    });
    setMaxIterations(100);
  }, []);

  // Color cycling animation
  const animateColors = useCallback(() => {
    setColorOffset(prev => (prev + 1) % 256);
    animationRef.current = requestAnimationFrame(animateColors);
  }, []);

  // Save image
  const saveImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `fractint-${fractalType}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, [fractalType]);

  // Toggle animation
  useEffect(() => {
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animateColors);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, animateColors]);

  // Render on parameter changes
  useEffect(() => {
    renderFractal();
  }, [renderFractal]);

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-2 sm:p-4">
      {/* DOS-style header */}
      <div className="mb-2 sm:mb-4 border-2 border-green-400 p-2">
        <h1 className="text-xl sm:text-2xl font-bold text-center">FRACTINT SIMULATOR</h1>
        <p className="text-center text-xs sm:text-sm">The DOS Fractal Generator - Web Edition</p>
      </div>

      {/* Mobile controls hint */}
      <div className="mb-2 border border-green-400 p-2 text-xs sm:hidden">
        <p>📱 Touch Controls: Drag to pan • Pinch to zoom • Double-tap to zoom in</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Control Panel */}
        <div className="lg:col-span-1 space-y-2 sm:space-y-4">
          <div className="border border-green-400 p-2 sm:p-3">
            <h2 className="text-base sm:text-lg font-bold mb-2 text-yellow-400">FRACTAL TYPE</h2>
            <select 
              value={fractalType} 
              onChange={(e) => setFractalType(e.target.value)}
              className="w-full bg-black border border-green-400 text-green-400 p-1"
            >
              <option value="mandelbrot">Mandelbrot Set</option>
              <option value="julia">Julia Set</option>
            </select>
          </div>

          <div className="border border-green-400 p-2 sm:p-3">
            <h2 className="text-base sm:text-lg font-bold mb-2 text-yellow-400">PARAMETERS</h2>
            <div className="space-y-2">
              <div>
                <label className="text-xs">Max Iterations:</label>
                <input 
                  type="range" 
                  min="50" 
                  max="500" 
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs">{maxIterations}</span>
              </div>
              
              {fractalType === 'julia' && (
                <>
                  <div>
                    <label className="text-xs">C Real: {juliaC.real.toFixed(3)}</label>
                    <input 
                      type="range" 
                      min="-1" 
                      max="1" 
                      step="0.01"
                      value={juliaC.real}
                      onChange={(e) => setJuliaC(prev => ({ ...prev, real: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs">C Imag: {juliaC.imag.toFixed(3)}</label>
                    <input 
                      type="range" 
                      min="-1" 
                      max="1" 
                      step="0.01"
                      value={juliaC.imag}
                      onChange={(e) => setJuliaC(prev => ({ ...prev, imag: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border border-green-400 p-2 sm:p-3">
            <h2 className="text-base sm:text-lg font-bold mb-2 text-yellow-400">COLOR PALETTE</h2>
            <div className="grid grid-cols-2 gap-1 sm:gap-2">
              <button 
                onClick={() => setColorScheme(0)}
                className={`p-1 sm:p-2 border text-xs sm:text-base ${colorScheme === 0 ? 'bg-green-400 text-black' : 'border-green-400'}`}
              >
                Rainbow
              </button>
              <button 
                onClick={() => setColorScheme(1)}
                className={`p-1 sm:p-2 border text-xs sm:text-base ${colorScheme === 1 ? 'bg-green-400 text-black' : 'border-green-400'}`}
              >
                Fire
              </button>
              <button 
                onClick={() => setColorScheme(2)}
                className={`p-1 sm:p-2 border text-xs sm:text-base ${colorScheme === 2 ? 'bg-green-400 text-black' : 'border-green-400'}`}
              >
                Ocean
              </button>
              <button 
                onClick={() => setColorScheme(3)}
                className={`p-1 sm:p-2 border text-xs sm:text-base ${colorScheme === 3 ? 'bg-green-400 text-black' : 'border-green-400'}`}
              >
                Gray
              </button>
            </div>
          </div>

          <div className="border border-green-400 p-2 sm:p-3">
            <h2 className="text-base sm:text-lg font-bold mb-2 text-yellow-400">CONTROLS</h2>
            <div className="grid grid-cols-2 gap-1 sm:gap-2">
              <button 
                onClick={() => handleZoom(0.5)}
                className="p-1 sm:p-2 border border-green-400 hover:bg-green-400 hover:text-black flex items-center justify-center text-xs sm:text-base"
              >
                <ZoomIn size={14} className="mr-1 sm:w-4 sm:h-4" /> Zoom
              </button>
              <button 
                onClick={() => handleZoom(2)}
                className="p-1 sm:p-2 border border-green-400 hover:bg-green-400 hover:text-black flex items-center justify-center text-xs sm:text-base"
              >
                <ZoomOut size={14} className="mr-1 sm:w-4 sm:h-4" /> Out
              </button>
              <button 
                onClick={resetView}
                className="p-1 sm:p-2 border border-green-400 hover:bg-green-400 hover:text-black flex items-center justify-center text-xs sm:text-base"
              >
                <RotateCcw size={14} className="mr-1 sm:w-4 sm:h-4" /> Reset
              </button>
              <button 
                onClick={() => setIsAnimating(!isAnimating)}
                className="p-1 sm:p-2 border border-green-400 hover:bg-green-400 hover:text-black flex items-center justify-center text-xs sm:text-base"
              >
                {isAnimating ? <Pause size={14} className="mr-1 sm:w-4 sm:h-4" /> : <Play size={14} className="mr-1 sm:w-4 sm:h-4" />}
                Cycle
              </button>
              <button 
                onClick={saveImage}
                className="col-span-2 p-1 sm:p-2 border border-green-400 hover:bg-green-400 hover:text-black flex items-center justify-center text-xs sm:text-base"
              >
                <Download size={14} className="mr-1 sm:w-4 sm:h-4" /> Save Image
              </button>
            </div>
          </div>

          <div className="border border-green-400 p-2 sm:p-3 text-xs">
            <h2 className="text-xs sm:text-sm font-bold mb-1 text-yellow-400">INSTRUCTIONS</h2>
            <div className="hidden sm:block">
              <p>• Drag to pan around</p>
              <p>• Scroll wheel to zoom</p>
              <p>• Double-click to zoom in</p>
              <p>• Use controls for navigation</p>
            </div>
            <div className="sm:hidden">
              <p>• Drag to pan</p>
              <p>• Pinch to zoom</p>
              <p>• Double-tap to zoom in</p>
            </div>
          </div>
        </div>

        {/* Fractal Display */}
        <div className="lg:col-span-3 border-2 border-green-400 touch-none">
          <canvas 
            ref={canvasRef}
            width={800}
            height={600}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-full h-auto cursor-move bg-black"
            style={{ 
              imageRendering: 'pixelated',
              touchAction: 'none'
            }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-2 sm:mt-4 border border-green-400 p-1 sm:p-2 flex flex-wrap justify-between text-xs">
        <span className="mr-2">X: [{viewPort.xMin.toFixed(4)}, {viewPort.xMax.toFixed(4)}]</span>
        <span className="mr-2">Y: [{viewPort.yMin.toFixed(4)}, {viewPort.yMax.toFixed(4)}]</span>
        <span className="mr-2">Iter: {maxIterations}</span>
        <span>Type: {fractalType.toUpperCase()}</span>
      </div>
    </div>
  );
};

export default FractintSimulator;