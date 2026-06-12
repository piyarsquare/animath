/**
 * The Suspense fallback for lazy-loaded routes (src/index.tsx). A code-split
 * app chunk — plus Three.js for the 3D/fractal viewers — can take a beat to
 * download; this shows a skinned splash (the brand mark pulsing inside a
 * spinning accent ring) on the dotted stage instead of a blank flash. It reads
 * the active `data-theme`, so it matches whatever skin is persisted.
 */
export function LoadingScreen() {
  return (
    <div className="am-loading" role="status" aria-live="polite" aria-label="Loading">
      <div className="am-loading-mark">
        <span className="am-loading-ring" aria-hidden="true" />
        <span className="am-brand-mark">a</span>
      </div>
      <span className="am-loading-text">Loading…</span>
    </div>
  );
}
