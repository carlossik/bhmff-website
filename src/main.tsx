import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import './lib/supabaseClient'
import { SaasAnalyticsConsent } from './components/analytics/SaasAnalyticsConsent'
import { initialiseSaasAnalytics } from './lib/saasAnalytics'

initialiseSaasAnalytics()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
        <SaasAnalyticsConsent />
    </React.StrictMode>,
)