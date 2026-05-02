import React from 'react';
import { createRoot } from 'react-dom/client';

function App(): React.JSX.Element {
  return <div style={{ padding: 16 }}>
    <h1>Almedalsstjärnan — Starred Events</h1>
    <p>Stars page placeholder — full implementation in Task 19.</p>
  </div>;
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
