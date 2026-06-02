import React, { useRef, useState } from 'react';
import { useFloaterDrag } from '../../components/useFloaterDrag';
import './PlaybackFloater.css';

export interface PlaybackFloaterProps {
  /** Title shown in the panel header and the collapsed button tooltip. */
  title?: string;
  /** Glyph for the collapsed toggle button. */
  icon?: string;
  /** Current playback position, 0..1, reflected by the side scrubber. */
  progress: number;
  /** Called as the user drags the side scrubber (normalized 0..1). */
  onScrub: (t01: number) => void;
  /** Greys out the scrubber when there's nothing to scrub. */
  scrubDisabled?: boolean;
  children: React.ReactNode;
}

/** A collapsible, draggable floating panel pinned (by default) to the
 *  bottom-left of the view. It gives the Correspondence action controls an
 *  always-on-screen home, with a vertical scrubber down the side for seeking
 *  the c-path playback. Drag the header (or the collapsed grip) to reposition
 *  it anywhere in the view. */
export default function PlaybackFloater({
  title = 'Playback', icon = '▶', progress, onScrub, scrubDisabled, children,
}: PlaybackFloaterProps) {
  const [open, setOpen] = useState(false);
  const { panelRef, posStyle, dragHandlers } = useFloaterDrag();

  /* ---- Side scrubber ---- */
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);

  const scrubFromY = (clientY: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || r.height === 0) return;
    // Bottom of the track is the start of the path (0), top is the end (1).
    onScrub(Math.max(0, Math.min(1, 1 - (clientY - r.top) / r.height)));
  };
  const onScrubDown = (e: React.PointerEvent) => {
    if (scrubDisabled) return;
    scrubbing.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    scrubFromY(e.clientY);
    e.preventDefault();
  };
  const onScrubMove = (e: React.PointerEvent) => { if (scrubbing.current) scrubFromY(e.clientY); };
  const onScrubUp = () => { scrubbing.current = false; };

  if (!open) {
    return (
      <div className="pf pf-collapsed" ref={panelRef} style={posStyle}>
        <span className="pf-grip pf-grip-collapsed" title="Drag to move" {...dragHandlers}>⠿</span>
        <button
          className="pf-toggle"
          onClick={() => setOpen(true)}
          aria-label={`Show ${title} panel`}
          title={title}
        >{icon}</button>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(1, progress)) * 100;

  return (
    <div className="pf" ref={panelRef} style={posStyle}>
      <div className="pf-header" {...dragHandlers}>
        <span className="pf-grip" title="Drag to move">⠿</span>
        <span className="pf-title">{title}</span>
        <button
          className="pf-close"
          onClick={() => setOpen(false)}
          aria-label={`Hide ${title} panel`}
        >×</button>
      </div>

      <div className="pf-main">
        <div className="pf-body">{children}</div>
        <div
          className={`pf-scrubber ${scrubDisabled ? 'pf-scrubber-disabled' : ''}`}
          onPointerDown={onScrubDown}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubUp}
          onPointerCancel={onScrubUp}
          role="slider"
          aria-label="Playback position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div className="pf-scrubber-track" ref={trackRef}>
            <div className="pf-scrubber-fill" style={{ height: `${pct}%` }} />
            <div className="pf-scrubber-thumb" style={{ bottom: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
