import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import { ShellActions, ShellSettings, useAppExplainer, useAppHeader } from '../../components/AppShell';
import { Section, Slider, Pills } from '../../components/ControlPanel';
import { step, cloudSpread, type SimState, type Planet, type Star } from './physics';
import { PRESETS, getPreset, buildStars, orbitFrame, launchPlanet, type TargetId } from './presets';
import { Analyzer } from './analysis/analyzer';
import { DEFAULT_CLASSIFY, type ClassifyParams, type Snapshot } from './analysis/types';
import Observatory from './Observatory';
import explainerText from './EXPLAINER.md?raw';

const STAR_COLORS = [0xffd27f, 0xff7043, 0x9ec7ff];
const REF_COLOR = 0x66f0ff;
const GHOST_COLOR = 0xff5fa2;
const GHOST_COLOR_HEX = '#ff5fa2';
const TRAIL_MAX = 2000; // points stored per body; visible length is a live slider.
const VEL_SCALE = 1;    // sim-units of drag → units of launch speed.
const SAMPLE_DT = 0.05; // sim-time between classifier samples of the reference planet.

/** Sim plane lives at world y = 0 so the camera can look down on it like a floor. */
function simX(x: number) { return x; }
function simZ(y: number) { return -y; }

/** Soft radial sprite used to give the stars a glow halo. */
function makeGlowTexture(): THREE.Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/** A sliding-window trail: a fixed buffer with a live-adjustable visible tail. */
class Trail {
  geom = new THREE.BufferGeometry();
  line: THREE.Line;
  private attr: THREE.BufferAttribute;
  private buf = new Float32Array(TRAIL_MAX * 3);
  private count = 0;

  constructor(color: number, opacity: number) {
    this.attr = new THREE.BufferAttribute(this.buf, 3);
    this.geom.setAttribute('position', this.attr);
    this.geom.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    this.line = new THREE.Line(this.geom, mat);
    this.line.frustumCulled = false;
  }

  push(x: number, y: number, z: number) {
    if (this.count === TRAIL_MAX) {
      this.buf.copyWithin(0, 3);
      this.count--;
    }
    const i = this.count * 3;
    this.buf[i] = x; this.buf[i + 1] = y; this.buf[i + 2] = z;
    this.count++;
  }

  /** Show only the most recent `visible` points. */
  setVisible(visible: number) {
    const start = Math.max(0, this.count - visible);
    this.geom.setDrawRange(start, this.count - start);
    this.attr.needsUpdate = true;
  }

  reset() {
    this.count = 0;
    this.geom.setDrawRange(0, 0);
  }

  dispose() {
    this.geom.dispose();
    (this.line.material as THREE.Material).dispose();
  }
}

export default function TrinaryStars() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [target, setTargetState] = useState<TargetId>(PRESETS[0].target);
  const [ghostCount, setGhostCount] = useState(12);
  const [epsExp, setEpsExp] = useState(-3);      // perturbation ε = 10^epsExp
  const [planetRadius, setPlanetRadiusState] = useState(PRESETS[0].planetRadius);
  const [planetSpeed, setPlanetSpeedState] = useState(PRESETS[0].planetSpeed);
  const [massMul, setMassMul] = useState<number[]>([1, 1, 1]);   // per-star mass multipliers
  const [starSoft, setStarSoft] = useState(PRESETS[0].starSoft); // close-encounter softening
  const [speed, setSpeed] = useState(1);          // sim-seconds per real-second
  const [trailLen, setTrailLen] = useState(500);
  const [showTrails, setShowTrails] = useState(true);
  const [paused, setPaused] = useState(false);
  const [placeMode, setPlaceMode] = useState(false);
  // Climate-classification knobs (habitable band as multiples of launch insolation).
  const [lumExp, setLumExp] = useState(DEFAULT_CLASSIFY.lumExp);
  const [habLo, setHabLo] = useState(DEFAULT_CLASSIFY.habLo);
  const [habHi, setHabHi] = useState(DEFAULT_CLASSIFY.habHi);
  const [calmThresh, setCalmThresh] = useState(DEFAULT_CLASSIFY.calmThresh);
  const [labSnap, setLabSnap] = useState<Snapshot | null>(null);

  const preset = getPreset(presetId);
  useAppHeader('Trinary System', preset.name);
  useAppExplainer(explainerText);

  const classify: ClassifyParams = { ...DEFAULT_CLASSIFY, lumExp, habLo, habHi, calmThresh };

  // Base (untuned) star masses for this preset, for labelling the mass sliders.
  const baseMasses = useMemo(() => getPreset(presetId).make().map(s => s.mass), [presetId]);

  // Live params the animation loop / pointer handlers read without re-mounting.
  const refs = useRef({
    speed, trailLen, showTrails, paused,
    ghostCount, epsExp, planetRadius, planetSpeed, presetId, target, placeMode, massMul, starSoft, classify,
  });
  refs.current = { speed, trailLen, showTrails, paused, ghostCount, epsExp, planetRadius, planetSpeed, presetId, target, placeMode, massMul, starSoft, classify };

  // A hand-placed launch (position + velocity). When set it overrides the
  // parametric target/radius/speed seeding until a launch control changes.
  const customRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  // Imperative handles populated by onMount and called by control effects/buttons.
  const api = useRef<{ reset: () => void; scatter: () => void } | null>(null);

  const spreadElRef = useRef<HTMLSpanElement>(null);
  const timeElRef = useRef<HTMLSpanElement>(null);

  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  }) => {
    scene.background = new THREE.Color(0x05060a);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const grid = new THREE.GridHelper(24, 24, 0x223047, 0x141c2b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    scene.add(grid);

    const glowTex = makeGlowTexture();

    // --- Stars (created once; positions updated each frame) ---
    const starMeshes: THREE.Mesh[] = [];
    const starGlows: THREE.Sprite[] = [];
    const starTrails: Trail[] = [];
    for (let i = 0; i < 3; i++) {
      const color = STAR_COLORS[i];
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 24, 24),
        new THREE.MeshBasicMaterial({ color }),
      );
      scene.add(mesh);
      starMeshes.push(mesh);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      scene.add(glow);
      starGlows.push(glow);

      const trail = new Trail(color, 0.35);
      scene.add(trail.line);
      starTrails.push(trail);
    }

    // --- Planets (rebuilt when the ghost count changes) ---
    const planetGroup = new THREE.Group();
    scene.add(planetGroup);
    let planetMeshes: THREE.Mesh[] = [];
    let planetTrails: Trail[] = [];

    const sim: SimState = {
      stars: [], planets: [], t: 0, dtBase: 0.002, G: 1, starSoft: 0.02, planetSoft: 0.05,
    };

    // Streaming classifier for the reference planet (planets[0]).
    let analyzer: Analyzer | null = null;
    let nextSampleT = SAMPLE_DT;

    function disposePlanets() {
      for (const m of planetMeshes) {
        planetGroup.remove(m);
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      for (const t of planetTrails) { scene.remove(t.line); t.dispose(); }
      planetMeshes = [];
      planetTrails = [];
    }

    /** Seed the planet states: a reference planet at the chosen launch point,
     *  with ghosts spread in a tiny ring of radius ε around it. */
    function seedPlanets(): Planet[] {
      const n = Math.max(1, Math.round(refs.current.ghostCount));
      const eps = Math.pow(10, refs.current.epsExp);

      let bx: number, by: number, bvx: number, bvy: number;
      const custom = customRef.current;
      if (custom) {
        bx = custom.x; by = custom.y; bvx = custom.vx; bvy = custom.vy;
      } else {
        // Launch at radius r along +x from the target, tangentially (CCW).
        const b = launchPlanet(sim.stars, refs.current.target, refs.current.planetRadius, refs.current.planetSpeed);
        bx = b.x; by = b.y; bvx = b.vx; bvy = b.vy;
      }

      const planets: Planet[] = [];
      for (let i = 0; i < n; i++) {
        let px = bx, py = by;
        if (i > 0) {
          const ang = (2 * Math.PI * (i - 1)) / Math.max(1, n - 1);
          px += eps * Math.cos(ang);
          py += eps * Math.sin(ang);
        }
        planets.push({ x: px, y: py, vx: bvx, vy: bvy, ax: 0, ay: 0 });
      }
      return planets;
    }

    function buildPlanetMeshes(n: number) {
      disposePlanets();
      for (let i = 0; i < n; i++) {
        const isRef = i === 0;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(isRef ? 0.085 : 0.06, 16, 16),
          new THREE.MeshBasicMaterial({
            color: isRef ? REF_COLOR : GHOST_COLOR,
            transparent: !isRef,
            opacity: isRef ? 1 : 0.6,
          }),
        );
        planetGroup.add(mesh);
        planetMeshes.push(mesh);

        const trail = new Trail(isRef ? REF_COLOR : GHOST_COLOR, isRef ? 0.7 : 0.22);
        scene.add(trail.line);
        planetTrails.push(trail);
      }
    }

    /** Full deterministic reset: re-seed stars + planets from the active preset. */
    function reset() {
      const p = getPreset(refs.current.presetId);
      sim.stars = buildStars(p, refs.current.massMul);
      sim.starSoft = refs.current.starSoft;
      sim.dtBase = p.dt;
      sim.planets = seedPlanets();
      sim.t = 0;
      const n = sim.planets.length;
      if (planetMeshes.length !== n) buildPlanetMeshes(n);
      for (const t of starTrails) t.reset();
      for (const t of planetTrails) t.reset();
      // Scale star sizes/glow by mass.
      for (let i = 0; i < 3; i++) {
        const m = sim.stars[i].mass;
        const rad = 0.11 * Math.cbrt(m);
        starMeshes[i].scale.setScalar(rad);
        starGlows[i].scale.setScalar(rad * 9);
      }
      // Restart classification from the fresh launch state.
      analyzer = new Analyzer(refs.current.classify, sim.stars, sim.planets[0]);
      nextSampleT = SAMPLE_DT;
      setLabSnap(analyzer.snapshot());
    }

    /** Re-scatter the ghosts around the reference planet's *current* state,
     *  without disturbing the stars — make a fresh cloud mid-flight. */
    function scatter() {
      const ref = sim.planets[0];
      if (!ref) return;
      const eps = Math.pow(10, refs.current.epsExp);
      const n = sim.planets.length;
      for (let i = 1; i < n; i++) {
        const ang = (2 * Math.PI * (i - 1)) / Math.max(1, n - 1);
        sim.planets[i].x = ref.x + eps * Math.cos(ang);
        sim.planets[i].y = ref.y + eps * Math.sin(ang);
        sim.planets[i].vx = ref.vx;
        sim.planets[i].vy = ref.vy;
      }
      for (const t of planetTrails) t.reset();
    }

    api.current = { reset, scatter };
    reset();

    // --- Orbit camera (drag to rotate, wheel to zoom) ---
    const cam = { az: 0.0, polar: 0.62, dist: 11 };
    camera.up.set(0, 1, 0);
    camera.near = 0.05;
    camera.far = 400;
    camera.updateProjectionMatrix();

    function placeCamera() {
      const sp = Math.sin(cam.polar), cp = Math.cos(cam.polar);
      camera.position.set(
        cam.dist * sp * Math.sin(cam.az),
        cam.dist * cp,
        cam.dist * sp * Math.cos(cam.az),
      );
      camera.lookAt(0, 0, 0);
    }
    placeCamera();

    // --- Click-to-place plumbing ---
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xffffff, 0.22, 0.13);
    arrow.visible = false;
    scene.add(arrow);

    const el = renderer.domElement;
    function pointerToSim(e: PointerEvent): { x: number; y: number } | null {
      const rect = el.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      if (!raycaster.ray.intersectPlane(groundPlane, hit)) return null;
      return { x: hit.x, y: -hit.z };
    }

    let dragging = false;       // camera orbit
    let placing = false;        // planet placement
    let lastX = 0, lastY = 0;
    let placeStart = { x: 0, y: 0 };
    let draftVel = { vx: 0, vy: 0 };

    const onDown = (e: PointerEvent) => {
      if (refs.current.placeMode) {
        const p = pointerToSim(e);
        if (!p) return;
        placing = true;
        placeStart = p;
        draftVel = { vx: 0, vy: 0 };
        arrow.position.set(p.x, 0, -p.y);
        arrow.setLength(0.0001, 0.0001, 0.0001);
        arrow.visible = true;
        el.setPointerCapture(e.pointerId);
        return;
      }
      dragging = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (placing) {
        const p = pointerToSim(e);
        if (!p) return;
        const dx = p.x - placeStart.x, dy = p.y - placeStart.y;
        draftVel = { vx: dx * VEL_SCALE, vy: dy * VEL_SCALE };
        const dir = new THREE.Vector3(dx, 0, -dy);
        const len = dir.length();
        if (len > 1e-5) {
          arrow.setDirection(dir.normalize());
          arrow.setLength(len, Math.min(0.3, len * 0.28), Math.min(0.18, len * 0.16));
        }
        return;
      }
      if (!dragging) return;
      cam.az -= (e.clientX - lastX) * 0.006;
      cam.polar = Math.min(1.52, Math.max(0.05, cam.polar - (e.clientY - lastY) * 0.006));
      lastX = e.clientX; lastY = e.clientY;
      placeCamera();
    };
    const onUp = (e: PointerEvent) => {
      if (placing) {
        placing = false;
        arrow.visible = false;
        customRef.current = { x: placeStart.x, y: placeStart.y, vx: draftVel.vx, vy: draftVel.vy };
        reset();
        try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        return;
      }
      dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.dist = Math.min(60, Math.max(2, cam.dist * (1 + Math.sign(e.deltaY) * 0.08)));
      placeCamera();
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    // --- Animation loop ---
    const clock = new THREE.Clock();
    let raf = 0;
    let uiAccum = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const realDt = Math.min(clock.getDelta(), 0.05);
      const r = refs.current;

      if (!r.paused) {
        const dt = sim.dtBase ?? 0.002;
        const simSeconds = r.speed * realDt;
        let steps = Math.round(simSeconds / dt);
        steps = Math.min(400, Math.max(0, steps));
        for (let s = 0; s < steps; s++) step(sim, dt);

        if (r.showTrails && steps > 0) {
          for (let i = 0; i < 3; i++) starTrails[i].push(simX(sim.stars[i].x), 0, simZ(sim.stars[i].y));
          for (let i = 0; i < sim.planets.length; i++) {
            planetTrails[i]?.push(simX(sim.planets[i].x), 0, simZ(sim.planets[i].y));
          }
        }

        // Sample the classifier at a fixed sim-time cadence.
        if (analyzer && steps > 0 && sim.t >= nextSampleT) {
          analyzer.push(sim.t, sim.stars, sim.planets[0]);
          nextSampleT = sim.t + SAMPLE_DT;
        }
      }

      // Sync meshes to state.
      for (let i = 0; i < 3; i++) {
        const wx = simX(sim.stars[i].x), wz = simZ(sim.stars[i].y);
        starMeshes[i].position.set(wx, 0, wz);
        starGlows[i].position.set(wx, 0, wz);
      }
      for (let i = 0; i < sim.planets.length; i++) {
        planetMeshes[i]?.position.set(simX(sim.planets[i].x), 0, simZ(sim.planets[i].y));
      }

      // Trails: visibility + show/hide.
      const vis = Math.round(r.trailLen);
      for (const t of starTrails) { t.line.visible = r.showTrails; if (r.showTrails) t.setVisible(vis); }
      for (const t of planetTrails) { t.line.visible = r.showTrails; if (r.showTrails) t.setVisible(vis); }

      // Throttled UI readouts.
      uiAccum += realDt;
      if (uiAccum > 0.1) {
        uiAccum = 0;
        if (spreadElRef.current) spreadElRef.current.textContent = cloudSpread(sim.planets).toExponential(2);
        if (timeElRef.current) timeElRef.current.textContent = sim.t.toFixed(1);
        if (analyzer) setLabSnap(analyzer.snapshot());
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      glowTex.dispose();
      api.current = null;
    };
  }, []);

  // Re-seed whenever an initial-condition control changes. (Launch-defining
  // changes also clear any hand-placed launch via their wrapped setters.)
  useEffect(() => {
    api.current?.reset();
  }, [presetId, target, ghostCount, epsExp, planetRadius, planetSpeed, massMul, starSoft, lumExp, habLo, habHi, calmThresh]);

  // Wrapped setters: any change that redefines the launch drops a hand-placed one.
  const setPlanetRadius = (v: number) => { customRef.current = null; setPlanetRadiusState(v); };
  const setPlanetSpeed = (v: number) => { customRef.current = null; setPlanetSpeedState(v); };
  const setTarget = (t: TargetId) => { customRef.current = null; setTargetState(t); };
  const setStarMass = (i: number, v: number) =>
    setMassMul(prev => { const next = [...prev]; next[i] = v; return next; });

  const onPickPreset = (id: string) => {
    const p = getPreset(id);
    customRef.current = null;
    setPresetId(id);
    setTargetState(p.target);
    setPlanetRadiusState(p.planetRadius);
    setPlanetSpeedState(p.planetSpeed);
    setMassMul([1, 1, 1]);
    setStarSoft(p.starSoft);
  };

  // Set the launch speed to the local circular speed √(M/r) for the target.
  const onAutoCircular = () => {
    const stars = buildStars(getPreset(presetId), massMul);
    const f = orbitFrame(stars, target);
    const v = Math.sqrt(f.mass / Math.max(0.05, planetRadius));
    setPlanetSpeed(Math.round(v / 0.05) * 0.05);
  };

  const onTogglePlace = () => {
    const next = !placeMode;
    setPlaceMode(next);
    if (next) { setPaused(true); api.current?.reset(); }
  };

  const targetOptions: { value: TargetId; label: string }[] = [
    { value: 'bary', label: 'Barycenter' },
    { value: 's0', label: 'Star 1' },
    { value: 's1', label: 'Star 2' },
    { value: 's2', label: 'Star 3' },
    ...(preset.hasBinary ? [{ value: 'binary' as TargetId, label: 'Inner binary' }] : []),
  ];

  const btnStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: 6, border: '1px solid var(--cp-border, #2a3550)',
    background: 'rgba(255,255,255,0.06)', color: 'var(--cp-fg, #e8edf6)', cursor: 'pointer', fontSize: 14, flex: 1,
  };
  const placeBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: placeMode ? 'rgba(255, 212, 0, 0.18)' : 'rgba(255,255,255,0.06)',
    borderColor: placeMode ? 'rgba(255,212,0,0.5)' : 'var(--cp-border, #2a3550)',
  };

  return (
    <>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas3D onMount={onMount} />
      </div>

      {/* Live divergence readout. */}
      <div style={{
        position: 'absolute', top: 64, left: 12, padding: '8px 12px',
        background: 'rgba(8,12,20,0.62)', border: '1px solid rgba(120,150,200,0.25)',
        borderRadius: 8, color: '#cfe0f5', font: '12px/1.5 ui-monospace, monospace',
        pointerEvents: 'none', backdropFilter: 'blur(4px)',
      }}>
        <div>cloud spread&nbsp; <span ref={spreadElRef} style={{ color: GHOST_COLOR_HEX }}>0.00e+0</span></div>
        <div>sim time&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span ref={timeElRef} style={{ color: '#9ec7ff' }}>0.0</span></div>
        {placeMode && <div style={{ color: '#ffd27f' }}>click + drag to launch</div>}
      </div>

      <Observatory snapshot={labSnap} />

      <ShellActions>
        <div className="cp-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnStyle} onClick={() => setPaused(p => !p)}>{paused ? '▶ Play' : '❚❚ Pause'}</button>
            <button style={btnStyle} onClick={() => api.current?.reset()}>↺ Reset</button>
          </div>
          <button style={placeBtnStyle} onClick={onTogglePlace}>
            {placeMode ? '✛ Placing — click + drag on the scene' : '✛ Place planet by hand'}
          </button>
          <button style={btnStyle} onClick={() => api.current?.scatter()}>✦ Scatter ghosts here</button>
          <button style={btnStyle} onClick={() => { window.location.hash = '#/trinary-lab'; }}>📊 Open statistics lab</button>
          <Slider label="Speed" value={speed} min={0.1} max={4} step={0.1}
            onChange={setSpeed} format={v => `${v.toFixed(1)}×`} />
        </div>
      </ShellActions>

      <ShellSettings>
        <Section title="System" icon="✸" defaultOpen>
          <Pills
            options={PRESETS.map(p => ({ value: p.id, label: p.name }))}
            value={presetId}
            onChange={onPickPreset}
          />
          <div style={{ font: '12px/1.5 system-ui', color: 'var(--cp-fg-dim, #93a2bd)', padding: '4px 2px' }}>
            {preset.blurb}
          </div>
        </Section>

        <Section title="Chaos demo" icon="∿" defaultOpen>
          <Slider label="Ghost planets" value={ghostCount} min={1} max={120} step={1}
            onChange={setGhostCount} format={v => `${v}`} />
          <Slider label="Perturbation ε" value={epsExp} min={-5} max={-1} step={0.5}
            onChange={setEpsExp} format={v => `10^${v.toFixed(1)}`} />
        </Section>

        <Section title="Stars" icon="☉">
          <Slider label="Star 1 mass · gold" value={massMul[0]} min={0.1} max={4} step={0.05}
            onChange={v => setStarMass(0, v)} format={v => (baseMasses[0] * v).toFixed(2)} />
          <Slider label="Star 2 mass · orange" value={massMul[1]} min={0.1} max={4} step={0.05}
            onChange={v => setStarMass(1, v)} format={v => (baseMasses[1] * v).toFixed(2)} />
          <Slider label="Star 3 mass · blue" value={massMul[2]} min={0.1} max={4} step={0.05}
            onChange={v => setStarMass(2, v)} format={v => (baseMasses[2] * v).toFixed(2)} />
          <Slider label="Softening" value={starSoft} min={0.005} max={0.3} step={0.005}
            onChange={setStarSoft} format={v => v.toFixed(3)} />
          <button style={{ ...btnStyle, width: '100%', flex: 'none' }}
            onClick={() => { setMassMul([1, 1, 1]); setStarSoft(preset.starSoft); }}>
            ⟲ Reset star masses
          </button>
          <div style={{ font: '11px/1.5 system-ui', color: 'var(--cp-fg-dim, #93a2bd)', padding: '2px' }}>
            Equal masses keep a preset’s character (just faster); uneven ones detune it — e.g. nudge a mass to watch the figure-eight fall into chaos. Softening sets how gently close passes are smoothed.
          </div>
        </Section>

        <Section title="Planet launch" icon="◐" defaultOpen>
          <Pills
            label="Orbit around"
            options={targetOptions}
            value={target}
            onChange={setTarget}
          />
          <Slider label="Start radius" value={planetRadius} min={0.1} max={8} step={0.05}
            onChange={setPlanetRadius} format={v => v.toFixed(2)} />
          <Slider label="Start speed" value={planetSpeed} min={0} max={3} step={0.05}
            onChange={setPlanetSpeed} format={v => v.toFixed(2)} />
          <button style={{ ...btnStyle, width: '100%', flex: 'none' }} onClick={onAutoCircular}>
            ◯ Circular orbit speed
          </button>
          <div style={{ font: '11px/1.5 system-ui', color: 'var(--cp-fg-dim, #93a2bd)', padding: '2px' }}>
            Radius &amp; speed are measured from the body you orbit. Pick a star for a tight inner (S-type) orbit; the barycenter or inner binary for a wide one.
          </div>
        </Section>

        <Section title="Climate model" icon="🌡">
          <Slider label="Habitable floor (×ref)" value={habLo} min={0.1} max={1} step={0.05}
            onChange={setHabLo} format={v => v.toFixed(2)} />
          <Slider label="Habitable ceiling (×ref)" value={habHi} min={1} max={6} step={0.25}
            onChange={setHabHi} format={v => v.toFixed(2)} />
          <Slider label="Luminosity exponent β" value={lumExp} min={0.5} max={4} step={0.5}
            onChange={setLumExp} format={v => v.toFixed(1)} />
          <Slider label="Calm threshold" value={calmThresh} min={0.01} max={0.2} step={0.01}
            onChange={setCalmThresh} format={v => v.toFixed(2)} />
          <div style={{ font: '11px/1.5 system-ui', color: 'var(--cp-fg-dim, #93a2bd)', padding: '2px' }}>
            The habitable band is set relative to the planet’s starlight at launch (L = mᵝ). The timeline below classifies every moment as Paradise / Warm·precarious / Calm·barren / Chaotic.
          </div>
        </Section>

        <Section title="View" icon="◑">
          <Slider label="Trail length" value={trailLen} min={0} max={TRAIL_MAX} step={50}
            onChange={setTrailLen} format={v => (v === 0 ? 'off' : `${v}`)} />
          <Pills
            label="Trails"
            options={[{ value: 1, label: 'On' }, { value: 0, label: 'Off' }]}
            value={showTrails ? 1 : 0}
            onChange={v => setShowTrails(v === 1)}
          />
        </Section>
      </ShellSettings>
    </>
  );
}
