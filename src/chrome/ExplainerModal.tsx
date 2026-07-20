import React, { Suspense, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { useEscLayer } from './useEscLayer';

// `summary` is natively focusable (it opens/closes the layered-explainer folds)
// and must be in the trap; conversely, links inside a CLOSED <details> match the
// selector but aren't reachable, so we filter to visible elements below.
const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, summary, [tabindex]:not([tabindex="-1"])';

/** Focusable descendants that are actually reachable — excludes anything inside
 *  a collapsed <details> (display:none ⇒ no layout box ⇒ offsetParent null). */
function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}

/**
 * Layered explainer: split the markdown at `## ` headings (fence-aware) so the
 * dialog opens on the essentials — the intro and the first section — with every
 * later section (derivations, methods, sources, implementation notes) folded
 * behind a disclosure. Turns the old thousands-of-pixels encyclopedia into a
 * short read that can still go deep, without rewriting any app's EXPLAINER.md.
 */
export function splitExplainer(md: string): { lead: string; sections: { title: string; body: string }[] } {
  const lines = md.split('\n');
  const chunks: { title: string | null; lines: string[] }[] = [{ title: null, lines: [] }];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const m = !inFence && /^## +(.+?)\s*$/.exec(line);
    if (m) chunks.push({ title: m[1], lines: [] });
    else chunks[chunks.length - 1].lines.push(line);
  }
  // Lead = the intro chunk plus the FIRST titled section (kept under its
  // heading so the text reads unchanged); the rest fold.
  const intro = chunks[0].lines.join('\n');
  const titled = chunks.slice(1);
  if (titled.length === 0) return { lead: intro, sections: [] };
  const first = titled[0];
  const lead = `${intro}\n\n## ${first.title}\n${first.lines.join('\n')}`;
  return {
    lead,
    sections: titled.slice(1).map(c => ({ title: c.title as string, body: c.lines.join('\n') })),
  };
}

/** Trap Tab inside the dialog while it's open, focus it on open, and restore
 *  focus to the opener on close — without this, Tab kept driving the controls
 *  BEHIND the dialog, and closing dropped keyboard users at the document root. */
function useFocusTrap(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const dlg = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    if (dlg) focusableIn(dlg)[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dlg) return;
      // Recompute each Tab: opening/closing a fold changes what's reachable.
      const items = focusableIn(dlg);
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
function LayeredExplainer({ markdown }: { markdown: string }) {
  const { lead, sections } = splitExplainer(markdown);
  return (
    <>
      <Readme markdown={lead} />
      {sections.map(s => (
        <details key={s.title} className="am-expl-fold">
          <summary>{s.title}</summary>
          <Readme markdown={s.body} />
        </details>
      ))}
    </>
  );
}

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
          <LayeredExplainer markdown={markdown} />
        </Suspense>
      </div>
    </div>,
    document.body,
  );
}
