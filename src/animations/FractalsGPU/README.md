# Fractals GPU

This variant of the fractal viewer renders the Mandelbrot and Julia sets entirely on the GPU via a fragment shader. The shader computes the iteration count for each pixel in parallel, making zoom and palette changes much faster than the CPU implementation.

Pan and zoom are available through the arrow and zoom buttons in the interface.
