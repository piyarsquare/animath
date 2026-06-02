import * as THREE from 'three';
import { MobiusTheme } from '../themes';

/** Build the corridor wall material for a given theme. */
export function makeCorridorMaterial(theme: MobiusTheme): THREE.MeshPhysicalMaterial {
  const tex = theme.makeTexture();
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex,
    color: theme.color,
    roughness: theme.roughness,
    metalness: theme.metalness,
    side: THREE.DoubleSide,    // viewed from inside; lit on both faces
    clearcoat: 0.3,
    clearcoatRoughness: 0.3,
    iridescence: theme.iridescence,
    iridescenceIOR: 1.5,
    emissive: new THREE.Color(theme.emissive),
    emissiveIntensity: theme.emissiveIntensity,
    emissiveMap: theme.glow ? tex : null,
  });

  // Subtle view-dependent sheen. Spliced at <dithering_fragment>, where
  // `normal`, `vViewPosition` and `gl_FragColor` are all in scope (splicing at
  // <color_fragment> references undefined identifiers and fails to compile).
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      /* glsl */ `
      {
        float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
        vec3 sheen = 0.5 + 0.45 * cos(6.2831853 * facing + vec3(0.0, 2.094, 4.188));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, sheen, 0.10);
      }
      #include <dithering_fragment>
      `,
    );
  };
  return mat;
}
