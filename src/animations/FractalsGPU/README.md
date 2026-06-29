# Fractals GPU

This viewer renders several classic fractals entirely on the GPU via a fragment shader. The Mandelbrot, Julia, Burning Ship and Tricorn sets are available. Escape times for every pixel are computed in parallel, then a color map is applied. Clicking the fractal shows the orbit path just like the original CPU implementation.

Pan and zoom directly on the canvas: drag to pan, pinch or mouse-wheel to zoom. The power of the iteration function `z^k + c` can be changed from 1 up to 100 using a numeric spinbox. Iterations can also be set with a spinbox up to the shader limit of 1000. The viewer offers multiple coloring modes including escape velocity, limit magnitude and a layered combination of both.  In limit magnitude mode the inner region is shaded according to the **maximum** magnitude reached during the iterations.

## Deep zoom and the precision limit

Zoom far enough and the plot turns blocky — not because the fractal runs out of detail but because 32-bit GPU floats run out of digits (~7 of them), so neighboring pixels round to the same coordinate. The **Precision** toggle (Viewport panel) switches the shader to **Extended** precision (df64 — each coordinate carried as an unevaluated sum of two floats, doubling the working digits to ~14), pushing the zoom wall out by roughly ten-million-fold. The method, why it is mathematically legitimate, and the broader limits of computing with finite bits are written up in **DEEP_ZOOM.md** (also shown in the in-app **?** panel).
