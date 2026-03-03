import React from 'react';

const ComplexParticles = React.lazy(() => import('./animations/ComplexParticles/ComplexParticles'));

export default function App() {
  return (
    <React.Suspense fallback={<div style={{ background: '#000', width: '100vw', height: '100vh' }} />}>
      <ComplexParticles />
    </React.Suspense>
  );
}
