import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { useEscLayer } from './useEscLayer';

// Lazy so `marked` only enters the bundle when an explainer is opened.
const Readme = React.lazy(() => import('../components/Readme'));

/**
 * "What am I looking at?" — the explainer dialog, opened from the top bar's
 * ? button (and from a fullscreen view's header, where the top bar is
 * buried). Hosts each app's EXPLAINER.md / README.md markdown (decision
 * recorded in docs/redesign/IN-PROGRESS.md: this replaces the old drawer
 * About sections and the AppShell help popup).
 *
 * Portaled to <body> so the scrim escapes its opener's stacking context —
 * the modal layer (LAYER.modal / --z-modal) sits above fullscreen views.
 * Esc goes through the shared layer stack (close the modal first, then the
 * fullscreen view on the next keypress).
 */
export function ExplainerModal({ title, markdown, onClose }: {
  title: string;
  markdown: string;
  onClose: () => void;
}) {
  useEscLayer(true, onClose);
  return createPortal(
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
    </div>,
    document.body,
  );
}
