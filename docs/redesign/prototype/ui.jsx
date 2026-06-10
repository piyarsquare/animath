/* ui.jsx — legible icon set + control primitives shared by every layout
   variant. Mirrors animath's real ControlPanel vocabulary (Section, Slider,
   Pills, Select, Checkbox) but with labelled, legible chrome icons replacing
   the cryptic ⌂ ☰ ƒ ⚙ ▶ ? glyphs. */

const { useState, useEffect } = React;

/* ---- Icon set (stroke, 24 viewBox) --------------------------------------- */
const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  fx: 'M16 6c-2 0-3 1-3.5 3.5L9 21M6 9h8',                 // function ƒ
  tune: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M18 18h2M14 4v4M6 10v4M16 16v4',
  play: 'M7 5l12 7-12 7z',
  help: 'M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1-1.5 2.3M12 17.5v.01',
  reset: 'M4 4v6h6M4 10a8 8 0 1 1 1.5 7',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-4.3-4.3',
  close: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 6l6 6-6 6',
  chevrondown: 'M6 9l6 6 6-6',
  pin: 'M9 4h6l-1 6 3 3H7l3-3-1-6zM12 16v4',
  command: 'M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z',
  sparkles: 'M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5zM18 14l.8 2 .2 2 2-.8L19 18z',
  palette: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1-1-2 1-1 2-1h1a3 3 0 0 0 3-3 8 8 0 0 0-8-7zM7.5 12.5v.01M9.5 8.5v.01M14.5 7.5v.01',
  camera: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3 8l2-3h4l1 2h4l1-2h0M3 8h18v11H3z',
  waves: 'M3 8c2 0 2 2 4.5 2S10 8 12 8s2 2 4.5 2S19 8 21 8M3 14c2 0 2 2 4.5 2S10 14 12 14s2 2 4.5 2S19 14 21 14',
  domain: 'M4 4h16v16H4zM4 9h16M4 14h16M9 4v16M14 4v16',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8v.01',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7 15h10',
  orbit: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5.6 16C3.4 14.8 2 13 2 12c0-2.2 4.5-4 10-4s10 1.8 10 4-4.5 4-10 4',
  rotate: 'M4 4v6h6M20 20v-6h-6M20 9a8 8 0 0 0-15-2M4 15a8 8 0 0 0 15 2',
  back: 'M15 6l-6 6 6 6',
  list: 'M8 6h13M8 12h13M8 18h13M3 6v.01M3 12v.01M3 18v.01',
  move: 'M12 4v16M4 12h16M12 4l-3 3M12 4l3 3M12 20l-3-3M12 20l3-3M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3',
  chart: 'M5 20V12M12 20V5M19 20v-6M3 20h18',
  window: 'M3 5h18v14H3zM3 9h18M6 7v.01',
  expand: 'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5',
};

function Icon({ name, size = 18, style }) {
  const d = ICONS[name] || ICONS.info;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={style} aria-hidden="true">
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={'M' + seg} />)}
    </svg>
  );
}

/* ---- Section (collapsible) ----------------------------------------------- */
function Section({ icon, title, count, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={`am-section ${open ? 'am-open' : ''}`}>
      <button className="am-sec-head" onClick={() => setOpen(o => !o)}>
        <span className="am-sec-ico"><Icon name={icon} size={14} /></span>
        <span className="am-sec-title">{title}</span>
        {count != null && <span className="am-sec-count">{count}</span>}
        <span className="am-sec-chev"><Icon name="chevron" size={14} /></span>
      </button>
      <div className="am-sec-body">{children}</div>
    </div>
  );
}

/* ---- Slider -------------------------------------------------------------- */
function Slider({ label, value, min = 0, max = 1, step = 0.01, fmt }) {
  const [v, setV] = useState(value);
  const f = fmt || (x => (Math.round(x * 100) / 100).toString());
  return (
    <div className="am-row">
      <div className="am-row-head">
        <span className="am-row-label">{label}</span>
        <span className="am-row-val">{f(v)}</span>
      </div>
      <input className="am-slider" type="range" min={min} max={max} step={step}
        value={v} onChange={e => setV(parseFloat(e.target.value))} />
    </div>
  );
}

/* ---- Pills (segmented) --------------------------------------------------- */
function Pills({ label, options, value }) {
  const [v, setV] = useState(value ?? options[0]);
  return (
    <div className="am-row">
      {label && <div className="am-row-head"><span className="am-row-label">{label}</span></div>}
      <div className="am-pills">
        {options.map(o => (
          <button key={o} className={`am-pill ${v === o ? 'am-on' : ''}`} onClick={() => setV(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

/* ---- Select -------------------------------------------------------------- */
function SelectRow({ label, options, value }) {
  const [v, setV] = useState(value ?? options[0]);
  return (
    <div className="am-row">
      {label && <div className="am-row-head"><span className="am-row-label">{label}</span></div>}
      <select className="am-select" value={v} onChange={e => setV(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ---- Toggle -------------------------------------------------------------- */
function Toggle({ label, checked }) {
  const [on, setOn] = useState(!!checked);
  return (
    <div className="am-row">
      <div className={`am-toggle ${on ? 'am-on' : ''}`} onClick={() => setOn(o => !o)}>
        <span className="am-row-label">{label}</span>
        <span className="am-switch" />
      </div>
    </div>
  );
}

/* ---- RangeSlider (two-thumb min/max) — mirrors ControlPanel.RangeSlider --- */
function RangeSlider({ label, lo, hi, min = 0, max = 100, step = 1, fmt }) {
  const [a, setA] = useState(lo);
  const [b, setB] = useState(hi);
  const f = fmt || (x => `${Math.round(x)}`);
  const loV = Math.min(a, b), hiV = Math.max(a, b);
  const pct = x => ((x - min) / (max - min)) * 100;
  return (
    <div className="am-row">
      <div className="am-row-head">
        <span className="am-row-label">{label}</span>
        <span className="am-row-val">{f(loV)} – {f(hiV)}</span>
      </div>
      <div className="am-range">
        <div className="am-range-track" />
        <div className="am-range-fill" style={{ left: `${pct(loV)}%`, right: `${100 - pct(hiV)}%` }} />
        <input className="am-range-input" type="range" min={min} max={max} step={step} value={a} onChange={e => setA(parseFloat(e.target.value))} />
        <input className="am-range-input" type="range" min={min} max={max} step={step} value={b} onChange={e => setB(parseFloat(e.target.value))} />
      </div>
    </div>
  );
}

/* ---- NumberInput (commit on blur/Enter, clamped) — mirrors ControlPanel --- */
function NumberInput({ label, value, min, max, step = 1, suffix }) {
  const [v, setV] = useState(value);
  const clamp = x => {
    let n = parseFloat(x); if (isNaN(n)) return value;
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    return n;
  };
  return (
    <div className="am-row">
      <div className="am-row-head"><span className="am-row-label">{label}</span></div>
      <div className="am-numwrap">
        <input className="am-num" type="number" value={v} min={min} max={max} step={step}
          onChange={e => setV(e.target.value)} onBlur={e => setV(clamp(e.target.value))}
          onKeyDown={e => { if (e.key === 'Enter') setV(clamp(e.target.value)); }} />
        {suffix && <span className="am-num-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

/* ---- Skins — switchable styling systems on [data-theme] ------------------- */
const SKINS = [
  { id: 'dark', name: 'Observatory', blurb: 'Ink blue · refined gold', dots: ['#0a0c12', '#ffce47', '#5fe3cd'] },
  { id: 'light', name: 'Paper', blurb: 'Warm paper · deep amber', dots: ['#f0ede4', '#b67d10', '#1d8a78'] },
  { id: 'neon', name: 'Spectrum', blurb: 'Space black · cyan + magenta', dots: ['#05060f', '#34e6cf', '#ff5aa6'] },
  { id: 'blueprint', name: 'Blueprint', blurb: 'Drafting blue · chalk lines', dots: ['#102650', '#f2f6ff', '#69a8ff'] },
  { id: 'phosphor', name: 'Phosphor', blurb: 'CRT green · all mono', dots: ['#04130a', '#3dff7a', '#b5ffce'] },
];
function SkinPicker({ theme, onSetTheme, compact }) {
  const [openMenu, setOpenMenu] = useState(false);
  const cur = SKINS.find(s => s.id === theme) || SKINS[0];
  useEffect(() => {
    if (!openMenu) return;
    const k = e => { if (e.key === 'Escape') setOpenMenu(false); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [openMenu]);
  return (
    <div style={{ position: 'relative' }}>
      <button className="am-skin-btn" title="Skin" onClick={() => setOpenMenu(m => !m)}>
        <span className="am-skin-dots">{cur.dots.map((d, i) => <i key={i} style={{ background: d }} />)}</span>
        {!compact && <span>{cur.name}</span>}
        <Icon name="chevrondown" size={12} style={{ opacity: 0.6 }} />
      </button>
      {openMenu && (
        <>
          <div className="am-menu-scrim" onClick={() => setOpenMenu(false)} />
          <div className="am-skin-menu">
            <div className="am-lay-group">Skins</div>
            {SKINS.map(s => (
              <button key={s.id} className={`am-skin-item ${s.id === theme ? 'am-on' : ''}`} onClick={() => { onSetTheme(s.id); setOpenMenu(false); }}>
                <span className="am-skin-dots">{s.dots.map((d, i) => <i key={i} style={{ background: d }} />)}</span>
                <span className="am-skin-meta"><span>{s.name}</span><span className="am-skin-blurb">{s.blurb}</span></span>
                {s.id === theme && <Icon name="chevron" size={13} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---- usePhone — true below 740px, tracks resizes -------------------------- */
function usePhone() {
  const [p, setP] = useState(() => window.matchMedia('(max-width: 740px)').matches);
  useEffect(() => {
    const m = window.matchMedia('(max-width: 740px)');
    const h = e => setP(e.matches);
    m.addEventListener('change', h); return () => m.removeEventListener('change', h);
  }, []);
  return p;
}

Object.assign(window, { Icon, Section, Slider, Pills, SelectRow, Toggle, RangeSlider, NumberInput, ICONS, SKINS, SkinPicker, usePhone });
