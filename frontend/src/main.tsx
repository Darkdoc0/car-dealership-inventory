import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { createSession } from './auth/session';
import { createTokenStore } from './auth/tokenStorage';
import './index.css';

// Composition root: the one place that touches real browser globals.
const session = createSession(createTokenStore(window.localStorage), (input, init) => window.fetch(input, init));

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <App session={session} />
    </BrowserRouter>
  </StrictMode>,
);
