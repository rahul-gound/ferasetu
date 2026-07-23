import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'
import { client } from './lib/appwrite'

// Ping the Appwrite backend once on app start to verify connectivity/setup.
client.ping()
  .then(() => console.log('[Appwrite] Connected — ping OK'))
  .catch((err) => console.warn('[Appwrite] Ping failed:', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
