import React, { useRef, useState } from 'react';
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
 *  the c-path playback. Drag the header to reposition it anywhere in the view. */
export default function PlaybackFloater({
  title = 'Playback', icon = '▷', progress, onScrub, scrubDisabled, children,
}: PlaybackFloaterProps) {
  const [open, setOpen] = useState(false);
  // null → anchored to the default corner via CSS; otherwise absolute px.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* ---- Reposition: drag by the header ---- */
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const clampToParent = (x: number, y: number) => {
    const el = panelRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return { x, y };
    const maxX = Math.max(0, parent.clientWidth - el.offsetWidth);
    const maxY = Math.max(0, parent.clientHeight - el.offsetHeight);
    return { x: Math.max(0, Math.min(maxX, x)), y: Math.max(0, Math.min(maxY, y)) };
  };

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    // Let the close button work without starting a drag.
    if ((e.target as HTMLElement).closest('.pf-close')) return;
    const el = panelRef.current;
    if (!el) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: el.offsetLeft, baseY: el.offsetTop };
    setPos({ x: el.offsetLeft, y: el.offsetTop });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onHeaderPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPos(clampToParent(d.baseX + (e.clientX - d.startX), d.baseY + (e.clientY - d.startY)));
  };
  const onHeaderPointerUp = () => { dragRef.current = null; };

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

  const posStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
    : {};

  if (!open) {
    return (
      <div className="pf pf-collapsed" ref={panelRef} style={posStyle}>
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
      <div
        className="pf-header"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
      >
        <span className="pf-grip" aria-hidden="true">⠿</span>
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
