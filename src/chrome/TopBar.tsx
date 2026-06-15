import React, { useState } from 'react';
import { Icon } from './icons';
import { SkinPicker, useSkin } from './skins';
import { ExplainerModal } from './ExplainerModal';

export interface WorkspaceMode { id: string; label: string; }

/**
 * The redesigned top bar (DESIGN-SPEC §1–2). The brand mark is Home — the
 * gallery is the only hub between apps. Apps add: title + mono subtitle,
 * optional mode pills (e.g. Trinary's Observatory | Lab), a Layouts-menu
 * slot (children), the ? explainer and the skin picker.
 */
export function TopBar({ title, subtitle, modes, activeMode, onModeChange, explainer, note, home = true, compact, hideTitle: hideTitleProp, onTitleClick, extra, children }: {
  title: string;
  subtitle?: string;
  modes?: WorkspaceMode[];
  activeMode?: string;
  onModeChange?: (id: string) => void;
  explainer?: string | null;
  /** Right-side note (gallery tagline). */
  note?: string;
  /** Render the brand mark as a Home button (off on the gallery itself). */
  home?: boolean;
  /** Compact phone bar: tighter padding, compact skin picker. */
  compact?: boolean;
  /** Force-hide the title (e.g. immersive desktop, where the bar carries the
   *  panel rail and the title would duplicate its World icon + crowd the row). */
  hideTitle?: boolean;
  /** Makes the title/formula a button (e.g. opens the Function panel). */
  onTitleClick?: () => void;
  /** Always-available inline control right after the title (WorkspaceProps.topExtra). */
  extra?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [skin, setSkin] = useSkin();
  const [helpOpen, setHelpOpen] = useState(false);
  // On the cramped phone bar, an always-on `extra` selector already names the
  // subject, so the title is redundant — drop it (and its separator) to make room.
  const hideTitle = (!!compact && !!extra) || !!hideTitleProp;
  return (
    <header className="am-bar" style={compact ? { padding: '0 10px' } : undefined}>
      {home ? (
        <button className="am-brand am-home-btn" title="Home — all animations" aria-label="Home — all animations"
          onClick={() => { window.location.hash = '#/'; }}>
          <span className="am-brand-mark">a</span>
          <Icon name="home" size={13} className="am-home-hint" />
        </button>
      ) : (
        <div className="am-brand"><span className="am-brand-mark">a</span></div>
      )}
      {!hideTitle && <div className="am-bar-sep" />}
      {!hideTitle && (onTitleClick ? (
        <button
          className="am-titlewrap am-title-btn"
          title="Open settings"
          aria-label={`${title} — open settings`}
          onClick={onTitleClick}
        >
          <span className="am-title">{title}</span>
          {subtitle && <span className="am-sub">{subtitle}</span>}
        </button>
      ) : (
        <div className="am-titlewrap">
          <span className="am-title">{title}</span>
          {subtitle && <span className="am-sub">{subtitle}</span>}
        </div>
      ))}
      {extra && (
        <>
          <div className="am-bar-sep" />
          <div className="am-bar-extra">{extra}</div>
        </>
      )}
      {modes && modes.length > 0 && (
        <>
          <div className="am-bar-sep" />
          <div className="am-pills" role="tablist" aria-label="Mode" style={{ flex: '0 0 auto' }}>
            {modes.map(m => (
              <button
                key={m.id}
                role="tab"
                aria-selected={m.id === activeMode}
                className={`am-pill ${m.id === activeMode ? 'am-on' : ''}`}
                onClick={() => onModeChange?.(m.id)}
              >{m.label}</button>
            ))}
          </div>
        </>
      )}
      {children && (
        <>
          <div className="am-bar-sep" />
          {children}
        </>
      )}
      <div className="am-spacer" />
      {note && <span className="am-gal-bar-note">{note}</span>}
      {explainer && (
        <button
          className="am-btn am-btn-icon am-btn-ghost"
          title="What am I looking at?"
          aria-label="What am I looking at?"
          onClick={() => setHelpOpen(true)}
        >
          <Icon name="help" size={17} />
        </button>
      )}
      <SkinPicker skin={skin} onSetSkin={setSkin} compact={compact} />
      {helpOpen && explainer && (
        <ExplainerModal title={title} markdown={explainer} onClose={() => setHelpOpen(false)} />
      )}
    </header>
  );
}
