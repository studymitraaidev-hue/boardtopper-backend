import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env['VITE_SENTRY_DSN_FRONTEND'] ?? '',
  environment: import.meta.env['MODE'] ?? 'development',
  tracesSampleRate: 0.2,
  enabled: !!(import.meta.env['VITE_SENTRY_DSN_FRONTEND']),
});

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

fetch(import.meta.env['VITE_API_URL'] + '/health').catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

