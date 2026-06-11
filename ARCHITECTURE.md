# Animath Architecture & Consolidation Guide

> **Historical note (kept for background).** This document was the *design
> proposal* that motivated the consolidation work. The codebase was refactored in
> its spirit — the duplicated complex viewers became the shared `src/lib/particles`
> engine plus `ParticleViewerShell`, complex math moved to `lib/complexMath.ts`,
> and textures to `lib/textures.ts` — but the concrete folder names below
> (`core/`, `widgets/`, `ui/`) were **not** adopted. Shared code actually lives in
> `src/components/` and `src/lib/`, and the AppShell described here was later
> replaced by the workspace chrome (`src/chrome/`). Some files this document
> analyzes (`lib/R2Mapping.ts`, `lib/ParticleDisplay.ts`, `src/materials/`) have
> since been deleted as orphans. For the current structure see **CLAUDE.md**; to
> build a new app, see **docs/BUILDING_AN_APP.md**. Treat this file as background
> only.

This document provides a detailed analysis of the repository structure, identifies the core primitives, and proposes a consolidated architecture for better maintainability and extensibility.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Identified Primitives](#2-identified-primitives)
3. [Widget/Animation Patterns](#3-widgetanimation-patterns)
4. [Code Duplication Analysis](#4-code-duplication-analysis)
5. [Proposed Consolidated Structure](#5-proposed-consolidated-structure)
6. [Migration Path](#6-migration-path)
7. [Primitives API Reference](#7-primitives-api-reference)

---

## 1. Current State Analysis

### Current Directory Structure

```
src/
├── App.tsx                 # Root component (renders ComplexParticles)
├── index.tsx               # Entry point with hash-based routing
├── animations/             # Self-contained animation modules
│   ├── ComplexParticles/   # 3D complex function visualization
│   ├── ComplexRoots/       # z^(p/q) rational exponent viewer
│   ├── ComplexMultibranch/ # Multi-branch variant of ComplexParticles
│   ├── Correspondence/     # Mandelbrot-Julia correspondence
│   ├── Fractals/           # Legacy CPU-based fractal renderer
│   ├── FractalsGPU/        # GPU-accelerated fractal viewer
│   └── MobiusWalk/         # First-person Möbius strip corridor
├── components/             # Reusable React components
│   ├── Canvas3D.tsx        # Three.js scene wrapper
│   ├── ToggleMenu.tsx      # Collapsible menu widget
│   └── Readme.tsx          # Markdown renderer component
├── config/                 # Configuration constants
│   └── defaults.ts         # Canvas and particle defaults
├── controls/               # UI control components
│   └── QuarterTurnBar.tsx  # 4D rotation control buttons
├── lib/                    # Utility libraries
│   ├── ParticleDisplay.ts  # Particle system helper
│   ├── R2Mapping.ts        # ℝ² → ℝ² function library
│   └── viewpoint.ts        # 4D projection and quaternion utils
├── materials/              # Three.js material presets
│   ├── index.ts            # Material factory functions
│   └── README.md           # Documentation
├── math/                   # Mathematical utilities
│   ├── constants.ts        # Mathematical constants (planes, QUARTER)
│   └── quat4.ts            # 4D quaternion rotation helpers
├── styles/                 # Style utilities
│   └── responsive.ts       # Responsive design hooks/utilities
├── types/                  # TypeScript type definitions
│   └── uniforms.d.ts       # Shader uniform types
└── unported_examples/      # Legacy/experimental code
    └── fractint-simulator.tsx
```

### Key Observations

1. **Significant Code Duplication**: `ComplexParticles`, `ComplexRoots`, and `ComplexMultibranch` share ~80% of their structure and patterns (same state management, animation loop, UI layout)
2. **Mixed Concerns**: Some animation components contain reusable utilities (texture generators, complex math functions)
3. **Inconsistent Imports**: Mix of relative and alias (`@/`) imports
4. **Scattered Math Functions**: Complex number operations duplicated across multiple files
5. **No Shared Shader Library**: GLSL code duplicated in shader files

---

## 2. Identified Primitives

### 2.1 Core Primitives (Building Blocks)

These are the fundamental, reusable units that can be composed to create any animation:

#### **Math Primitives** (`src/primitives/math/`)

| Primitive | Current Location | Purpose |
|-----------|------------------|---------|
| `Complex` | Inline in animations | Complex number operations (add, mul, div, exp, sin, etc.) |
| `Quaternion4D` | `lib/viewpoint.ts`, `math/quat4.ts` | 4D rotation representations |
| `Vec2`, `Vec4` | Inline | 2D/4D vector operations |
| `R2Mapping` | `lib/R2Mapping.ts` | ℝ² → ℝ² function mappings |

#### **Rendering Primitives** (`src/primitives/rendering/`)

| Primitive | Current Location | Purpose |
|-----------|------------------|---------|
| `Canvas3D` | `components/Canvas3D.tsx` | Three.js scene lifecycle wrapper |
| `ParticleSystem` | `lib/ParticleDisplay.ts` | Point cloud geometry manager |
| `AxisDisplay` | Inline in animations | 4D axis line rendering |
| `TextureFactory` | Inline in animations | Procedural texture generators |

#### **Shader Primitives** (`src/primitives/shaders/`)

| Primitive | Current Location | Purpose |
|-----------|------------------|---------|
| `quatRotate4D` | Inline GLSL | 4D quaternion rotation on GPU |
| `project4Dto3D` | Inline GLSL | Perspective/stereo/Hopf projections |
| `complexFunctions` | Inline GLSL | Complex math operations |
| `domainColoring` | Inline GLSL | HSV/modulus/phase coloring |

#### **UI Primitives** (`src/primitives/ui/`)

| Primitive | Current Location | Purpose |
|-----------|------------------|---------|
| `ToggleMenu` | `components/ToggleMenu.tsx` | Collapsible control panel |
| `QuarterTurnBar` | `controls/QuarterTurnBar.tsx` | 4D rotation buttons |
| `SliderControl` | Inline | Range input with label |
| `SelectControl` | Inline | Dropdown with label |
| `ResponsiveContainer` | `styles/responsive.ts` | Mobile-aware layouts |

---

## 3. Widget/Animation Patterns

### 3.1 Animation Component Template

All animations follow this pattern:

```typescript
interface AnimationProps {
  // Configurable parameters
}

export default function AnimationName(props: AnimationProps) {
  // 1. State management (useState hooks)
  // 2. Refs for Three.js objects
  // 3. onMount callback for scene setup
  // 4. useEffect hooks for parameter updates
  // 5. Animation loop
  // 6. UI overlay rendering
}
```

### 3.2 Animation Categories

| Category | Examples | Shared Features |
|----------|----------|-----------------|
| **Complex Function Viewers** | ComplexParticles, ComplexRoots, ComplexMultibranch | 4D rotation, particle system, domain coloring, projection modes |
| **Fractal Explorers** | FractalsGPU, Correspondence, Fractals | Viewport navigation, iteration control, palette selection |
| **3D Environments** | MobiusWalk | Camera movement, geometry generation, lighting |

### 3.3 Common Feature Matrix

| Feature | ComplexParticles | ComplexRoots | ComplexMultibranch | FractalsGPU | Correspondence | MobiusWalk |
|---------|------------------|--------------|---------------------|-------------|----------------|------------|
| Canvas3D wrapper | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| 4D rotation | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Particle system | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Projection modes | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Domain coloring | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Viewport pan/zoom | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| Texture generation | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| ToggleMenu | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Responsive hooks | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |

---

## 4. Code Duplication Analysis

### 4.1 Most Duplicated Code

#### Texture Generators (duplicated 3x)
```typescript
// Found identically in: ComplexParticles, ComplexRoots, ComplexMultibranch
function makeCheckerTexture(size = 64): THREE.DataTexture { ... }
function makeSpeckledTexture(size = 64): THREE.DataTexture { ... }
function makeStoneTexture(size = 64): THREE.DataTexture { ... }
function makeMetalTexture(size = 64): THREE.DataTexture { ... }
```

#### Complex Number Functions (duplicated 3x)
```typescript
// Found identically in: ComplexParticles, ComplexRoots, ComplexMultibranch
function complexSqrt(z: THREE.Vector2): THREE.Vector2 { ... }
function complexSquare(z: THREE.Vector2): THREE.Vector2 { ... }
function complexLn(z: THREE.Vector2): THREE.Vector2 { ... }
function complexExp(z: THREE.Vector2): THREE.Vector2 { ... }
function complexSin(z: THREE.Vector2): THREE.Vector2 { ... }
function complexCos(z: THREE.Vector2): THREE.Vector2 { ... }
function complexTan(z: THREE.Vector2): THREE.Vector2 { ... }
function complexInv(z: THREE.Vector2): THREE.Vector2 { ... }
```

#### Axis Helper Creation (duplicated 3x)
```typescript
// Found identically in: ComplexParticles, ComplexRoots, ComplexMultibranch
const makeAxis = (mat: THREE.LineBasicMaterial): Axis => { ... }
const updateAxis = (axis: Axis, start: Vector4, end: Vector4) => { ... }
```

#### Animation Loop Pattern (duplicated 3x)
```typescript
// Very similar structure in all complex function viewers
const animate = () => {
  // Time management
  // Quaternion composition
  // Axis updates
  // Orientation matrix calculation
  requestAnimationFrame(animate);
};
```

#### UI Control Layout (duplicated 3x)
```typescript
// Similar slider/button layouts in all animations
<label>
  Saturation:
  <input type="range" ... />
</label>
```

### 4.2 Lines of Code Analysis

| File | Total Lines | Lines Matching Shared Patterns | Unique Lines |
|------|-------------|-------------------------------|--------------|
| ComplexParticles.tsx | 1260 | ~700 | ~560 |
| ComplexRoots.tsx | 1146 | ~650 | ~496 |
| ComplexMultibranch.tsx | 1354 | ~750 | ~604 |
| **Total** | 3760 | N/A | ~1660 |

**Analysis**: The three complex viewers share a common structure that could be extracted into a base component of ~700-800 lines. After extraction:
- Base component: ~750 lines (shared logic)
- ComplexParticles: ~560 lines (unique)
- ComplexRoots: ~450 lines (unique, mainly p/q controls)
- ComplexMultibranch: ~550 lines (unique, mainly branch logic)
- **Consolidated total**: ~2310 lines (vs current 3760 = ~38% reduction)

---

## 5. Proposed Consolidated Structure

```
src/
├── index.tsx                    # Entry point with routing
├── App.tsx                      # Default route component
│
├── core/                        # Core framework primitives
│   ├── index.ts                 # Public exports
│   ├── math/
│   │   ├── Complex.ts           # Complex number class
│   │   ├── Quaternion4D.ts      # 4D quaternion operations
│   │   ├── Vector.ts            # Vec2, Vec4 utilities
│   │   └── constants.ts         # PI, planes, etc.
│   ├── rendering/
│   │   ├── Canvas3D.tsx         # Three.js wrapper
│   │   ├── ParticleSystem.ts    # Point cloud manager
│   │   ├── AxisHelper.ts        # 4D axis renderer
│   │   ├── TextureFactory.ts    # Procedural textures
│   │   └── Projection.ts        # 4D→3D projections
│   └── shaders/
│       ├── chunks/
│       │   ├── quaternion.glsl  # Quat rotation functions
│       │   ├── complex.glsl     # Complex math functions
│       │   ├── projection.glsl  # Projection functions
│       │   └── coloring.glsl    # Domain coloring
│       └── index.ts             # Shader string exports
│
├── ui/                          # Reusable UI components
│   ├── index.ts
│   ├── ToggleMenu.tsx
│   ├── Readme.tsx
│   ├── controls/
│   │   ├── QuarterTurnBar.tsx
│   │   ├── Slider.tsx           # Generic slider control
│   │   ├── Select.tsx           # Generic select control
│   │   └── ControlPanel.tsx     # Collapsible panel layout
│   └── hooks/
│       └── useResponsive.ts     # Screen size detection
│
├── widgets/                     # Composed, reusable widget systems
│   ├── index.ts
│   ├── ComplexViewer/           # Shared base for complex viewers
│   │   ├── ComplexViewerBase.tsx
│   │   ├── useComplexControls.ts
│   │   ├── useAxisAnimation.ts
│   │   └── shaders/
│   └── FractalViewer/           # Shared base for fractal viewers
│       ├── FractalViewerBase.tsx
│       ├── useViewport.ts
│       ├── useIterator.ts
│       └── shaders/
│
├── animations/                  # Specific animation implementations
│   ├── ComplexParticles/
│   │   ├── index.tsx            # Uses ComplexViewerBase
│   │   └── README.md
│   ├── ComplexRoots/
│   │   ├── index.tsx            # Uses ComplexViewerBase + custom p/q logic
│   │   └── README.md
│   ├── ComplexMultibranch/
│   │   ├── index.tsx            # Uses ComplexViewerBase + branch logic
│   │   └── README.md
│   ├── FractalsGPU/
│   │   ├── index.tsx            # Uses FractalViewerBase
│   │   └── README.md
│   ├── Correspondence/
│   │   ├── index.tsx            # Two FractalViewerBase instances
│   │   └── README.md
│   └── MobiusWalk/
│       ├── index.tsx
│       ├── corridorGeometry.ts
│       ├── objects.ts
│       └── README.md
│
├── materials/                   # Three.js material presets
│   ├── index.ts
│   └── README.md
│
├── config/                      # Global configuration
│   └── defaults.ts
│
├── types/                       # TypeScript definitions
│   ├── index.ts
│   └── uniforms.d.ts
│
└── unported_examples/           # Archived/experimental
```

---

## 6. Migration Path

### Phase 1: Extract Shared Utilities (Low Risk)

1. **Create `core/math/Complex.ts`**
   - Extract all complex functions from animation files
   - Unify the THREE.Vector2-based API with the `Vec2` type from R2Mapping

2. **Create `core/rendering/TextureFactory.ts`**
   - Move all `make*Texture` functions
   - Export as named exports

3. **Create `core/rendering/AxisHelper.ts`**
   - Extract axis creation/update logic
   - Parameterize colors and widths

### Phase 2: Consolidate Shaders (Medium Risk)

1. **Create shader chunks directory**
   - Extract common GLSL snippets
   - Use string templates or vite-plugin-glsl

2. **Compose shaders from chunks**
   - Keep animation-specific variations
   - Share common transforms

### Phase 3: Create Widget Bases (Higher Risk)

1. **Create `ComplexViewerBase`**
   - Abstract the common animation loop
   - Extract shared state management
   - Provide props for customization

2. **Refactor animations to use bases**
   - ComplexParticles: minimal wrapper
   - ComplexRoots: adds p/q controls
   - ComplexMultibranch: adds branch controls

### Phase 4: UI Component Library

1. **Create generic control components**
   - Slider with label
   - Select with options
   - Control panel layout

2. **Update animations to use components**
   - Reduce inline style duplication
   - Consistent look and feel

---

## 7. Primitives API Reference

### 7.1 Complex Number API

```typescript
// Proposed: src/core/math/Complex.ts
export type Complex = { re: number; im: number };

export function complex(re: number, im: number = 0): Complex;
export function add(a: Complex, b: Complex): Complex;
export function mul(a: Complex, b: Complex): Complex;
export function div(a: Complex, b: Complex): Complex;
export function conj(z: Complex): Complex;
export function abs(z: Complex): number;
export function arg(z: Complex): number;
export function exp(z: Complex): Complex;
export function ln(z: Complex, branch?: number): Complex;
export function pow(z: Complex, p: number, q?: number): Complex;
export function sqrt(z: Complex, branch?: number): Complex;
export function sin(z: Complex): Complex;
export function cos(z: Complex): Complex;
export function tan(z: Complex): Complex;
```

### 7.2 Quaternion4D API

```typescript
// Proposed: src/core/math/Quaternion4D.ts
export type Quat4 = { w: number; x: number; y: number; z: number };
export type Plane = 'XY' | 'XU' | 'XV' | 'YU' | 'YV' | 'UV';

export function identity(): Quat4;
export function fromAxisAngle(plane: Plane, angle: number): { L: Quat4; R: Quat4 };
export function multiply(a: Quat4, b: Quat4): Quat4;
export function conjugate(q: Quat4): Quat4;
export function normalize(q: Quat4): Quat4;
export function slerp(a: Quat4, b: Quat4, t: number): Quat4;
export function rotatePoint(p: Vec4, L: Quat4, R: Quat4): Vec4;
```

### 7.3 Projection API

```typescript
// Proposed: src/core/rendering/Projection.ts
export enum ProjectionMode {
  Perspective = 0,
  Stereo = 1,
  Hopf = 2,
  DropX = 3,
  DropY = 4,
  DropU = 5,
  DropV = 6
}

export function project(p: Vec4, mode: ProjectionMode): Vec3;
```

### 7.4 TextureFactory API

```typescript
// Proposed: src/core/rendering/TextureFactory.ts
export function checker(size?: number): THREE.DataTexture;
export function speckled(size?: number): THREE.DataTexture;
export function stone(size?: number): THREE.DataTexture;
export function metal(size?: number): THREE.DataTexture;
export function solid(color?: number): THREE.DataTexture;
```

### 7.5 UI Control Components

```typescript
// Proposed: src/ui/controls/Slider.tsx
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  showValue?: boolean;
}

// Proposed: src/ui/controls/Select.tsx
interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}

// Proposed: src/ui/controls/ControlPanel.tsx
interface ControlPanelProps {
  title: string;
  children: React.ReactNode;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  collapsible?: boolean;
  defaultExpanded?: boolean;
}
```

---

## Summary

The animath repository would benefit significantly from:

1. **Extracting shared code** into reusable primitives (~750 lines of common logic)
2. **Establishing a clear hierarchy**: core primitives → widgets → animations
3. **Creating a composable UI system** with generic control components
4. **Unifying the shader architecture** with shared GLSL chunks

This consolidation would:
- Reduce the complex viewer code by ~38% (3760 → ~2310 lines)
- Make adding new animations much easier
- Improve consistency across the application
- Enable easier testing of isolated primitives
