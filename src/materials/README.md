# Material Presets

Reusable Three.js materials for animations. Import any of the preset functions
from `src/materials` to quickly apply a consistent look.

## Available presets

- **basic** – simple `MeshBasicMaterial` with configurable color.
- **wireframe** – renders geometry edges only.
- **metallic** – shiny `MeshStandardMaterial` with high metalness.
- **glass** – transparent physical material mimicking glass.
- **toon** – cartoon-style shading using `MeshToonMaterial`.
- **glowSprite** – additive blending sprite for luminous effects.
- **dashedLine** – dashed line material for outlines or grids.
- **depthMaterial** – renders depth values of geometry.

Each function accepts an optional color (when applicable) and returns a ready
configured Three.js material instance.
