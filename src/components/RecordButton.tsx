import { Loader2, Mic, Square } from 'lucide-react'
import clsx from 'clsx'

export type RecordState = 'idle' | 'recording' | 'busy'

interface RecordButtonProps {
  state: RecordState
  onStart: () => void
  onStop: () => void
  disabled?: boolean
  size?: 'md' | 'lg'
  label?: string
}

export function RecordButton({ state, onStart, onStop, disabled, size = 'lg', label }: RecordButtonProps) {
  const recording = state === 'recording'
  const busy = state === 'busy'
  const dimension = size === 'lg' ? 'h-24 w-24' : 'h-16 w-16'
  const icon = size === 'lg' ? 34 : 24

  return (
    <div className="relative flex items-center justify-center">
      {recording && (
        <span
          className={clsx('absolute rounded-full bg-extra/25 animate-ping', size === 'lg' ? 'h-28 w-28' : 'h-20 w-20')}
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        onClick={recording ? onStop : onStart}
        disabled={disabled || busy}
        aria-label={recording ? 'Parar de grabar' : (label ?? 'Grabarme')}
        className={clsx(
          'relative flex cursor-pointer items-center justify-center rounded-full border-4 text-[var(--color-surface)] transition-all duration-200 active:scale-90',
          'shadow-[0_10px_25px_rgba(43,29,18,0.25)] disabled:cursor-not-allowed disabled:opacity-60',
          dimension,
          recording ? 'scale-105 border-extra bg-extra' : 'border-primary-hover bg-primary hover:scale-105',
        )}
      >
        {busy ? (
          <Loader2 size={icon} strokeWidth={1.75} className="animate-spin" />
        ) : recording ? (
          <Square size={icon - 6} strokeWidth={1.5} fill="currentColor" />
        ) : (
          <Mic size={icon} strokeWidth={1.75} />
        )}
      </button>
    </div>
  )
}
