import React, { useState } from 'react';
import './PlaybackFloater.css';

export interface PlaybackFloaterProps {
  /** Title shown in the panel header and the collapsed button tooltip. */
  title?: string;
  /** Glyph for the collapsed toggle button. */
  icon?: string;
  children: React.ReactNode;
}

/** A collapsible floating panel pinned to the bottom-right of the view, giving
 *  the Correspondence playback/action controls an always-on-screen home that
 *  doesn't require opening the drawer. Mirrors the look of PlaneCurveFloater. */
export default function PlaybackFloater({
  title = 'Playback', icon = '▷', children,
}: PlaybackFloaterProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="pf pf-collapsed">
        <button
          className="pf-toggle"
          onClick={() => setOpen(true)}
          aria-label={`Show ${title} panel`}
          title={title}
        >{icon}</button>
      </div>
    );
  }

  return (
    <div className="pf">
      <div className="pf-header">
        <span className="pf-title">{title}</span>
        <button
          className="pf-close"
          onClick={() => setOpen(false)}
          aria-label={`Hide ${title} panel`}
        >×</button>
      </div>
      <div className="pf-body">{children}</div>
    </div>
  );
}
