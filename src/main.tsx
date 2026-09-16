import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './firebase/config'
import AuthGate from './features/auth/AuthGate'
import './styles.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/ClassMate_AI/sw.js').catch(() => undefined)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
)
