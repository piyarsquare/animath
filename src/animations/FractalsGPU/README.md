# Fractals GPU

This viewer renders the Mandelbrot and Julia sets entirely on the GPU via a fragment shader. Escape times for every pixel are computed in parallel, then a color map is applied. Clicking the fractal now shows the orbit path just like the original CPU implementation.

Pan and zoom are available through the arrow and zoom buttons in the interface.
