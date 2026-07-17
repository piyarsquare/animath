import React, { useRef } from 'react';
import { Icon } from '../icons';
import { useScrollHints } from '../useScrollHints';
import { ARCHETYPES } from './archetypes';
import type { SectionDef } from './types';

/**
 * The left icon rail (DESIGN-SPEC §2): one 40×40 button per panel, sorted by
 * tier with 1px separators between tiers. Hover tooltip = panel title + mono
 * uppercase tier label. `sections` must already be tier-sorted. On windows
 * too short for every icon the rail scrolls, with fade + chevron hints at
 * whichever edge has more.
 */
export function Rail({ sections, openIds, onToggle, orientation = 'vertical' }: {
  sections: SectionDef[];
  openIds: Record<string, unknown>;
  onToggle: (id: string) => void;
  /** 'horizontal' is the flat top-bar icon row used by immersive desktop apps,
   *  where a left-edge rail would overlay the full-bleed scene. */
  orientation?: 'vertical' | 'horizontal';
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const hint = useScrollHints(railRef, 'y');
  const items = sections.map((s, i) => {
    const arch = ARCHETYPES[s.arch];
    const prev = i > 0 ? ARCHETYPES[sections[i - 1].arch] : null;
    const active = !!openIds[s.id];
    return (
      <React.Fragment key={s.id}>
        {prev && prev.tier !== arch.tier && <div className="am-ws-rail-sep" />}
        <button
          className={`am-ws-rail-btn am-labeled ${active ? 'am-on' : ''}`}
          aria-label={`${s.title} (${arch.tier})`}
          aria-pressed={active}
          onClick={() => onToggle(s.id)}
        >
          <Icon name={arch.icon} size={16} />
          {orientation === 'vertical' && <span className="am-ws-rail-lbl">{s.title}</span>}
          <span className="am-ws-rail-tip">{s.title}<i>{arch.tier}</i></span>
        </button>
      </React.Fragment>
    );
  });
  if (orientation === 'horizontal') {
    return (
      <div className="am-ws-rail am-ws-rail-h" role="toolbar" aria-label="Panels" aria-orientation="horizontal">
        {items}
      </div>
    );
  }
  return (
    <div className="am-ws-railwrap">
      <div ref={railRef} className="am-ws-rail" role="toolbar" aria-label="Panels" aria-orientation="vertical">
        {items}
      </div>
      {hint.start && (
        <div className="am-rail-more am-rail-more-up" aria-hidden="true">
          <Icon name="chevrondown" size={12} style={{ transform: 'rotate(180deg)' }} />
        </div>
      )}
      {hint.end && (
        <div className="am-rail-more am-rail-more-down" aria-hidden="true">
          <Icon name="chevrondown" size={12} />
        </div>
      )}
    </div>
  );
}
