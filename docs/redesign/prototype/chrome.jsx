/* chrome.jsx — control content + the per-app information architecture.
   The chrome is now ADAPTIVE: every app declares exactly the panels it needs
   (and a context "quick-switch" for its headline choice). Apps that have no
   function never show a Function tab; apps with no playback never show one. */

const { useState: uS } = React;

/* ============ App catalog, grouped (fixes the flat menu IA) ============ */
const GROUPS = [
  { label: 'Complex analysis', apps: [
    { id: 'complex-particles', name: 'Complex Particles', glyph: '✦', kind: 'particles', blurb: 'z → f(z) as a 4D particle cloud', cat: 'Complex' },
    { id: 'plane-transform', name: 'Plane Transform', glyph: '↦', kind: 'particles', blurb: 'Warp a colored grid by f : ℂ → ℂ', cat: 'Complex' },
  ]},
  { label: 'Fractals', apps: [
    { id: 'fractals', name: 'Fractals', glyph: '◯', kind: 'fractal', blurb: 'Mandelbrot, Julia, Burning Ship', cat: 'Fractal' },
    { id: 'correspondence', name: 'Mandelbrot ↔ Julia', glyph: '⇄', kind: 'fractal', blurb: 'Every point seeds its own Julia set', cat: 'Fractal' },
  ]},
  { label: 'Topology & dynamics', apps: [
    { id: 'topology-walk', name: 'Topology Walk', glyph: '∞', kind: 'trinary', blurb: 'Walk a closed surface in first person', cat: 'Dynamics' },
    { id: 'trinary', name: 'Trinary System', glyph: '✸', kind: 'trinary', blurb: 'Three stars, one doomed world + a Lab', cat: 'Dynamics' },
  ]},
  { label: 'Algorithms', apps: [
    { id: 'stable-marriage', name: 'Stable Marriage', glyph: '♥', kind: 'trinary', blurb: 'Step through Gale–Shapley', cat: 'Algorithm' },
    { id: 'agentic-sorting', name: 'Agentic Sorting', glyph: '⇅', kind: 'particles', blurb: 'Rival agents race to sort', cat: 'Algorithm' },
  ]},
];
const ALL_APPS = GROUPS.flatMap(g => g.apps);

/* ===================================================================== *
 * PANEL VOCABULARY — the canonical "units of menu".
 *   Every panel in every app is one of these archetypes. Each has ONE icon
 *   and ONE meaning, grouped into five tiers that always sort in this order
 *   on the rail — so opening a new app never means learning new icons, just
 *   a different SUBSET of the same vocabulary.
 * ===================================================================== */
const ARCH = {
  subject:  { icon: 'fx',       tier: 'Define',  tip: 'What you are visualizing' },
  domain:   { icon: 'domain',   tier: 'Define',  tip: 'Input space, viewport or starting layout' },
  view:     { icon: 'camera',   tier: 'Render',  tip: 'Projection & camera' },
  color:    { icon: 'palette',  tier: 'Render',  tip: 'Coloring scheme' },
  marks:    { icon: 'sparkles', tier: 'Render',  tip: 'How points or cells are drawn' },
  motion:   { icon: 'waves',    tier: 'Render',  tip: 'Continuous animation' },
  drive:    { icon: 'move',     tier: 'Drive',   tip: 'Hands-on manipulation' },
  playback: { icon: 'play',     tier: 'Drive',   tip: 'Time transport — play, step, scrub' },
  lab:      { icon: 'flask',    tier: 'Analyze', tip: 'Batch experiments over many runs' },
  readout:  { icon: 'chart',    tier: 'Analyze', tip: 'Stats & plots' },
  quality:  { icon: 'gear',     tier: 'System',  tip: 'Resolution, detail & performance' },
};
const TIER_ORDER = ['Define', 'Render', 'Drive', 'Analyze', 'System'];
/* Stamp icon + tier + tip onto each section from its archetype, and keep a
   stable rail order: by tier first, then authored order within the tier. */
function buildSections(list) {
  const withMeta = list.map((s, i) => ({ ...s, _i: i, icon: ARCH[s.arch].icon, tier: ARCH[s.arch].tier, tip: ARCH[s.arch].tip }));
  return withMeta.sort((a, b) => (TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)) || (a._i - b._i));
}

/* ===================================================================== *
 * Panel content — authored once as small section BODIES, then composed.
 *   Each app exposes a flat `sections` array: { id, title, icon, group,
 *   detach?, open?, Body }. From that we derive both the tabbed Content
 *   (group → tab) and any panel-composition layout (groups, icon rail…).
 * ===================================================================== */

/* ---- Complex Particles ---- */
const PBody = {
  function: () => (<>
    <SelectRow label="Function" options={['exp', 'sin', 'cos', 'z²', '1/z', '√z', 'ln z', 'z^(p/q)']} value="exp" />
    <SelectRow label="Branches" options={['1', '2', '3']} value="1" />
  </>),
  domain: () => (<>
    <Pills label="Units" options={['×1', '×π']} value="×1" />
    <Slider label="X extent (±)" value={2.5} min={0.5} max={6} step={0.1} fmt={v => v.toFixed(1)} />
    <Slider label="Y extent (±)" value={2.5} min={0.5} max={6} step={0.1} fmt={v => v.toFixed(1)} />
  </>),
  camera: () => (<>
    <Pills label="Projection" options={['Persp', 'Stereo', 'Hopf', 'Torus']} value="Persp" />
    <Pills label="Motion" options={['Fixed', 'Quaternion', 'Orbit']} value="Quaternion" />
    <Slider label="Distance" value={6} min={2} max={14} step={0.1} fmt={v => v.toFixed(1)} />
  </>),
  color: () => (<>
    <Pills label="Color by" options={['Domain', 'Range']} value="Domain" />
    <Pills label="Style" options={['Phase', 'Modulus', 'HSV']} value="Phase" />
    <Slider label="Hue shift" value={0.1} />
    <Slider label="Saturation" value={0.8} />
  </>),
  particles: () => (<>
    <Slider label="Size" value={1.6} min={0.2} max={5} step={0.1} fmt={v => v.toFixed(1)} />
    <Slider label="Opacity" value={0.7} />
    <Slider label="Intensity" value={0.9} />
    <SelectRow label="Shape" options={['Round', 'Square', 'Star', 'Ring']} value="Round" />
    <SelectRow label="Texture" options={['Soft', 'Speckle', 'Stone', 'Metal']} value="Soft" />
    <Toggle label="Light background" checked={false} />
  </>),
  motion: () => (<>
    <Slider label="Shimmer" value={0.3} />
    <Slider label="Jitter" value={0.02} max={0.2} step={0.001} fmt={v => v.toFixed(3)} />
  </>),
  detail: () => (<>
    <Slider label="Particle count" value={40000} min={5000} max={120000} step={1000} fmt={v => `${Math.round(v/1000)}k`} />
    <Toggle label="Adaptive density" checked={true} />
    <Slider label="Axis width" value={1.5} min={0.5} max={5} step={0.1} fmt={v => v.toFixed(1)} />
  </>),
  rotate: () => {
    const planes = ['XY', 'XU', 'XV', 'YU', 'YV', 'UV'];
    const [spin, setSpin] = uS('XY');
    return (
      <div style={{ padding: '2px 0' }}>
        <div className="am-hint">Quarter-turn or hold-to-spin each of the six 4D planes. Drag the plot to rotate freely.</div>
        <div className="am-grid3" style={{ marginTop: 10 }}>
          {planes.map(p => (
            <button key={p} className={`am-mini ${spin === p ? 'am-on' : ''}`} onClick={() => setSpin(p)}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{p}</span><Icon name="rotate" size={13} />
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10 }}><Slider label="Spin speed" value={1.2} min={0} max={4} step={0.1} fmt={v => `${v.toFixed(1)} rad/s`} /></div>
        <Pills label="Drop axis" options={['None', 'X', 'Y', 'U', 'V']} value="None" />
        <div className="am-grid2" style={{ marginTop: 10 }}>
          <button className="am-mini"><Icon name="reset" size={14} /> Snap view</button>
          <button className="am-mini"><Icon name="rotate" size={14} /> Stop spins</button>
        </div>
      </div>
    );
  },
};
const PARTICLE_SECTIONS = buildSections([
  { id: 'function', title: 'Function', arch: 'subject', open: true, Body: PBody.function },
  { id: 'domain', title: 'Domain', arch: 'domain', Body: PBody.domain },
  { id: 'camera', title: 'Camera', arch: 'view', open: true, Body: PBody.camera },
  { id: 'color', title: 'Color', arch: 'color', Body: PBody.color },
  { id: 'particles', title: 'Particles', arch: 'marks', Body: PBody.particles },
  { id: 'motion', title: 'Motion', arch: 'motion', Body: PBody.motion },
  { id: 'rotate', title: '4D Rotation', arch: 'drive', open: true, Body: PBody.rotate },
  { id: 'detail', title: 'Detail', arch: 'quality', Body: PBody.detail },
]);

/* ---- Fractals ---- */
const FBody = {
  set: () => (<>
    <Pills label="Fractal" options={['Mandelbrot', 'Julia', 'Ship', 'Tricorn']} value="Mandelbrot" />
    <Slider label="Julia seed (re)" value={-0.4} min={-2} max={2} step={0.01} fmt={v => v.toFixed(2)} />
  </>),
  viewport: () => (<>
    <Slider label="Zoom" value={1.1} min={0.5} max={400} step={0.1} fmt={v => `${v.toFixed(1)}×`} />
    <Slider label="Center (re)" value={-0.6} min={-2.5} max={1} step={0.001} fmt={v => v.toFixed(3)} />
    <Slider label="Center (im)" value={0} min={-1.5} max={1.5} step={0.001} fmt={v => v.toFixed(3)} />
    <button className="am-mini" style={{ width: '100%', marginTop: 4 }}><Icon name="reset" size={14} /> Reset viewport</button>
  </>),
  iteration: () => (<>
    <RangeSlider label="Iteration band" lo={60} hi={400} min={20} max={1000} step={10} fmt={v => `${Math.round(v)}`} />
    <Toggle label="Smooth shading" checked={true} />
  </>),
  palette: () => (<>
    <Pills label="Ramp" options={['Fire', 'Ice', 'Mono']} value="Fire" />
    <Slider label="Cycle" value={0.2} />
    <Toggle label="Invert interior" checked={false} />
  </>),
};
const FRACTAL_SECTIONS = buildSections([
  { id: 'set', title: 'Set', arch: 'subject', open: true, Body: FBody.set },
  { id: 'viewport', title: 'Viewport', arch: 'domain', open: true, Body: FBody.viewport },
  { id: 'palette', title: 'Palette', arch: 'color', Body: FBody.palette },
  { id: 'iteration', title: 'Iteration', arch: 'quality', Body: FBody.iteration },
]);

/* ---- small readout primitives (shared across the lab-style apps) ---- */
function Breakdown({ rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, margin: '4px 0 2px' }}>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 72, fontSize: 12, color: 'var(--dim)' }}>{r.label}</span>
          <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--track, rgba(255,255,255,0.1))', overflow: 'hidden' }}>
            <div style={{ width: `${r.pct}%`, height: '100%', background: r.color || 'var(--accent)', borderRadius: 999 }} />
          </div>
          <span style={{ width: 34, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{r.pct}%</span>
        </div>
      ))}
    </div>
  );
}
function MiniHisto({ bars, caption }) {
  const max = Math.max(...bars);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72, padding: '4px 0' }}>
        {bars.map((h, i) => <div key={i} style={{ flex: 1, height: `${Math.max(4, h / max * 100)}%`, background: 'var(--accent)', opacity: 0.3 + 0.6 * (h / max), borderRadius: '2px 2px 0 0' }} />)}
      </div>
      {caption && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--dim-2)', marginTop: 2 }}>{caption}</div>}
    </div>
  );
}
function Sparkline({ pts, h = 54 }) {
  const max = Math.max(...pts), min = Math.min(...pts), w = 232;
  const d = pts.map((p, i) => `${(i / (pts.length - 1) * w).toFixed(1)},${(h - (p - min) / (max - min || 1) * h).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block', overflow: 'visible' }} preserveAspectRatio="none">
      <polyline points={`0,${h} ${d} ${w},${h}`} fill="var(--accent-soft)" stroke="none" />
      <polyline points={d} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
function StatGrid({ stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '4px 0 2px' }}>
      {stats.map(s => (
        <div key={s.k} style={{ padding: '8px 10px', borderRadius: 9, background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.v}</div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1 }}>{s.k}</div>
        </div>
      ))}
    </div>
  );
}
const Kicker = ({ children }) => <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--dim-2)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '8px 0 5px' }}>{children}</div>;
const OUTCOME_COLORS = { ejected: 'var(--accent)', stable: 'oklch(0.72 0.12 155)', captured: 'oklch(0.7 0.12 240)', collision: 'oklch(0.64 0.17 25)' };

/* ---- Trinary System ---- */
const TBody = {
  stars: () => (<>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 22, padding: '2px 0 12px' }}>
      {[['A', 'var(--accent)', 15], ['B', 'oklch(0.72 0.12 240)', 12], ['C', 'oklch(0.66 0.16 30)', 11]].map(([n, c, s]) => (
        <div key={n} style={{ textAlign: 'center' }}>
          <div style={{ width: s * 2, height: s * 2, borderRadius: '50%', margin: '0 auto', background: `radial-gradient(circle at 38% 34%, #fff, ${c} 62%, transparent)`, boxShadow: `0 0 16px ${c}` }} />
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>{n}</div>
        </div>
      ))}
    </div>
    <Pills label="Preset" options={['Equal-mass', 'Binary + dwarf', 'Hierarchical']} value="Equal-mass" />
    <Slider label="Star A mass" value={1} min={0.2} max={3} step={0.05} fmt={v => `${v.toFixed(2)} M☉`} />
    <Slider label="Star B mass" value={1} min={0.2} max={3} step={0.05} fmt={v => `${v.toFixed(2)} M☉`} />
    <Slider label="Star C mass" value={1} min={0.2} max={3} step={0.05} fmt={v => `${v.toFixed(2)} M☉`} />
  </>),
  planet: () => (<>
    <Slider label="Start distance" value={1.5} min={0.5} max={4} step={0.1} fmt={v => `${v.toFixed(1)} AU`} />
    <Slider label="Launch speed" value={0.6} min={0} max={1.5} step={0.01} fmt={v => v.toFixed(2)} />
    <Slider label="Launch angle" value={90} min={0} max={360} step={1} fmt={v => `${Math.round(v)}°`} />
  </>),
  layout: () => (<>
    <Pills label="Configuration" options={['Equilateral', 'Collinear', 'Random']} value="Equilateral" />
    <Slider label="Separation" value={1} min={0.3} max={3} step={0.1} fmt={v => `${v.toFixed(1)} AU`} />
    <Toggle label="Lock centre of mass" checked={true} />
    <Toggle label="Show labels" checked={true} />
  </>),
  playback: () => (
    <div style={{ padding: '2px 0' }}>
      <div className="am-grid3">
        <button className="am-mini"><Icon name="back" size={14} /> Step</button>
        <button className="am-mini am-on"><Icon name="play" size={14} /> Play</button>
        <button className="am-mini"><Icon name="reset" size={14} /> Reset</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <Pills label="Speed" options={['0.5×', '1×', '2×', '4×']} value="1×" />
        <Slider label="Trail length" value={220} min={20} max={600} step={10} fmt={v => `${Math.round(v)}`} />
        <Toggle label="Show trail" checked={true} />
        <Toggle label="Show force vectors" checked={false} />
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
        {[['t', '142 yr'], ['energy', '−0.83'], ['planet', 'bound']].map(([k, v]) => (
          <div key={k} style={{ flex: 1, padding: '6px 8px', borderRadius: 8, background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{v}</div>
            <div style={{ fontSize: 10, color: 'var(--dim)' }}>{k}</div>
          </div>
        ))}
      </div>
    </div>
  ),
  batch: () => {
    const [running, setRunning] = uS(false);
    return (<>
      <Slider label="Worlds" value={2000} min={100} max={10000} step={100} fmt={v => `${(v / 1000).toFixed(v < 1000 ? 1 : 1)}k`} />
      <Slider label="Horizon" value={500} min={50} max={5000} step={50} fmt={v => `${Math.round(v)} yr`} />
      <Slider label="Perturbation δ" value={0.001} min={0.0001} max={0.01} step={0.0001} fmt={v => v.toFixed(4)} />
      <NumberInput label="Random seed" value={42} min={0} max={9999} step={1} />
      <button className={`am-mini ${running ? '' : 'am-on'}`} style={{ width: '100%', marginTop: 10 }} onClick={() => setRunning(r => !r)}>
        <Icon name={running ? 'reset' : 'play'} size={14} /> {running ? 'Stop run' : 'Run 2,000 worlds'}
      </button>
      {running && (
        <div style={{ marginTop: 9 }}>
          <div style={{ height: 6, borderRadius: 999, background: 'var(--track, rgba(255,255,255,0.1))', overflow: 'hidden' }}>
            <div style={{ width: '62%', height: '100%', background: 'var(--accent)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--dim)', marginTop: 5 }}>1,243 / 2,000 · 62%</div>
        </div>
      )}
    </>);
  },
  histogram: () => (<>
    <Kicker>Outcome of 2,000 worlds</Kicker>
    <Breakdown rows={[
      { label: 'Ejected', pct: 62, color: OUTCOME_COLORS.ejected },
      { label: 'Stable', pct: 21, color: OUTCOME_COLORS.stable },
      { label: 'Captured', pct: 11, color: OUTCOME_COLORS.captured },
      { label: 'Collision', pct: 6, color: OUTCOME_COLORS.collision },
    ]} />
    <Kicker>Survival time</Kicker>
    <MiniHisto bars={[8, 18, 34, 52, 70, 88, 64, 40, 26, 16, 9, 5]} caption="0 — 500 yr · median 180 yr" />
  </>),
  survival: () => (<>
    <Kicker>Fraction still bound</Kicker>
    <Sparkline pts={[100, 99, 96, 90, 80, 67, 54, 43, 34, 28, 24, 21, 21]} />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--dim-2)', marginTop: 2 }}><span>0 yr</span><span>500 yr</span></div>
    <StatGrid stats={[{ k: 'Half-life', v: '~165 yr' }, { k: 'Survive 500 yr', v: '21%' }]} />
  </>),
};
const TRINARY_SECTIONS = buildSections([
  { id: 'stars', title: 'Stars', arch: 'subject', open: true, Body: TBody.stars },
  { id: 'planet', title: 'Planet', arch: 'domain', open: true, Body: TBody.planet },
  { id: 'layout', title: 'Layout', arch: 'domain', Body: TBody.layout },
  { id: 'playback', title: 'Playback', arch: 'playback', open: true, Body: TBody.playback },
  { id: 'batch', title: 'Batch run', arch: 'lab', open: true, Body: TBody.batch },
  { id: 'histogram', title: 'Outcomes', arch: 'readout', open: true, Body: TBody.histogram },
  { id: 'survival', title: 'Survival curve', arch: 'readout', Body: TBody.survival },
]);

/* ---- Plane Transform (warp a colored grid by f : ℂ → ℂ) ---- */
const PtBody = {
  function: () => (<>
    <SelectRow label="Function" options={['exp', 'sin', 'z²', 'z³', '1/z', 'Möbius', 'z̄', 'polynomial']} value="z²" />
    <Toggle label="Compose with previous" checked={false} />
  </>),
  grid: () => (<>
    <Pills label="Lines" options={['Cartesian', 'Polar', 'Both']} value="Cartesian" />
    <Slider label="Extent (±)" value={3} min={1} max={8} step={0.5} fmt={v => v.toFixed(1)} />
    <Slider label="Line spacing" value={0.5} min={0.1} max={1} step={0.05} fmt={v => v.toFixed(2)} />
  </>),
  color: () => (<>
    <Pills label="Color source" options={['Domain', 'Checker', 'Polar']} value="Domain" />
    <Slider label="Hue shift" value={0.15} />
    <Toggle label="Fade by |f′(z)|" checked={true} />
  </>),
  marks: () => (<>
    <Slider label="Line weight" value={1.4} min={0.4} max={4} step={0.1} fmt={v => v.toFixed(1)} />
    <Toggle label="Show input grid (ghost)" checked={true} />
    <Toggle label="Anti-alias" checked={true} />
  </>),
  morph: () => (
    <div style={{ padding: '2px 0' }}>
      <div className="am-grid3">
        <button className="am-mini"><Icon name="back" size={14} /> Identity</button>
        <button className="am-mini am-on"><Icon name="play" size={14} /> Warp</button>
        <button className="am-mini"><Icon name="reset" size={14} /> Reset</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <Slider label="Warp amount" value={1} />
        <Pills label="Speed" options={['0.5×', '1×', '2×']} value="1×" />
        <Toggle label="Loop identity → f" checked={false} />
      </div>
    </div>
  ),
  handles: () => (
    <div style={{ padding: '2px 0' }}>
      <div className="am-hint">Drag preimage points on the plane to trace where f sends them.</div>
      <div className="am-grid2" style={{ marginTop: 10 }}>
        <button className="am-mini"><Icon name="sparkles" size={13} /> Add point</button>
        <button className="am-mini"><Icon name="close" size={13} /> Clear</button>
      </div>
      <Toggle label="Snap to integers" checked={true} />
      <Toggle label="Show image vectors" checked={true} />
    </div>
  ),
  detail: () => (<>
    <Slider label="Grid resolution" value={240} min={40} max={600} step={20} fmt={v => `${Math.round(v)}`} />
    <Toggle label="Adaptive near poles" checked={true} />
  </>),
};
const TRANSFORM_SECTIONS = buildSections([
  { id: 'function', title: 'Function', arch: 'subject', open: true, Body: PtBody.function },
  { id: 'grid', title: 'Grid', arch: 'domain', open: true, Body: PtBody.grid },
  { id: 'color', title: 'Color', arch: 'color', Body: PtBody.color },
  { id: 'marks', title: 'Grid style', arch: 'marks', Body: PtBody.marks },
  { id: 'morph', title: 'Morph', arch: 'motion', open: true, Body: PtBody.morph },
  { id: 'handles', title: 'Handles', arch: 'drive', Body: PtBody.handles },
  { id: 'detail', title: 'Detail', arch: 'quality', Body: PtBody.detail },
]);

/* ---- Mandelbrot ↔ Julia (every point seeds its own Julia set) ---- */
const CoBody = {
  set: () => (<>
    <Pills label="Family" options={['z²+c', 'z³+c', 'sinh']} value="z²+c" />
    <Toggle label="Link the two views" checked={true} />
  </>),
  viewport: () => (<>
    <Pills label="Active view" options={['Mandelbrot', 'Julia']} value="Mandelbrot" />
    <Slider label="Zoom" value={1} min={0.5} max={400} step={0.1} fmt={v => `${v.toFixed(1)}×`} />
    <button className="am-mini" style={{ width: '100%', marginTop: 4 }}><Icon name="reset" size={14} /> Reset both views</button>
  </>),
  seed: () => (<>
    <div className="am-hint">Hover the Mandelbrot set to pick the seed c — the Julia view updates live.</div>
    <Slider label="Seed (re)" value={-0.4} min={-2} max={2} step={0.001} fmt={v => v.toFixed(3)} />
    <Slider label="Seed (im)" value={0.6} min={-2} max={2} step={0.001} fmt={v => v.toFixed(3)} />
    <Toggle label="Lock seed" checked={false} />
  </>),
  morph: () => (
    <div style={{ padding: '2px 0' }}>
      <div className="am-grid3">
        <button className="am-mini"><Icon name="back" size={14} /> Step</button>
        <button className="am-mini am-on"><Icon name="play" size={14} /> Play path</button>
        <button className="am-mini"><Icon name="reset" size={14} /> Reset</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <Pills label="Speed" options={['0.5×', '1×', '2×']} value="1×" />
        <Slider label="Path radius" value={0.4} min={0.05} max={1} step={0.01} fmt={v => v.toFixed(2)} />
      </div>
    </div>
  ),
  palette: () => (<>
    <Pills label="Ramp" options={['Fire', 'Ice', 'Mono']} value="Ice" />
    <Slider label="Cycle" value={0.25} />
    <Toggle label="Invert interior" checked={false} />
  </>),
  iteration: () => (<>
    <RangeSlider label="Iteration band" lo={50} hi={300} min={20} max={1000} step={10} fmt={v => `${Math.round(v)}`} />
    <Toggle label="Smooth shading" checked={true} />
  </>),
};
const CORRESPONDENCE_SECTIONS = buildSections([
  { id: 'set', title: 'Set', arch: 'subject', open: true, Body: CoBody.set },
  { id: 'viewport', title: 'Viewport', arch: 'domain', Body: CoBody.viewport },
  { id: 'palette', title: 'Palette', arch: 'color', Body: CoBody.palette },
  { id: 'seed', title: 'Seed', arch: 'drive', open: true, Body: CoBody.seed },
  { id: 'morph', title: 'Morph', arch: 'playback', Body: CoBody.morph },
  { id: 'iteration', title: 'Iteration', arch: 'quality', Body: CoBody.iteration },
]);

/* ---- Topology Walk (walk a closed surface in first person) ---- */
const TwBody = {
  surface: () => (<>
    <SelectRow label="Surface" options={['Torus', 'Klein bottle', 'Sphere', 'Genus-2', 'Möbius band']} value="Torus" />
    <Slider label="Major radius R" value={2} min={1} max={4} step={0.1} fmt={v => v.toFixed(1)} />
    <Slider label="Minor radius r" value={0.7} min={0.2} max={1.5} step={0.05} fmt={v => v.toFixed(2)} />
  </>),
  camera: () => (<>
    <Pills label="View" options={['First person', 'Orbit']} value="First person" />
    <Slider label="Field of view" value={75} min={40} max={110} step={1} fmt={v => `${Math.round(v)}°`} />
    <Toggle label="Head bob" checked={true} />
  </>),
  move: () => (
    <div style={{ padding: '2px 0' }}>
      <div className="am-hint">Drag to look · <b>W A S D</b> to walk the surface. Cross an edge to see it wrap.</div>
      <div style={{ marginTop: 10 }}>
        <Slider label="Walk speed" value={1.2} min={0.2} max={4} step={0.1} fmt={v => v.toFixed(1)} />
        <Slider label="Turn speed" value={1} min={0.2} max={3} step={0.1} fmt={v => v.toFixed(1)} />
        <Toggle label="Geodesic auto-walk" checked={false} />
      </div>
    </div>
  ),
  mesh: () => (<>
    <Pills label="Surface" options={['Solid', 'Wireframe', 'Both']} value="Both" />
    <Slider label="Edge density" value={24} min={6} max={64} step={2} fmt={v => `${Math.round(v)}`} />
    <Toggle label="Show normals" checked={false} />
  </>),
  color: () => (<>
    <Pills label="Color by" options={['Curvature', 'Checker', 'Normal']} value="Curvature" />
    <Slider label="Hue shift" value={0.5} />
  </>),
  tess: () => (<>
    <Slider label="Tessellation" value={4000} min={500} max={20000} step={500} fmt={v => `${Math.round(v/1000)}k`} />
    <Toggle label="Adaptive detail" checked={true} />
  </>),
};
const TOPOLOGY_SECTIONS = buildSections([
  { id: 'surface', title: 'Surface', arch: 'subject', open: true, Body: TwBody.surface },
  { id: 'camera', title: 'Camera', arch: 'view', open: true, Body: TwBody.camera },
  { id: 'color', title: 'Color', arch: 'color', Body: TwBody.color },
  { id: 'mesh', title: 'Mesh', arch: 'marks', Body: TwBody.mesh },
  { id: 'move', title: 'Move', arch: 'drive', open: true, Body: TwBody.move },
  { id: 'tess', title: 'Tessellation', arch: 'quality', Body: TwBody.tess },
]);

/* ---- Stable Marriage (step through Gale–Shapley) ---- */
const SmBody = {
  prefs: () => (<>
    <Slider label="Participants (n per side)" value={8} min={3} max={20} step={1} fmt={v => `${Math.round(v)}`} />
    <Pills label="Preferences" options={['Random', 'Correlated', 'Clustered']} value="Random" />
    <Toggle label="Show preference matrix" checked={true} />
  </>),
  population: () => (<>
    <Pills label="Proposing side" options={['A', 'B']} value="A" />
    <Toggle label="Equal group sizes" checked={true} />
    <Toggle label="Allow ties" checked={false} />
  </>),
  playback: () => (
    <div style={{ padding: '2px 0' }}>
      <div className="am-grid3">
        <button className="am-mini"><Icon name="back" size={14} /> Step</button>
        <button className="am-mini am-on"><Icon name="play" size={14} /> Play</button>
        <button className="am-mini"><Icon name="reset" size={14} /> Reset</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <Pills label="Speed" options={['0.5×', '1×', '2×', '4×']} value="1×" />
        <Toggle label="Highlight current proposal" checked={true} />
      </div>
    </div>
  ),
  stats: () => (<>
    <StatGrid stats={[{ k: 'Blocking pairs', v: '0' }, { k: 'Avg rank', v: '1.8' }, { k: 'Rounds', v: '14' }, { k: 'Unmatched', v: '0' }]} />
    <Kicker>Who got their…</Kicker>
    <Breakdown rows={[
      { label: '1st choice', pct: 48 },
      { label: 'Top 3', pct: 82, color: 'oklch(0.72 0.12 155)' },
      { label: 'Last choice', pct: 6, color: 'oklch(0.64 0.17 25)' },
    ]} />
    <Kicker>Rank distribution</Kicker>
    <MiniHisto bars={[48, 24, 14, 7, 4, 2, 1]} caption="rank 1 → 7 · proposer-optimal" />
  </>),
  rounds: () => (<>
    <Kicker>Active proposals per round</Kicker>
    <Sparkline pts={[8, 8, 7, 7, 6, 6, 5, 4, 4, 3, 2, 2, 1, 0]} />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--dim-2)', marginTop: 2 }}><span>round 1</span><span>14</span></div>
    <div className="am-hint" style={{ marginTop: 8 }}>Converged in 14 rounds — every proposer is matched and no pair would defect.</div>
  </>),
};
const MARRIAGE_SECTIONS = buildSections([
  { id: 'prefs', title: 'Preferences', arch: 'subject', open: true, Body: SmBody.prefs },
  { id: 'population', title: 'Population', arch: 'domain', Body: SmBody.population },
  { id: 'playback', title: 'Playback', arch: 'playback', open: true, Body: SmBody.playback },
  { id: 'stats', title: 'Matching stats', arch: 'readout', open: true, Body: SmBody.stats },
  { id: 'rounds', title: 'Rounds', arch: 'readout', Body: SmBody.rounds },
]);

/* ---- Agentic Sorting (rival agents race to sort) ---- */
const AsBody = {
  array: () => (<>
    <Slider label="Elements" value={64} min={10} max={200} step={2} fmt={v => `${Math.round(v)}`} />
    <Pills label="Distribution" options={['Random', 'Nearly sorted', 'Reversed', 'Few unique']} value="Random" />
    <Toggle label="Show values" checked={false} />
  </>),
  agents: () => (<>
    <Slider label="Agents" value={3} min={1} max={8} step={1} fmt={v => `${Math.round(v)}`} />
    <SelectRow label="Strategy" options={['Insertion', 'Quicksort', 'Bubble', 'Merge', 'Mixed']} value="Mixed" />
    <Toggle label="Agents compete" checked={true} />
  </>),
  run: () => (
    <div style={{ padding: '2px 0' }}>
      <div className="am-grid3">
        <button className="am-mini"><Icon name="back" size={14} /> Step</button>
        <button className="am-mini am-on"><Icon name="play" size={14} /> Play</button>
        <button className="am-mini"><Icon name="reset" size={14} /> Reset</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <Pills label="Speed" options={['0.5×', '1×', '2×', '4×']} value="1×" />
        <Slider label="Steps / frame" value={1} min={1} max={20} step={1} fmt={v => `${Math.round(v)}`} />
      </div>
    </div>
  ),
  metrics: () => (<>
    <Kicker>Progress by agent</Kicker>
    <Breakdown rows={[
      { label: 'Quicksort', pct: 100 },
      { label: 'Merge', pct: 88, color: 'oklch(0.72 0.12 240)' },
      { label: 'Insertion', pct: 56, color: 'oklch(0.72 0.12 155)' },
      { label: 'Bubble', pct: 30, color: 'oklch(0.64 0.17 25)' },
    ]} />
    <StatGrid stats={[{ k: 'Comparisons', v: '412' }, { k: 'Swaps', v: '188' }, { k: 'Leader', v: 'Quicksort' }, { k: 'Elapsed', v: '0.9 s' }]} />
  </>),
  race: () => (<>
    <Kicker>Comparisons over time</Kicker>
    <Sparkline pts={[0, 40, 96, 150, 210, 260, 300, 340, 380, 412]} />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--dim-2)', marginTop: 2 }}><span>start</span><span>sorted</span></div>
    <div className="am-hint" style={{ marginTop: 8 }}>Quicksort finishes first on random data; Insertion wins when nearly-sorted.</div>
  </>),
};
const SORTING_SECTIONS = buildSections([
  { id: 'array', title: 'Array', arch: 'subject', open: true, Body: AsBody.array },
  { id: 'agents', title: 'Agents', arch: 'drive', open: true, Body: AsBody.agents },
  { id: 'run', title: 'Run', arch: 'playback', open: true, Body: AsBody.run },
  { id: 'metrics', title: 'Metrics', arch: 'readout', open: true, Body: AsBody.metrics },
  { id: 'race', title: 'Race', arch: 'readout', Body: AsBody.race },
]);

/* Build a tabbed Content component from the sections of one group. */
function groupContent(sections, group) {
  return function GroupContent() {
    return (<>
      {sections.filter(s => s.group === group).map(s => (
        <Section key={s.id} icon={s.icon} title={s.title} defaultOpen={s.open !== false}>
          <s.Body />
        </Section>
      ))}
    </>);
  };
}

function FunctionList({ current = 'exp' }) {
  const fns = ['exp', 'sin', 'cos', 'tan', 'z²', 'z³', '1/z', '√z', 'ln z', 'z^(p/q)'];
  const [cur, setCur] = uS(current);
  return (
    <div style={{ padding: 6 }}>
      {fns.map(f => (
        <button key={f} className={`am-navitem ${cur === f ? 'am-on' : ''}`} style={{ borderRadius: 8 }} onClick={() => setCur(f)}>
          <span className="am-navitem-ico" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>ƒ</span>
          <span className="am-navitem-meta"><span>{f}</span></span>
          {cur === f && <Icon name="chevron" size={14} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
        </button>
      ))}
    </div>
  );
}

/* ===================================================================== *
 * Per-app configuration — the heart of the adaptive chrome.
 *   panels : ordered inspector tabs; detach:true ⇒ can pop out over the plot
 * ===================================================================== */
const APPS = {
  'complex-particles': {
    id: 'complex-particles', title: 'Complex Particles', sub: 'f(z) = exp(z)', kind: 'particles',
    about: 'See a complex function z → f(z) as a cloud of particles living in 4D, projected down to 3D. Pick the function, shape the domain, then spin the four planes to read its structure.',
    sections: PARTICLE_SECTIONS,
    views: [{ id: 'plot', title: 'f(z) · particle cloud', kind: 'particles', x: 372, y: 16, w: 712, h: 628 }],
    panels: [
      { id: 'tune', label: 'Tune', icon: 'tune', Content: groupContent(PARTICLE_SECTIONS, 'tune'), hint: 'Function, domain, camera, color & particles' },
      { id: 'rotate', label: 'Rotate', icon: 'rotate', Content: groupContent(PARTICLE_SECTIONS, 'rotate'), detach: true, detachTitle: '4D Rotation', hint: 'Quarter-turn or spin the six 4D planes' },
    ],
  },
  'fractals': {
    id: 'fractals', title: 'Fractals', sub: 'Mandelbrot', kind: 'fractal',
    about: 'Zoom the classic escape-time fractals — Mandelbrot, Julia, Burning Ship. Pan and zoom the viewport, push iteration depth, and recolor the bands.',
    sections: FRACTAL_SECTIONS,
    views: [{ id: 'plot', title: 'Mandelbrot', kind: 'fractal', x: 372, y: 16, w: 712, h: 628 }],
    panels: [
      { id: 'tune', label: 'Tune', icon: 'tune', Content: groupContent(FRACTAL_SECTIONS, 'tune'), hint: 'Set, viewport, iteration & palette' },
    ],
  },
  'trinary': {
    id: 'trinary', title: 'Trinary System', sub: '3-body · chaotic', kind: 'trinary',
    about: 'Three stars and one doomed planet. Set the masses and launch, watch the chaotic orbit, then open the Lab to run thousands of perturbed worlds and tally the planet’s fate.',
    sections: TRINARY_SECTIONS,
    views: [{ id: 'orbit', title: 'Orbit', kind: 'trinary', x: 372, y: 16, w: 712, h: 432 }],
    panels: [
      { id: 'bodies', label: 'Bodies', icon: 'orbit', Content: groupContent(TRINARY_SECTIONS, 'bodies'), hint: 'Star masses, planet & layout' },
      { id: 'run', label: 'Run', icon: 'play', Content: groupContent(TRINARY_SECTIONS, 'run'), detach: true, detachTitle: 'Playback', hint: 'Play, step, speed & trails' },
      { id: 'lab', label: 'Lab', icon: 'flask', Content: groupContent(TRINARY_SECTIONS, 'lab'), hint: 'Batch-run worlds, outcome histogram' },
    ],
  },
  'plane-transform': {
    id: 'plane-transform', title: 'Plane Transform', sub: 'f : ℂ → ℂ', kind: 'particles',
    about: 'Watch a complex function bend space itself: a colored coordinate grid is warped by f : ℂ → ℂ. Pick a function, then morph from the identity to f and drag points to trace where they land.',
    sections: TRANSFORM_SECTIONS,
    views: [
      { id: 'input', title: 'z-plane (input)', kind: 'particles', x: 360, y: 16, w: 356, h: 356 },
      { id: 'output', title: 'f(z)-plane', kind: 'particles', x: 728, y: 16, w: 356, h: 356 },
    ],
  },
  'correspondence': {
    id: 'correspondence', title: 'Mandelbrot ↔ Julia', sub: 'every point seeds a Julia set', kind: 'fractal',
    about: 'The Mandelbrot set is an atlas of Julia sets: every point c you hover seeds its own Julia set in the linked view. Pick seeds, zoom both views, and animate c along a path.',
    sections: CORRESPONDENCE_SECTIONS,
    views: [
      { id: 'mandel', title: 'Mandelbrot — pick c', kind: 'fractal', x: 360, y: 16, w: 356, h: 356 },
      { id: 'julia', title: 'Julia(c)', kind: 'fractal', x: 728, y: 16, w: 356, h: 356 },
    ],
  },
  'topology-walk': {
    id: 'topology-walk', title: 'Topology Walk', sub: 'first-person on a closed surface', kind: 'trinary',
    about: 'Walk a closed surface in first person — a torus, Klein bottle or higher-genus handlebody — and feel how the space wraps as you cross its edges.',
    sections: TOPOLOGY_SECTIONS,
    views: [{ id: 'walk', title: 'First-person view', kind: 'trinary', x: 372, y: 16, w: 712, h: 628 }],
  },
  'stable-marriage': {
    id: 'stable-marriage', title: 'Stable Marriage', sub: 'Gale–Shapley', kind: 'trinary',
    about: 'Step through the Gale–Shapley algorithm as two groups propose and tentatively match. Watch it converge to a provably stable matching with no blocking pairs.',
    sections: MARRIAGE_SECTIONS,
    views: [{ id: 'graph', title: 'Matching', kind: 'trinary', x: 372, y: 16, w: 712, h: 484 }],
  },
  'agentic-sorting': {
    id: 'agentic-sorting', title: 'Agentic Sorting', sub: 'rival sorters race', kind: 'particles',
    about: 'Set rival agents loose on the same array, each running a different sorting strategy, and watch which one orders the data first — comparisons and swaps tallied live.',
    sections: SORTING_SECTIONS,
    views: [{ id: 'bars', title: 'Array', kind: 'particles', x: 372, y: 16, w: 712, h: 484 }],
  },
};
const KIND_DEFAULT = { particles: 'complex-particles', fractal: 'fractals', trinary: 'trinary' };
function getApp(idOrKind) { return APPS[idOrKind] || APPS[KIND_DEFAULT[idOrKind]] || APPS['complex-particles']; }

/* IA reference — proposed per-app panels, mapped onto the current
   Settings + Actions split. "⤢" marks a panel that can pop out over the plot. */
const IA_SPEC = [
  { app: 'Complex Particles', glyph: '✦', panels: ['Tune', 'Rotate ⤢'], note: 'Settings → Tune · Actions → Rotate (the 4D pad)' },
  { app: 'Plane Transform', glyph: '↦', panels: ['Tune', 'Curves ⤢'], note: 'No 4D rotation pad; adds traced-curve overlay' },
  { app: 'Fractals', glyph: '◯', panels: ['Tune'], note: 'Single panel — no Actions tab to disable' },
  { app: 'Mandelbrot ↔ Julia', glyph: '⇄', panels: ['Tune', 'Playback ⤢'], note: 'Actions → Playback scrubber' },
  { app: 'Topology Walk', glyph: '∞', panels: ['Surface', 'Move'], note: 'Settings → Surface · Actions → Move' },
  { app: 'Trinary System', glyph: '✸', panels: ['Bodies', 'Run ⤢', 'Lab'], note: 'Splits Settings into Bodies + the batch Lab' },
  { app: 'Stable Marriage', glyph: '♥', panels: ['Setup', 'Playback ⤢'], note: 'Settings → Setup · Actions → Playback' },
  { app: 'Agentic Sorting', glyph: '⇅', panels: ['Setup', 'Playback ⤢'], note: 'Settings → Setup · Actions → Playback' },
];

window.AnimathChrome = { GROUPS, ALL_APPS, APPS, getApp, FunctionList, IA_SPEC, PARTICLE_SECTIONS, FRACTAL_SECTIONS, TRINARY_SECTIONS };
