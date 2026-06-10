import React, { useEffect, useMemo, useState } from 'react';
import { usePersistentState } from '../../lib/usePersistentState';
import { Icon } from '../icons';
import { TopBar } from '../TopBar';
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
  const { appId, title, subtitle, views, explainer, titlePanel, modes, activeMode, onModeChange } = props;
  const sections = useMemo(() => sortByTier(props.sections), [props.sections]);
  const [sheet, setSheet] = useState<string | null>(null);
  /* per-view card heights are layout state (like desktop view rects) — persisted */
  const [cardH, setCardH] = usePersistentState<Record<string, number>>(`wsphone:${appId}`, {});
  /* fullscreen is transient view state — deliberately not persisted */
  const [full, setFull] = useState<string | null>(null);
  const active = sections.find(s => s.id === sheet);

  useEffect(() => {
    if (!sheet && !full) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSheet(null);
      setFull(null);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [sheet, full]);

  /* drag the bottom grip to resize a card; fullscreen restyles the same DOM
     node (CSS-only), so WebGL engines keep their context either way */
  const onResizeDown = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    const body = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement | null;
    const oh = body?.offsetHeight ?? 240;
    beginPointerDrag(e, (_dx, dy) => {
      const h = Math.round(Math.min(Math.max(oh + dy, MIN_CARD_H), maxCardH()));
      setCardH(prev => ({ ...prev, [id]: h }));
    }, () => {});
  };

  return (
    <div className="am-app am-phone-app">
      <TopBar
        title={title}
        subtitle={subtitle}
        modes={modes}
        activeMode={activeMode}
        onModeChange={onModeChange}
        explainer={explainer}
        compact
        onTitleClick={
          titlePanel && sections.some(s => s.id === titlePanel)
            ? () => setSheet(titlePanel)
            : undefined
        }
      />
      <div className="am-phone-scroll">
        {views.map(v => {
          const isFull = full === v.id;
          const h = cardH[v.id];
          return (
            <div className={`am-phone-view${isFull ? ' am-ws-full' : ''}`} key={v.id}>
              <div className="am-ws-vhead">
                <span className="am-ws-vico"><Icon name="window" size={13} /></span>
                <span className="am-ws-vtitle">{v.title}</span>
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
                style={!isFull && h ? { height: h, maxHeight: 'none' } : undefined}
              >
                {v.node}
              </div>
              {!isFull && (
                <div className="am-phone-vresize" onPointerDown={onResizeDown(v.id)} aria-label={`Resize ${v.title}`}>
                  <i />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <nav className="am-phone-dock" aria-label="Panels">
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
      {active && (
        <>
          <div className="am-phone-scrim" onClick={() => setSheet(null)} role="presentation" />
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
    </div>
  );
}
