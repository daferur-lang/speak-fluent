import { PartyPopper, X } from 'lucide-react'
import type { CEFRLevel } from '../types'

export function LevelUpBanner({ level, onDismiss }: { level: CEFRLevel; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-accent bg-accent/15 px-5 py-4 text-[var(--ink)] shadow-sm">
      <PartyPopper size={22} strokeWidth={1.75} className="shrink-0 text-accent" />
      <p className="flex-1 text-sm">
        <span className="font-display text-base font-semibold">¡Has subido a nivel {level}!</span>
        <br />
        Nuevas situaciones y frases más exigentes te esperan.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar aviso de subida de nivel"
        className="cursor-pointer rounded-full p-1 text-[var(--ink)]/60 transition-colors duration-200 hover:bg-black/5 hover:text-[var(--ink)]"
      >
        <X size={18} strokeWidth={1.75} />
      </button>
    </div>
  )
}
