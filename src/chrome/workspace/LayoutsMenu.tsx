import React, { useState } from 'react';
import { Icon } from '../icons';
import { useEscLayer } from '../useEscLayer';
import type { LayoutDef, SavedLayout } from './types';

/**
 * The `Layout: <name>` top-bar control and its dropdown: built-in layouts per
 * app plus user-saved ones ("Save current layout…", deletable). Any manual
 * move/open/close marks the current layout `Custom *` (DESIGN-SPEC §2).
 */
export function LayoutsControl({ current, builtin, saved, onPick, onSave, onDelete }: {
  current: string;
  builtin: LayoutDef[];
  saved: SavedLayout[];
  onPick: (l: LayoutDef) => void;
  onSave: () => void;
  onDelete: (l: SavedLayout) => void;
}) {
  const [open, setOpen] = useState(false);
  useEscLayer(open, () => setOpen(false));

  const all = [...builtin, ...saved];
  const curName = all.find(l => l.id === current)?.name ?? 'Custom';

  const Item = (l: LayoutDef & { saved?: boolean }) => (
    <button
      key={l.id}
      className={`am-lay-item ${current === l.id ? 'am-on' : ''}`}
      onClick={() => { onPick(l); setOpen(false); }}
    >
      <span className="am-lay-ico"><Icon name={l.icon ?? 'layers'} size={13} /></span>
      <span className="am-lay-meta"><span>{l.name}</span>{l.sub && <span className="am-lay-sub">{l.sub}</span>}</span>
      {l.saved && (
        <span
          className="am-lay-del"
          role="button"
          aria-label={`Delete layout ${l.name}`}
          onClick={(e) => { e.stopPropagation(); onDelete(l as SavedLayout); }}
        >
          <Icon name="close" size={14} />
        </span>
      )}
      {current === l.id && !l.saved && <Icon name="chevron" size={14} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
    </button>
  );

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="am-layouts-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(m => !m)}
      >
        <Icon name="layers" size={15} />
        <span>Layout:</span> <span className="am-lay-name">{curName}{current === 'custom' ? ' *' : ''}</span>
        <Icon name="chevrondown" size={13} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <>
          <div className="am-menu-scrim" onPointerDown={() => setOpen(false)} />
          <div className="am-layouts-menu" role="menu">
            <div className="am-lay-group">Workspaces</div>
            {builtin.map(Item)}
            {saved.length > 0 && <div className="am-lay-group">Saved</div>}
            {saved.map(Item)}
            <div className="am-lay-foot">
              <button className="am-lay-save" onClick={() => { onSave(); setOpen(false); }}>
                <Icon name="pin" size={15} /> Save current layout…
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
