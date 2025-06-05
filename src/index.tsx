import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const routes: Record<string, JSX.Element> = {
  '/': <App />
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
