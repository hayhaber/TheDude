import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { InstrumentProvider } from './instruments/InstrumentContext.jsx'
import { InfoTooltipsProvider } from './hooks/InfoTooltipsProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <InstrumentProvider>
        <InfoTooltipsProvider>
          <App />
        </InfoTooltipsProvider>
      </InstrumentProvider>
    </LanguageProvider>
  </StrictMode>,
)
