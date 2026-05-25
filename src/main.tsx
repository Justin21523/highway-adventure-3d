import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in DOM');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

/**
 * Dismiss the loading screen once React has mounted.
 * The loading screen uses a CSS transition for a smooth fade-out.
 */
const loadingScreen = document.getElementById('loading-screen');
if (loadingScreen) {
  loadingScreen.classList.add('fade-out');
  setTimeout(() => {
    loadingScreen.remove();
  }, 600);
}
