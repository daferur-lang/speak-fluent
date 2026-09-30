import { registerSW } from 'virtual:pwa-register'

const CHECK_EVERY_MS = 60 * 60 * 1000
/** Right after launch nobody is mid-exercise yet, so an update can reload straight away. */
const SAFE_WINDOW_MS = 10_000

/**
 * Self-updating PWA without interrupting practice: a new version is applied
 * immediately if it arrives just after launch, otherwise as soon as the app
 * goes to the background (never mid-recording). Checks for updates hourly
 * because an installed PWA can stay open for days.
 */
export function setupAutoUpdate(): void {
  if (!('serviceWorker' in navigator)) return
  const startedAt = Date.now()

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (Date.now() - startedAt < SAFE_WINDOW_MS || document.visibilityState === 'hidden') {
        updateSW(true)
        return
      }
      const applyWhenHidden = () => {
        if (document.visibilityState === 'hidden') updateSW(true)
      }
      document.addEventListener('visibilitychange', applyWhenHidden)
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => {
        if (navigator.onLine) registration.update().catch(() => {})
      }, CHECK_EVERY_MS)
    },
  })
}
