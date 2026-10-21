// Must stay the first import: per-profile localStorage (src/profile/).
import './profile/install.js'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { InstrumentProvider } from './instruments/InstrumentContext.jsx'
import { InfoTooltipsProvider } from './hooks/InfoTooltipsProvider.jsx'
import { unlockAudioContextOnFirstGesture } from './audio/audioContext.js'
import { installMicSessionGuard } from './audio/micSession.js'
import { captureInstallPrompt, detectPlatform } from './install/pwaInstall.js'
import { InstallPage } from './install/InstallPage.jsx'

// The browser's "install this app" event fires once, early: keep it for the
// Install buttons (install/pwaInstall.js).
captureInstallPrompt()

// iOS: a 'playback' audio session (set by the Recorder) silences the mic —
// every getUserMedia switches it back first (audio/micSession.js).
installMicSessionGuard()

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

// /install = the install guide instead of the app (install/InstallPage.jsx).
// On iPhone / iPad "Add to Home Screen" may bookmark the CURRENT address, so
// the address is set back to "/" at once (the guide stays on screen) — the
// icon then opens the app, not this page.
const startOnInstall = /^\/install\/?$/.test(window.location.pathname)
if (startOnInstall && detectPlatform().startsWith('ios')) window.history.replaceState(null, '', '/')

function Root() {
  const [install, setInstall] = useState(startOnInstall)
  if (install)
    return (
      <InstallPage
        onOpen={() => {
          window.history.replaceState(null, '', '/')
          setInstall(false)
        }}
      />
    )
  return (
    <InstrumentProvider>
      <InfoTooltipsProvider>
        <App />
      </InfoTooltipsProvider>
    </InstrumentProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <Root />
    </LanguageProvider>
  </StrictMode>,
)
