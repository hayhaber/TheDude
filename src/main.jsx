// Must stay the first import: per-profile localStorage (src/profile/).
import './profile/install.js'
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

// A new deploy must reach the user on their next visit, not the one after.
// The service worker (vite-plugin-pwa, skipWaiting + clientsClaim) serves the
// cached old build first and installs the new one in the background; when
// the new one takes over, reload once so the page actually runs it. Also
// look for a new deploy whenever the app comes back to the foreground (a
// PWA on a phone/tablet is rarely reloaded otherwise).
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {})
  })
}

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
