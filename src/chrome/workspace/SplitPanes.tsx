import React from 'react';
import type { PaneDef } from './types';

/**
 * The split body of a paned view window (CHROME-REVIEW P5): a fixed,
 * non-negotiable equal flex split — equal inscribed squares are the
 * invariant that keeps a domain/image pair truthful, so there is
 * deliberately NO draggable divider. Shared by ViewWindow, the phone view
 * cards, and the embed routes (one DOM, one set of classes).
 */
export function SplitPanes({ panes }: { panes: PaneDef[] }) {
  return (
    <div className="am-split">
      {panes.map(p => (
        <div className="am-split-pane" key={p.id}>
          {p.node}
          {p.label && <span className="am-split-label">{p.label}</span>}
        </div>
      ))}
    </div>
  );
}
