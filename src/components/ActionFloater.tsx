import React, { useState } from 'react';
import { useFloaterDrag } from './useFloaterDrag';
import './ActionFloater.css';

export interface ActionFloaterProps {
  /** Whether the active app has any actions to show. */
  active: boolean;
  /** Title shown in the open panel's header. */
  title: string;
  /** Portal target for the actions; AppShell renders ShellActions into it. */
  bodyRef: React.RefObject<HTMLDivElement>;
}

/**
 * A draggable, collapsible floating panel that surfaces an app's actions on
 * screen (mirroring the drawer's Actions tab). Collapsed, it's a ▶ play button
 * with a little drag grip on its left edge; expanded, it shows the actions with
 * a draggable header. The body div is always mounted so the actions portal
 * target persists across collapse — it's just hidden when collapsed.
 */
export default function ActionFloater({ active, title, bodyRef }: ActionFloaterProps) {
  const [open, setOpen] = useState(false);
  const { panelRef, posStyle, dragHandlers } = useFloaterDrag();

  return (
    <div
      ref={panelRef}
      style={posStyle}
      className={`af ${open ? 'af-open' : 'af-collapsed'} ${active ? '' : 'af-inactive'}`}
    >
      {open ? (
        <div className="af-header">
          <span className="af-grip" title="Drag to move" {...dragHandlers}>⠿</span>
          <span className="af-title">{title}</span>
          <button
            className="af-iconbtn"
            onClick={() => setOpen(false)}
            aria-label="Hide actions"
          >×</button>
        </div>
      ) : (
        <div className="af-collapsed-row">
          <span className="af-grip af-grip-collapsed" title="Drag to move" {...dragHandlers}>⠿</span>
          <button
            className="af-play"
            onClick={() => setOpen(true)}
            aria-label="Show actions"
            title="Actions"
          >▶</button>
        </div>
      )}

      <div className="af-body" ref={bodyRef} style={{ display: open ? 'block' : 'none' }} />
    </div>
  );
}
