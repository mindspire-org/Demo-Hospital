import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'

const container = document.getElementById('root')!
const Router: any = (location.protocol === 'file:') ? HashRouter : BrowserRouter
createRoot(container).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
)

// Preloader is now hidden by App component after content renders
// to avoid white-screen flash between preloader and app content
