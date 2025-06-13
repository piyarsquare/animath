import * as THREE from 'three';

export function corridorMaterial(): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    roughness: 0.2,
    metalness: 0.4,
    side: THREE.BackSide,      // we view the inside
    clearcoat: 0.1,
    transmission: 0.05,
    iridescence: 0.2,
    color: 0x445566
  });
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
        // iridescent tint depending on normal•view
        float facing = dot(normal, vViewPosition) / length(vViewPosition);
        vec3 hueShift = vec3(0.5 + 0.3 * sin(6.283 * facing));
        outgoingLight = mix(outgoingLight, hueShift, 0.15);
      `
    );
  };
  return mat;
}
