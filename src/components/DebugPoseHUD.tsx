// src/components/DebugPoseHUD.tsx
//
// The opt-in dev HUD for the debug-pose harness. Mounted only when a route asks
// for it (`?hud` / `?debug=1`, via debugPose.hudEnabled), it overlays a compact
// text readout of the live pose diagnostics on the canvas so a headless
// screenshot records *what the engine thinks the frame is*, not just the picture.
//
// Modeled on SolidWorlds' ChiralityHUD: a fixed-corner, pointer-events:none
// overlay that polls a getter in a rAF loop. It is text-only and never mounts
// unless requested, so it has zero impact on the shipped UI.
//
// Each walker passes a `get` that snapshots its own state into a DebugState; the
// HUD renders whichever fields are present (a 2D walker omits z/cell, etc.).

import React, { useEffect, useRef } from 'react';
import type { DebugState } from '../lib/debugPose';

const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '∞');

function lines(s: DebugState): string[] {
  const out: string[] = [];
  if (s.world) out.push(`world  ${s.world}${s.look ? ` · ${s.look}` : ''}`);
  if (s.pos) {
    const z = s.pos.z != null ? ` ${fmt(s.pos.z)}` : '';
    out.push(`pos    ${fmt(s.pos.x)} ${fmt(s.pos.y)}${z}`);
  }
  if (s.yaw != null || s.pitch != null) {
    out.push(`look   yaw ${fmt(s.yaw ?? 0)} · pitch ${fmt(s.pitch ?? 0)}`);
  }
  if (s.determinant != null) {
    out.push(`det    ${s.determinant > 0 ? '+1 (original)' : '−1 (mirrored)'}`);
  }
  if (s.cell) out.push(`cell   ${s.cell.x} ${s.cell.y} ${s.cell.z}`);
  if (s.nearestMarker != null) out.push(`marker ${fmt(s.nearestMarker)}`);
  if (s.jump != null) out.push(`jump   ${fmt(s.jump, 4)}`);
  return out;
}

/**
 * @param get   snapshot the live DebugState (called every frame); return null
 *              until the engine is ready.
 * @param phone nudge below the phone top bar.
 */
export default function DebugPoseHUD({
  get,
  phone,
}: {
  get: () => DebugState | null;
  phone?: boolean;
}) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const s = get();
      if (s && ref.current) ref.current.textContent = lines(s).join('\n');
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [get]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        pointerEvents: 'none',
        padding: '8px 12px',
        borderRadius: 8,
        background: 'rgba(8,10,18,0.62)',
        border: '1px solid rgba(255,255,255,0.16)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(6px)',
        maxWidth: phone ? '70vw' : 280,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)',
          marginBottom: 4,
        }}
      >
        Debug pose
      </div>
      <pre
        ref={ref}
        style={{
          margin: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 11,
          lineHeight: 1.45,
          color: 'rgba(255,255,255,0.82)',
          whiteSpace: 'pre',
        }}
      >
        …
      </pre>
    </div>
  );
}
