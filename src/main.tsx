import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyTheme, initialDark } from './lib/theme';
import './global.css';

// Apply the persisted theme before first paint to avoid a flash.
applyTheme(initialDark());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
