import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { SystemConfigProvider } from './contexts/SystemConfigContext'

// Override native alert to non-blocking toast across the entire app
window.alert = (message?: any) => {
  const text = typeof message === 'string' ? message : String(message)
  window.dispatchEvent(new CustomEvent('app:alert', { detail: { message: text } }))
}

const container = document.getElementById('root')!
const Router: any = (location.protocol === 'file:') ? HashRouter : BrowserRouter
createRoot(container).render(
  <React.StrictMode>
    <Router>
      <SystemConfigProvider>
        <App />
      </SystemConfigProvider>
    </Router>
  </React.StrictMode>
)
