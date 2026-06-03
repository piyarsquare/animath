/**
 * EXPERIMENTAL WebGPU accelerator. One GPU thread integrates one world — the
 * embarrassingly-parallel structure N-body was made for. It mirrors the CPU
 * runner's leapfrog + softened gravity and a simplified classifier (climate
 * habitability, star ejection, planet fate; no "calm" axis). The CPU/worker
 * engines remain the authoritative ground truth; this is a speed lane that
 * must be verified in-browser against them, and any failure throws so callers
 * can fall back.
 *
 * Integration is chunked across several compute passes (state persists in
 * storage buffers) to avoid long single-dispatch GPU timeouts.
 */

import { getPreset, buildStars, launchPlanet, type Outcome, type RunResult } from '@/lib/nbody';
import type { EnsembleConfig, RunParams } from './rng';

export function gpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as any).gpu;
}

const DEG = Math.PI / 180;
const STEPS_PER_PASS = 1500;

const WGSL = /* wgsl */`
struct Cfg {
  u0: vec4<f32>,  // dt, tMax, sampleDt, lumExp
  u1: vec4<f32>,  // starSoft2, planetSoft2, insolSoft2, rKill
  u2: vec4<f32>,  // rEsc, habLoMul, habHiMul, count
  m:  vec4<f32>,  // m0, m1, m2, _
};
@group(0) @binding(0) var<uniform> cfg: Cfg;
@group(0) @binding(1) var<storage, read_write> bodies: array<vec4<f32>>; // 4 per run: planet, s0, s1, s2  (x,y,vx,vy)
@group(0) @binding(2) var<storage, read_write> acc: array<vec4<f32>>;    // 3 per run: (t,next,hab,long)(cur,min,Sref,tEject)(status,ej,_,_)

fn grav(a: vec2<f32>, b: vec2<f32>, mb: f32, soft2: f32) -> vec2<f32> {
  let d = b - a;
  let r2 = dot(d, d) + soft2;
  return d * (mb * (1.0 / (r2 * sqrt(r2))));
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let run = gid.x;
  if (f32(run) >= cfg.u2.w) { return; }
  let bi = run * 4u;
  let ai = run * 3u;

  var a0 = acc[ai];
  if (a0.x >= cfg.u0.y || acc[ai + 2u].x != 0.0) { return; } // finished/terminal

  let dt = cfg.u0.x; let tMax = cfg.u0.y; let sampleDt = cfg.u0.z; let lumExp = cfg.u0.w;
  let ss2 = cfg.u1.x; let ps2 = cfg.u1.y; let is2 = cfg.u1.z; let rKill = cfg.u1.w;
  let rEsc = cfg.u2.x; let habLo = cfg.u2.y; let habHi = cfg.u2.z;
  let m0 = cfg.m.x; let m1 = cfg.m.y; let m2 = cfg.m.z;

  var p = bodies[bi];       // planet
  var s0 = bodies[bi + 1u];
  var s1 = bodies[bi + 2u];
  var s2 = bodies[bi + 3u];
  var a1 = acc[ai + 1u];
  var a2 = acc[ai + 2u];
  var t = a0.x; var next = a0.y; var hab = a0.z; var lng = a0.w;
  var cur = a1.x; var mind = a1.y; let Sref = a1.z; var tEj = a1.w;
  var status = a2.x; var ej = a2.y;

  for (var k = 0u; k < ${STEPS_PER_PASS}u; k = k + 1u) {
    if (t >= tMax) { status = 3.0; break; }
    if (status != 0.0) { break; }

    // leapfrog (KDK): stars mutually gravitate; planet is a test mass.
    var as0 = grav(s0.xy, s1.xy, m1, ss2) + grav(s0.xy, s2.xy, m2, ss2);
    var as1 = grav(s1.xy, s0.xy, m0, ss2) + grav(s1.xy, s2.xy, m2, ss2);
    var as2 = grav(s2.xy, s0.xy, m0, ss2) + grav(s2.xy, s1.xy, m1, ss2);
    var ap = grav(p.xy, s0.xy, m0, ps2) + grav(p.xy, s1.xy, m1, ps2) + grav(p.xy, s2.xy, m2, ps2);
    let h = 0.5 * dt;
    s0 = vec4<f32>(s0.xy + (s0.zw + h * as0) * dt, s0.zw + h * as0);
    s1 = vec4<f32>(s1.xy + (s1.zw + h * as1) * dt, s1.zw + h * as1);
    s2 = vec4<f32>(s2.xy + (s2.zw + h * as2) * dt, s2.zw + h * as2);
    p  = vec4<f32>(p.xy  + (p.zw  + h * ap)  * dt, p.zw  + h * ap);
    as0 = grav(s0.xy, s1.xy, m1, ss2) + grav(s0.xy, s2.xy, m2, ss2);
    as1 = grav(s1.xy, s0.xy, m0, ss2) + grav(s1.xy, s2.xy, m2, ss2);
    as2 = grav(s2.xy, s0.xy, m0, ss2) + grav(s2.xy, s1.xy, m1, ss2);
    ap  = grav(p.xy, s0.xy, m0, ps2) + grav(p.xy, s1.xy, m1, ps2) + grav(p.xy, s2.xy, m2, ps2);
    s0 = vec4<f32>(s0.xy, s0.zw + h * as0);
    s1 = vec4<f32>(s1.xy, s1.zw + h * as1);
    s2 = vec4<f32>(s2.xy, s2.zw + h * as2);
    p  = vec4<f32>(p.xy,  p.zw  + h * ap);
    t = t + dt;

    if (t >= next) {
      next = t + sampleDt;
      let d0 = distance(p.xy, s0.xy); let d1 = distance(p.xy, s1.xy); let d2 = distance(p.xy, s2.xy);
      let dmin = min(d0, min(d1, d2));
      mind = min(mind, dmin);
      let L0 = pow(m0, lumExp); let L1 = pow(m1, lumExp); let L2 = pow(m2, lumExp);
      let S = L0 / (d0 * d0 + is2) + L1 / (d1 * d1 + is2) + L2 / (d2 * d2 + is2);
      let habitable = (S >= Sref * habLo) && (S <= Sref * habHi);
      if (habitable) { hab = hab + sampleDt; cur = cur + sampleDt; lng = max(lng, cur); } else { cur = 0.0; }
      // planet energy (stars treated static this instant)
      let Ep = 0.5 * dot(p.zw, p.zw) - (m0 / sqrt(d0 * d0 + is2) + m1 / sqrt(d1 * d1 + is2) + m2 / sqrt(d2 * d2 + is2));
      // star ejection (distance from system centre ~ origin)
      if (ej < 0.0) {
        if (length(s0.xy) > rEsc) { ej = 0.0; tEj = t; }
        else if (length(s1.xy) > rEsc) { ej = 1.0; tEj = t; }
        else if (length(s2.xy) > rEsc) { ej = 2.0; tEj = t; }
      }
      if (dmin < rKill) { status = 1.0; }
      else if (Ep > 0.0 && length(p.xy) > rEsc) { status = 2.0; }
    }
  }

  bodies[bi] = p; bodies[bi + 1u] = s0; bodies[bi + 2u] = s1; bodies[bi + 3u] = s2;
  acc[ai] = vec4<f32>(t, next, hab, lng);
  acc[ai + 1u] = vec4<f32>(cur, mind, Sref, tEj);
  acc[ai + 2u] = vec4<f32>(status, ej, 0.0, 0.0);
}
`;

// WebGPU globals aren't in the default TS lib; access them dynamically.
const BU = (globalThis as any).GPUBufferUsage;
const MM = (globalThis as any).GPUMapMode;

export class GpuRunner {
  private device: any;
  private pipeline: any;

  private constructor(device: any, pipeline: any) {
    this.device = device;
    this.pipeline = pipeline;
  }

  static async create(): Promise<GpuRunner> {
    const gpu = (navigator as any).gpu;
    if (!gpu) throw new Error('no WebGPU');
    const adapter = await gpu.requestAdapter();
    if (!adapter) throw new Error('no WebGPU adapter');
    const device = await adapter.requestDevice();
    const module = device.createShaderModule({ code: WGSL });
    const pipeline = device.createComputePipeline({ layout: 'auto', compute: { module, entryPoint: 'main' } });
    return new GpuRunner(device, pipeline);
  }

  /** Run one batch of worlds and return their RunResults. */
  async runBatch(cfg: EnsembleConfig, params: RunParams[]): Promise<RunResult[]> {
    const dev = this.device;
    const count = params.length;
    const preset = getPreset(cfg.presetId);
    const stars = buildStars(preset, cfg.massMul);
    const cls = cfg.classify;

    // --- Build initial state ---
    const bodies = new Float32Array(count * 4 * 4);
    const acc = new Float32Array(count * 3 * 4);
    for (let r = 0; r < count; r++) {
      const pr = params[r];
      const planet = launchPlanet(stars, cfg.target, pr.radius, pr.speed, pr.angleDeg * DEG, pr.retro);
      const b = r * 16;
      bodies[b] = planet.x; bodies[b + 1] = planet.y; bodies[b + 2] = planet.vx; bodies[b + 3] = planet.vy;
      for (let s = 0; s < 3; s++) {
        const o = b + 4 + s * 4;
        bodies[o] = stars[s].x; bodies[o + 1] = stars[s].y; bodies[o + 2] = stars[s].vx; bodies[o + 3] = stars[s].vy;
      }
      // Sref = insolation at launch
      let Sref = 0;
      for (const st of stars) {
        const dx = st.x - planet.x, dy = st.y - planet.y;
        Sref += Math.pow(st.mass, cls.lumExp) / (dx * dx + dy * dy + cls.insolSoft2);
      }
      const a = r * 12;
      acc[a] = 0;        // t
      acc[a + 1] = 0;    // next sample time (first step samples immediately)
      acc[a + 5] = 1e9;  // minDist
      acc[a + 6] = Sref; // launch insolation reference
      acc[a + 7] = -1;   // tEject
      acc[a + 8] = 0;    // status (0 = running)
      acc[a + 9] = -1;   // ejected star
    }

    // --- Uniform config ---
    const dt = preset.dt;
    const uni = new Float32Array([
      dt, cfg.tMax, 0.1, cls.lumExp,
      cfg.starSoft * cfg.starSoft, 0.05 * 0.05, cls.insolSoft2, cls.rKill,
      cls.rEsc, cls.habLo, cls.habHi, count,
      stars[0].mass, stars[1].mass, stars[2].mass, 0,
    ]);

    const uniBuf = dev.createBuffer({ size: uni.byteLength, usage: BU.UNIFORM | BU.COPY_DST });
    const bodiesBuf = dev.createBuffer({ size: bodies.byteLength, usage: BU.STORAGE | BU.COPY_DST });
    const accBuf = dev.createBuffer({ size: acc.byteLength, usage: BU.STORAGE | BU.COPY_DST | BU.COPY_SRC });
    const readBuf = dev.createBuffer({ size: acc.byteLength, usage: BU.MAP_READ | BU.COPY_DST });
    dev.queue.writeBuffer(uniBuf, 0, uni);
    dev.queue.writeBuffer(bodiesBuf, 0, bodies);
    dev.queue.writeBuffer(accBuf, 0, acc);

    const bind = dev.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniBuf } },
        { binding: 1, resource: { buffer: bodiesBuf } },
        { binding: 2, resource: { buffer: accBuf } },
      ],
    });

    const passes = Math.ceil((cfg.tMax / dt) / STEPS_PER_PASS);
    const groups = Math.ceil(count / 64);
    const enc = dev.createCommandEncoder();
    for (let pass = 0; pass < passes; pass++) {
      const cp = enc.beginComputePass();
      cp.setPipeline(this.pipeline);
      cp.setBindGroup(0, bind);
      cp.dispatchWorkgroups(groups);
      cp.end();
    }
    enc.copyBufferToBuffer(accBuf, 0, readBuf, 0, acc.byteLength);
    dev.queue.submit([enc.finish()]);

    await readBuf.mapAsync(MM.READ);
    const out = new Float32Array(readBuf.getMappedRange().slice(0));
    readBuf.unmap();
    uniBuf.destroy(); bodiesBuf.destroy(); accBuf.destroy(); readBuf.destroy();

    // --- Assemble results ---
    const results: RunResult[] = [];
    for (let r = 0; r < count; r++) {
      const a = r * 12;
      const t = out[a], hab = out[a + 2], lng = out[a + 3];
      const mind = out[a + 5], tEj = out[a + 7];
      const status = out[a + 8], ej = out[a + 9];
      const fate = status === 1 ? 'destroyed' : status === 2 ? 'ejected' : 'bound';
      const outcome: Outcome = status === 1 ? 'planet-destroyed'
        : status === 2 ? 'planet-ejected'
        : ej >= 0 ? 'happy' : 'survived';
      const pr = params[r];
      results.push({
        tSim: t, outcome,
        habitableFraction: t > 0 ? hab / t : 0,
        bothFraction: 0,
        longestHabitable: lng,
        minStarDist: mind,
        ejectedStar: ej >= 0 ? ej : -1,
        tEject: tEj,
        planetFate: fate,
        radius: pr.radius, speed: pr.speed, angleDeg: pr.angleDeg, retro: pr.retro, seed: pr.seed,
      });
    }
    return results;
  }

  dispose() { /* device released with page */ }
}
