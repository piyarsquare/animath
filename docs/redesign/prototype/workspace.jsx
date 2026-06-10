/* workspace.jsx — the "workspace / saved layouts" concept.
   The inspector is NOT a single tower. Instead:
     • a slim LEFT icon rail — click an icon to open that panel
     • panels are floating, draggable, collapsible cards — you open only
       what you need and arrange them over the plot
     • the arrangement is a LAYOUT; a Layouts menu offers presets +
       "Save current layout…", persisted in localStorage.
   This treats workspace layout as the primary customization of a lab. */

const { useState: wS, useEffect: wE, useRef: wR } = React;
const WC = window.AnimathChrome;
const WLS = 'animath-workspace';

function wsLoad() { try { return JSON.parse(localStorage.getItem(WLS)) || {}; } catch (e) { return {}; } }
function wsSave(s) { try { localStorage.setItem(WLS, JSON.stringify(s)); } catch (e) {} }

/* ---- Built-in layouts, derived from an app's sections ---- */
/* rough panel heights (px) for tidy auto-packing of the "Everything" view */
const WS_EST = {
  function: 190, domain: 236, camera: 236, color: 236, particles: 312, motion: 158, detail: 200, rotate: 332,
  set: 168, viewport: 252, iteration: 172, palette: 212,
  stars: 320, planet: 200, layout: 200, playback: 320, batch: 250, histogram: 300, survival: 232,
  grid: 212, marks: 200, morph: 246, handles: 226, seed: 250, surface: 236,
  mesh: 200, move: 230, tess: 158, prefs: 212, population: 186, stats: 340, rounds: 200, array: 212, agents: 200, run: 246, metrics: 300, race: 200,
};

function builtinLayouts(app) {
  const ids = app.sections.map(s => s.id);
  const has = id => ids.includes(id);
  const pick = (...wanted) => wanted.filter(has);
  const col = (list, startX) => {
    const o = {};
    list.forEach((id, i) => { o[id] = { x: startX, y: 18 + i * 258 }; });
    return o;
  };
  /* pack panels top-to-bottom into columns by estimated height — no overlap, no tower */
  const pack = (list) => {
    const o = {}; const colW = 274, maxH = 648;
    let col = 0, y = 18, colH = 0;
    list.forEach(id => {
      const h = (WS_EST[id] || 224) + 14;
      if (colH > 0 && colH + h > maxH) { col++; y = 18; colH = 0; }
      o[id] = { x: 84 + col * colW, y };
      y += h; colH += h;
    });
    return o;
  };
  const L = [];
  L.push({ id: 'compact', name: 'Compact', sub: 'Rail only — open as needed', icon: 'layers', open: {} });
  if (app.id === 'complex-particles') {
    L.push({ id: 'essentials', name: 'Essentials', sub: 'Function · Camera', icon: 'tune', open: col(pick('function', 'camera'), 84) });
    L.push({ id: 'appearance', name: 'Appearance', sub: 'Color · Particles · Motion', icon: 'palette', open: { color: { x: 84, y: 18 }, particles: { x: 366, y: 18 }, motion: { x: 84, y: 322 } } });
    L.push({ id: 'rotate', name: 'Rotate', sub: '4D rotation over the plot', icon: 'rotate', open: { rotate: { x: 360, y: 96 } } });
  } else if (app.id === 'trinary') {
    L.push({ id: 'sandbox', name: 'Sandbox', sub: 'Stars · Playback', icon: 'orbit', open: { stars: { x: 84, y: 16 }, playback: { x: 84, y: 348 } } });
    L.push({ id: 'lab', name: 'Lab', sub: 'Batch · Outcomes · Survival', icon: 'flask', open: { batch: { x: 84, y: 16 }, histogram: { x: 84, y: 282 }, survival: { x: 360, y: 16 } } });
  } else if (app.id === 'stable-marriage') {
    L.push({ id: 'setup', name: 'Setup', sub: 'Preferences · Playback', icon: 'tune', open: { prefs: { x: 84, y: 16 }, playback: { x: 84, y: 252 } } });
    L.push({ id: 'analysis', name: 'Analysis', sub: 'Matching stats · Rounds', icon: 'chart', open: { stats: { x: 84, y: 16 }, rounds: { x: 360, y: 16 } } });
  } else if (app.id === 'agentic-sorting') {
    L.push({ id: 'setup', name: 'Setup', sub: 'Array · Agents · Run', icon: 'tune', open: { array: { x: 84, y: 16 }, run: { x: 84, y: 252 } } });
    L.push({ id: 'analysis', name: 'Analysis', sub: 'Metrics · Race', icon: 'chart', open: { metrics: { x: 84, y: 16 }, race: { x: 360, y: 16 } } });
  } else {
    L.push({ id: 'essentials', name: 'Essentials', sub: 'Core panels', icon: 'tune', open: col(ids.slice(0, 2), 84) });
  }
  L.push({ id: 'everything', name: 'Everything', sub: `All ${ids.length} panels, tiled`, icon: 'grid', open: pack(ids) });
  return L;
}

/* ---- Magnetic snapping (soft / sticky) ------------------------------------
   Panels may OVERLAP freely. Edges are magnetic: as a dragged edge nears a
   target (workspace border, or another panel's edge — aligned or docked with a
   gap) it feels resistance and is pulled toward it, then locks when very close.
   A guide line shows only while an axis is actually locked. */
const WS_LOCK = 9, WS_PULL = 26, WS_GAP = 10, WS_RAIL = 78, WS_MARGIN = 14;
function softAxis(raw, cands) {
  let best = null, bd = WS_PULL;
  cands.forEach(c => { const d = Math.abs(raw - c.v); if (d < bd) { bd = d; best = c; } });
  if (!best) return { pos: raw, guide: null };
  const d = raw - best.v, ad = Math.abs(d);
  if (ad <= WS_LOCK) return { pos: best.v, guide: best.g, locked: true };
  // resistance: displayed offset eases from 0 (at lock) to full (at pull edge)
  const f = (ad - WS_LOCK) / (WS_PULL - WS_LOCK);
  return { pos: best.v + d * f, guide: best.g, locked: false };
}
function snapPos(x, y, w, h, SW, SH, others) {
  const xC = [{ v: WS_RAIL, g: WS_RAIL }, { v: SW - w - WS_MARGIN, g: SW - WS_MARGIN }];
  const yC = [{ v: WS_MARGIN, g: WS_MARGIN }, { v: SH - h - WS_MARGIN, g: SH - WS_MARGIN }];
  others.forEach(o => {
    xC.push({ v: o.x, g: o.x }, { v: o.x + o.w - w, g: o.x + o.w },
            { v: o.x + o.w, g: o.x + o.w }, { v: o.x - w, g: o.x });
    yC.push({ v: o.y, g: o.y }, { v: o.y + o.h - h, g: o.y + o.h },
            { v: o.y + o.h, g: o.y + o.h }, { v: o.y - h, g: o.y });
  });
  const sx = softAxis(x, xC), sy = softAxis(y, yC);
  const guides = {};
  if (sx.locked) guides.gx = sx.guide;
  if (sy.locked) guides.gy = sy.guide;
  // clamp only enough to keep the panel reachable — overlap is allowed
  const bx = Math.max(WS_RAIL - 4, Math.min(sx.pos, SW - 44));
  const by = Math.max(8, Math.min(sy.pos, SH - 42));
  return { x: bx, y: by, guides };
}

/* assign stacking z to layout panels so controls default ABOVE view windows */
function stampZ(openMap, base) {
  const out = {}; let z = (base || 0) + 1;
  Object.keys(openMap).forEach(k => { out[k] = { ...openMap[k], z: openMap[k].z || z++ }; });
  return out;
}

/* ---- A floating, draggable, collapsible panel card ---- */
function WSPanel({ sec, state, nodeRef, snap, onMove, onRaise, onToggleCollapse, onClose }) {
  const onDown = (e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const o = { sx: e.clientX, sy: e.clientY, ox: state.x, oy: state.y };
    const move = (ev) => {
      const rawX = o.ox + (ev.clientX - o.sx), rawY = o.oy + (ev.clientY - o.sy);
      onMove(snap ? snap(rawX, rawY) : { x: Math.max(70, rawX), y: Math.max(8, rawY) });
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); onMove({ settle: true }); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };
  return (
    <div ref={nodeRef} className="am-ws-panel" style={{ left: state.x, top: state.y, zIndex: 30 + (state.z || 0) }} onMouseDown={onRaise}>
      <div className={`am-ws-phead ${state.collapsed ? 'am-collapsed' : ''}`} onMouseDown={onDown}>
        <span className="am-ws-pico"><Icon name={sec.icon} size={13} /></span>
        <span className="am-ws-panel-title">{sec.title}</span>
        <button className="am-btn am-btn-icon" title={state.collapsed ? 'Expand' : 'Collapse'} onClick={onToggleCollapse}>
          <Icon name={state.collapsed ? 'chevron' : 'chevrondown'} size={14} />
        </button>
        <button className="am-btn am-btn-icon" title="Close panel" onClick={onClose}><Icon name="close" size={14} /></button>
      </div>
      {!state.collapsed && <div className="am-ws-pbody"><sec.Body /></div>}
    </div>
  );
}

/* ---- A view window: a draggable / dockable / resizable plot ("viewports
   are windows too"). Shares the float / snap / raise model with panels. ---- */
function WSView({ view, theme, nodeRef, snap, resize, onMove, onResize, onRaise, onToggleCollapse }) {
  const onDown = (e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const o = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
    const move = (ev) => {
      const rx = o.ox + (ev.clientX - o.sx), ry = o.oy + (ev.clientY - o.sy);
      onMove(snap ? snap(rx, ry) : { x: Math.max(70, rx), y: Math.max(8, ry) });
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); onMove({ settle: true }); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };
  const onResizeDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const o = { sx: e.clientX, sy: e.clientY, ow: view.w, oh: view.h };
    const move = (ev) => onResize(resize(o.ow + (ev.clientX - o.sx), o.oh + (ev.clientY - o.sy), view.x, view.y));
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); onResize({ settle: true }); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };
  return (
    <div ref={nodeRef} className="am-ws-view" style={{ left: view.x, top: view.y, width: view.w, height: view.collapsed ? undefined : view.h, zIndex: 30 + (view.z || 0) }} onMouseDown={onRaise}>
      <div className="am-ws-vhead" onMouseDown={onDown}>
        <span className="am-ws-vico"><Icon name="window" size={13} /></span>
        <span className="am-ws-vtitle">{view.title}</span>
        <button className="am-btn am-btn-icon" title={view.collapsed ? 'Expand' : 'Collapse'} onClick={onToggleCollapse}>
          <Icon name={view.collapsed ? 'chevron' : 'chevrondown'} size={14} />
        </button>
      </div>
      {!view.collapsed && <div className="am-ws-view-body"><MockViz kind={view.kind} theme={theme} /></div>}
      {!view.collapsed && <div className="am-ws-resize" onMouseDown={onResizeDown} title="Resize"><Icon name="expand" size={10} /></div>}
    </div>
  );
}

/* ---- Layouts (workspaces) menu ---- */
function LayoutsMenu({ current, builtin, saved, onPick, onSave, onDelete, onClose }) {
  wE(() => {
    const k = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  const Item = (l) => (
    <button key={l.id} className={`am-lay-item ${current === l.id ? 'am-on' : ''}`} onClick={() => onPick(l)}>
      <span className="am-lay-ico"><Icon name={l.icon || 'layers'} size={13} /></span>
      <span className="am-lay-meta"><span>{l.name}</span>{l.sub && <span className="am-lay-sub">{l.sub}</span>}</span>
      {l.saved && <span className="am-lay-del" onClick={(e) => { e.stopPropagation(); onDelete(l); }}><Icon name="close" size={14} /></span>}
      {current === l.id && !l.saved && <Icon name="chevron" size={14} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
    </button>
  );
  return (
    <>
      <div className="am-menu-scrim" onClick={onClose} />
      <div className="am-layouts-menu">
        <div className="am-lay-group">Workspaces</div>
        {builtin.map(Item)}
        {saved.length > 0 && <div className="am-lay-group">Saved</div>}
        {saved.map(Item)}
        <div className="am-lay-foot">
          <button className="am-lay-save" onClick={onSave}><Icon name="pin" size={15} /> Save current layout…</button>
        </div>
      </div>
    </>
  );
}

/* ====================================================================== *
 * Workspace — the concept harness
 * ====================================================================== */
function DesktopWorkspace({ appId, meta, theme, onHome, onSetTheme }) {
  const boot = wsLoad();
  const app = WC.getApp(appId);
  const builtin = React.useMemo(() => builtinLayouts(app), [appId]);
  const restore = boot.open && boot.appId === appId;
  const nViews = (app.views || []).length;
  const [saved, setSaved] = wS(boot.saved || []);
  const [open, setOpen] = wS(() => restore ? boot.open : stampZ(builtin[1].open, nViews));
  const [curLayout, setCurLayout] = wS(restore && boot.curLayout ? boot.curLayout : builtin[1].id);
  const [menu, setMenu] = wS(false);
  const [guides, setGuides] = wS(null);
  const stageRef = wR(null);
  const panelRefs = wR({});
  const viewRefs = wR({});
  const expandedHRef = wR({});
  const firstRun = wR(true);
  const initViews = () => (app.views || []).map((v, i) => ({ ...v, z: i + 1 }));
  const [views, setViews] = wS(() => (restore && boot.views) ? boot.views : initViews());

  wE(() => { wsSave({ appId, saved, open, curLayout, views }); }, [appId, saved, open, curLayout, views]);
  // when the app changes (not on first mount / reload) reset to its Essentials layout + default views
  wE(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const b = builtinLayouts(app); setOpen(stampZ(b[1].open, (app.views || []).length)); setCurLayout(b[1].id); setViews(initViews());
  }, [appId]);

  const allLayouts = [...builtin, ...saved];
  const curName = allLayouts.find(l => l.id === curLayout)?.name || 'Custom';

  /* stage geometry + measured sibling rects, in stage-local coords */
  const stageGeo = () => {
    const el = stageRef.current;
    const r = el ? el.getBoundingClientRect() : { left: 0, top: 0, width: 1100, height: 680 };
    return { sr: r, SW: el ? el.clientWidth : 1100, SH: el ? el.clientHeight : 680 };
  };
  /* every window's rect (panels AND view-windows) in unscaled layout coords */
  const allRects = (selfId) => {
    const out = [];
    Object.keys(open).forEach(o => { if (o === selfId) return; const e = panelRefs.current[o]; if (e) out.push({ x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }); });
    views.forEach(v => { if (v.id === selfId) return; const e = viewRefs.current[v.id]; if (e) out.push({ x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }); });
    return out;
  };
  const showGuides = (g, SW, SH) => setGuides(g && (g.gx != null || g.gy != null) ? { ...g, SW, SH } : null);
  /* drag-snap resolver shared by panels and views */
  const makeSnap = (id, refs) => (rawX, rawY) => {
    const { SW, SH } = stageGeo();
    const self = refs.current[id];
    const w = self ? self.offsetWidth : 268, h = self ? self.offsetHeight : 240;
    const res = snapPos(rawX, rawY, w, h, SW, SH, allRects(id));
    showGuides(res.guides, SW, SH);
    return { x: res.x, y: res.y };
  };
  /* resize-snap for views: snap the far (right / bottom) edges to other windows */
  const makeResize = (id) => (rawW, rawH, x, y) => {
    const { SW, SH } = stageGeo();
    const targets = allRects(id);
    const rights = [SW - WS_MARGIN], bottoms = [SH - WS_MARGIN];
    targets.forEach(o => { rights.push(o.x, o.x + o.w); bottoms.push(o.y, o.y + o.h); });
    let w = rawW, h = rawH; const g = {};
    let bd = WS_LOCK; rights.forEach(v => { const d = Math.abs(x + rawW - v); if (d < bd) { bd = d; w = v - x; g.gx = v; } });
    bd = WS_LOCK; bottoms.forEach(v => { const d = Math.abs(y + rawH - v); if (d < bd) { bd = d; h = v - y; g.gy = v; } });
    w = Math.max(220, Math.min(w, SW - x - 4));
    h = Math.max(150, Math.min(h, SH - y - 4));
    showGuides(g, SW, SH);
    return { w: Math.round(w), h: Math.round(h) };
  };
  const nextZ = () => Math.max(0, ...Object.values(open).map(p => p.z || 1), ...views.map(v => v.z || 1)) + 1;
  /* first non-overlapping slot, packing into columns next to the rail */
  const freeSlot = (estH) => {
    const { SW, SH } = stageGeo();
    const occ = allRects('__none__');
    const colW = 268 + WS_GAP;
    for (let col = 0; col < 6; col++) {
      const x = WS_RAIL + col * colW;
      if (x + 268 > SW - 4) break;
      const inCol = occ.filter(o => Math.abs(o.x - x) < colW * 0.6);
      const bottom = inCol.length ? Math.max(...inCol.map(o => o.y + o.h)) + WS_GAP : WS_MARGIN;
      if (bottom + estH <= SH - WS_MARGIN) return { x, y: bottom };
    }
    const n = Object.keys(open).length;
    return { x: WS_RAIL + (n % 4) * 22, y: WS_MARGIN + (n % 4) * 22 };
  };

  const pickLayout = (l) => { setOpen(stampZ(JSON.parse(JSON.stringify(l.open)), (app.views || []).length)); setCurLayout(l.id); setMenu(false); };
  const markCustom = () => { if (curLayout !== 'custom') setCurLayout('custom'); };
  const togglePanel = (id) => {
    if (open[id]) { closePanel(id); return; }
    const pos = freeSlot(WS_EST[id] || 224);
    setOpen(prev => ({ ...prev, [id]: { ...pos, z: nextZ() } })); markCustom();
  };
  const movePanel = (id, pos) => {
    if (pos.settle) { setGuides(null); return; }
    setOpen(prev => ({ ...prev, [id]: { ...prev[id], ...pos } })); markCustom();
  };
  /* bring a touched window (panel or view) to the front */
  const raisePanel = (id) => {
    setOpen(prev => {
      const top = Math.max(0, ...Object.values(prev).map(p => p.z || 1), ...views.map(v => v.z || 1));
      if ((prev[id]?.z || 1) === top && top > 1) return prev;
      return { ...prev, [id]: { ...prev[id], z: top + 1 } };
    });
  };
  /* view-window handlers */
  const moveView = (id, pos) => {
    if (pos.settle) { setGuides(null); return; }
    setViews(prev => prev.map(v => v.id === id ? { ...v, ...pos } : v)); markCustom();
  };
  const resizeView = (id, size) => {
    if (size.settle) { setGuides(null); return; }
    setViews(prev => prev.map(v => v.id === id ? { ...v, ...size } : v)); markCustom();
  };
  const raiseView = (id) => {
    setViews(prev => {
      const top = Math.max(0, ...Object.values(open).map(p => p.z || 1), ...prev.map(v => v.z || 1));
      if ((prev.find(v => v.id === id)?.z || 1) === top && top > 1) return prev;
      return prev.map(v => v.id === id ? { ...v, z: top + 1 } : v);
    });
  };
  const collapseView = (id) => { setViews(prev => prev.map(v => v.id === id ? { ...v, collapsed: !v.collapsed } : v)); markCustom(); };
  /* Collapse/expand — docked neighbours below move with the height change, so a
     sticky stack "closes up" on collapse and "pushes out" on expand. */
  const collapsePanel = (id) => {
    const el = panelRefs.current[id];
    if (!el) { setOpen(prev => ({ ...prev, [id]: { ...prev[id], collapsed: !prev[id].collapsed } })); return; }
    const willCollapse = !open[id].collapsed;
    const head = el.querySelector('.am-ws-phead');
    const fromH = el.offsetHeight;
    let toH;
    if (willCollapse) { expandedHRef.current[id] = fromH; toH = head.offsetHeight; }
    else { toH = expandedHRef.current[id] || fromH; }
    // geometry of every open panel, unscaled layout space
    const geo = {};
    Object.keys(open).forEach(o => { const e = panelRefs.current[o]; if (e) geo[o] = { x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }; });
    // BFS down the docked chain from this panel's bottom edge
    const toMove = new Set(), q = [id];
    const bottomOf = o => o === id ? geo[o].y + fromH : geo[o].y + geo[o].h;
    while (q.length) {
      const cur = q.shift(), cb = bottomOf(cur), g0 = geo[cur];
      Object.keys(geo).forEach(o => {
        if (o === id || o === cur || toMove.has(o)) return;
        const g = geo[o];
        const xOverlap = g.x < g0.x + g0.w && g.x + g.w > g0.x;
        if (xOverlap && Math.abs(g.y - cb) <= 6) { toMove.add(o); q.push(o); }
      });
    }
    // re-stack the docked chain flush against the anchor's NEW bottom (drift-free)
    const chain = [...toMove].sort((a, b) => geo[a].y - geo[b].y);
    setOpen(prev => {
      const next = { ...prev, [id]: { ...prev[id], collapsed: willCollapse } };
      let runBottom = geo[id].y + toH;
      chain.forEach(o => {
        next[o] = { ...prev[o], y: Math.max(8, Math.round(runBottom)) };
        runBottom += geo[o].h;
      });
      return next;
    });
    markCustom();
  };
  const closePanel = (id) => { setOpen(prev => { const n = { ...prev }; delete n[id]; return n; }); markCustom(); };
  const saveLayout = () => {
    const name = window.prompt('Name this layout', 'My layout');
    if (!name) return;
    const id = 'saved-' + Date.now();
    const lay = { id, name, sub: `${Object.keys(open).length} panels`, icon: 'pin', saved: true, open: JSON.parse(JSON.stringify(open)) };
    setSaved(s => [...s, lay]); setCurLayout(id); setMenu(false);
  };
  const deleteLayout = (l) => { setSaved(s => s.filter(x => x.id !== l.id)); if (curLayout === l.id) setCurLayout('custom'); };

  const openIds = Object.keys(open);

  return (
    <div className="am-app" data-app data-screen-label={'Workspace · ' + app.title}>
      <header className="am-bar">
        <button className="am-brand am-home-btn" title="Home — all animations" onClick={onHome}>
          <span className="am-brand-mark">a</span>
          <Icon name="home" size={13} className="am-home-hint" />
        </button>
        <div className="am-bar-sep" />
        <div className="am-titlewrap"><span className="am-title">{meta?.name || app.title}</span><span className="am-sub">{meta?.blurb || app.sub}</span></div>
        <div className="am-bar-sep" />
        <div style={{ position: 'relative' }}>
          <button className="am-layouts-btn" onClick={() => setMenu(m => !m)}>
            <Icon name="layers" size={15} /><span>Layout:</span> <span className="am-lay-name">{curName}{curLayout === 'custom' ? ' *' : ''}</span>
            <Icon name="chevrondown" size={13} style={{ opacity: 0.6 }} />
          </button>
          {menu && <LayoutsMenu current={curLayout} builtin={builtin} saved={saved}
            onPick={pickLayout} onSave={saveLayout} onDelete={deleteLayout} onClose={() => setMenu(false)} />}
        </div>
        <div className="am-spacer" />
        <SkinPicker theme={theme} onSetTheme={onSetTheme} />
      </header>

      <div className="am-stage am-stage-void" ref={stageRef}>
        {/* snap guides */}
        {guides && guides.gx != null && <div className="am-ws-guide am-ws-guide-v" style={{ left: guides.gx }} />}
        {guides && guides.gy != null && <div className="am-ws-guide am-ws-guide-h" style={{ top: guides.gy }} />}

        {/* view windows — the plots are windows too */}
        {views.map(v => (
          <WSView key={v.id} view={v} theme={theme}
            nodeRef={el => { if (el) viewRefs.current[v.id] = el; else delete viewRefs.current[v.id]; }}
            snap={makeSnap(v.id, viewRefs)} resize={makeResize(v.id)}
            onMove={pos => moveView(v.id, pos)} onResize={size => resizeView(v.id, size)}
            onRaise={() => raiseView(v.id)} onToggleCollapse={() => collapseView(v.id)} />
        ))}

        {/* left icon rail — panels grouped by vocabulary tier */}
        <div className="am-ws-rail">
          {app.sections.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && app.sections[i - 1].tier !== s.tier && <div className="am-ws-rail-sep" />}
              <button className={`am-ws-rail-btn ${open[s.id] ? 'am-on' : ''}`} onClick={() => togglePanel(s.id)}>
                <Icon name={s.icon} size={18} />
                <span className="am-ws-rail-tip">{s.title}<i>{s.tier}</i></span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* floating panels */}
        {openIds.length === 0 && (
          <div className="am-ws-empty">No panels open — click an icon on the <b>rail</b> to open one, arrange the cards, then save the arrangement as a layout.</div>
        )}
        {app.sections.filter(s => open[s.id]).map(s => (
          <WSPanel key={s.id} sec={s} state={open[s.id]}
            nodeRef={el => { if (el) panelRefs.current[s.id] = el; else delete panelRefs.current[s.id]; }}
            snap={makeSnap(s.id, panelRefs)}
            onMove={pos => movePanel(s.id, pos)} onRaise={() => raisePanel(s.id)} onToggleCollapse={() => collapsePanel(s.id)} onClose={() => closePanel(s.id)} />
        ))}
      </div>

    </div>
  );
}

/* ====================================================================== *
 * PhoneWorkspace — same vocabulary, phone-native chrome: views stack
 * full-width, the rail becomes a bottom dock, panels open as a sheet.
 * ====================================================================== */
function PhoneWorkspace({ appId, meta, theme, onHome, onSetTheme }) {
  const app = WC.getApp(appId);
  const [sheet, setSheet] = wS(null);
  wE(() => { setSheet(null); }, [appId]);
  const active = app.sections.find(s => s.id === sheet);
  return (
    <div className="am-app am-phone-app" data-app data-screen-label={'Workspace (phone) · ' + app.title}>
      <header className="am-bar" style={{ padding: '0 10px' }}>
        <button className="am-brand am-home-btn" title="Home" onClick={onHome}>
          <span className="am-brand-mark">a</span>
          <Icon name="home" size={13} className="am-home-hint" />
        </button>
        <div className="am-bar-sep" />
        <div className="am-titlewrap"><span className="am-title" style={{ fontSize: 14 }}>{meta?.name || app.title}</span></div>
        <div className="am-spacer" />
        <SkinPicker theme={theme} onSetTheme={onSetTheme} compact />
      </header>
      <div className="am-phone-scroll">
        {(app.views || []).map(v => (
          <div className="am-phone-view" key={v.id}>
            <div className="am-ws-vhead">
              <span className="am-ws-vico"><Icon name="window" size={13} /></span>
              <span className="am-ws-vtitle">{v.title}</span>
            </div>
            <div className="am-phone-view-body"><MockViz kind={v.kind} theme={theme} /></div>
          </div>
        ))}
      </div>
      <nav className="am-phone-dock">
        {app.sections.map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 && app.sections[i - 1].tier !== s.tier && <div className="am-phone-dock-sep" />}
            <button className={`am-phone-dock-btn ${sheet === s.id ? 'am-on' : ''}`} onClick={() => setSheet(sheet === s.id ? null : s.id)}>
              <Icon name={s.icon} size={19} />
              <span>{s.title}</span>
            </button>
          </React.Fragment>
        ))}
      </nav>
      {active && (
        <>
          <div className="am-phone-scrim" onClick={() => setSheet(null)} />
          <div className="am-phone-sheet">
            <div className="am-sheet-grip" />
            <div className="am-phone-sheet-head">
              <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon name={active.icon} size={16} /></span>
              <span className="am-phone-sheet-title">{active.title}</span>
              <span className="am-sec-tier">{active.tier}</span>
              <button className="am-btn am-btn-icon" onClick={() => setSheet(null)}><Icon name="chevrondown" size={17} /></button>
            </div>
            <div className="am-phone-sheet-body"><active.Body /></div>
          </div>
        </>
      )}
    </div>
  );
}

/* Responsive entry: phone chrome below 740px, windowed workspace above. */
function Workspace(props) {
  const phone = usePhone();
  return phone ? <PhoneWorkspace {...props} /> : <DesktopWorkspace {...props} />;
}

Object.assign(window, { Workspace });
