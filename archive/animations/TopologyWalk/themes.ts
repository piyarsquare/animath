import * as THREE from 'three';

export type FlickerKind = 'steady' | 'torch' | 'candle' | 'pulse';

export interface ThemeLighting {
  ambient: number;
  hemi?: { sky: number; ground: number; intensity: number };
  /** Emitter lights placed along the corridor near the player (torches, etc.). */
  emitter: {
    color: number; intensity: number; distance: number; decay: number;
    count: number; spacing: number; flicker: FlickerKind; amp: number; spriteSize: number;
  };
  /** Optional cool directional "moonbeam". */
  moonbeam?: { color: number; intensity: number; dir: [number, number, number] };
  bloom: { strength: number; radius: number; threshold: number };
  exposure: number;
}

/** A look for the corridor: palette + material + a procedural wall texture + lights. */
export interface MobiusTheme {
  id: string;
  label: string;
  background: number;
  fogNear: number;
  fogFar: number;
  color: number;
  metalness: number;
  roughness: number;
  emissive: number;
  emissiveIntensity: number;
  glow: boolean;
  iridescence: number;
  makeTexture: () => THREE.CanvasTexture;
  lighting: ThemeLighting;
}

function canvasTexture(
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
  panelUnits = 2.4,
): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  draw(cvs.getContext('2d')!, s);
  const t = new THREE.CanvasTexture(cvs);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / panelUnits, 1 / panelUnits);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft round glow sprite (white; tint via material color). Shared for emitter
 *  flames and the wall-writing "ink". */
export function glowTexture(): THREE.CanvasTexture {
  const s = 128;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const THEMES: MobiusTheme[] = [
  {
    id: 'panels', label: 'Steel panels',
    background: 0x05050a, fogNear: 6, fogFar: 30,
    color: 0x8893a8, metalness: 0.55, roughness: 0.4, emissive: 0x000000,
    emissiveIntensity: 0, glow: false, iridescence: 0.45,
    makeTexture: () => canvasTexture((ctx, s) => {
      ctx.fillStyle = '#c4cee0'; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#28303f'; ctx.lineWidth = s * 0.06; ctx.strokeRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(60,72,96,0.35)'; ctx.lineWidth = s * 0.02;
      ctx.strokeRect(s * 0.12, s * 0.12, s * 0.76, s * 0.76);
      ctx.fillStyle = '#39435a';
      for (const [x, y] of [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]]) {
        ctx.beginPath(); ctx.arc(x * s, y * s, s * 0.015, 0, 7); ctx.fill();
      }
    }),
    lighting: {
      ambient: 0.32,
      emitter: { color: 0xdfe8ff, intensity: 7, distance: 16, decay: 1.6, count: 5, spacing: 8, flicker: 'steady', amp: 0, spriteSize: 0.5 },
      bloom: { strength: 0.35, radius: 0.5, threshold: 0.85 }, exposure: 1.05,
    },
  },
  {
    id: 'spaceship', label: 'Spaceship',
    background: 0x02030a, fogNear: 7, fogFar: 34,
    color: 0x2a3340, metalness: 0.85, roughness: 0.35, emissive: 0x0a2230,
    emissiveIntensity: 0.4, glow: true, iridescence: 0.2,
    makeTexture: () => canvasTexture((ctx, s) => {
      ctx.fillStyle = '#0b0f16'; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#1a2430'; ctx.lineWidth = s * 0.05; ctx.strokeRect(0, 0, s, s);
      ctx.strokeStyle = '#27e0ff'; ctx.lineWidth = s * 0.012;
      ctx.beginPath();
      ctx.moveTo(s * 0.1, s * 0.5); ctx.lineTo(s * 0.4, s * 0.5); ctx.lineTo(s * 0.5, s * 0.65); ctx.lineTo(s * 0.9, s * 0.65);
      ctx.moveTo(s * 0.5, s * 0.1); ctx.lineTo(s * 0.5, s * 0.4);
      ctx.stroke();
      ctx.fillStyle = '#27e0ff'; ctx.fillRect(s * 0.46, s * 0.06, s * 0.08, s * 0.05);
    }, 1.8),
    lighting: {
      ambient: 0.18,
      emitter: { color: 0x55ddff, intensity: 8, distance: 14, decay: 1.5, count: 6, spacing: 6, flicker: 'pulse', amp: 0.4, spriteSize: 0.4 },
      bloom: { strength: 0.7, radius: 0.6, threshold: 0.6 }, exposure: 1.1,
    },
  },
  {
    id: 'rainbow', label: 'Rainbow road',
    background: 0x05021a, fogNear: 8, fogFar: 40,
    color: 0xffffff, metalness: 0.2, roughness: 0.5, emissive: 0xffffff,
    emissiveIntensity: 0.9, glow: true, iridescence: 0.1,
    makeTexture: () => canvasTexture((ctx, s) => {
      for (let i = 0; i < s; i++) { ctx.fillStyle = `hsl(${(i / s) * 360}, 90%, 58%)`; ctx.fillRect(0, i, s, 1); }
      ctx.fillStyle = '#101020'; ctx.fillRect(0, 0, s, s * 0.08); ctx.fillRect(0, s * 0.92, s, s * 0.08);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let y = 0; y < s; y += s * 0.25) ctx.fillRect(s * 0.47, y + s * 0.06, s * 0.06, s * 0.12);
    }, 3.2),
    lighting: {
      ambient: 0.6,
      emitter: { color: 0xffffff, intensity: 3, distance: 14, decay: 1.4, count: 4, spacing: 9, flicker: 'steady', amp: 0, spriteSize: 0.3 },
      bloom: { strength: 0.9, radius: 0.7, threshold: 0.5 }, exposure: 1.15,
    },
  },
  {
    id: 'dragon', label: "Dragon's belly",
    background: 0x140404, fogNear: 5, fogFar: 24,
    color: 0x6e1414, metalness: 0.1, roughness: 0.75, emissive: 0x300404,
    emissiveIntensity: 0.5, glow: false, iridescence: 0.15,
    makeTexture: () => canvasTexture((ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s * 0.7);
      g.addColorStop(0, '#a83232'); g.addColorStop(1, '#3a0a0a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(20,0,0,0.5)'; ctx.lineWidth = s * 0.04;
      for (let i = -1; i < 6; i++) { ctx.beginPath(); ctx.arc(s * 0.5, s * (i * 0.25), s * 0.3, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,120,90,0.25)'; ctx.lineWidth = s * 0.015; ctx.strokeRect(0, 0, s, s);
    }, 2.0),
    lighting: {
      ambient: 0.18,
      emitter: { color: 0xff5a1e, intensity: 11, distance: 12, decay: 1.7, count: 6, spacing: 6, flicker: 'torch', amp: 0.55, spriteSize: 0.7 },
      bloom: { strength: 0.8, radius: 0.6, threshold: 0.55 }, exposure: 1.05,
    },
  },
  {
    id: 'portal', label: 'Test chamber',
    background: 0x0c0f12, fogNear: 8, fogFar: 38,
    color: 0xdfe3e8, metalness: 0.15, roughness: 0.55, emissive: 0x000000,
    emissiveIntensity: 0, glow: false, iridescence: 0.1,
    makeTexture: () => canvasTexture((ctx, s) => {
      ctx.fillStyle = '#eef1f4'; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#aeb6bf'; ctx.lineWidth = s * 0.025; ctx.strokeRect(0, 0, s, s);
      ctx.fillStyle = '#d7dce1'; ctx.fillRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
      ctx.strokeStyle = '#c2c9d0'; ctx.lineWidth = s * 0.01; ctx.strokeRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
    }, 2.6),
    lighting: {
      ambient: 0.5,
      hemi: { sky: 0xeaf2ff, ground: 0x3a4048, intensity: 0.5 },
      emitter: { color: 0xeaf2ff, intensity: 7, distance: 18, decay: 1.5, count: 5, spacing: 9, flicker: 'steady', amp: 0, spriteSize: 0.35 },
      bloom: { strength: 0.25, radius: 0.4, threshold: 0.9 }, exposure: 1.0,
    },
  },
  {
    id: 'moonlit', label: 'Moonlit ruin',
    background: 0x080b14, fogNear: 6, fogFar: 30,
    color: 0x5a6170, metalness: 0.2, roughness: 0.8, emissive: 0x000000,
    emissiveIntensity: 0, glow: false, iridescence: 0.1,
    makeTexture: () => canvasTexture((ctx, s) => {
      ctx.fillStyle = '#6a7280'; ctx.fillRect(0, 0, s, s);
      // rough stone blocks
      ctx.strokeStyle = 'rgba(20,24,32,0.6)'; ctx.lineWidth = s * 0.03;
      ctx.strokeRect(0, 0, s, s); ctx.beginPath(); ctx.moveTo(0, s * 0.5); ctx.lineTo(s, s * 0.5);
      ctx.moveTo(s * 0.5, 0); ctx.lineTo(s * 0.5, s * 0.5); ctx.moveTo(s * 0.25, s * 0.5); ctx.lineTo(s * 0.25, s); ctx.stroke();
      // mottling
      ctx.fillStyle = 'rgba(40,46,58,0.4)';
      for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * s, Math.random() * s, s * 0.04, s * 0.04);
    }, 2.2),
    lighting: {
      ambient: 0.12,
      hemi: { sky: 0x2a3a66, ground: 0x0a0c12, intensity: 0.4 },
      moonbeam: { color: 0x9fb8ff, intensity: 1.1, dir: [0.3, 1, 0.2] },
      emitter: { color: 0xbfd0ff, intensity: 2.2, distance: 12, decay: 1.6, count: 4, spacing: 11, flicker: 'candle', amp: 0.35, spriteSize: 0.4 },
      bloom: { strength: 0.5, radius: 0.7, threshold: 0.7 }, exposure: 1.1,
    },
  },
];

export const DEFAULT_THEME = THEMES[0];

/** Texture for the floor-marker decal: forward arrows + "UP" text. */
export function floorMarkerTexture(): THREE.CanvasTexture {
  const w = 128, h = 256;
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.42); ctx.lineTo(w * 0.5, h * 0.18); ctx.lineTo(w * 0.8, h * 0.42); ctx.stroke();
  ctx.fillStyle = '#ffe14d'; ctx.font = `bold ${Math.round(h * 0.16)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('UP', w * 0.5, h * 0.7);
  const t = new THREE.CanvasTexture(cvs);
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
