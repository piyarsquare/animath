import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface SelectiveBloom {
  render(): void;
  setSize(w: number, h: number): void;
  dispose(): void;
}

/**
 * Emissive-keyed selective bloom. Two composers ping-pong each frame:
 *
 *  1. the **bloom** composer renders an *emissive-only* copy of the scene (every
 *     mesh swapped for a flat, unlit material showing just its `emissive` colour,
 *     against a black sky) and blurs the bright result;
 *  2. the **final** composer renders the scene normally, adds that bloom texture,
 *     then tonemaps (ACES) + encodes via `OutputPass`.
 *
 * Keying the glow to **emissive** (not luminance) is the whole point: the camera
 * headlamp + warm/cool key rig can light decor as hot as they like without
 * blooming, while the seams, markers, the ★ beacon and the avatar — the things
 * that actually emit — bleed light. Each glow's strength is just its material's
 * `emissive · emissiveIntensity`, so brightness stays an authoring knob.
 */
export function makeSelectiveBloom(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  opts: { strength: number; radius: number; threshold: number },
): SelectiveBloom {
  const w = renderer.domElement.width, h = renderer.domElement.height;

  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), opts.strength, opts.radius, opts.threshold);
  bloomComposer.addPass(bloomPass);

  const mixPass = new ShaderPass(new THREE.ShaderMaterial({
    uniforms: { baseTexture: { value: null }, bloomTexture: { value: bloomComposer.renderTarget2.texture } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main(){ gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }',
  }), 'baseTexture');
  mixPass.needsSwap = true;

  const finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(new RenderPass(scene, camera));
  finalComposer.addPass(mixPass);
  finalComposer.addPass(new OutputPass());

  bloomComposer.setSize(w, h);
  finalComposer.setSize(w, h);

  // emissive-only material swap (cached per source material)
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const proxies = new Map<THREE.Material, THREE.Material>();
  const saved = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  function proxyFor(m: THREE.Material): THREE.Material {
    const cached = proxies.get(m);
    if (cached) return cached;
    const sm = m as THREE.MeshStandardMaterial;
    const e = sm.emissive;
    let proxy: THREE.Material;
    if (e && (e.r > 0 || e.g > 0 || e.b > 0)) {
      proxy = new THREE.MeshBasicMaterial({
        color: e.clone().multiplyScalar(sm.emissiveIntensity ?? 1),
        map: sm.emissiveMap ?? null,
        transparent: sm.transparent, opacity: sm.opacity, side: sm.side,
      });
    } else {
      proxy = black;
    }
    proxies.set(m, proxy);
    return proxy;
  }
  function darken(o: THREE.Object3D) {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    saved.set(mesh, mesh.material);
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(proxyFor) : proxyFor(mesh.material);
  }
  function restore() {
    saved.forEach((mat, mesh) => { mesh.material = mat; });
    saved.clear();
  }

  return {
    render() {
      const prevBg = scene.background;
      scene.background = null;                 // emissive pass blooms against pure black
      scene.traverse(darken);
      bloomComposer.render();
      restore();
      scene.background = prevBg;
      finalComposer.render();
    },
    setSize(nw, nh) {
      bloomComposer.setSize(nw, nh);
      finalComposer.setSize(nw, nh);
    },
    dispose() {
      bloomComposer.dispose();
      finalComposer.dispose();
      bloomPass.dispose();
      black.dispose();
      proxies.forEach((p) => { if (p !== black) p.dispose(); });
      proxies.clear();
    },
  };
}
