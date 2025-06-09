import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Fractals2D from './animations/Fractals/Fractals2D';
import FractalsGPU from './animations/FractalsGPU/FractalsGPU';

const routes: Record<string, JSX.Element> = {
  '/': <App />,
  '/fractals': <Fractals2D />,
  '/fractals-gpu': <FractalsGPU />
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
