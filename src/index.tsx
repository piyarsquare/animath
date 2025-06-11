import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import FractalsGPU from './animations/FractalsGPU/FractalsGPU';
import Correspondence from './animations/Correspondence/Correspondence';
import ComplexRoots from './animations/ComplexRoots/ComplexRoots';
import ComplexMultibranch from './animations/ComplexMultibranch/ComplexMultibranch';

const routes: Record<string, JSX.Element> = {
  '/': <App />,
  '/fractals': <FractalsGPU />,
  '/correspondence': <Correspondence />,
  '/roots': <ComplexRoots />,
  '/multibranch': <ComplexMultibranch />
};

function getRoute(): JSX.Element {
  const hash = window.location.hash.replace(/^#/, '');
  return routes[hash] ?? <App />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {getRoute()}
  </React.StrictMode>
);
