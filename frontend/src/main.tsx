import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import './index.css'
import App from './App.tsx'
import './lib/posthog.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)


if (typeof window !== 'undefined') {
  const initTelemetry = () => {
    import('./services/errorTelemetry').then((m) => m.initGlobalErrorTelemetry?.());
  };
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(initTelemetry, { timeout: 3000 });
  } else {
    setTimeout(initTelemetry, 1500);
  }
}
