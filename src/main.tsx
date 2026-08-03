import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './components/LanguageContext.tsx'
import { AuthProvider } from './components/AuthContext.tsx'
import PayPalProvider from './components/PayPalProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PayPalProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </PayPalProvider>
    </AuthProvider>
  </StrictMode>,
)
