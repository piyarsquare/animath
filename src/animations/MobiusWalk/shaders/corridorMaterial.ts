import * as THREE from 'three';

export function corridorMaterial(): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    roughness: 0.35,
    metalness: 0.5,
    side: THREE.DoubleSide,    // viewed from inside; lit on both faces
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
    iridescence: 0.6,
    iridescenceIOR: 1.6,
    color: 0x3a4a66,
  });
  // Add a subtle view-dependent iridescent sheen. This must be spliced where
  // `normal`, `vViewPosition` and `gl_FragColor` are all in scope — i.e. late
  // in main(), at <dithering_fragment> — NOT at <color_fragment> (where
  // `outgoingLight`/`normal` don't exist yet and the shader fails to compile).
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      /* glsl */ `
      {
        float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
        vec3 sheen = 0.5 + 0.45 * cos(6.2831853 * facing + vec3(0.0, 2.094, 4.188));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, sheen, 0.18);
      }
      #include <dithering_fragment>
      `,
    );
  };
  return mat;
}
