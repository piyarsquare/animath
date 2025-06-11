# Fractals GPU

This viewer renders several classic fractals entirely on the GPU via a fragment shader. The Mandelbrot, Julia, Burning Ship and Tricorn sets are available. Escape times for every pixel are computed in parallel, then a color map is applied. Clicking the fractal shows the orbit path just like the original CPU implementation.

Pan and zoom are available through the arrow and zoom buttons in the interface. The power of the iteration function `z^k + c` can be changed from 1 up to 100 using a numeric spinbox. Iterations can also be set with a spinbox up to the shader limit of 1000. The viewer offers multiple coloring modes including escape velocity, limit magnitude and a layered combination of both.  In limit magnitude mode the inner region is shaded according to the **maximum** magnitude reached during the iterations.
