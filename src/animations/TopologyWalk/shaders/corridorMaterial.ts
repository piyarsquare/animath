import * as THREE from 'three';
import { MobiusTheme } from '../themes';

/** Build the corridor wall material for a given theme. A plain, well-lit PBR
 *  surface — no iridescent/thin-film tint, which previously read as rainbow
 *  fringing once bloom amplified it. The look now comes from the theme texture
 *  and its light rig. */
export function makeCorridorMaterial(theme: MobiusTheme): THREE.MeshPhysicalMaterial {
  const tex = theme.makeTexture();
  return new THREE.MeshPhysicalMaterial({
    map: tex,
    color: theme.color,
    roughness: theme.roughness,
    metalness: theme.metalness,
    side: THREE.DoubleSide,    // viewed from inside; lit on both faces
    clearcoat: 0.25,
    clearcoatRoughness: 0.4,
    emissive: new THREE.Color(theme.emissive),
    emissiveIntensity: theme.emissiveIntensity,
    emissiveMap: theme.glow ? tex : null,
  });
}
