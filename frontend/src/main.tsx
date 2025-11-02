// Polyfill for 'module' if not defined (for relayer-sdk compatibility)
// Note: This is a backup - the main polyfill is in index.html
if (typeof module === 'undefined') {
  if (typeof window !== 'undefined') {
    // @ts-ignore - We're creating a minimal module polyfill for browser compatibility
    (window as any).module = { exports: {} };
  }
  if (typeof globalThis !== 'undefined') {
    // @ts-ignore - We're creating a minimal module polyfill for browser compatibility
    (globalThis as any).module = { exports: {} };
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Add error handling for app initialization
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  console.log('Initializing VeriSafe app...');
  const root = createRoot(rootElement);
  root.render(
  <StrictMode>
    <App />
    </StrictMode>
  );
  console.log('VeriSafe app initialized successfully');
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="padding: 2rem; text-align: center; color: white; font-family: system-ui;">
      <h1 style="margin-bottom: 1rem;">Application Error</h1>
      <p style="margin-bottom: 1rem;">Failed to load application. Please check the browser console for details.</p>
      <p style="color: #999; font-size: 0.9rem; margin-top: 1rem;">
        Error: ${error instanceof Error ? error.message : String(error)}
      </p>
      <button 
        onclick="window.location.reload()" 
        style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;"
      >
        Reload Page
      </button>
    </div>
  `;
}
