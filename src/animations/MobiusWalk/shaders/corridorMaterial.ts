import * as THREE from 'three';

/** A small repeating "panel" texture (light face, dark seams) so the corridor
 *  walls read as crisp metallic panels instead of a smooth, fuzzy gradient. */
function panelTexture(): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;

  ctx.fillStyle = '#c4cee0';
  ctx.fillRect(0, 0, s, s);

  // Recessed seam frame around each panel.
  ctx.strokeStyle = '#28303f';
  ctx.lineWidth = s * 0.06;
  ctx.strokeRect(0, 0, s, s);
  // Soft inner border for a beveled look.
  ctx.strokeStyle = 'rgba(60, 72, 96, 0.35)';
  ctx.lineWidth = s * 0.02;
  ctx.strokeRect(s * 0.12, s * 0.12, s * 0.76, s * 0.76);
  // A couple of bolt dots.
  ctx.fillStyle = '#39435a';
  for (const [x, y] of [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]]) {
    ctx.beginPath();
    ctx.arc(x * s, y * s, s * 0.015, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // UVs are in world units; ~2.4-unit panels.
  tex.repeat.set(1 / 2.4, 1 / 2.4);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function corridorMaterial(): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    map: panelTexture(),
    roughness: 0.4,
    metalness: 0.55,
    side: THREE.DoubleSide,    // viewed from inside; lit on both faces
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
    iridescence: 0.45,
    iridescenceIOR: 1.5,
    color: 0x8893a8,
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
        gl_FragColor.rgb = mix(gl_FragColor.rgb, sheen, 0.12);
      }
      #include <dithering_fragment>
      `,
    );
  };
  return mat;
}
