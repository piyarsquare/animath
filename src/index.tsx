import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import R2MappingDemo from './animations/R2MappingDemo/R2MappingDemo';

const routes: Record<string, JSX.Element> = {
  '/': <App />,
  '/r2mapping': <R2MappingDemo />
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
