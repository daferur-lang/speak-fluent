import { useEffect, useState } from 'react'
import { Download, Share, SquarePlus, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'speak-fluent-install-dismissed'
const DISMISS_DAYS = 14

// Captured at module load: Chrome can fire it before React mounts.
let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((l) => l())
  })
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function recentlyDismissed(): boolean {
  const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
  return Date.now() - at < DISMISS_DAYS * 86_400_000
}

/** Offers installation: native prompt on Chrome/Edge/Android, manual steps on iOS (Apple has no install API). */
export function InstallBanner() {
  const [canPrompt, setCanPrompt] = useState(!!deferredPrompt)
  const [hidden, setHidden] = useState(() => isStandalone() || recentlyDismissed())
  const ios = isIOS()

  useEffect(() => {
    const update = () => setCanPrompt(!!deferredPrompt)
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  if (hidden || (!canPrompt && !ios)) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setHidden(true)
  }

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    setCanPrompt(false)
    if (outcome === 'accepted') setHidden(true)
  }

  return (
    <aside className="mb-5 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary-soft p-4 text-sm">
      <Download size={22} strokeWidth={1.75} className="shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--ink)]">Instala Speak Fluent</p>
        {ios ? (
          <p className="mt-0.5 leading-snug">
            Toca <Share size={14} className="inline -mt-0.5" aria-label="Compartir" /> y luego{' '}
            <SquarePlus size={14} className="inline -mt-0.5" aria-hidden="true" /> «Añadir a pantalla de inicio».
          </p>
        ) : (
          <p className="mt-0.5 leading-snug">Ábrela como una app, funciona sin conexión y se actualiza sola.</p>
        )}
      </div>
      {canPrompt && (
        <button
          type="button"
          onClick={install}
          className="min-h-11 shrink-0 cursor-pointer rounded-full bg-primary px-4 font-semibold text-[var(--color-surface)] hover:bg-primary-hover"
        >
          Instalar
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Ahora no"
        className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--surface)]"
      >
        <X size={18} />
      </button>
    </aside>
  )
}
