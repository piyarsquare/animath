import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export function makeCheckerTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const c = ((x >> 4) & 1) ^ ((y >> 4) & 1) ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

export function makeSpeckledTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const c = Math.floor(Math.random() * 256);
    const j = i * 4;
    data[j] = data[j + 1] = data[j + 2] = c;
    data[j + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

export function makeStoneTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n =
        0.5 +
        0.5 * (Math.sin(x * 0.3) * Math.sin(y * 0.3)) +
        0.1 * Math.random();
      const c = Math.floor(100 + 80 * n);
      data[i] = data[i + 1] = data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

export function makeMetalTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const shine = 0.5 + 0.5 * Math.sin(x * 0.2);
      const c = Math.floor(180 + 40 * shine);
      data[i] = data[i + 1] = data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

/** Load all textures used by particle visualizations. Index 5 (royal HDR) loads async. */
export function loadParticleTextures(onHdrLoaded?: (tex: THREE.Texture) => void): THREE.Texture[] {
  const textures: THREE.Texture[] = [];
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  white.needsUpdate = true;
  textures[0] = white;
  textures[1] = makeCheckerTexture(64);
  textures[2] = makeSpeckledTexture(64);
  textures[3] = makeStoneTexture(64);
  textures[4] = makeMetalTexture(64);
  new RGBELoader()
    .setDataType(THREE.UnsignedByteType)
    .load(`${import.meta.env.BASE_URL}textures/royal_esplanade_1k.hdr`, tex => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.flipY = true;
      tex.needsUpdate = true;
      textures[5] = tex;
      onHdrLoaded?.(tex);
    });
  return textures;
}
