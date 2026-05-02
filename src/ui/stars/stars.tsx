/**
 * Stars page entry point.
 *
 * Creates a real BrowserApiAdapter and renders the App component
 * into the root div. This is the production entry point — tests
 * pass a mock adapter directly to App.
 *
 * Requirements: 10.11, 10.12
 */

import { createRoot } from 'react-dom/client';

import { BrowserApiAdapter } from '#core/browser-api-adapter';

import { App } from './App';
import './stars.css';

const root = document.getElementById('root');
if (root) {
  const adapter = new BrowserApiAdapter();
  createRoot(root).render(<App adapter={adapter} />);
}
