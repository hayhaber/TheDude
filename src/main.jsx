import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { InstrumentProvider } from './instruments/InstrumentContext.jsx'
import { InfoTooltipsProvider } from './hooks/InfoTooltipsProvider.jsx'
import { unlockAudioContextOnFirstGesture } from './audio/audioContext.js'

// See audioContext.js's own comment — iOS Safari needs an explicit unlock
// tied to the very first real touch/click the page receives, not just a
// later .resume() call from inside a note-playing handler.
unlockAudioContextOnFirstGesture()

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
