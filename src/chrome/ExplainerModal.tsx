import React, { Suspense, useEffect } from 'react';
import { Icon } from './icons';

// Lazy so `marked` only enters the bundle when an explainer is opened.
const Readme = React.lazy(() => import('../components/Readme'));

/**
 * "What am I looking at?" — the explainer dialog, opened from the top bar's
 * ? button. Hosts each app's EXPLAINER.md / README.md markdown (decision
 * recorded in docs/redesign/IN-PROGRESS.md: this replaces the old drawer
 * About sections and the AppShell help popup).
 */
export function ExplainerModal({ title, markdown, onClose }: {
  title: string;
  markdown: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);
  return (
    <div className="am-modal-scrim" onClick={onClose} role="presentation">
      <div
        className="am-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${title} — explainer`}
        onClick={e => e.stopPropagation()}
      >
        <div className="am-modal-head">
          <h2>{title}</h2>
          <button className="am-btn am-btn-icon" aria-label="Close explainer" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <Suspense fallback={<div className="am-hint">Loading…</div>}>
          <Readme markdown={markdown} />
        </Suspense>
      </div>
    </div>
  );
}
