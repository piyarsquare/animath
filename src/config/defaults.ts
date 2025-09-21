export const CANVAS_CONFIG = {
  fov: 60,
  near: 0.1,
  far: 1000,
  style: {
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    position: 'relative'
  } as const
};

export const TOGGLE_MENU_STYLE = {
  container: {
    display: 'inline-block'
  },
  panel: {
    marginTop: 8,
    padding: 6,
    background: 'rgba(0,0,0,0.5)',
    color: 'white',
    borderRadius: 4
  }
};

export const COMPLEX_PARTICLES_DEFAULTS = {
  axisLength: 4,
  axisWidth: 5,
  initial: {
    saturation: 1,
    cameraZ: 5,
    size: 1,
    opacity: 0.9,
    intensity: 1,
    shimmer: 0,
    hueShift: 0,
    jitter: 0.1,
    axisWidth: 5
  },
  defaultParticleCount: 80000,
  ranges: {
    saturation: { min: 0, max: 1, step: 0.01 },
    particleCount: { min: 1000, max: 80000, step: 1000 },
    size: { min: 0.2, max: 5, step: 0.1 },
    opacity: { min: 0, max: 1, step: 0.01 },
    intensity: { min: 0.5, max: 2, step: 0.05 },
    shimmer: { min: 0, max: 1, step: 0.01 },
    jitter: { min: 0, max: 0.5, step: 0.005 },
    hueShift: { min: 0, max: 1, step: 0.01 },
    cameraZ: { min: 2, max: 50, step: 0.1 },
    axisWidth: { min: 0.5, max: 5, step: 0.1 }
  }
};
