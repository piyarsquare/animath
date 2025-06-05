import * as THREE from 'three';

/** Basic unlit material */
export function basic(color: number | string = 0xffffff): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color });
}

/** Wireframe display of geometry */
export function wireframe(color: number | string = 0xffffff): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, wireframe: true });
}

/** Metallic surface with slight roughness */
export function metallic(color: number | string = 0xffffff): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.2 });
}

/** Transparent glass-like material */
export function glass(color: number | string = 0xffffff): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    transmission: 0.9,
    opacity: 0.6,
    roughness: 0,
    metalness: 0
  });
}

/** Cartoon style shaded material */
export function toon(color: number | string = 0xffffff): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color });
}

/** Additive glowing sprite material */
export function glowSprite(color: number | string = 0xffffaa): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({ color, transparent: true, blending: THREE.AdditiveBlending });
}

/** Dashed line material for outlines */
export function dashedLine(color: number | string = 0xffffff): THREE.LineDashedMaterial {
  return new THREE.LineDashedMaterial({ color, dashSize: 0.1, gapSize: 0.1 });
}

/** Depth-encoded material useful for visualising depth */
export function depthMaterial(): THREE.MeshDepthMaterial {
  return new THREE.MeshDepthMaterial();
}
