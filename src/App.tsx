import React from 'react';

const ComplexParticles = React.lazy(() => import('./animations/ComplexParticles/ComplexParticles'));

export default function App() {
  return (
    <React.Suspense fallback={<div style={{ background: 'var(--bg, #000)', width: '100%', height: '100%' }} />}>
      <ComplexParticles />
    </React.Suspense>
  );
}
