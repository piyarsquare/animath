/**
 * Scene "looks" — selectable atmospheres for the walk, distilled from the
 * retired Topology Walk's corridor themes (themes.ts). The corridor-specific
 * parts (wall textures, torch emitters, bloom) don't translate to these open
 * sky-and-floor worlds, so a look here is just the *atmosphere* layer: the sky
 * (background + fog tint), tone-mapping exposure, and the shared lighting rig's
 * colors + intensities. The per-cover lighting profile still scales these, so a
 * look reads consistently across the flat / spherical / hyperbolic worlds.
 *
 * Daytime is the engine's original look (so the default is unchanged); the rest
 * are the few Topology Walk themes that read well outdoors — a warm dusk and a
 * cool night — plus a flat overcast.
 */
export interface PolygonLook {
  id: string;
  label: string;
  /** Background + fog color. Omit to keep each presenter's own sky (Daytime). */
  sky?: number;
  /** Renderer tone-mapping exposure. */
  exposure: number;
  /** Ambient intensity (scaled by the per-cover fill profile). */
  ambient: number;
  /** Hemisphere fill: sky/ground colors + intensity (scaled by fill). */
  hemiSky: number;
  hemiGround: number;
  hemi: number;
  /** Warm key (the "above" light) color + intensity (scaled by key). */
  warmColor: number;
  warm: number;
  /** Cool key (the "below" light) color + intensity (scaled by key). */
  coolColor: number;
  cool: number;
  /** Camera headlamp color + a multiplier on the per-cover lamp intensity. */
  lampColor: number;
  lampMul: number;
}

export const LOOKS: PolygonLook[] = [
  {
    id: 'daytime', label: 'Daytime',
    exposure: 1.06, ambient: 0.42,
    hemiSky: 0xffe6c2, hemiGround: 0x5b73a6, hemi: 0.4,
    warmColor: 0xffd2a1, warm: 0.95, coolColor: 0x9bc2ff, cool: 0.62,
    lampColor: 0xfff0d8, lampMul: 1,
  },
  {
    id: 'overcast', label: 'Overcast',
    sky: 0x9fabbd, exposure: 1.0, ambient: 0.62,
    hemiSky: 0xdfe7f1, hemiGround: 0x6b7480, hemi: 0.72,
    warmColor: 0xeef0f2, warm: 0.5, coolColor: 0xcdd7e3, cool: 0.5,
    lampColor: 0xeef2f8, lampMul: 0.7,
  },
  {
    id: 'dusk', label: 'Ember dusk',
    sky: 0x2c0f0a, exposure: 1.04, ambient: 0.24,
    hemiSky: 0xff8a4a, hemiGround: 0x1a0807, hemi: 0.5,
    warmColor: 0xff7a36, warm: 1.15, coolColor: 0x70405e, cool: 0.42,
    lampColor: 0xffb070, lampMul: 1.25,
  },
  {
    id: 'moonlit', label: 'Moonlit',
    sky: 0x0a1024, exposure: 1.12, ambient: 0.17,
    hemiSky: 0x2a3a66, hemiGround: 0x0a0c12, hemi: 0.55,
    warmColor: 0xcfd6ff, warm: 0.55, coolColor: 0x6a86c8, cool: 0.62,
    lampColor: 0xc6d2ff, lampMul: 1.15,
  },
];

export const DEFAULT_LOOK = LOOKS[0];

export function findLook(id: string): PolygonLook {
  return LOOKS.find((l) => l.id === id) ?? DEFAULT_LOOK;
}
