import React from 'react';
import { Icon } from '../icons';
import { ARCHETYPES } from './archetypes';
import type { SectionDef } from './types';

/**
 * The left icon rail (DESIGN-SPEC §2): one 40×40 button per panel, sorted by
 * tier with 1px separators between tiers. Hover tooltip = panel title + mono
 * uppercase tier label. `sections` must already be tier-sorted.
 */
export function Rail({ sections, openIds, onToggle }: {
  sections: SectionDef[];
  openIds: Record<string, unknown>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="am-ws-rail" role="toolbar" aria-label="Panels" aria-orientation="vertical">
      {sections.map((s, i) => {
        const arch = ARCHETYPES[s.arch];
        const prev = i > 0 ? ARCHETYPES[sections[i - 1].arch] : null;
        const active = !!openIds[s.id];
        return (
          <React.Fragment key={s.id}>
            {prev && prev.tier !== arch.tier && <div className="am-ws-rail-sep" />}
            <button
              className={`am-ws-rail-btn ${active ? 'am-on' : ''}`}
              aria-label={`${s.title} (${arch.tier})`}
              aria-pressed={active}
              onClick={() => onToggle(s.id)}
            >
              <Icon name={arch.icon} size={18} />
              <span className="am-ws-rail-tip">{s.title}<i>{arch.tier}</i></span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
