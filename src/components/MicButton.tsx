import { Loader2, Mic, Square, Volume2 } from 'lucide-react'
import clsx from 'clsx'
import type { ConversationStatus } from '../hooks/useConversation'

interface MicButtonProps {
  status: ConversationStatus
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

export function MicButton({ status, onStart, onStop, disabled }: MicButtonProps) {
  const listening = status === 'listening'
  const busy = status === 'scoring' || status === 'ai-thinking'
  const speaking = status === 'ai-speaking'

  const handleClick = () => {
    if (listening) onStop()
    else if (status === 'idle' || status === 'error') onStart()
  }

  return (
    <div className="relative flex items-center justify-center">
      {listening && (
        <span className="absolute h-32 w-32 rounded-full bg-primary/25 animate-ping" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || busy || speaking}
        aria-label={listening ? 'Detener grabación' : 'Empezar a hablar'}
        className={clsx(
          'relative cursor-pointer flex h-28 w-28 items-center justify-center rounded-full border-4 transition-all duration-200 active:scale-90',
          'shadow-[0_10px_25px_rgba(43,29,18,0.25)]',
          listening
            ? 'bg-extra border-extra text-[var(--color-surface)] scale-105'
            : 'bg-primary border-primary-hover text-[var(--color-surface)] hover:scale-105',
          (busy || speaking) && 'opacity-70 cursor-not-allowed hover:scale-100',
        )}
      >
        {busy ? (
          <Loader2 size={36} strokeWidth={1.75} className="animate-spin" />
        ) : speaking ? (
          <Volume2 size={36} strokeWidth={1.75} />
        ) : listening ? (
          <Square size={30} strokeWidth={1.5} fill="currentColor" />
        ) : (
          <Mic size={36} strokeWidth={1.75} />
        )}
      </button>
    </div>
  )
}
