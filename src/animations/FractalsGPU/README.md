# Fractals GPU

This viewer renders the Mandelbrot and Julia sets entirely on the GPU via a fragment shader. Escape times for every pixel are computed in parallel, then a color map is applied. Clicking the fractal now shows the orbit path just like the original CPU implementation.

Pan and zoom are available through the arrow and zoom buttons in the interface. The power of the iteration function `z^k + c` can be changed, and the viewer offers multiple coloring modes including escape velocity, limit magnitude and a layered combination of both. In limit mode the interior pixels are colored according to the magnitude of `z` after the final iteration.
