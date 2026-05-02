import React from 'react';
import { createRoot } from 'react-dom/client';

function App(): React.JSX.Element {
  return <div style={{ width: 360, minHeight: 480, padding: 16 }}>
    <h1>Almedalsstjärnan</h1>
    <p>Popup placeholder — full implementation in Task 18.</p>
  </div>;
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
