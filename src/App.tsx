import React from 'react';
import { LoadingScreen } from './chrome/LoadingScreen';

const ComplexParticles = React.lazy(() => import('./animations/ComplexParticles/ComplexParticles'));

export default function App() {
  return (
    <React.Suspense fallback={<LoadingScreen />}>
      <ComplexParticles />
    </React.Suspense>
  );
}
