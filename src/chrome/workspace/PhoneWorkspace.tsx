import React, { useMemo, useRef, useState } from 'react';
import { usePersistentState } from '../../lib/usePersistentState';
import { ExplainerModal } from '../ExplainerModal';
import { Icon } from '../icons';
import { TopBar } from '../TopBar';
import { useEscLayer } from '../useEscLayer';
import { useScrollHints } from '../useScrollHints';
import { ActionBar } from './ActionBar';
import { SplitPanes } from './SplitPanes';
import { sortByTier, ARCHETYPES } from './archetypes';
import { beginPointerDrag } from './drag';
import type { WorkspaceProps } from './types';

/** Phone view-card height limits: keep the header reachable, leave room to scroll. */
const MIN_CARD_H = 140;
const maxCardH = () => Math.round(window.innerHeight * 0.8);

/**
 * The phone workspace (≤740px, DESIGN-SPEC §6) — same vocabulary, no
 * floating windows: view windows stack as full-width cards (height-resizable
 * from a bottom grip, expandable to fullscreen), the rail becomes a bottom
 * dock, and panels open one at a time as a bottom sheet over a scrim. The
 * Layouts menu is hidden on phone.
 */
export default function PhoneWorkspace(props: WorkspaceProps) {
  const { appId, title, subtitle, views, layouts: appLayouts, defaultLayoutId, explainer, titlePanel, topExtra, actions, phoneActionsInDock, modes, activeMode, onModeChange } = props;
  const sections = useMemo(() => sortByTier(props.sections), [props.sections]);
  // When an app opts in, the action verbs ride inside the dock as a leading
  // cluster (one consolidated bottom bar) rather than a separate strip above it.
  const mergeActions = !!phoneActionsInDock && !!actions?.length;
  // Single-view apps go full-bleed: the lone view fills the whole screen and
  // the top bar floats over it (overlaid), rather than sitting above it. Multi-
  // view apps keep the stacked cards below the bar.
  const immersive = views.length === 1;
  const [sheet, setSheet] = useState<string | null>(null);
  /* per-view card heights are layout state (like desktop view rects) — persisted */
  const [cardH, setCardH] = usePersistentState<Record<string, number>>(`wsphone:${appId}`, {});
  /* fullscreen is transient view state — deliberately not persisted */
  const [full, setFull] = useState<string | null>(null);
  /* explainer opened from the fullscreen card header (the top bar is buried) */
  const [fullHelp, setFullHelp] = useState(false);
  /* start hints (P2): per-session, gone on the card's first pointer touch */
  const [hintSeen, setHintSeen] = useState<Record<string, boolean>>({});
  /* staged Esc via the shared layer stack: most recently opened layer first */
  useEscLayer(full != null, () => setFull(null));
  useEscLayer(sheet != null, () => setSheet(null));

  // Apps that model mutually exclusive views as layouts (views[id].open) get
  // a chip switcher; the default layout decides which cards start visible.
  // Closed cards are hidden, never unmounted, so engine state survives a
  // switch (same rule as desktop view windows).
  const viewLayouts = useMemo(
    () => (appLayouts ?? []).filter(l => views.some(v => l.views?.[v.id]?.open === false)),
    [appLayouts, views],
  );
  const [layoutId, setLayoutId] = usePersistentState<string | null>(`wsphone:${appId}:layout`, null);
  const wanted = layoutId ?? defaultLayoutId ?? appLayouts?.[0]?.id;
  const activeLayout = viewLayouts.find(l => l.id === wanted)
    ?? viewLayouts.find(l => l.id === defaultLayoutId)
    ?? viewLayouts[0]
    ?? null;
  const viewOpen = (id: string) => (activeLayout ? activeLayout.views?.[id]?.open !== false : true);

  const active = sections.find(s => s.id === sheet);
  const dockRef = useRef<HTMLElement>(null);
  const dockHint = useScrollHints(dockRef, 'x');

  /* Cards fill the screen by default (flex), so the bottom grip resizes the
     whole card by pinning its flex-basis; fullscreen restyles the same DOM
     node (CSS-only), so WebGL engines keep their context either way. */
  const onResizeDown = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    const card = (e.currentTarget as HTMLElement).parentElement as HTMLElement | null;
    const oh = card?.offsetHeight ?? 280;
    beginPointerDrag(e, (_dx, dy) => {
      const h = Math.round(Math.min(Math.max(oh + dy, MIN_CARD_H), maxCardH()));
      setCardH(prev => ({ ...prev, [id]: h }));
    }, () => {});
  };

  return (
    <div className={`am-app am-phone-app${actions?.length && !mergeActions ? ' am-has-actions' : ''}${immersive ? ' am-phone-immersive' : ''}`}>
      <TopBar
        title={title}
        subtitle={subtitle}
        modes={modes}
        activeMode={activeMode}
        onModeChange={onModeChange}
        explainer={explainer}
        extra={topExtra}
        compact
        onTitleClick={
          titlePanel && sections.some(s => s.id === titlePanel)
            ? () => setSheet(titlePanel)
            : undefined
        }
      />
      <div className="am-phone-scroll">
        {viewLayouts.length > 1 && (
          <div className="am-phone-layouts" role="tablist" aria-label="Views">
            {viewLayouts.map(l => (
              <button
                key={l.id}
                role="tab"
                aria-selected={l.id === activeLayout?.id}
                className={`am-chip ${l.id === activeLayout?.id ? 'am-on' : ''}`}
                onClick={() => setLayoutId(l.id)}
              >
                {l.name}
              </button>
            ))}
          </div>
        )}
        {views.map(v => {
          const isFull = full === v.id;
          const h = cardH[v.id];
          // A manually-resized card pins its flex-basis (and stops growing);
          // otherwise it flex-fills the stage. Fullscreen ignores both.
          const cardStyle: React.CSSProperties | undefined = !viewOpen(v.id)
            ? { display: 'none' }
            : !isFull && h
              ? { flex: `0 0 ${h}px` }
              : undefined;
          return (
            <div
              className={`am-phone-view${isFull ? ' am-ws-full' : ''}${immersive ? ' am-phone-view-solo' : ''}`}
              key={v.id}
              style={cardStyle}
            >
              <div className="am-ws-vhead">
                <span className="am-ws-vico"><Icon name="window" size={13} /></span>
                <span className="am-ws-vtitle">{v.title}</span>
                {isFull && explainer && (
                  <button
                    className="am-btn am-btn-icon"
                    title="What am I looking at?"
                    aria-label="What am I looking at?"
                    onClick={() => setFullHelp(true)}
                  >
                    <Icon name="help" size={14} />
                  </button>
                )}
                <button
                  className="am-btn am-btn-icon"
                  title={isFull ? 'Exit full screen' : 'Full screen'}
                  aria-label={isFull ? `Exit full screen ${v.title}` : `Full screen ${v.title}`}
                  onClick={() => setFull(isFull ? null : v.id)}
                >
                  <Icon name={isFull ? 'shrink' : 'expand'} size={13} />
                </button>
              </div>
              <div
                className="am-phone-view-body"
                onPointerDownCapture={
                  v.hint && !hintSeen[v.id]
                    ? () => setHintSeen(s => ({ ...s, [v.id]: true }))
                    : undefined
                }
              >
                {v.panes ? <SplitPanes panes={v.panes} /> : v.node}
                {v.hint && !hintSeen[v.id] && (
                  <div className="am-view-overlay" aria-hidden="true">
                    <span className="am-view-hint-pill">{v.hint}</span>
                  </div>
                )}
              </div>
              {!isFull && (
                <div className="am-phone-vresize" onPointerDown={onResizeDown(v.id)} aria-label={`Resize ${v.title}`}>
                  <i />
                </div>
              )}
              {/* Immersive apps hide the card header, so this floating button is
                  the way into (chrome-free) full screen; the fullscreen header
                  brings back exit + help. */}
              {immersive && !isFull && (
                <button
                  className="am-phone-immersive-expand"
                  title="Full screen"
                  aria-label={`Full screen ${v.title}`}
                  onClick={() => setFull(v.id)}
                >
                  <Icon name="expand" size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {/* The action verbs normally fold into the dock (mergeActions). But a
          fullscreen view sits at --z-full, above the --z-dock the merged
          cluster rides — so in fullscreen we fall back to the standalone
          ActionBar (--z-actionbar, above fullscreen), preserving the contract
          that primary verbs stay reachable while full. */}
      {actions && (!mergeActions || full != null) && <ActionBar actions={actions} sections={sections} phone />}
      <div className="am-phone-dockwrap">
        <nav ref={dockRef} className="am-phone-dock" aria-label="Panels">
          {mergeActions && full == null && (
            <>
              {actions!.map(a => (
                <button
                  key={`act-${a.id}`}
                  className={`am-phone-dock-btn am-phone-dock-verb${a.primary ? ' am-primary' : ''}`}
                  aria-label={a.label}
                  disabled={a.disabled}
                  onClick={a.onClick}
                >
                  <Icon name={a.icon} size={19} />
                  <span>{a.label}</span>
                </button>
              ))}
              <div className="am-phone-dock-sep" />
            </>
          )}
          {sections.map((s, i) => {
            const arch = ARCHETYPES[s.arch];
            const prev = i > 0 ? ARCHETYPES[sections[i - 1].arch] : null;
            return (
              <React.Fragment key={s.id}>
                {prev && prev.tier !== arch.tier && <div className="am-phone-dock-sep" />}
                <button
                  className={`am-phone-dock-btn ${sheet === s.id ? 'am-on' : ''}`}
                  aria-label={`${s.title} (${arch.tier})`}
                  onClick={() => setSheet(sheet === s.id ? null : s.id)}
                >
                  <Icon name={arch.icon} size={19} />
                  <span>{s.title}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>
        {dockHint.start && (
          <div className="am-dock-more am-dock-more-left" aria-hidden="true">
            <Icon name="chevron" size={13} style={{ transform: 'rotate(180deg)' }} />
          </div>
        )}
        {dockHint.end && (
          <div className="am-dock-more am-dock-more-right" aria-hidden="true">
            <Icon name="chevron" size={13} />
          </div>
        )}
      </div>
      {active && (
        <>
          <div className="am-phone-scrim" onPointerDown={() => setSheet(null)} role="presentation" />
          <div className="am-phone-sheet" role="dialog" aria-label={active.title}>
            <div className="am-sheet-grip" />
            <div className="am-phone-sheet-head">
              <span style={{ color: 'var(--accent)', display: 'flex' }}>
                <Icon name={ARCHETYPES[active.arch].icon} size={16} />
              </span>
              <span className="am-phone-sheet-title">{active.title}</span>
              <span className="am-sec-tier">{ARCHETYPES[active.arch].tier}</span>
              <button className="am-btn am-btn-icon" aria-label="Close panel" onClick={() => setSheet(null)}>
                <Icon name="chevrondown" size={17} />
              </button>
            </div>
            <div className="am-phone-sheet-body">{active.node}</div>
          </div>
        </>
      )}
      {fullHelp && explainer && (
        <ExplainerModal title={title} markdown={explainer} onClose={() => setFullHelp(false)} />
      )}
    </div>
  );
}
