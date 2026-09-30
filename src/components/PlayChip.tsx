import type { ReactNode } from 'react'
import { Square } from 'lucide-react'
import clsx from 'clsx'

interface PlayChipProps {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}

/** Pill button for playing a clip; turns into a stop control while it plays. */
export function PlayChip({ active, onClick, icon, children }: PlayChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
        active ? 'border-primary bg-primary-soft text-primary' : 'border-[var(--border)] hover:border-primary',
      )}
    >
      {active ? <Square size={14} fill="currentColor" /> : icon}
      {children}
    </button>
  )
}
