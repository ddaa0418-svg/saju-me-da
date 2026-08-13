import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SharedResultPage from './pages/SharedResultPage.jsx'
import { getResultShareIdFromPath } from './utils/shareSaju.js'

const shareId = getResultShareIdFromPath(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {shareId ? <SharedResultPage shareId={shareId} /> : <App />}
  </StrictMode>,
)
