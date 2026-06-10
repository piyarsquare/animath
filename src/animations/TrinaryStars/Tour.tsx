import React, { useEffect, useState } from 'react';

/**
 * A small, self-contained guided tour: a sequence of dismissable cards shown
 * over the Trinary app on a user's first visit (and re-launchable from the
 * "Take the tour" button in the Observatory's Sim panel). Pure presentation —
 * it owns only its step index; the parent decides when it is open and persists
 * the "seen" flag.
 */
export interface TourStep { title: string; body: string }

export default function Tour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const last = i === steps.length - 1;
  const step = steps[i];

  // Escape closes the tour, matching the rest of the app's overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={scrim} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Trinary System tour">
        <div style={kicker}>Guided tour · {i + 1} / {steps.length}</div>
        <h2 style={titleStyle}>{step.title}</h2>
        <p style={bodyStyle}>{step.body}</p>
        <div style={dotsRow}>
          {steps.map((_, k) => <span key={k} style={dot(k === i)} />)}
        </div>
        <div style={btnRow}>
          <button style={ghostBtn} onClick={onClose}>Skip</button>
          <div style={{ flex: 1 }} />
          {i > 0 && <button style={ghostBtn} onClick={() => setI(i - 1)}>Back</button>}
          <button style={primaryBtn} onClick={() => (last ? onClose() : setI(i + 1))}>
            {last ? 'Got it' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

const scrim: React.CSSProperties = {
  // Above all workspace chrome (panels, view windows, layout menu).
  position: 'fixed', inset: 0, zIndex: 320,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(2,4,8,0.55)', backdropFilter: 'blur(3px)', padding: 16,
};
const card: React.CSSProperties = {
  width: 'min(440px, 100%)',
  background: 'rgba(14,18,28,0.97)', border: '1px solid rgba(120,150,200,0.3)',
  borderRadius: 14, padding: '20px 22px', color: '#cfe0f5',
  boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
};
const kicker: React.CSSProperties = {
  font: '600 11px/1 ui-monospace, monospace', letterSpacing: 0.6,
  textTransform: 'uppercase', color: '#66f0ff', marginBottom: 8,
};
const titleStyle: React.CSSProperties = { margin: '0 0 8px', font: '700 19px/1.25 system-ui, sans-serif', color: '#fff' };
const bodyStyle: React.CSSProperties = { margin: 0, font: '14px/1.6 system-ui, sans-serif', color: '#b6c6e0' };
const dotsRow: React.CSSProperties = { display: 'flex', gap: 6, margin: '18px 0 14px' };
function dot(active: boolean): React.CSSProperties {
  return { width: active ? 20 : 7, height: 7, borderRadius: 999, background: active ? '#66f0ff' : 'rgba(150,170,200,0.3)', transition: 'width 0.2s, background 0.2s' };
}
const btnRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const baseBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', borderRadius: 8,
  padding: '8px 16px', font: '600 13px/1 system-ui, sans-serif',
};
const ghostBtn: React.CSSProperties = { ...baseBtn, border: '1px solid rgba(120,150,200,0.28)', background: 'transparent', color: '#9aa7bd' };
const primaryBtn: React.CSSProperties = { ...baseBtn, border: 'none', background: '#66f0ff', color: '#06121f' };
