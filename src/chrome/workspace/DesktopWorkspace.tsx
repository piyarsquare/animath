import React, { useMemo, useRef, useState } from 'react';
import { usePersistentState } from '../../lib/usePersistentState';
import { ExplainerModal } from '../ExplainerModal';
import { TopBar } from '../TopBar';
import { useEscLayer } from '../useEscLayer';
import { sortByTier } from './archetypes';
import { snapPos, snapResize, freeSlot, dockedChainBelow, PANEL_W } from './geometry';
import type { Rect, SnapGuides } from './geometry';
import { builtinLayouts, applyLayout, sanitize, raiseWindow, DEFAULT_EST } from './layouts';
import { LAYER } from './layers';
import { Panel } from './Panel';
import { ViewWindow } from './ViewWindow';
import { Rail } from './Rail';
import { LayoutsControl } from './LayoutsMenu';
import type { LayoutDef, PersistedWorkspace, SavedLayout, WorkspaceProps } from './types';

type RefMap = React.MutableRefObject<Record<string, HTMLDivElement | null>>;

/**
 * The desktop workspace (DESIGN-SPEC §2): a void stage where the plots
 * ("view windows") and the control panels are draggable windows sharing one
 * interaction model — soft-magnetic snapping with accent guide lines, tight
 * docking, never-overlap opening, collapse-chain reflow, raise-on-touch —
 * plus the left icon rail and named layouts, persisted per app.
 */
export default function DesktopWorkspace(props: WorkspaceProps) {
  const { appId, title, subtitle, views, layouts: appLayouts, defaultLayoutId, explainer, titlePanel, modes, activeMode, onModeChange } = props;
  const sections = useMemo(() => sortByTier(props.sections), [props.sections]);
  const builtin = useMemo(
    () => builtinLayouts(sections, appLayouts),
    // layout geometry depends only on the section id set
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sections.map(s => s.id).join(','), appLayouts]
  );

  const defaultLayout = (): LayoutDef => {
    const wanted = defaultLayoutId ?? appLayouts?.[0]?.id ?? 'everything';
    return builtin.find(l => l.id === wanted) ?? builtin[builtin.length - 1];
  };
  const initial = (): PersistedWorkspace => applyLayout(sections, views, defaultLayout(), []);

  const [raw, setRaw] = usePersistentState<PersistedWorkspace | null>(`ws:${appId}`, null);
  const state = useMemo(
    () => sanitize(raw, sections, views) ?? initial(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, sections, views]
  );
  const update = (fn: (s: PersistedWorkspace) => PersistedWorkspace) =>
    setRaw(prev => fn(sanitize(prev, sections, views) ?? initial()));

  const [guides, setGuides] = useState<SnapGuides | null>(null);
  /* fullscreen is transient view state — deliberately not persisted */
  const [fullView, setFullView] = useState<string | null>(null);
  /* explainer opened from the fullscreen view header (the top bar is buried) */
  const [fullHelp, setFullHelp] = useState(false);
  /* staged Esc: the layer stack peels modal → fullscreen, one per keypress */
  useEscLayer(fullView != null, () => setFullView(null));
  const stageRef = useRef<HTMLDivElement | null>(null);
  const panelRefs: RefMap = useRef({});
  const viewRefs: RefMap = useRef({});
  const expandedH = useRef<Record<string, number>>({});

  const estOf = (id: string) => sections.find(s => s.id === id)?.estHeight ?? DEFAULT_EST;

  /* ---- stage geometry + measured window rects (stage-local coords) ---- */
  const stageGeo = () => {
    const el = stageRef.current;
    return { SW: el ? el.clientWidth : 1100, SH: el ? el.clientHeight : 680 };
  };
  const allRects = (selfId: string): Rect[] => {
    const out: Rect[] = [];
    const collect = (refs: RefMap) => {
      for (const id of Object.keys(refs.current)) {
        if (id === selfId) continue;
        const el = refs.current[id];
        if (el) out.push({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
      }
    };
    collect(panelRefs);
    collect(viewRefs);
    return out;
  };
  const showGuides = (g: SnapGuides) =>
    setGuides(g.gx != null || g.gy != null ? g : null);

  /* drag-snap resolver shared by panels and views */
  const makeSnap = (id: string, refs: RefMap) => (rawX: number, rawY: number) => {
    const { SW, SH } = stageGeo();
    const self = refs.current[id];
    const w = self?.offsetWidth ?? PANEL_W;
    const h = self?.offsetHeight ?? 240;
    const res = snapPos(rawX, rawY, w, h, SW, SH, allRects(id));
    showGuides(res.guides);
    return { x: res.x, y: res.y };
  };
  /* resize-snap for views: far edges lock to other windows + stage margin */
  const makeResize = (id: string) => (rawW: number, rawH: number, x: number, y: number) => {
    const { SW, SH } = stageGeo();
    const res = snapResize(rawW, rawH, x, y, SW, SH, allRects(id));
    showGuides(res.guides);
    return { w: res.w, h: res.h };
  };
  const settle = () => setGuides(null);

  const topZ = (s: PersistedWorkspace) => Math.max(
    0,
    ...Object.values(s.open).map(p => p.z ?? 1),
    ...Object.values(s.views).map(v => v.z ?? 1),
  );

  /* ---- panel actions ---- */
  const togglePanel = (id: string) => {
    if (state.open[id]) { closePanel(id); return; }
    const { SW, SH } = stageGeo();
    const pos = freeSlot(estOf(id), SW, SH, allRects('__none__'), Object.keys(state.open).length);
    update(s => ({ ...s, layout: 'custom', open: { ...s.open, [id]: { ...pos, z: topZ(s) + 1 } } }));
  };
  const closePanel = (id: string) => {
    update(s => {
      const open = { ...s.open };
      delete open[id];
      return { ...s, layout: 'custom', open };
    });
  };
  const movePanel = (id: string, pos: { x: number; y: number }) =>
    update(s => ({ ...s, layout: 'custom', open: { ...s.open, [id]: { ...s.open[id], ...pos } } }));
  /* raiseWindow renumbers z to 1..n on every raise, so persisted z stays
     bounded below the fullscreen layer (CHROME-REVIEW F5 addendum) */
  const raisePanel = (id: string) => update(s => raiseWindow(s, 'open', id));
  /* Collapse/expand moves the chain of panels docked below, so a docked stack
     closes up on collapse and pushes out on expand (drift-free restack). */
  const collapsePanel = (id: string) => {
    const el = panelRefs.current[id];
    const cur = state.open[id];
    if (!el || !cur) {
      update(s => ({ ...s, open: { ...s.open, [id]: { ...s.open[id], collapsed: !s.open[id].collapsed } } }));
      return;
    }
    const willCollapse = !cur.collapsed;
    const head = el.querySelector('.am-ws-phead') as HTMLElement | null;
    const fromH = el.offsetHeight;
    let toH: number;
    if (willCollapse) { expandedH.current[id] = fromH; toH = head?.offsetHeight ?? 40; }
    else { toH = expandedH.current[id] ?? fromH; }
    const geo: Record<string, Rect> = {};
    for (const o of Object.keys(panelRefs.current)) {
      const e = panelRefs.current[o];
      if (e) geo[o] = { x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight };
    }
    const chain = dockedChainBelow(id, geo, geo[id].y + fromH);
    update(s => {
      const open = { ...s.open, [id]: { ...s.open[id], collapsed: willCollapse } };
      let runBottom = geo[id].y + toH;
      for (const o of chain) {
        open[o] = { ...s.open[o], y: Math.max(8, Math.round(runBottom)) };
        runBottom += geo[o].h;
      }
      return { ...s, layout: 'custom', open };
    });
  };

  /* ---- view-window actions ---- */
  const moveView = (id: string, pos: { x: number; y: number }) =>
    update(s => ({ ...s, layout: 'custom', views: { ...s.views, [id]: { ...s.views[id], ...pos } } }));
  const resizeView = (id: string, size: { w: number; h: number }) =>
    update(s => ({ ...s, layout: 'custom', views: { ...s.views, [id]: { ...s.views[id], ...size } } }));
  const raiseView = (id: string) => update(s => raiseWindow(s, 'views', id));
  const collapseView = (id: string) =>
    update(s => ({ ...s, layout: 'custom', views: { ...s.views, [id]: { ...s.views[id], collapsed: !s.views[id].collapsed } } }));

  /* ---- layouts ---- */
  const pickLayout = (l: LayoutDef) => update(s => applyLayout(sections, views, l, s.saved));
  const saveLayout = () => {
    const name = window.prompt('Name this layout', 'My layout');
    if (!name) return;
    update(s => {
      const id = 'saved-' + Date.now();
      const open: LayoutDef['open'] = {};
      for (const k of Object.keys(s.open)) {
        const p = s.open[k];
        open[k] = { x: p.x, y: p.y, ...(p.collapsed ? { collapsed: true } : {}) };
      }
      const lviews: LayoutDef['views'] = {};
      for (const k of Object.keys(s.views)) {
        const v = s.views[k];
        lviews[k] = { x: v.x, y: v.y, w: v.w, h: v.h, open: v.open !== false, ...(v.collapsed ? { collapsed: true } : {}) };
      }
      const lay: SavedLayout = {
        id, name, icon: 'pin', saved: true,
        sub: `${Object.keys(s.open).length} panels`,
        open, views: lviews,
      };
      return { ...s, saved: [...s.saved, lay], layout: id };
    });
  };
  const deleteLayout = (l: SavedLayout) =>
    update(s => ({
      ...s,
      saved: s.saved.filter(x => x.id !== l.id),
      layout: s.layout === l.id ? 'custom' : s.layout,
    }));

  const openIds = Object.keys(state.open);

  return (
    <div className="am-app">
      <TopBar
        title={title}
        subtitle={subtitle}
        modes={modes}
        activeMode={activeMode}
        onModeChange={onModeChange}
        explainer={explainer}
        onTitleClick={
          titlePanel && sections.some(s => s.id === titlePanel)
            ? () => (state.open[titlePanel] ? raisePanel(titlePanel) : togglePanel(titlePanel))
            : undefined
        }
      >
        <LayoutsControl
          current={state.layout}
          builtin={builtin}
          saved={state.saved}
          onPick={pickLayout}
          onSave={saveLayout}
          onDelete={deleteLayout}
        />
      </TopBar>

      <div className={`am-stage am-stage-void${fullView ? ' am-has-full' : ''}`} ref={stageRef}>
        {guides?.gx != null && <div className="am-ws-guide am-ws-guide-v" style={{ left: guides.gx }} />}
        {guides?.gy != null && <div className="am-ws-guide am-ws-guide-h" style={{ top: guides.gy }} />}

        {/* view windows — the plots are windows too */}
        {views.map(v => {
          const vs = state.views[v.id];
          if (!vs || vs.open === false) return null;
          return (
            <ViewWindow
              key={v.id}
              view={v}
              state={vs}
              full={fullView === v.id}
              nodeRef={el => { if (el) viewRefs.current[v.id] = el; else delete viewRefs.current[v.id]; }}
              snap={makeSnap(v.id, viewRefs)}
              resize={makeResize(v.id)}
              onMove={pos => moveView(v.id, pos)}
              onResize={size => resizeView(v.id, size)}
              onSettle={settle}
              onRaise={() => raiseView(v.id)}
              onToggleCollapse={() => collapseView(v.id)}
              onToggleFull={() => setFullView(f => (f === v.id ? null : v.id))}
              onHelp={explainer ? () => setFullHelp(true) : undefined}
            />
          );
        })}

        <Rail sections={sections} openIds={state.open} onToggle={togglePanel} />

        {openIds.length === 0 && (
          <div className="am-ws-empty">
            No panels open — click an icon on the <b>rail</b> to open one, arrange
            the cards, then save the arrangement as a layout.
          </div>
        )}
        {sections.filter(s => state.open[s.id]).map(s => (
          <Panel
            key={s.id}
            sec={s}
            state={state.open[s.id]}
            zBase={fullView ? LAYER.overFull : LAYER.window}
            nodeRef={el => { if (el) panelRefs.current[s.id] = el; else delete panelRefs.current[s.id]; }}
            snap={makeSnap(s.id, panelRefs)}
            onMove={pos => movePanel(s.id, pos)}
            onSettle={settle}
            onRaise={() => raisePanel(s.id)}
            onToggleCollapse={() => collapsePanel(s.id)}
            onClose={() => closePanel(s.id)}
          />
        ))}
      </div>
      {fullHelp && explainer && (
        <ExplainerModal title={title} markdown={explainer} onClose={() => setFullHelp(false)} />
      )}
    </div>
  );
}
