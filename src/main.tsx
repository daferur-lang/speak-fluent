import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupAutoUpdate } from './lib/pwa'

document.documentElement.dataset.build = __BUILD_ID__
setupAutoUpdate()
// Ask the browser not to evict progress (IndexedDB/localStorage) when the device is low on space.
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
