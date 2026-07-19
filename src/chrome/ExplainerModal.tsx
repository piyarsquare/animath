import React, { Suspense, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { useEscLayer } from './useEscLayer';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** Trap Tab inside the dialog while it's open, focus it on open, and restore
 *  focus to the opener on close — without this, Tab kept driving the controls
 *  BEHIND the dialog, and closing dropped keyboard users at the document root. */
function useFocusTrap(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const dlg = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    dlg?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dlg) return;
      const items = Array.from(dlg.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement;
      const escaped = !dlg.contains(active);
      if (e.shiftKey ? active === first || escaped : active === last || escaped) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      opener?.focus?.();
    };
  }, [ref]);
}

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
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);
  return createPortal(
    <div className="am-modal-scrim" onPointerDown={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="am-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${title} — explainer`}
        tabIndex={-1}
        onPointerDown={e => e.stopPropagation()}
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
