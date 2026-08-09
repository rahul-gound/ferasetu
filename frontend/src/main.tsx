import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider afterSignOutUrl="/">
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ClerkProvider>
  </StrictMode>,
)

