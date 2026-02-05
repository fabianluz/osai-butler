import React from 'react'
import ReactDOM from 'react-dom/client'
// CHANGE THIS IMPORT:
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* CHANGE THIS TAG: */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)