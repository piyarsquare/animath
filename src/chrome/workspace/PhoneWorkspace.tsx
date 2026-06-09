import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../icons';
import { TopBar } from '../TopBar';
import { sortByTier, ARCHETYPES } from './archetypes';
import type { WorkspaceProps } from './types';

/**
 * The phone workspace (≤740px, DESIGN-SPEC §6) — same vocabulary, no
 * floating windows: view windows stack as full-width cards, the rail becomes
 * a bottom dock, and panels open one at a time as a bottom sheet over a
 * scrim. The Layouts menu is hidden on phone.
 */
export default function PhoneWorkspace(props: WorkspaceProps) {
  const { title, subtitle, views, explainer, modes, activeMode, onModeChange } = props;
  const sections = useMemo(() => sortByTier(props.sections), [props.sections]);
  const [sheet, setSheet] = useState<string | null>(null);
  const active = sections.find(s => s.id === sheet);

  useEffect(() => {
    if (!sheet) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [sheet]);

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
      />
      <div className="am-phone-scroll">
        {views.map(v => (
          <div className="am-phone-view" key={v.id}>
            <div className="am-ws-vhead">
              <span className="am-ws-vico"><Icon name="window" size={13} /></span>
              <span className="am-ws-vtitle">{v.title}</span>
            </div>
            <div className="am-phone-view-body">{v.node}</div>
          </div>
        ))}
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
