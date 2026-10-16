import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { MOBILE } from './lib/mobile.js'
import { setupPwaUpdate } from './lib/pwa-update.js'
import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import './styles/avadesk.css'
import './styles/v41.css'

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)

// Not in the mobile build: the native shell already serves everything from disk.
if (!MOBILE && 'serviceWorker' in navigator && location.protocol === 'https:') {
  setupPwaUpdate()   // V4.1: registro + auto-atualização segura (lib/pwa-update.js)
}

// Shared responsive navigation follows theme and legacy styles.
import './styles/organization.css'
